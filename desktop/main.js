const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const net = require('net')
const os = require('os')
const { execFile, spawn } = require('child_process')
const { commandCategories, flattenCommands } = require('../bot-core/commands/catalog')
const { listBlueprints, loadBlueprint, validateBlueprint } = require('../blueprint-utils')

const ROOT = path.join(__dirname, '..')
const USER_ROOT = app.isPackaged ? app.getPath('userData') : ROOT
const DATA_DIR = app.isPackaged ? path.join(USER_ROOT, 'data') : path.join(ROOT, 'data')
const CONFIG_FILE = path.join(USER_ROOT, 'config.json')
const MEMORY_FILE = path.join(USER_ROOT, 'bot-memory.json')
const DESKTOP_SETTINGS_FILE = path.join(DATA_DIR, 'desktop-settings.json')

let mainWindow = null
let botProcess = null
let botStartedAt = null
let botConnectionState = 'stopped'
let botLastError = null
const botLogs = []
const desktopConsole = []

function pushLog(line) {
  const text = String(line || '').replace(/\r?\n$/, '')
  if (!text) return
  botLogs.push({
    at: new Date().toISOString(),
    text
  })
  updateConnectionStateFromLog(text)
  while (botLogs.length > 500) botLogs.shift()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('bot:log', botLogs[botLogs.length - 1])
    mainWindow.webContents.send('bot:status', botStatus())
  }
}

function pushConsole(line, level = 'info') {
  const entry = {
    at: new Date().toISOString(),
    level,
    text: String(line || '')
  }
  desktopConsole.push(entry)
  while (desktopConsole.length > 250) desktopConsole.shift()
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('desktop:console', entry)
  }
}

function updateConnectionStateFromLog(text) {
  const lower = String(text).toLowerCase()
  if (lower.includes('[connection] bot connecte') || lower.includes('bot autonome actif')) {
    botConnectionState = 'connected'
    botLastError = null
    return
  }

  if (lower.includes('[connection] bot deconnecte')) {
    botConnectionState = botProcess ? 'disconnected' : 'stopped'
    return
  }

  if (lower.includes('[connection]') && (lower.includes('error') || lower.includes('erreur') || lower.includes('econn') || lower.includes('refused'))) {
    botConnectionState = 'error'
    botLastError = text
    return
  }

  if (lower.includes('[err]') || lower.includes('error:') || lower.includes('uncaught')) {
    botConnectionState = 'error'
    botLastError = text
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2))
}

function seedJsonFile(targetPath, sourcePath, fallback) {
  if (fs.existsSync(targetPath)) return
  fs.mkdirSync(path.dirname(targetPath), { recursive: true })
  if (sourcePath && fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath)
    return
  }
  fs.writeFileSync(targetPath, JSON.stringify(fallback, null, 2))
}

function ensureUserDataFiles() {
  const defaultConfig = {
    server: {
      host: '',
      port: 25565,
      username: 'BotAssistant',
      auth: 'offline',
      version: '1.20.1'
    },
    owners: [],
    behavior: {
      autoSleepAtBase: false,
      autoFarmAnimalsDays: 3
    }
  }

  fs.mkdirSync(DATA_DIR, { recursive: true })
  seedJsonFile(CONFIG_FILE, path.join(ROOT, 'config.example.json'), defaultConfig)
}

function defaultDesktopSettings(config = readJson(CONFIG_FILE, {})) {
  const server = config.server || {}
  return {
    theme: 'galaxy',
    performanceMode: false,
    selectedProfileId: 'default',
    serverProfiles: [
      {
        id: 'default',
        name: 'Serveur principal',
        host: server.host || '',
        port: Number(server.port) || 25565,
        username: server.username || 'BotAssistant',
        version: server.version || '1.20.1',
        owners: Array.isArray(config.owners) ? config.owners : []
      }
    ],
    customCommands: [
      { id: 'cmd-status', label: 'Status', command: 'status' },
      { id: 'cmd-retour', label: 'Retour base', command: 'retour base' },
      { id: 'cmd-mine-fer', label: 'Mine fer', command: 'mine 64 fer' }
    ]
  }
}

