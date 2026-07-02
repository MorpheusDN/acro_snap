const { app, BrowserWindow, globalShortcut, ipcMain, screen, shell } = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const isDev = !app.isPackaged;
const devUrl = process.env.ACRO_DEV_URL || 'http://127.0.0.1:5173';

const profileRoot = isDev
  ? path.join(os.tmpdir(), 'acro-snap-electron-dev')
  : path.join(app.getPath('appData'), 'AcroSnap');
const cacheRoot = path.join(profileRoot, 'Cache');

fs.mkdirSync(cacheRoot, { recursive: true });
app.setPath('userData', profileRoot);
app.commandLine.appendSwitch('disk-cache-dir', cacheRoot);

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  app.quit();
}

let mainWindow;
let searchWindow;
let chatWindow;
let pendingChatContext = null;
let searchPinned = false;
let chatPinned = false;
let isQuitting = false;

function isUsableWindow(win) {
  return Boolean(win && !win.isDestroyed());
}

app.on('second-instance', () => {
  if (!isUsableWindow(mainWindow)) createMainWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

function buildRoundedRectShape(width, height, radius) {
  const safeRadius = Math.max(0, Math.min(radius, Math.floor(width / 2), Math.floor(height / 2)));
  if (!safeRadius) return [{ x: 0, y: 0, width, height }];

  const rects = [];
  let current = null;

  for (let y = 0; y < height; y += 1) {
    const topDistance = safeRadius - y - 0.5;
    const bottomDistance = y + 0.5 - (height - safeRadius);
    const distance = Math.max(topDistance, bottomDistance, 0);
    const inset = distance > 0
      ? Math.ceil(safeRadius - Math.sqrt(Math.max(0, safeRadius * safeRadius - distance * distance)))
      : 0;

    const row = {
      x: inset,
      y,
      width: Math.max(0, width - inset * 2),
      height: 1
    };

    if (current && current.x === row.x && current.width === row.width) {
      current.height += 1;
    } else {
      current = row;
      rects.push(current);
    }
  }

  return rects;
}

function applyRoundedWindowShape(win, radius = 18) {
  if (!isUsableWindow(win) || process.platform !== 'win32' || typeof win.setShape !== 'function') return;

  const updateShape = () => {
    if (!isUsableWindow(win)) return;
    if (win.isMaximized() || win.isFullScreen()) {
      win.setShape([]);
      return;
    }

    const [width, height] = win.getContentSize();
    win.setShape(buildRoundedRectShape(width, height, radius));
  };

  if (!win.__acroShapeBound) {
    win.__acroShapeBound = true;
    win.once('ready-to-show', updateShape);
    win.webContents.once('did-finish-load', updateShape);
    win.on('resize', updateShape);
    win.on('resized', updateShape);
    win.on('maximize', updateShape);
    win.on('unmaximize', updateShape);
    win.on('enter-full-screen', updateShape);
    win.on('leave-full-screen', updateShape);
  }
  setTimeout(updateShape, 50);
}

function windowUrl(name) {
  if (isDev) return `${devUrl}/?window=${name}`;
  return `file://${path.join(__dirname, '../dist/index.html')}?window=${name}`;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 980,
    minHeight: 640,
    frame: false,
    transparent: true,
    roundedCorners: true,
    title: 'AcroSnap',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  applyRoundedWindowShape(mainWindow, 18);
  mainWindow.loadURL(windowUrl('main'));
  mainWindow.on('close', () => {
    if (isQuitting) return;
    isQuitting = true;
    if (isUsableWindow(searchWindow)) searchWindow.close();
    if (isUsableWindow(chatWindow)) chatWindow.close();
    app.quit();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createSearchWindow() {
  searchWindow = new BrowserWindow({
    width: 560,
    height: 720,
    minWidth: 460,
    minHeight: 520,
    show: false,
    frame: false,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    roundedCorners: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  applyRoundedWindowShape(searchWindow, 18);

  searchWindow.loadURL(windowUrl('search'));
  searchWindow.on('blur', () => {
    if (isUsableWindow(searchWindow) && searchWindow.isVisible() && !searchPinned) searchWindow.hide();
  });
  searchWindow.on('closed', () => {
    searchWindow = null;
    searchPinned = false;
  });
}

function createChatWindow() {
  chatWindow = new BrowserWindow({
    width: 640,
    height: 820,
    minWidth: 520,
    minHeight: 620,
    show: false,
    frame: false,
    transparent: true,
    roundedCorners: true,
    title: 'AcroSnap Chat',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  applyRoundedWindowShape(chatWindow, 18);

  chatWindow.loadURL(windowUrl('chat'));
  chatWindow.on('blur', () => {
    if (isUsableWindow(chatWindow) && chatWindow.isVisible() && !chatPinned) chatWindow.hide();
  });
  chatWindow.webContents.on('did-finish-load', () => {
    if (pendingChatContext && isUsableWindow(chatWindow) && !chatWindow.webContents.isDestroyed()) {
      chatWindow.webContents.send('chat:context', pendingChatContext);
      pendingChatContext = null;
    }
  });
  chatWindow.on('closed', () => {
    chatWindow = null;
    chatPinned = false;
  });
}

function showSearchWindow() {
  if (!isUsableWindow(searchWindow)) createSearchWindow();
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const bounds = display.workArea;
  const [width, height] = searchWindow.getSize();
  searchWindow.setPosition(
    Math.round(bounds.x + (bounds.width - width) / 2),
    Math.round(bounds.y + Math.max(90, (bounds.height - height) * 0.22))
  );
  searchWindow.show();
  applyRoundedWindowShape(searchWindow, 18);
  searchWindow.focus();
  if (!searchWindow.webContents.isDestroyed()) searchWindow.webContents.send('search:reset');
}

function showChatWindow(payload) {
  if (!isUsableWindow(chatWindow)) createChatWindow();
  if (payload) pendingChatContext = payload;
  chatWindow.show();
  applyRoundedWindowShape(chatWindow, 18);
  chatWindow.focus();
  if (payload && !chatWindow.webContents.isDestroyed() && !chatWindow.webContents.isLoading()) {
    chatWindow.webContents.send('chat:context', payload);
    pendingChatContext = null;
  }
}

app.whenReady().then(() => {
  createMainWindow();
  createSearchWindow();
  createChatWindow();

  globalShortcut.register('Alt+1', showSearchWindow);
  globalShortcut.register('Alt+2', () => showChatWindow());

  ipcMain.handle('search:show', () => showSearchWindow());
  ipcMain.handle('search:hide', () => {
    if (isUsableWindow(searchWindow)) searchWindow.hide();
  });
  ipcMain.handle('chat:hide', () => {
    if (isUsableWindow(chatWindow)) chatWindow.hide();
  });
  ipcMain.handle('chat:open', (_event, payload) => {
    if (isUsableWindow(searchWindow)) searchWindow.hide();
    showChatWindow(payload);
  });
  ipcMain.handle('external:open', async (_event, url) => {
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) return;
    await shell.openExternal(url);
  });
  ipcMain.handle('ai:chat-completion', async (_event, request) => {
    if (!request || typeof request.endpoint !== 'string' || !/^https?:\/\//.test(request.endpoint)) {
      return { ok: false, status: 400, endpoint: request?.endpoint || '', text: JSON.stringify({ error: { message: 'Invalid AI endpoint' } }) };
    }

    try {
      const apiKey = String(request.apiKey || process.env.ARK_API_KEY || '').trim();
      if (!apiKey) {
        return {
          ok: false,
          status: 401,
          endpoint: request.endpoint,
          text: JSON.stringify({
            error: {
              message: '未检测到 AI API Key。请在服务配置里填写并保存 AI API Key，或在启动 Electron 前设置 ARK_API_KEY 环境变量。'
            }
          })
        };
      }

      const isResponses = request.mode === 'responses';
      const body = isResponses
        ? {
            model: request.model,
            instructions: request.instructions,
            input: Array.isArray(request.messages)
              ? request.messages
                  .filter((message) => message.role !== 'system')
                  .map((message) => ({
                    role: message.role,
                    content: [
                      {
                        type: message.role === 'assistant' ? 'output_text' : 'input_text',
                        text: message.content
                      }
                    ]
                  }))
              : []
          }
        : {
            model: request.model,
            messages: Array.isArray(request.messages) ? request.messages : [],
            temperature: request.temperature ?? 0.2
          };

      const response = await fetch(request.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      return {
        ok: response.ok,
        status: response.status,
        endpoint: request.endpoint,
        text: await response.text()
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        endpoint: request.endpoint,
        text: JSON.stringify({
          error: {
            message: error instanceof Error ? error.message : 'AI network request failed'
          }
        })
      };
    }
  });
  ipcMain.handle('window:set-pinned', (event, pinned) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender);
    if (!isUsableWindow(senderWindow)) return;

    if (senderWindow === searchWindow) {
      searchPinned = Boolean(pinned);
      searchWindow.setAlwaysOnTop(true);
      return;
    }

    if (senderWindow === chatWindow) {
      chatPinned = Boolean(pinned);
      chatWindow.setAlwaysOnTop(chatPinned);
    }
  });
  ipcMain.handle('window:minimize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (isUsableWindow(window)) window.minimize();
  });
  ipcMain.handle('window:toggle-maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!isUsableWindow(window)) return;
    if (window.isMaximized()) window.unmaximize();
    else window.maximize();
  });
  ipcMain.handle('window:close', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (isUsableWindow(window)) window.close();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('will-quit', () => {
  isQuitting = true;
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
