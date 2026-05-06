const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('acroSnap', {
  hideSearch: () => ipcRenderer.invoke('search:hide'),
  openChat: (payload) => ipcRenderer.invoke('chat:open', payload),
  showSearch: () => ipcRenderer.invoke('search:show'),
  onChatContext: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('chat:context', listener);
    return () => ipcRenderer.removeListener('chat:context', listener);
  }
});