function readSettings() {
  const config = readJson(CONFIG_FILE, {})
  const defaults = defaultDesktopSettings(config)
  const settings = readJson(DESKTOP_SETTINGS_FILE, defaults)
  return {
    ...defaults,
    ...settings,
    serverProfiles: Array.isArray(settings.serverProfiles) && settings.serverProfiles.length > 0
      ? settings.serverProfiles
      : defaults.serverProfiles,
    customCommands: Array.isArray(settings.customCommands)
      ? settings.customCommands
      : defaults.customCommands
  }
}

function saveSettings(patch = {}) {
  const current = readSettings()
  const next = {
    ...current,
    ...patch,
    serverProfiles: Array.isArray(patch.serverProfiles) ? patch.serverProfiles : current.serverProfiles,
    customCommands: Array.isArray(patch.customCommands) ? patch.customCommands : current.customCommands
  }
  writeJson(DESKTOP_SETTINGS_FILE, next)
  pushConsole('Reglages desktop sauvegardes.')
  return next
}

function botStatus() {
  return {
    running: Boolean(botProcess),
    pid: botProcess ? botProcess.pid : null,
    startedAt: botStartedAt,
    state: botConnectionState,
    lastError: botLastError,
    logs: botLogs.slice(-200)
  }
}

function blueprintSummary() {
  return listBlueprints().map(name => {
    try {
      const blueprint = loadBlueprint(name)
      return {
        key: name,
        name: blueprint.name || name,
        description: blueprint.description || '',
        size: blueprint.size || [0, 0, 0],
        materials: blueprint.materials || {},
        valid: validateBlueprint(blueprint).length === 0
      }
    } catch (err) {
      return {
        key: name,
        name,
        description: err.message,
        size: [0, 0, 0],
        materials: {},
        valid: false
      }
    }
  })
}

function overview() {
  return {
    config: readJson(CONFIG_FILE, {}),
    memory: readJson(MEMORY_FILE, {}),
    settings: readSettings(),
    bot: botStatus(),
    console: desktopConsole.slice(-100),
    commands: commandCategories,
    allCommands: flattenCommands(),
    blueprints: blueprintSummary()
  }
}

function startBot() {
  if (botProcess) return botStatus()

  botStartedAt = new Date().toISOString()
  botConnectionState = 'starting'
  botLastError = null
  pushLog('[desktop] demarrage du bot')
  pushConsole('Aiko V1 test: demarrage du bot.')
  pushConsole('Dans Minecraft, Aiko repond seulement aux owners configures.')
  pushConsole('Commandes conseillees: status, setbase, prepare, mine 16 fer, retour base.')
  pushConsole('Les cartes "Feature incoming" sont visibles mais encore en developpement.')
  botProcess = spawn(process.execPath, [path.join(ROOT, 'bot.js')], {
    cwd: ROOT,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      AIKO_CONFIG_FILE: CONFIG_FILE,
      AIKO_MEMORY_FILE: MEMORY_FILE
    },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  botProcess.stdout.on('data', chunk => {
    for (const line of String(chunk).split(/\r?\n/)) pushLog(line)
  })

  botProcess.stderr.on('data', chunk => {
    for (const line of String(chunk).split(/\r?\n/)) pushLog(`[err] ${line}`)
  })

  botProcess.on('error', err => {
    botConnectionState = 'error'
    botLastError = err.message
    pushLog(`[desktop] erreur bot: ${err.message}`)
    pushConsole(`Erreur bot: ${err.message}`, 'error')
  })

  botProcess.on('close', code => {
    if (botConnectionState !== 'error') botConnectionState = 'stopped'
    pushLog(`[desktop] bot arrete avec code ${code}`)
    pushConsole(`Bot arrete avec code ${code}.`, code === 0 ? 'info' : 'warn')
    botProcess = null
    botStartedAt = null
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bot:status', botStatus())
    }
  })

  return botStatus()
}

