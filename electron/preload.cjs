const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('acroSnap', {
  hideSearch: () => ipcRenderer.invoke('search:hide'),
  hideChat: () => ipcRenderer.invoke('chat:hide'),
  openChat: (payload) => ipcRenderer.invoke('chat:open', payload),
  openExternal: (url) => ipcRenderer.invoke('external:open', url),
  chatCompletion: (request) => ipcRenderer.invoke('ai:chat-completion', request),
  showSearch: () => ipcRenderer.invoke('search:show'),
  setWindowPinned: (pinned) => ipcRenderer.invoke('window:set-pinned', pinned),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggle-maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  onChatContext: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('chat:context', listener);
    return () => ipcRenderer.removeListener('chat:context', listener);
  }
});
