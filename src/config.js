const fs = require('fs')
const path = require('path')

const CONFIG_FILE = process.env.AIKO_CONFIG_FILE || path.join(__dirname, '..', 'config.json')

const DEFAULT_CONFIG = {
  server: {
    host: '',
    port: 25565,
    username: 'BotAssistant',
    auth: 'offline',
    version: '1.20.1'
  },
  owners: [],
  behavior: {
    foodEatAt: 14,
    foodCriticalAt: 8,
    foodCarry: 16,
    healthReturnAt: 8,
    oxygenCriticalAt: 10,
    hostileDistance: 9,
    hostileCriticalDistance: 5,
    mineSearchRadius: 64,
    exploreRadius: 24,
    farmRadius: 18,
    sugarCaneRadius: 24,
    maxCookItemsPerFarmRun: 8,
    minEmptySlots: 3,
    pathThinkTimeout: 10000,
    baseProtectionRadius: 48,
    farmProtectionRadius: 24,
    buildProtectionRadius: 24,
    mineStartDistanceFromBase: 64,
    buildGatherDistanceFromBase: 500,
    miningExploreStep: 18,
    miningMaxScanCycles: 20,
    miningStripLength: 48,
    diamondTargetY: -58,
    autoSleepAtBase: false,
    autoFarmAnimalsDays: 3
  }
}

function loadConfig() {
  let fileConfig = {}

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'))
    }
  } catch (err) {
    console.warn('[config] Impossible de lire config.json, utilisation config par défaut:', err.message)
  }

  const server = {
    ...DEFAULT_CONFIG.server,
    ...(fileConfig.server || {})
  }

  server.host = process.env.MC_HOST || server.host
  server.port = Number(process.env.MC_PORT || server.port)
  server.username = process.env.MC_USERNAME || server.username
  server.auth = process.env.MC_AUTH || server.auth || 'offline'
  server.version = process.env.MC_VERSION || server.version || '1.20.1'

  const behavior = {
    ...DEFAULT_CONFIG.behavior,
    ...(fileConfig.behavior || {})
  }

  const owners = Array.isArray(fileConfig.owners)
    ? fileConfig.owners.map(owner => String(owner).trim()).filter(Boolean)
    : DEFAULT_CONFIG.owners

  const envOwners = process.env.MC_OWNERS
    ? process.env.MC_OWNERS.split(',').map(owner => owner.trim()).filter(Boolean)
    : null

  const finalOwners = envOwners || owners

  return {
    // Nouvelle structure propre
    server,
    owners: finalOwners,
    behavior,

    // Compatibilité ancien code si bot.js utilise config.host directement
    host: server.host,
    port: server.port,
    username: server.username,
    auth: server.auth,
    version: server.version,

    // Compatibilité ancien code si bot.js utilise config.foodEatAt directement
    ...behavior
  }
}

module.exports = {
  DEFAULT_CONFIG,
  loadConfig
}