function stopBot() {
  if (!botProcess) return botStatus()

  pushLog('[desktop] arret demande')
  pushConsole('Arret du bot demande.')
  const child = botProcess
  botProcess = null
  botStartedAt = null
  botConnectionState = 'stopped'
  child.kill('SIGTERM')

  setTimeout(() => {
    if (!child.killed) child.kill('SIGKILL')
  }, 4000)

  return botStatus()
}

async function restartBot() {
  pushConsole('Redemarrage du bot...')
  stopBot()
  await new Promise(resolve => setTimeout(resolve, 1200))
  return startBot()
}

function saveConfig(patch) {
  const current = readJson(CONFIG_FILE, {})
  const next = {
    ...current,
    server: {
      ...(current.server || {}),
      ...(patch.server || {})
    },
    owners: Array.isArray(patch.owners) ? patch.owners : current.owners,
    behavior: {
      ...(current.behavior || {}),
      ...(patch.behavior || {})
    }
  }

  if (next.server && typeof next.server.port !== 'undefined') {
    next.server.port = Number(next.server.port)
  }

  writeJson(CONFIG_FILE, next)
  pushLog('[desktop] configuration sauvegardee')
  pushConsole('Configuration sauvegardee automatiquement.')
  return next
}

function applyServerProfile(profileId) {
  const settings = readSettings()
  const profile = settings.serverProfiles.find(item => item.id === profileId)
  if (!profile) throw new Error('Profil serveur introuvable.')

  const config = saveConfig({
    server: {
      host: profile.host,
      port: Number(profile.port),
      username: profile.username,
      version: profile.version
    },
    owners: Array.isArray(profile.owners) ? profile.owners : []
  })

  saveSettings({ selectedProfileId: profile.id })
  pushConsole(`Profil applique: ${profile.name}`)
  return { config, settings: readSettings() }
}

function saveServerProfile(profile) {
  const settings = readSettings()
  const clean = {
    id: profile.id || `profile-${Date.now()}`,
    name: profile.name || 'Nouveau serveur',
    host: profile.host || '',
    port: Number(profile.port) || 25565,
    username: profile.username || 'BotAssistant',
    version: profile.version || '1.20.1',
    owners: Array.isArray(profile.owners) ? profile.owners : []
  }
  const exists = settings.serverProfiles.some(item => item.id === clean.id)
  const serverProfiles = exists
    ? settings.serverProfiles.map(item => item.id === clean.id ? clean : item)
    : [...settings.serverProfiles, clean]
  pushConsole(`Profil serveur sauvegarde: ${clean.name}`)
  return saveSettings({ serverProfiles, selectedProfileId: clean.id })
}

function deleteServerProfile(profileId) {
  const settings = readSettings()
  const serverProfiles = settings.serverProfiles.filter(profile => profile.id !== profileId)
  const selectedProfileId = settings.selectedProfileId === profileId
    ? (serverProfiles[0] && serverProfiles[0].id) || null
    : settings.selectedProfileId
  pushConsole('Profil serveur supprime.')
  return saveSettings({ serverProfiles, selectedProfileId })
}

function testConnection(target = {}) {
  const config = readJson(CONFIG_FILE, {})
  const server = {
    ...(config.server || {}),
    ...(target.server || target || {})
  }
  const host = server.host
  const port = Number(server.port)

  return new Promise(resolve => {
    if (!host || !port) {
      resolve({ ok: false, message: 'Adresse ou port manquant.' })
      return
    }

    const startedAt = Date.now()
    const socket = net.createConnection({ host, port, timeout: 5000 })
    let finished = false

    function done(ok, message) {
      if (finished) return
      finished = true
      socket.destroy()
      const result = {
        ok,
        host,
        port,
        latencyMs: Date.now() - startedAt,
        message
      }
      pushConsole(ok
        ? `Test connexion OK ${host}:${port} (${result.latencyMs}ms)`
        : `Test connexion echoue ${host}:${port}: ${message}`,
      ok ? 'info' : 'error')
      resolve(result)
    }

    socket.on('connect', () => done(true, 'Serveur joignable.'))
    socket.on('timeout', () => done(false, 'Timeout: serveur ferme, endormi ou port incorrect.'))
    socket.on('error', err => done(false, err.message))
  })
}

