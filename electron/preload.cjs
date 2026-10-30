const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopSecurity', {
  isDesktop: true,
  startLockdown: () => ipcRenderer.send('exam:start-lockdown'),
  endLockdown: () => ipcRenderer.send('exam:end-lockdown'),
  clearClipboard: () => ipcRenderer.send('clipboard:clear'),
  closeApp: () => ipcRenderer.send('app:close'),
  checkEnvironment: () => ipcRenderer.invoke('exam:check-environment'),
  onViolation: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('proctoring:violation', listener);
    return () => ipcRenderer.removeListener('proctoring:violation', listener);
  }
});
