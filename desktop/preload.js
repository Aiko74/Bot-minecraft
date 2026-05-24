const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('aikoApp', {
  overview: () => ipcRenderer.invoke('app:overview'),
  startBot: () => ipcRenderer.invoke('bot:start'),
  stopBot: () => ipcRenderer.invoke('bot:stop'),
  restartBot: () => ipcRenderer.invoke('bot:restart'),
  botStatus: () => ipcRenderer.invoke('bot:status'),
  saveConfig: patch => ipcRenderer.invoke('config:save', patch),
  saveSettings: patch => ipcRenderer.invoke('settings:save', patch),
  saveProfile: profile => ipcRenderer.invoke('profile:save', profile),
  deleteProfile: profileId => ipcRenderer.invoke('profile:delete', profileId),
  applyProfile: profileId => ipcRenderer.invoke('profile:apply', profileId),
  testConnection: target => ipcRenderer.invoke('connection:test', target),
  detectLocalIpv4: () => ipcRenderer.invoke('network:local-ipv4'),
  exportConfig: () => ipcRenderer.invoke('config:export'),
  importConfig: () => ipcRenderer.invoke('config:import'),
  runConsoleCommand: command => ipcRenderer.invoke('desktop:console', command),
  openBlueprintFolder: () => ipcRenderer.invoke('folder:blueprints'),
  openProjectFolder: () => ipcRenderer.invoke('folder:project'),
  onBotLog: callback => {
    const listener = (_event, value) => callback(value)
    ipcRenderer.on('bot:log', listener)
    return () => ipcRenderer.removeListener('bot:log', listener)
  },
  onBotStatus: callback => {
    const listener = (_event, value) => callback(value)
    ipcRenderer.on('bot:status', listener)
    return () => ipcRenderer.removeListener('bot:status', listener)
  },
  onDesktopConsole: callback => {
    const listener = (_event, value) => callback(value)
    ipcRenderer.on('desktop:console', listener)
    return () => ipcRenderer.removeListener('desktop:console', listener)
  }
})