function isUsableIpv4(address) {
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(address)) return false
  const parts = address.split('.').map(Number)
  if (parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return false
  if (parts[0] === 127 || parts[0] === 0) return false
  if (parts[0] === 169 && parts[1] === 254) return false
  return true
}

function isPrivateIpv4(address) {
  const [a, b] = address.split('.').map(Number)
  return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)
}

function scoreIpv4Candidate(candidate) {
  const adapter = String(candidate.adapter || '').toLowerCase()
  let score = 0
  if (candidate.address.startsWith('192.168.')) score += 60
  else if (candidate.address.startsWith('10.')) score += 45
  else if (isPrivateIpv4(candidate.address)) score += 40
  if (/wi-?fi|wireless|wlan|ethernet|reseau|r.seau/.test(adapter)) score += 12
  if (/virtual|vmware|vbox|hyper-v|vethernet|docker|wsl|loopback|bluetooth|tailscale|zerotier/.test(adapter)) score -= 80
  return score
}

function parseIpconfigIpv4(output) {
  const candidates = []
  let adapter = ''

  for (const rawLine of String(output || '').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue
    if (!/^\s/.test(rawLine) && line.endsWith(':')) adapter = line.slice(0, -1)
    if (!/ipv4/i.test(line)) continue

    const match = line.match(/:\s*(\d{1,3}(?:\.\d{1,3}){3})/)
    if (!match) continue
    const address = match[1]
    if (!isUsableIpv4(address)) continue
    candidates.push({ address, adapter, source: 'ipconfig', score: scoreIpv4Candidate({ address, adapter }) })
  }

  return candidates
}

function networkInterfaceIpv4Fallback() {
  const candidates = []
  const interfaces = os.networkInterfaces()

  for (const [adapter, entries] of Object.entries(interfaces)) {
    for (const entry of entries || []) {
      const address = entry && entry.address
      if (!address || entry.internal || entry.family !== 'IPv4' || !isUsableIpv4(address)) continue
      candidates.push({ address, adapter, source: 'networkInterfaces', score: scoreIpv4Candidate({ address, adapter }) })
    }
  }

  return candidates
}

function uniqueIpv4Candidates(candidates) {
  const seen = new Set()
  return candidates
    .filter(candidate => {
      if (!candidate || !candidate.address || seen.has(candidate.address)) return false
      seen.add(candidate.address)
      return true
    })
    .sort((a, b) => b.score - a.score)
}

function detectLocalIpv4() {
  return new Promise(resolve => {
    execFile('ipconfig', { windowsHide: true, timeout: 5000 }, (error, stdout) => {
      const candidates = uniqueIpv4Candidates([
        ...parseIpconfigIpv4(stdout),
        ...networkInterfaceIpv4Fallback()
      ])

      if (!candidates.length) {
        const message = error
          ? `Impossible de lire ipconfig: ${error.message}`
          : 'Aucune adresse IPv4 locale trouvee.'
        pushConsole(message, 'warn')
        resolve({ ok: false, message, candidates: [] })
        return
      }

      const selected = candidates.find(candidate => isPrivateIpv4(candidate.address)) || candidates[0]
      pushConsole(`IPv4 locale detectee: ${selected.address}`)
      resolve({
        ok: true,
        address: selected.address,
        adapter: selected.adapter,
        candidates: candidates.map(candidate => ({
          address: candidate.address,
          adapter: candidate.adapter,
          source: candidate.source
        })),
        message: `Adresse IPv4 trouvee: ${selected.address}`
      })
    })
  })
}

