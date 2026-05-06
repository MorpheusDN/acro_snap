const { app, BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('node:path');

const isDev = !app.isPackaged;
const devUrl = 'http://127.0.0.1:5173';

let mainWindow;
let searchWindow;
let chatWindow;
let pendingChatContext = null;

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
    title: 'AcroSnap',
    backgroundColor: '#071016',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadURL(windowUrl('main'));
}

function createSearchWindow() {
  searchWindow = new BrowserWindow({
    width: 720,
    height: 430,
    show: false,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  searchWindow.loadURL(windowUrl('search'));
  searchWindow.on('blur', () => {
    if (searchWindow?.isVisible()) searchWindow.hide();
  });
}

function createChatWindow() {
  chatWindow = new BrowserWindow({
    width: 980,
    height: 760,
    minWidth: 780,
    minHeight: 620,
    show: false,
    title: 'AcroSnap Chat',
    backgroundColor: '#071016',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  chatWindow.loadURL(windowUrl('chat'));
  chatWindow.webContents.on('did-finish-load', () => {
    if (pendingChatContext) {
      chatWindow.webContents.send('chat:context', pendingChatContext);
      pendingChatContext = null;
    }
  });
}

function showSearchWindow() {
  if (!searchWindow) createSearchWindow();
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const bounds = display.workArea;
  const [width, height] = searchWindow.getSize();
  searchWindow.setPosition(
    Math.round(bounds.x + (bounds.width - width) / 2),
    Math.round(bounds.y + Math.max(90, (bounds.height - height) * 0.22))
  );
  searchWindow.show();
  searchWindow.focus();
  searchWindow.webContents.send('search:reset');
}

function showChatWindow(payload) {
  if (!chatWindow) createChatWindow();
  if (payload) pendingChatContext = payload;
  chatWindow.show();
  chatWindow.focus();
  if (payload && !chatWindow.webContents.isLoading()) {
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
  ipcMain.handle('search:hide', () => searchWindow?.hide());
  ipcMain.handle('chat:open', (_event, payload) => {
    searchWindow?.hide();
    showChatWindow(payload);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