async function exportConfig() {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Exporter la configuration',
    defaultPath: 'aiko-config.json',
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled || !result.filePath) return { ok: false, message: 'Export annule.' }
  fs.copyFileSync(CONFIG_FILE, result.filePath)
  pushConsole(`Configuration exportee: ${result.filePath}`)
  return { ok: true, filePath: result.filePath }
}

async function importConfig() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Importer une configuration',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  if (result.canceled || !result.filePaths[0]) return { ok: false, message: 'Import annule.' }

  const imported = readJson(result.filePaths[0], null)
  if (!imported || typeof imported !== 'object') {
    return { ok: false, message: 'Fichier JSON invalide.' }
  }
  const safeConfig = {
    server: imported.server || {},
    owners: Array.isArray(imported.owners) ? imported.owners : [],
    behavior: imported.behavior || {}
  }
  writeJson(CONFIG_FILE, safeConfig)
  pushConsole(`Configuration importee: ${result.filePaths[0]}`)
  return { ok: true, config: safeConfig }
}

async function runDesktopConsole(command) {
  const text = String(command || '').trim()
  if (!text) return { ok: false, message: 'Commande vide.' }
  pushConsole(`> ${text}`)

  if (text === 'start') return { ok: true, result: startBot() }
  if (text === 'stop') return { ok: true, result: stopBot() }
  if (text === 'restart') return { ok: true, result: await restartBot() }
  if (text === 'status') return { ok: true, result: botStatus() }
  if (text === 'test') return { ok: true, result: await testConnection() }
  if (text === 'open project') {
    await shell.openPath(ROOT)
    return { ok: true, result: 'Dossier projet ouvert.' }
  }

  const message = "Commande console locale inconnue. Disponibles: start, stop, restart, status, test, open project."
  pushConsole(message, 'warn')
  return { ok: false, message }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    title: 'Minecraft Survival Assistant',
    backgroundColor: '#05070a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  const distIndex = path.join(__dirname, 'dist', 'index.html')
  if (fs.existsSync(distIndex)) {
    mainWindow.loadFile(distIndex)
  } else {
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent('<body style="background:#05070a;color:#eef7ff;font-family:system-ui;padding:32px"><h1>Aiko Assistant</h1><p>Interface non compilee. Lance npm run desktop:build puis npm run desktop.</p></body>')}`)
  }
}

ipcMain.handle('app:overview', () => overview())
ipcMain.handle('bot:start', () => startBot())
ipcMain.handle('bot:stop', () => stopBot())
ipcMain.handle('bot:restart', () => restartBot())
ipcMain.handle('bot:status', () => botStatus())
ipcMain.handle('config:save', (_event, patch) => saveConfig(patch || {}))
ipcMain.handle('config:export', () => exportConfig())
ipcMain.handle('config:import', () => importConfig())
ipcMain.handle('settings:save', (_event, patch) => saveSettings(patch || {}))
ipcMain.handle('profile:save', (_event, profile) => saveServerProfile(profile || {}))
ipcMain.handle('profile:delete', (_event, profileId) => deleteServerProfile(profileId))
ipcMain.handle('profile:apply', (_event, profileId) => applyServerProfile(profileId))
ipcMain.handle('connection:test', (_event, target) => testConnection(target || {}))
ipcMain.handle('network:local-ipv4', () => detectLocalIpv4())
ipcMain.handle('desktop:console', (_event, command) => runDesktopConsole(command))
ipcMain.handle('folder:blueprints', () => shell.openPath(path.join(ROOT, 'blueprints')))
ipcMain.handle('folder:project', () => shell.openPath(ROOT))

app.whenReady().then(() => {
  ensureUserDataFiles()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  if (botProcess) {
    botProcess.kill('SIGTERM')
    botProcess = null
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
