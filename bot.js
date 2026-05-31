const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const toolPlugin = require('mineflayer-tool').plugin
const minecraftData = require('minecraft-data')
const { Vec3 } = require('vec3')
const { ANIMAL_FARMS } = require('./farm-config')
const {
  listBlueprints,
  loadBlueprint,
  missingMaterials,
  summarizeMissing
} = require('./blueprint-utils')
const { loadConfig } = require('./src/memory/config')
const { parseIntent } = require('./src/chat/intents')
const { progressBar, progressBucket, progressPercent } = require('./src/chat/progress')
const { createMissionText } = require('./src/bot/missionManager')
const { createCommandContextFactory } = require('./src/bot/commandContext')
const { createMissionRuntime } = require('./src/bot/missionRuntime')
const { createAutomationHelpers } = require('./src/bot/automation')
const { createRunExclusive } = require('./src/bot/runExclusive')
const { createAuth } = require('./src/bot/auth')
const { createRuntimeMemory } = require('./src/bot/runtimeMemory')
const { createCommandHandler } = require('./src/commands')
const { handleLegacyCommand } = require('./src/commands/legacyDispatch')
const { createBuildHelpers } = require('./src/building/builder')
const { createNetherHelpers } = require('./src/dimensions/nether')
const { createChestHelpers } = require('./src/inventory/chests')
const { blockLabel, floorVec, isValidPos } = require('./src/navigation/positions')
const { createFollowHelpers } = require('./src/navigation/follow')
const { createExplorationHelpers } = require('./src/navigation/exploration')
const { createDefaultMovements } = require('./src/navigation/movements')
const { createDoorHelpers } = require('./src/navigation/doors')
const { createPortalHelpers } = require('./src/navigation/portals')
const { createOxygenSafety } = require('./src/survival/oxygen')
const { createDangerHelpers } = require('./src/survival/danger')
const { createFoodHelpers } = require('./src/survival/food')
const { createSleepHelpers } = require('./src/survival/sleep')
const { createToolHelpers } = require('./src/survival/tools')
const {
  BED_BLOCK_NAMES,
  FOOD_NAMES,
  FOOD_PRIORITY,
  FUEL_VALUES,
  HAZARD_BLOCK_NAMES,
  HOSTILE_ENTITIES,
  HUNT_TARGETS,
  NEUTRAL_ENTITIES,
  RAW_TO_COOKED,
  SWORD_MATERIAL_ITEMS,
  SWORD_PRIORITY,
  UNFIGHTABLE_ENTITIES,
  VILLAGE_HINT_BLOCKS
} = require('./src/data/constants')
const {
  RESOURCE_TARGETS,
  resourceTargetByKey
} = require('./src/data/resources')
const {
  explorationOffset,
  isAncientDebrisTarget,
  isDiamondTarget,
  isStripMiningTarget,
  isWoodTarget,
  miningStrategyFor
} = require('./src/mining/strategy')
const {
  loadMemory: readMemory,
  saveMemory: writeMemory
} = require('./src/memory/memory')
const {
  createProtectedZones,
  protectedZoneReason: findProtectedZoneReason
} = require('./src/navigation/protection')

const CONFIG = loadConfig()
let botConnected = false
let startupAnnounced = false

const bot = mineflayer.createBot({
  host: CONFIG.host,
  port: CONFIG.port,
  username: CONFIG.username,
  auth: CONFIG.auth,
  version: CONFIG.version
})

bot.on('error', handleBotError)
bot.on('end', handleBotEnd)
bot.on('kicked', handleBotKicked)

bot.loadPlugin(pathfinder)
bot.loadPlugin(toolPlugin)

let mcData
let defaultMove
let basePos = null
let baseContainerPos = null
let farmZones = { animals: null, sugarcane: null }
let farmContainerPos = { animals: null, sugarcane: null }
let farmDoorPos = { animals: null, sugarcane: null }
let netherPortals = { overworld: null, nether: null }
let buildSite = null
let missionActive = false
let commandRunning = false
let safetyRunning = false
let combatRunning = false
let autoSleepRunning = false
let autoFarmRunning = false
let stopRequested = false
let currentMission = null
let defendMode = true
let farmNoDigActive = false
let farmProtectionActive = false
let followTargetUsername = null
let lastBasePathFailureAt = 0
let automationState = { lastAnimalFarmDay: null, nextAnimalFarmDay: null }
let farmDoorIssues = []
let lastFarmDepositOpened = false
let lastFarmDepositedCount = 0
let woodNoAxeWarned = false
let lastCreativeWarningAt = 0

const chatCooldowns = new Map()
const lavaRiskLogAt = new Map()
let originalDig = null
let originalPlaceBlock = null
let farmProtectionGuardInstalled = false
const missionText = createMissionText({ resourceTargetByKey })
const commandHandler = createCommandHandler()
const auth = createAuth(CONFIG)

const runtimeMemory = createRuntimeMemory({
  getAutomationState: () => automationState, getBaseContainerPos: () => baseContainerPos, getBasePos: () => basePos,
  getBuildSite: () => buildSite, getCurrentMission: () => currentMission, getFarmContainerPos: () => farmContainerPos,
  getFarmDoorPos: () => farmDoorPos, getFarmZones: () => farmZones, getNetherPortals: () => netherPortals, logError, readMemory,
  setAutomationState: value => { automationState = value }, setBaseContainerPos: value => { baseContainerPos = value },
  setBasePos: value => { basePos = value }, setBuildSite: value => { buildSite = value },
  setCurrentMission: value => { currentMission = value }, setFarmContainerPos: value => { farmContainerPos = value },
  setFarmDoorPos: value => { farmDoorPos = value }, setFarmZones: value => { farmZones = value },
  setNetherPortals: value => { netherPortals = value || { overworld: null, nether: null } }, writeMemory
})

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function safeChat(message, cooldownMs = 0) {
  if (!botConnected) return
  const now = Date.now()
  const last = chatCooldowns.get(message) || 0
  if (cooldownMs > 0 && now - last < cooldownMs) return
  chatCooldowns.set(message, now)

  try {
    bot.chat(message)
  } catch {}
}

const oxygenSafety = createOxygenSafety({ bot, CONFIG, safeChat, logTag, sleep })

const foodHelpers = createFoodHelpers({
  bot,
  config: CONFIG,
  foodNames: FOOD_NAMES,
  foodPriority: FOOD_PRIORITY,
  logError,
  safeChat
})

const sleepHelpers = createSleepHelpers({
  bot, bedBlockNames: BED_BLOCK_NAMES, getBasePos: () => basePos, getMcData: () => mcData,
  goals, logError, logTag, safeChat, safeGoto, shortError
})

const doorHelpers = createDoorHelpers({
  bot,
  farmGoalNear,
  getBasePos: () => basePos,
  getFarmDoorPos: () => farmDoorPos,
  getMcData: () => mcData,
  goals,
  isValidPos,
  logError,
  safeChat,
  safeGoto,
  sleep
})

const portalHelpers = createPortalHelpers({
  bot,
  canBreakForPath,
  digTowardPosition,
  getNetherPortals: () => netherPortals,
  goals,
  isStopRequested: () => stopRequested,
  isValidPos,
  safeChat,
  safeGoto,
  saveMemory: runtimeMemory.saveMemory,
  setNetherPortals: value => { netherPortals = value || { overworld: null, nether: null } },
  sleep,
  travelToPosition
})

const followHelpers = createFollowHelpers({
  bot,
  getDefaultMove: () => defaultMove,
  getFollowTargetUsername: () => followTargetUsername,
  goals,
  isCommandRunning: () => commandRunning,
  isMissionActive: () => missionActive,
  isStopRequested: () => stopRequested,
  logError,
  safeChat,
  safeGoto,
  setFollowTargetUsername: value => { followTargetUsername = value },
  setStopRequested: value => { stopRequested = value }
})

const toolHelpers = createToolHelpers({
  bot,
  bestOwnedScore,
  isLogBlockName,
  logError,
  ownedItems,
  remainingDurability,
  swordPriority: SWORD_PRIORITY
})

const chestHelpers = createChestHelpers({
  bot,
  config: CONFIG,
  farmChestAccessPositions,
  farmGoalNear,
  food: foodHelpers,
  fuelValues: FUEL_VALUES,
  getBaseContainerPos: () => baseContainerPos,
  getBasePos: () => basePos,
  getFarmContainerPos: () => farmContainerPos,
  getFarmNoDigActive: () => farmNoDigActive,
  getLastFarmDepositedCount: () => lastFarmDepositedCount,
  goals,
  inventoryCount,
  isValidPos,
  logError,
  ownedItems,
  safeChat,
  safeGoBase,
  safeGoto,
  saveMemory: runtimeMemory.saveMemory,
  setBaseContainerPos: value => { baseContainerPos = value },
  setLastFarmDepositOpened: value => { lastFarmDepositOpened = value },
  addLastFarmDepositedCount: value => { lastFarmDepositedCount += value },
  shouldWithdrawUpgrade: toolHelpers.shouldWithdrawUpgrade,
  withTimeout
})

const missionRuntime = createMissionRuntime({
  bot,
  collectNearbyDrops,
  countItems,
  food: foodHelpers,
  getBasePos: () => basePos,
  getCurrentMission: () => currentMission,
  isNearBase,
  isMissionActive: () => missionActive,
  isStopRequested: () => stopRequested,
  logMission,
  missionText,
  resourceTargetByKey,
  safeChat,
  safeGoBase,
  saveMemory: runtimeMemory.saveMemory,
  setCurrentMission: value => { currentMission = value },
  setMissionActive: value => { missionActive = value },
  setStopRequested: value => { stopRequested = value },
  sleep,
  storeItems: chestHelpers.storeItems,
  takeLoadoutFromChest: chestHelpers.takeLoadoutFromChest
})

const dangerHelpers = createDangerHelpers({
  bot,
  chests: chestHelpers,
  collectNearbyDrops,
  config: CONFIG,
  ensureCombatGear,
  food: foodHelpers,
  getBasePos: () => basePos,
  getDefendMode: () => defendMode,
  getMcData: () => mcData,
  goals,
  hazardBlockNames: HAZARD_BLOCK_NAMES,
  hostileEntities: HOSTILE_ENTITIES,
  neutralEntities: NEUTRAL_ENTITIES,
  isCombatRunning: () => combatRunning,
  isSafetyRunning: () => safetyRunning,
  isStopRequested: () => stopRequested,
  logError,
  missionRuntime,
  oxygen: oxygenSafety,
  safeChat,
  safeGoBase,
  safeGoto,
  setCombatRunning: value => { combatRunning = value },
  setSafetyRunning: value => { safetyRunning = value },
  sleep,
  stabilizeHealthBeforeRetreat,
  tools: toolHelpers,
  unfightableEntities: UNFIGHTABLE_ENTITIES
})

const buildHelpers = createBuildHelpers({
  bot,
  chests: chestHelpers,
  collectNearbyDrops,
  config: CONFIG,
  countItems,
  craftItemByName,
  danger: dangerHelpers,
  ensureCraftingTable,
  ensureFarmFuel,
  ensureSticks,
  equipForBlock,
  explore,
  explorationOffset,
  findFuelItem,
  floorVec,
  fuelValues: FUEL_VALUES,
  getBasePos: () => basePos,
  getBlockIds,
  getBuildSite: () => buildSite,
  getDefaultMove: () => defaultMove,
  goals,
  inventoryCount,
  isFarmProtectionActive: () => farmProtectionActive,
  isProtectedBreakPosition,
  isStopRequested: () => stopRequested,
  listBlueprints,
  loadBlueprint,
  logError,
  mine,
  missingMaterials,
  openNearestFurnace,
  protectedZoneReason,
  resourceTargetByKey,
  safeChat,
  safeGoBase,
  safeGoto,
  saveMemory: runtimeMemory.saveMemory,
  setBuildSite: value => { buildSite = value },
  sleep,
  summarizeMissing,
  travelToPosition,
  waitForCookedOutput,
  withdrawNamedItemsFromBase
})

const netherHelpers = createNetherHelpers({
  collectNearbyDrops,
  config: CONFIG,
  danger: dangerHelpers,
  explore,
  isStopRequested: () => stopRequested,
  portals: portalHelpers,
  prepareMission,
  resourceTargetByKey,
  safeChat,
  safeGoBase,
  setMissionActive: value => { missionActive = value },
  setStopRequested: value => { stopRequested = value },
  sleep,
  storeItems: chestHelpers.storeItems
})

const runExclusive = createRunExclusive({
  bot,
  getCurrentMission: () => currentMission,
  isCommandRunning: () => commandRunning,
  isMissionActive: () => missionActive,
  isMissionRunning: missionRuntime.isMissionRunning,
  logError,
  safeChat,
  saveMission: missionRuntime.saveMission,
  setCommandRunning: value => { commandRunning = value },
  setMissionActive: value => { missionActive = value },
  setStopRequested: value => { stopRequested = value }
})

const automationHelpers = createAutomationHelpers({
  bot,
  config: CONFIG,
  farmAnimals,
  getAutomationState: () => automationState,
  getBasePos: () => basePos,
  getCurrentMission: () => currentMission,
  getFarmZones: () => farmZones,
  isAutoFarmRunning: () => autoFarmRunning,
  isAutoSleepRunning: () => autoSleepRunning,
  isCommandRunning: () => commandRunning,
  isFarmNoDigActive: () => farmNoDigActive,
  isMissionActive: () => missionActive,
  isNearBase,
  isStopRequested: () => stopRequested,
  logError,
  logTag,
  runExclusive,
  safeChat,
  safeGoBase,
  saveMemory: runtimeMemory.saveMemory,
  setAutoFarmRunning: value => { autoFarmRunning = value },
  setAutoSleepRunning: value => { autoSleepRunning = value },
  sleepInNearestBed: sleepHelpers.sleepInNearestBed
})

const explorationHelpers = createExplorationHelpers({
  config: CONFIG,
  ensureSurvival: (opts) => dangerHelpers.ensureSurvival(opts),
  getBasePos: () => basePos,
  goals,
  isStopRequested: () => stopRequested,
  safeChat,
  safeGoBase,
  safeGoto
})

function logError(label, err) {
  console.log(label, err && err.stack ? err.stack : err)
}

function isNetworkDisconnect(err) {
  const code = err && err.code
  const message = String(err && (err.message || err))
  return code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || message.includes('ECONNRESET')
}

function logConnectionProblem(label, err) {
  const code = err && err.code ? ` ${err.code}` : ''
  const message = err && err.message ? err.message : String(err || 'connexion fermee')
  console.log(`[connection] ${label}${code}: ${message}`)
  console.log(`[connection] Verifie que le serveur est ouvert, que l'adresse/port sont bons, et que le pseudo ${CONFIG.username} n'est pas deja connecte.`)
}

function handleBotError(err) {
  if (isNetworkDisconnect(err)) {
    botConnected = false
    logConnectionProblem('bot error', err)
    return
  }
  logError('bot error', err)
}

function handleBotEnd(reason) {
  botConnected = false
  console.log(`[connection] bot deconnecte${reason ? `: ${reason}` : ''}`)
}

function handleBotKicked(reason) {
  botConnected = false
  console.log('kicked', reason)
}

function farmGoalNear(pos, range = 2, label = 'cible ferme') {
  if (!isValidPos(pos)) {
    logTag('farm', `[path] cible invalide ignorée ${label}`)
    return null
  }

  return new goals.GoalNear(pos.x, pos.y, pos.z, range)
}

function configureMovements() {
  defaultMove = createDefaultMovements({
    Movements, bot, hazardBlockNames: HAZARD_BLOCK_NAMES, hostileEntities: HOSTILE_ENTITIES, neutralEntities: NEUTRAL_ENTITIES, mcData
  })
  bot.pathfinder.thinkTimeout = CONFIG.pathThinkTimeout
  bot.pathfinder.setMovements(defaultMove)
}

function installFarmBlockProtectionGuard() {
  if (farmProtectionGuardInstalled) return

  if (typeof bot.dig === 'function') {
    originalDig = bot.dig.bind(bot)
    bot.dig = async (block, ...args) => {
      if (farmProtectionActive) {
        console.log(`[farm][protect] dig bloqué ${blockLabel(block)}`)
        return false
      }

      return originalDig(block, ...args)
    }
  }

  if (typeof bot.placeBlock === 'function') {
    originalPlaceBlock = bot.placeBlock.bind(bot)
    bot.placeBlock = async (block, ...args) => {
      if (farmProtectionActive) {
        console.log(`[farm][protect] place bloqué ${blockLabel(block)}`)
        throw new Error('placement bloc interdit pendant ferme animaux')
      }

      return originalPlaceBlock(block, ...args)
    }
  }

  if (bot.collectBlock && typeof bot.collectBlock.collect === 'function') {
    const originalCollect = bot.collectBlock.collect.bind(bot.collectBlock)
    bot.collectBlock.collect = async (...args) => {
      if (farmProtectionActive) {
        console.log('[farm][protect] dig bloqué collectBlock')
        return false
      }

      return originalCollect(...args)
    }
  }

  farmProtectionGuardInstalled = true
}

function logMission(message) {
  console.log(`[mission] ${new Date().toISOString()} ${message}`)
}

function logTag(tag, message) {
  console.log(`[${tag}] ${new Date().toISOString()} ${message}`)
}

function shortError(err) {
  if (!err) return 'raison inconnue'
  const message = err.message || String(err)
  return message.split('\n')[0].slice(0, 120)
}

function isNavigationCancel(err) {
  const message = err && (err.message || String(err))
  return Boolean(message && message.includes('GoalChanged'))
}

async function withTimeout(promise, timeoutMs, onTimeout) {
  let timeout
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => {
          if (onTimeout) onTimeout()
          reject(new Error('timeout'))
        }, timeoutMs)
      })
    ])
  } finally {
    clearTimeout(timeout)
  }
}

async function safeGoto(goal, label = 'destination', options = {}) {
  const attempts = options.attempts || 2
  const timeoutMs = options.timeoutMs || Math.max(CONFIG.pathThinkTimeout + 5000, 15000)
  const forceNoDig = farmNoDigActive === true || farmProtectionActive === true

  if (!goal) return false
  if (stopRequested && !options.ignoreStop) return false
  if (options.successCheck && options.successCheck()) return true

  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (stopRequested && !options.ignoreStop) return false

    const previousCanDig = defaultMove.canDig
    const previousCanOpenDoors = defaultMove.canOpenDoors
    const previousAllow1by1Towers = defaultMove.allow1by1towers
    const previousSafeToBreak = defaultMove.safeToBreak
    const previousLiquidCost = defaultMove.liquidCost
    const previousScaffoldingBlocks = Array.isArray(defaultMove.scafoldingBlocks)
      ? [...defaultMove.scafoldingBlocks]
      : null
    try {
      // Ouvre les portes proches avant d'essayer le chemin.
      // Ca aide quand le bot est colle a une porte ou spawn devant l'entree.
      if (options.canOpenDoors !== false) await doorHelpers.openNearbyDoors(5, { quiet: true })

      if (options.canDig === false || forceNoDig) defaultMove.canDig = false
      else defaultMove.safeToBreak = options.safeToBreak || canBreakForPath
      if (options.canPlace === false || forceNoDig) {
        console.log('[farm][path] placement bloc interdit')
        defaultMove.allow1by1towers = false
        if (Array.isArray(defaultMove.scafoldingBlocks)) defaultMove.scafoldingBlocks = []
      }
      if (options.avoidWater === true) defaultMove.liquidCost = Math.max(defaultMove.liquidCost || 0, 80)
      defaultMove.canOpenDoors = options.canOpenDoors !== false
      bot.pathfinder.setMovements(defaultMove)
      await withTimeout(
        bot.pathfinder.goto(goal),
        timeoutMs,
        () => {
          bot.pathfinder.setGoal(null)
          bot.clearControlStates()
        }
      )
      defaultMove.canDig = previousCanDig
      defaultMove.canOpenDoors = previousCanOpenDoors
      defaultMove.allow1by1towers = previousAllow1by1Towers
      defaultMove.safeToBreak = previousSafeToBreak
      defaultMove.liquidCost = previousLiquidCost
      if (previousScaffoldingBlocks) defaultMove.scafoldingBlocks = previousScaffoldingBlocks
      bot.pathfinder.setMovements(defaultMove)
      if (options.successCheck && !options.successCheck()) return false
      return true
    } catch (err) {
      defaultMove.canDig = previousCanDig
      defaultMove.canOpenDoors = previousCanOpenDoors
      defaultMove.allow1by1towers = previousAllow1by1Towers
      defaultMove.safeToBreak = previousSafeToBreak
      defaultMove.liquidCost = previousLiquidCost
      if (previousScaffoldingBlocks) defaultMove.scafoldingBlocks = previousScaffoldingBlocks
      bot.pathfinder.setMovements(defaultMove)

      if (options.successCheck && options.successCheck()) return true
      if (stopRequested && !options.ignoreStop) return false
      if (isNavigationCancel(err)) return false

      // Si le chemin bloque, tente d'ouvrir une porte proche puis retente.
      const openedDoor = options.canOpenDoors !== false
        ? await doorHelpers.openNearbyDoors(6, { quiet: true })
        : false
      if (openedDoor && attempt < attempts) {
        await sleep(250)
        continue
      }

      if (!options.quiet) logError(`path ${label} attempt ${attempt}`, err)
      bot.pathfinder.setGoal(null)
      bot.clearControlStates()

      if (attempt < attempts) await sleep(350 + attempt * 250)
      else if (!options.quiet) {
        const suffix = shortError(err)
        safeChat(`Navigation impossible vers ${label}: ${suffix}.`, 8000)
      }
    }
  }

  return false
}

async function stabilizeHealthBeforeRetreat() {
  const hostile = dangerHelpers.nearestHostile(CONFIG.hostileCriticalDistance + 1)
  if (hostile) return false

  if (foodHelpers.findBestFood() && bot.food < 20) {
    await foodHelpers.autoEat(true)
  }

  // Si la barre de faim est haute, Minecraft regenere la vie tout seul.
  // On attend un peu au lieu de rentrer instant a la base.
  if (bot.food >= 18 && bot.health > 0) {
    const startHealth = bot.health
    for (let i = 0; i < 10 && !stopRequested; i++) {
      await sleep(500)
      if (bot.health > CONFIG.healthReturnAt + 2) return true
      if (bot.health > startHealth + 1) return true
      const danger = dangerHelpers.nearestHostile(CONFIG.hostileCriticalDistance)
      if (danger) return false
    }
  }

  return bot.health > CONFIG.healthReturnAt
}

function baseTravelTargets() {
  if (!basePos) return []

  const targets = []
  const addTarget = pos => {
    if (!pos) return
    const vec = new Vec3(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z))
    if (!targets.some(existing => existing.distanceTo(vec) < 1)) targets.push(vec)
  }

  console.log('[base] recherche entree')
  const doorSearchPoints = [basePos, baseContainerPos].filter(Boolean)
  for (const point of doorSearchPoints) {
    for (const door of doorHelpers.doorsNearPoint(point, 16)) {
      console.log(`[base] porte candidate ${door.position.x} ${door.position.y} ${door.position.z}`)
      addTarget(door.position)
      for (const passTarget of doorHelpers.doorPassTargets(door, 'towards')) {
        addTarget(passTarget)
      }
    }
  }

  addTarget(basePos)

  const offsets = [
    [0, 0], [2, 0], [-2, 0], [0, 2], [0, -2],
    [3, 3], [3, -3], [-3, 3], [-3, -3],
    [5, 0], [-5, 0], [0, 5], [0, -5]
  ]

  for (const [dx, dz] of offsets) {
    addTarget(basePos.offset(dx, 0, dz))
  }

  return targets
}

function isNearBase(range = 4) {
  if (!basePos) return false
  if (bot.entity.position.distanceTo(basePos) <= range) return true
  if (baseContainerPos && bot.entity.position.distanceTo(baseContainerPos) <= Math.max(range, 5)) return true
  return false
}

function isInsideBase(range = 5) {
  if (!basePos) return false
  return bot.entity.position.distanceTo(basePos) <= range
}

function rotatedVector(dx, dz, radians) {
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return {
    x: dx * cos - dz * sin,
    z: dx * sin + dz * cos
  }
}

function horizontalDistance(a, b) {
  if (!isValidPos(a) || !isValidPos(b)) return Infinity
  const dx = a.x - b.x
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dz * dz)
}

function distanceToBase() {
  if (!basePos) return Infinity
  return bot.entity.position.distanceTo(basePos)
}

function horizontalDistanceToBase() {
  if (!basePos) return Infinity
  return horizontalDistance(bot.entity.position, basePos)
}

function baseReturnSurfaceY() {
  if (!basePos) return 62
  return Math.max(48, Math.min(Math.floor(basePos.y) - 3, 64))
}

function hasOpenAirAboveForReturn(height = 12) {
  const origin = floorVec(bot.entity.position)
  let blocked = 0

  for (let dy = 2; dy <= height; dy++) {
    const block = bot.blockAt(origin.offset(0, dy, 0))
    if (!block) continue
    if (!isAirLike(block) && !isWaterLikeBlock(block)) blocked++
    if (blocked > 1) return false
  }

  return true
}

function needsBaseReturnClimb() {
  if (!basePos) return false
  const currentY = Math.floor(bot.entity.position.y)
  const surfaceY = baseReturnSurfaceY()
  if (currentY >= surfaceY) return false
  if (currentY >= surfaceY - 8 && hasOpenAirAboveForReturn(10)) return false
  if (currentY > 45 && hasOpenAirAboveForReturn(14)) return false
  return currentY < surfaceY
}

function shouldUseLongRangeBaseReturn() {
  return horizontalDistanceToBase() > 64 || needsBaseReturnClimb()
}

function goalNearXZOrNear(pos, range = 6) {
  return goals.GoalNearXZ
    ? new goals.GoalNearXZ(pos.x, pos.z, range)
    : new goals.GoalNear(pos.x, pos.y, pos.z, range)
}

function baseReturnDirectionVector() {
  if (!basePos) return miningDirectionVector()
  const current = bot.entity.position
  const dx = basePos.x - current.x
  const dz = basePos.z - current.z

  if (Math.abs(dx) > Math.abs(dz)) {
    return { x: dx > 0 ? 1 : -1, z: 0 }
  }

  if (Math.abs(dz) > 0.2) return { x: 0, z: dz > 0 ? 1 : -1 }
  return miningDirectionVector()
}

async function climbTowardSurfaceForBaseReturn(options = {}) {
  if (!basePos) return false
  if (!needsBaseReturnClimb()) return true

  const ignoreStop = options.ignoreStop === true
  const targetY = baseReturnSurfaceY()
  const startY = Math.floor(bot.entity.position.y)
  const maxSteps = Math.min(140, Math.max(32, targetY - startY + 18))
  let blockedRounds = 0

  console.log(`[base-return] underground y=${startY} targetY=${targetY}`)

  for (let step = 0; step < maxSteps && (ignoreStop || !stopRequested); step++) {
    const currentY = Math.floor(bot.entity.position.y)
    if (currentY >= targetY) {
      console.log(`[base-return] surface-ready y=${currentY}`)
      return true
    }

    const primary = baseReturnDirectionVector()
    let moved = false
    for (const direction of alternateDirections(primary)) {
      moved = await digStairStepUp(direction, 'retour base montee')
      if (moved) break
    }

    if (!moved) {
      blockedRounds++
      console.log('[base-return] stair step failed, trying alternate')
      if (blockedRounds >= 8) return false
      await sleep(250)
    } else {
      blockedRounds = 0
      if (step % 12 === 0) {
        console.log(`[base-return] stair up step ${step + 1}/${maxSteps} y=${Math.floor(bot.entity.position.y)}`)
      }
      await collectNearbyDrops(4)
    }
  }

  return Math.floor(bot.entity.position.y) >= targetY
}

function baseReturnCheckpoint(stepDistance, angle = 0) {
  const current = bot.entity.position
  const distance = horizontalDistance(current, basePos)
  if (!Number.isFinite(distance) || distance < 1) return floorVec(current)

  const dx = (basePos.x - current.x) / distance
  const dz = (basePos.z - current.z) / distance
  const dir = rotatedVector(dx, dz, angle)

  return new Vec3(
    Math.floor(current.x + dir.x * stepDistance),
    Math.floor(current.y),
    Math.floor(current.z + dir.z * stepDistance)
  )
}

async function safeGoBaseLongRange(options = {}) {
  if (!basePos) return false
  const ignoreStop = options.ignoreStop === true
  const initialDistance = Math.round(distanceToBase())

  if (!shouldUseLongRangeBaseReturn()) return true

  console.log(`[base-return] distance=${initialDistance} mode=long-range`)

  if (needsBaseReturnClimb()) {
    const climbed = await climbTowardSurfaceForBaseReturn({ ignoreStop })
    if (!climbed && horizontalDistanceToBase() > 70) {
      console.log('[base-return] underground climb failed')
      return false
    }
  }

  let checkpointIndex = 0
  let noProgress = 0
  const maxCheckpoints = Math.min(12, Math.max(3, Math.ceil(horizontalDistanceToBase() / 32) + 2))

  while (horizontalDistanceToBase() > 54 && checkpointIndex < maxCheckpoints && (ignoreStop || !stopRequested)) {
    checkpointIndex++
    const beforeBaseDistance = horizontalDistanceToBase()
    const stepDistance = Math.min(36, Math.max(24, beforeBaseDistance / 4))
    const angles = [0, Math.PI / 7, -Math.PI / 7, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2]
    let moved = false

    for (let i = 0; i < angles.length; i++) {
      const checkpoint = baseReturnCheckpoint(stepDistance, angles[i])
      const label = `checkpoint ${checkpointIndex}/${maxCheckpoints}`
      console.log(`[base-return] ${label} ${checkpoint.x} ${checkpoint.y} ${checkpoint.z}`)

      const reached = await safeGoto(goalNearXZOrNear(checkpoint, 7), 'base checkpoint', {
        attempts: 1,
        timeoutMs: 9000,
        canDig: false,
        canPlace: false,
        canOpenDoors: true,
        avoidWater: true,
        ignoreStop,
        quiet: true,
        successCheck: () => horizontalDistanceToBase() <= 54 ||
          horizontalDistance(bot.entity.position, checkpoint) <= 8 ||
          horizontalDistanceToBase() <= beforeBaseDistance - 10
      })

      const afterBaseDistance = horizontalDistanceToBase()
      if (reached || afterBaseDistance <= beforeBaseDistance - 8) {
        moved = true
        noProgress = 0
        break
      }

      console.log('[base-return] checkpoint failed, trying alternate')
      if (stopRequested && !ignoreStop) return false
    }

    if (!moved) {
      noProgress++
      if (needsBaseReturnClimb()) {
        const climbed = await climbTowardSurfaceForBaseReturn({ ignoreStop })
        if (climbed) continue
      }
      if (noProgress >= 2) return false
    }
  }

  if (horizontalDistanceToBase() <= 60 || isInsideBase(8)) {
    console.log(`[base-return] reached base radius=${Math.round(horizontalDistanceToBase())}`)
    return true
  }

  return false
}

async function travelToPosition(pos, label = 'destination', options = {}) {
  if (!pos) return false

  const finalRange = options.finalRange || 3
  const stepDistance = options.stepDistance || 24
  const maxSteps = options.maxSteps || 80
  const canDig = options.canDig !== false
  const quiet = options.quiet === true
  const ignoreStop = options.ignoreStop === true

  let lastDistance = Infinity
  let stuckSteps = 0

  for (let step = 0; step < maxSteps && (ignoreStop || !stopRequested); step++) {
    const current = bot.entity.position
    const distance = current.distanceTo(pos)

    if (distance <= finalRange) return true

    if (distance >= lastDistance - 1) stuckSteps++
    else stuckSteps = 0
    lastDistance = distance

    let dx = pos.x - current.x
    let dz = pos.z - current.z
    const horizontal = Math.sqrt(dx * dx + dz * dz)
    if (horizontal < 0.1) {
      dx = 1
      dz = 0
    } else {
      dx /= horizontal
      dz /= horizontal
    }

    const segment = Math.min(stepDistance, Math.max(6, distance - finalRange))
    const angleOffsets = stuckSteps > 1
      ? [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2, 0]
      : [0, Math.PI / 5, -Math.PI / 5]

    let moved = false
    const before = bot.entity.position.distanceTo(pos)

    for (const angle of angleOffsets) {
      const dir = rotatedVector(dx, dz, angle)
      const targetX = current.x + dir.x * segment
      const targetZ = current.z + dir.z * segment
      const targetY = current.y

      const segmentRange = Math.min(6, finalRange + 3)
      const segmentGoal = options.useExactY === true || !goals.GoalNearXZ
        ? new goals.GoalNear(targetX, targetY, targetZ, segmentRange)
        : new goals.GoalNearXZ(targetX, targetZ, segmentRange)

      const reached = await safeGoto(segmentGoal, label, {
        attempts: 1,
        timeoutMs: options.timeoutMs || 8000,
        canDig,
        safeToBreak: options.safeToBreak,
        quiet,
        successCheck: () => bot.entity.position.distanceTo(pos) <= finalRange || bot.entity.position.distanceTo(pos) <= before - 4
      })

      const after = bot.entity.position.distanceTo(pos)
      if (reached || after < before - 2) {
        moved = true
        break
      }

      if (stopRequested && !ignoreStop) return false
    }

    if (!moved) {
      logTag('path', `blocked ${label} distance=${Math.round(bot.entity.position.distanceTo(pos))}`)
      if (!quiet) safeChat(`Trajet bloque vers ${label}.`, 8000)
      return false
    }
  }

  return bot.entity.position.distanceTo(pos) <= finalRange
}

function findCraftingTable(maxDistance = 12) {
  const table = mcData && mcData.blocksByName.crafting_table
  if (!table) return null

  return bot.findBlock({
    matching: table.id,
    maxDistance
  })
}

async function craftItemByName(name, count, craftingTable = null) {
  const item = mcData.itemsByName[name]
  if (!item) return false

  const recipe = bot.recipesFor(item.id, null, 1, craftingTable)[0]
  if (!recipe) return false

  try {
    await bot.craft(recipe, count, craftingTable)
    return true
  } catch (err) {
    logError(`craft ${name} error`, err)
    return false
  }
}


const LOG_ITEM_NAMES = [
  'oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log',
  'mangrove_log', 'cherry_log', 'crimson_stem', 'warped_stem'
]
const PLANK_ITEM_NAMES = [
  'oak_planks', 'spruce_planks', 'birch_planks', 'jungle_planks', 'acacia_planks', 'dark_oak_planks',
  'mangrove_planks', 'cherry_planks', 'crimson_planks', 'warped_planks'
]
const LOG_TO_PLANKS = {
  oak_log: 'oak_planks',
  spruce_log: 'spruce_planks',
  birch_log: 'birch_planks',
  jungle_log: 'jungle_planks',
  acacia_log: 'acacia_planks',
  dark_oak_log: 'dark_oak_planks',
  mangrove_log: 'mangrove_planks',
  cherry_log: 'cherry_planks',
  crimson_stem: 'crimson_planks',
  warped_stem: 'warped_planks'
}

function inventoryCountAny(names) {
  const accepted = new Set(names)
  return bot.inventory.items()
    .filter(item => accepted.has(item.name))
    .reduce((total, item) => total + item.count, 0)
}

async function craftPlanksFromLogs(minPlanks = 4) {
  if (inventoryCountAny(PLANK_ITEM_NAMES) >= minPlanks) return true

  for (const [logName, plankName] of Object.entries(LOG_TO_PLANKS)) {
    if (inventoryCount(logName) <= 0) continue
    const before = inventoryCountAny(PLANK_ITEM_NAMES)
    await craftItemByName(plankName, 1, null)
    if (inventoryCountAny(PLANK_ITEM_NAMES) > before) return inventoryCountAny(PLANK_ITEM_NAMES) >= minPlanks
  }

  return inventoryCountAny(PLANK_ITEM_NAMES) >= minPlanks
}

async function gatherWoodLogs(minLogs = 2) {
  if (inventoryCountAny(LOG_ITEM_NAMES) >= minLogs) return true

  safeChat('Je cherche du bois pour fabriquer les outils.', 8000)

  const woodTarget = resourceTargetByKey('wood')
  if (!woodTarget) return false

  let failures = 0
  while (inventoryCountAny(LOG_ITEM_NAMES) < minLogs && failures < 8 && !stopRequested) {
    if (stopRequested) return false
    const block = findTargetBlock(woodTarget)
    if (!block) {
      failures++
      await explore(Math.min(CONFIG.exploreRadius, 18))
      continue
    }

    const reached = await safeGoto(
      new goals.GoalLookAtBlock(block.position, bot.world, { reach: 4.5 }),
      'bois',
      { attempts: 2, timeoutMs: 8000 }
    )
    if (!reached) {
      failures++
      continue
    }

    if (stopRequested) return false

    const freshBlock = bot.blockAt(block.position)
    if (!freshBlock || !woodTarget.blocks.includes(freshBlock.name)) {
      failures++
      continue
    }

    try {
      const axeReady = await equipAxeForWoodLog()
      if (!axeReady) {
        failures++
        continue
      }
      if (stopRequested) return false
      await bot.dig(freshBlock, true)
      await collectNearbyDrops(6)
      await sleep(250)
    } catch (err) {
      failures++
      logError('gather wood error', err)
    }
  }

  return inventoryCountAny(LOG_ITEM_NAMES) >= minLogs
}

async function ensureCraftingTable() {
  let table = findCraftingTable(8)
  if (table) return table

  if (inventoryCount('crafting_table') <= 0) {
    if (inventoryCountAny(PLANK_ITEM_NAMES) < 4) {
      if (inventoryCountAny(LOG_ITEM_NAMES) <= 0) await gatherWoodLogs(1)
      await craftPlanksFromLogs(4)
    }
    await craftItemByName('crafting_table', 1, null)
  }

  table = findCraftingTable(8)
  if (table) return table

  const tableItem = bot.inventory.items().find(item => item.name === 'crafting_table')
  if (!tableItem) return null

  try {
    await bot.equip(tableItem, 'hand')
    const offsets = [
      [1, -1, 0], [-1, -1, 0], [0, -1, 1], [0, -1, -1],
      [1, -1, 1], [-1, -1, -1], [1, -1, -1], [-1, -1, 1]
    ]

    for (const [dx, dy, dz] of offsets) {
      const reference = bot.blockAt(bot.entity.position.offset(dx, dy, dz))
      const above = bot.blockAt(bot.entity.position.offset(dx, dy + 1, dz))
      if (!reference || !above || above.name !== 'air') continue
      try {
        await bot.placeBlock(reference, new Vec3(0, 1, 0))
        await sleep(400)
        table = findCraftingTable(8)
        if (table) return table
      } catch {}
    }
  } catch (err) {
    logError('place crafting table error', err)
  }

  return findCraftingTable(8)
}

async function ensureWoodenPickaxe() {
  if (toolHelpers.findBestPickaxe(toolHelpers.pickaxeRank('wooden_pickaxe'))) {
    console.log('[tool] craft inutile evite')
    return true
  }

  if (inventoryCountAny(LOG_ITEM_NAMES) <= 0 && inventoryCountAny(PLANK_ITEM_NAMES) < 3) {
    await gatherWoodLogs(1)
  }
  await craftPlanksFromLogs(4)
  await ensureSticks(2)

  const table = await ensureCraftingTable()
  if (!table) {
    safeChat("Je n'arrive pas a poser/trouver une table de craft pour faire une pioche.", 8000)
    return false
  }

  const crafted = await craftItemByName('wooden_pickaxe', 1, table)
  if (crafted) safeChat('Pioche en bois fabriquee.', 8000)
  return crafted || ownedItems().some(item => item.name === 'wooden_pickaxe')
}

async function gatherCobblestoneForPickaxe(minCobble = 3) {
  if (inventoryCount('cobblestone') >= minCobble) return true
  if (!await ensureWoodenPickaxe()) return false

  const stoneTarget = resourceTargetByKey('cobblestone')
  let failures = 0
  while (inventoryCount('cobblestone') < minCobble && failures < 10 && !stopRequested) {
    const block = findTargetBlock(stoneTarget)
    if (!block) {
      failures++
      await explore(Math.min(CONFIG.exploreRadius, 16))
      continue
    }

    const reached = await safeGoto(
      new goals.GoalLookAtBlock(block.position, bot.world, { reach: 4.5 }),
      'pierre pour pioche',
      { attempts: 2, timeoutMs: 8000 }
    )
    if (!reached) {
      failures++
      continue
    }

    const freshBlock = bot.blockAt(block.position)
    if (!freshBlock || !stoneTarget.blocks.includes(freshBlock.name)) {
      failures++
      continue
    }

    const hasTool = await equipForBlock(freshBlock)
    if (!hasTool) {
      failures++
      continue
    }

    try {
      await bot.dig(freshBlock, true)
      await collectNearbyDrops(6)
      await sleep(250)
    } catch (err) {
      failures++
      logError('gather cobblestone error', err)
    }
  }

  return inventoryCount('cobblestone') >= minCobble
}

async function ensureStonePickaxe() {
  console.log('[tool] outil requis: stone_pickaxe ou mieux')
  if (toolHelpers.findBestPickaxe(toolHelpers.pickaxeRank('stone_pickaxe'))) {
    console.log('[tool] craft inutile evite')
    return true
  }

  await ensureWoodenPickaxe()
  await gatherCobblestoneForPickaxe(3)
  await ensureSticks(2)

  const table = await ensureCraftingTable()
  if (!table) return false

  const crafted = await craftItemByName('stone_pickaxe', 1, table)
  if (crafted) safeChat('Pioche en pierre fabriquee.', 8000)
  return crafted || ownedItems().some(item => item.name === 'stone_pickaxe')
}

function requiresIronPickaxe(block) {
  if (!block || !block.name) return false
  return (
    block.name.includes('diamond_ore') ||
    block.name.includes('gold_ore') ||
    block.name.includes('redstone_ore') ||
    block.name.includes('emerald_ore')
  )
}

function requiresDiamondPickaxe(block) {
  return Boolean(block && block.name === 'ancient_debris')
}

async function ensureDiamondPickaxeForAncientDebris() {
  const requiredRank = toolHelpers.pickaxeRank('diamond_pickaxe')
  console.log('[tool] outil requis: diamond_pickaxe ou netherite_pickaxe')
  if (toolHelpers.findBestPickaxe(requiredRank)) {
    console.log('[tool] craft inutile evite')
    return true
  }

  if (basePos) {
    const reachedBase = await safeGoBase({ force: true, quiet: true, ignoreStop: true })
    if (reachedBase) {
      await withdrawNamedItemsFromBase(['diamond_pickaxe', 'netherite_pickaxe'], 1)
      if (toolHelpers.findBestPickaxe(requiredRank)) {
        console.log('[tool] craft inutile evite')
        return true
      }
    }
  }

  safeChat("Ancient debris: il faut une pioche diamant ou netherite. Je ne risque pas de casser le bloc avec une mauvaise pioche.", 10000)
  return false
}

async function ensureIronPickaxe() {
  const requiredRank = toolHelpers.pickaxeRank('iron_pickaxe')
  console.log('[tool] outil requis: iron_pickaxe ou mieux')
  if (toolHelpers.findBestPickaxe(requiredRank)) {
    console.log('[tool] craft inutile evite')
    return true
  }

  safeChat('Pioche en fer requise, je cherche une pioche ou du fer.', 9000)

  if (basePos) {
    const reachedBase = await safeGoBase({ force: true, quiet: true, ignoreStop: true })
    if (reachedBase) {
      await withdrawNamedItemsFromBase(['iron_pickaxe'], 1)
      if (toolHelpers.findBestPickaxe(requiredRank)) {
        console.log('[tool] craft inutile evite')
        return true
      }
      await withdrawNamedItemsFromBase(['iron_ingot', 'raw_iron', 'iron_ore', 'deepslate_iron_ore', 'stick'], 8)
    }
  }

  // Try each iron source in order until we have enough ingots.
  for (const ironSource of ['raw_iron', 'iron_ore', 'deepslate_iron_ore']) {
    if (inventoryCount('iron_ingot') >= 3) break
    if (inventoryCount(ironSource) >= 3) {
      await buildHelpers.smeltItem(ironSource, 'iron_ingot', 3, 'base')
    }
  }

  if (inventoryCount('iron_ingot') < 3) {
    safeChat('Impossible de fabriquer une pioche en fer: il manque 3 lingots de fer.', 9000)
    return false
  }

  await ensureSticks(2)
  const table = await ensureCraftingTable()
  if (!table) {
    safeChat('Impossible de fabriquer une pioche en fer: pas de table de craft accessible.', 9000)
    return false
  }

  const crafted = await craftItemByName('iron_pickaxe', 1, table)
  if (crafted) safeChat('Pioche en fer fabriquee.', 8000)
  return crafted || Boolean(toolHelpers.findBestPickaxe(requiredRank))
}

async function ensureToolForBlock(block) {
  if (!toolHelpers.blockNeedsPickaxe(block)) {
    const preferredTool = toolHelpers.preferredToolPartForBlock(block)
    if (preferredTool) await toolHelpers.equipBestToolByNamePart(preferredTool)
    return true
  }

  const requiredRank = requiresDiamondPickaxe(block)
    ? toolHelpers.pickaxeRank('diamond_pickaxe')
    : (requiresIronPickaxe(block) ? toolHelpers.pickaxeRank('iron_pickaxe') : toolHelpers.pickaxeRank('wooden_pickaxe'))
  console.log(`[tool] outil requis: ${requiresDiamondPickaxe(block) ? 'diamond_pickaxe ou netherite_pickaxe' : (requiresIronPickaxe(block) ? 'iron_pickaxe ou mieux' : 'pickaxe')}`)

  if (await toolHelpers.equipPickaxe(requiredRank)) {
    console.log('[tool] craft inutile evite')
    return true
  }

  safeChat("Il me manque une pioche utilisable, je tente d'en fabriquer une.", 8000)

  if (basePos) {
    const reachedBase = await safeGoBase({ force: true, quiet: true, ignoreStop: true })
    if (reachedBase) await chestHelpers.takeLoadoutFromChest()
  }

  if (await toolHelpers.equipPickaxe(requiredRank)) {
    console.log('[tool] craft inutile evite')
    return true
  }
  if (await equipForBlock(block)) return true

  if (requiresDiamondPickaxe(block)) {
    return ensureDiamondPickaxeForAncientDebris()
  }

  if (requiresIronPickaxe(block)) {
    return ensureIronPickaxe()
  }

  if (block.name.includes('iron_ore') || block.name.includes('lapis_ore')) {
    return ensureStonePickaxe()
  }

  return ensureWoodenPickaxe()
}

async function ensureSticks(minCount = 1) {
  if (inventoryCount('stick') >= minCount) return true

  const missing = minCount - inventoryCount('stick')
  const crafts = Math.ceil(missing / 4)
  await craftItemByName('stick', crafts, null)

  return inventoryCount('stick') >= minCount
}

async function craftBestSword() {
  const craftingTable = findCraftingTable(12)
  if (!craftingTable) {
    safeChat('Pas de table de craft proche pour fabriquer une epee.', 8000)
    return false
  }

  await ensureSticks(1)

  for (const swordName of SWORD_PRIORITY) {
    const crafted = await craftItemByName(swordName, 1, craftingTable)
    if (crafted) {
      safeChat(`Epee fabriquee: ${swordName}.`)
      return true
    }
  }

  safeChat("Je n'ai pas les materiaux pour fabriquer une epee.", 8000)
  return false
}

async function ensureCombatGear(options = {}) {
  if (stopRequested) return false

  await toolHelpers.equipArmor()
  if (stopRequested) return false
  await toolHelpers.equipShield()
  if (stopRequested) return false

  if (toolHelpers.findBestSword()) {
    await toolHelpers.equipWeapon()
    return true
  }

  if (basePos && options.allowBaseTrip !== false) {
    safeChat('Je vais chercher ou fabriquer une epee.', 8000)
    await safeGoBase()
    if (stopRequested) return false
    await chestHelpers.takeLoadoutFromChest()
    if (stopRequested) return false
    await withdrawNamedItemsFromBase(['stick'], 4)
    await withdrawNamedItemsFromBase(SWORD_MATERIAL_ITEMS, 2)
    await toolHelpers.equipArmor()
    await toolHelpers.equipShield()
  }

  if (stopRequested) return false

  if (!toolHelpers.findBestSword() && options.allowCraft !== false) {
    await craftBestSword()
  }

  if (stopRequested) return false
  const equipped = await toolHelpers.equipWeapon()
  return equipped
}

function ownedItems() {
  const equipment = bot.entity && Array.isArray(bot.entity.equipment)
    ? bot.entity.equipment.filter(Boolean)
    : []

  return bot.inventory.items().concat(equipment)
}

function bestOwnedScore(namePart) {
  return ownedItems()
    .filter(item => item.name.includes(namePart))
    .reduce((best, item) => Math.max(best, toolHelpers.materialScore(item.name)), 0)
}

function inventoryCount(itemName) {
  return bot.inventory.items()
    .filter(item => item.name === itemName)
    .reduce((total, item) => total + item.count, 0)
}

function currentGameMode() {
  if (!bot.game) return null
  return bot.game.gameMode ?? bot.game.gamemode ?? bot.game.gameModeName ?? null
}

function isCreativeGameMode() {
  const gameMode = currentGameMode()
  if (gameMode === null || gameMode === undefined) return false
  const normalized = String(gameMode).toLowerCase()
  return normalized === 'creative' || normalized === '1'
}

function warnIfCreativeGameMode() {
  if (!isCreativeGameMode()) return false
  const now = Date.now()
  if (now - lastCreativeWarningAt > 60000) {
    lastCreativeWarningAt = now
    safeChat('⚠️ Le bot est en créatif. Mets-le en survie pour tester correctement.', 15000)
    logTag('survival', `warning creative gamemode (${currentGameMode()})`)
  }
  return true
}

async function equipAxeForWoodLog() {
  const axeAvailable = bot.inventory.items().some(item => item.name.includes('axe') && remainingDurability(item) > 3)
  const equipped = await toolHelpers.equipBestToolByNamePart('axe')
  if (equipped && bot.heldItem && bot.heldItem.name.includes('axe')) return true

  if (axeAvailable) {
    logTag('wood', 'hache disponible mais equip impossible, log ignore')
    return false
  }

  if (!woodNoAxeWarned) {
    woodNoAxeWarned = true
    safeChat('⚠️ Aucune hache disponible, collecte ralentie.', 15000)
  }

  if (bot.heldItem) {
    try {
      await bot.unequip('hand')
    } catch {}
  }

  return true
}

async function safeGoBase(options = {}) {
  warnIfCreativeGameMode()
  const ignoreStop = options.ignoreStop === true
  if (stopRequested && !ignoreStop) return false

  if (!basePos) {
    safeChat("Base non définie. Place-moi à la base puis dis setbase.", 5000)
    return false
  }

  if (portalHelpers.isNether()) {
    console.log('[portal] retour base depuis nether')
    const returned = await portalHelpers.ensureOverworld()
    if (!returned) {
      safeChat("Je suis dans le Nether et je n'arrive pas a reprendre le portail vers la base.", 9000)
      return false
    }
  }

  if (isInsideBase(4)) {
    console.log('[base] interieur atteint')
    return true
  }
  if (baseContainerPos && bot.entity.position.distanceTo(baseContainerPos) <= 5 && !isInsideBase(8)) {
    console.log('[base] coffre derriere mur ignore')
  }

  if (options.force) lastBasePathFailureAt = 0

  if (!options.force && Date.now() - lastBasePathFailureAt < 15000) {
    if (!options.quiet) safeChat('Base temporairement inaccessible, je reessaierai dans quelques secondes.', 8000)
    return false
  }

  console.log(options.force ? '[base] retour force' : '[base] retour')
  await doorHelpers.openNearbyDoors(6, { quiet: true })

  if (shouldUseLongRangeBaseReturn()) {
    const longRangeReady = await safeGoBaseLongRange({ ignoreStop })
    if (isInsideBase(8)) {
      console.log('[base] interieur atteint')
      lastBasePathFailureAt = 0
      return true
    }

    if (!longRangeReady && horizontalDistanceToBase() > 70) {
      lastBasePathFailureAt = Date.now()
      console.log(`[base-return] base inaccessible after long-range plans distance=${Math.round(distanceToBase())}`)
      if (!options.quiet) {
        safeChat("Base inaccessible. Je n'ai pas trouve de retour progressif fiable.", 9000)
      }
      return false
    }
  }

  const targets = baseTravelTargets()
  const plans = [
    { canDig: false, label: 'chemin normal' },
    { canDig: false, label: 'chemin portes' }
  ]

  for (const plan of plans) {
    if (plan.canDig === false && plan.label === 'chemin force') continue

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i]
      const reached = await travelToPosition(target, i === 0 ? 'coffre/base' : 'base', {
        finalRange: i === 0 && baseContainerPos ? 4 : 4,
        stepDistance: plan.canDig ? 14 : 18,
        maxSteps: plan.canDig ? 220 : 170,
        timeoutMs: plan.canDig ? 11000 : 9000,
        canDig: plan.canDig,
        ignoreStop,
        quiet: true
      })

      await doorHelpers.openNearbyDoors(6, { quiet: true })

      if (reached && isInsideBase(7)) {
        console.log('[base] interieur atteint')
        lastBasePathFailureAt = 0
        return true
      }
    }
  }

  // Derniere chance: objectif direct proche de la base. Utile si le pathfinder a du mal avec une porte.
  const directReached = await safeGoto(new goals.GoalNear(basePos.x, basePos.y, basePos.z, 6), 'base directe', {
    attempts: 5,
    timeoutMs: 12000,
    canDig: false,
    ignoreStop,
    quiet: true,
    successCheck: () => isInsideBase(8)
  })

  if ((directReached && isInsideBase(8)) || isInsideBase(8)) {
    await doorHelpers.openNearbyDoors(6, { quiet: true })
    console.log('[base] interieur atteint')
    lastBasePathFailureAt = 0
    return true
  }

  lastBasePathFailureAt = Date.now()
  console.log(`[base] base inaccessible apres ${targets.length + 1} essais`)
  if (!options.quiet) {
    safeChat("Base inaccessible. Si ta base est fermee, ouvre une entree ou refais setbase devant l'entree/coffre.", 9000)
  }
  return false
}

async function returnBase(options = {}) {
  const stopMission = options.stopMission !== false
  const deposit = options.deposit !== false

  if (stopMission) missionActive = false
  // Une commande manuelle "retour base" doit toujours reprendre la main, meme apres stop/pause.
  stopRequested = false
  bot.pathfinder.setGoal(null)
  bot.clearControlStates()

  safeChat('🏠 Retour à la base.')
  const arrived = await safeGoBase({ force: true, ignoreStop: true, quiet: true })
  if (!arrived) {
    safeChat('⚠️ Base inaccessible.')
    return false
  }

  if (deposit) {
    const stored = await chestHelpers.storeItems({ baseOnly: true, details: true, quiet: true })
    if (!stored.ok && stored.depositedCount === 0 && stored.startingCount > 0) {
      console.log('[base] coffre inaccessible ou depot impossible pendant retour base')
    }
  }

  safeChat('🏠 Base atteinte.')
  return arrived
}

async function prepareMission(options = {}) {
  const visitBase = options.visitBase === true
  const missionType = options.missionType || null
  const quiet = options.quiet === true
  const withDetails = options.details === true
  const loadoutReport = { withdrawn: [], count: 0 }
  let loadoutTaken = false
  let needsBase = visitBase

  function finishPrepare(ok, reason = null) {
    if (!withDetails) return ok
    return {
      ok,
      reason,
      loadoutTaken,
      loadoutReport
    }
  }

  function mergeLoadoutResult(result) {
    if (!result || !result.ok) return
    loadoutTaken = true
    loadoutReport.count += result.count || 0
    for (const entry of result.withdrawn || []) {
      const existing = loadoutReport.withdrawn.find(item => item.name === entry.name)
      if (existing) existing.count += entry.count
      else loadoutReport.withdrawn.push({ name: entry.name, count: entry.count })
    }
  }

  async function takeBaseLoadout() {
    const result = await chestHelpers.takeLoadoutFromChest({ baseOnly: true, details: true })
    mergeLoadoutResult(result)
    return result
  }

  warnIfCreativeGameMode()

  if (!needsBase && basePos) {
    if (bot.food <= CONFIG.foodCriticalAt && foodHelpers.foodCount() === 0) needsBase = true
    if ((missionType === 'mine' || missionType === 'collect' || missionType === 'hunt') && foodHelpers.foodCount() < Math.min(4, CONFIG.foodCarry)) needsBase = true
    if (missionType === 'mine' && !toolHelpers.hasUsablePickaxe()) needsBase = true
    if (missionType === 'hunt' && !toolHelpers.hasUsableWeapon()) needsBase = true
  }

  if (!quiet) safeChat(needsBase ? 'Préparation mission à la base.' : 'Préparation locale.')

  if (needsBase && basePos) {
    const reached = await safeGoBase()
    if (!reached) {
      safeChat("Preparation impossible: je n'arrive pas a rejoindre la base.", 8000)
      stopRequested = true
      return finishPrepare(false, 'base_inaccessible')
    }
    await takeBaseLoadout()
  }

  await toolHelpers.equipArmor()

  if (bot.food < 20) {
    await foodHelpers.autoEat()
  }

  if (!foodHelpers.findBestFood() && basePos && needsBase) {
    await takeBaseLoadout()
  }

  if (missionType === 'mine' && !toolHelpers.hasUsablePickaxe()) {
    const target = options.target || null
    if (target && target.key === 'ancient_debris') {
      const ready = await ensureDiamondPickaxeForAncientDebris()
      if (!ready) {
        stopRequested = true
        return finishPrepare(false, 'outil_manquant')
      }
    } else if (target && target.key === 'diamond') {
      await ensureIronPickaxe()
    } else {
      await ensureStonePickaxe()
    }
    if (!toolHelpers.hasUsablePickaxe()) {
      safeChat("Attention: je n'ai pas encore de pioche utilisable. Je tenterai l'auto-craft pendant le minage.", 8000)
    }
  } else if (missionType === 'mine' && options.target && options.target.key === 'diamond' && !toolHelpers.hasPickaxeAtLeast(toolHelpers.pickaxeRank('iron_pickaxe'))) {
    await ensureIronPickaxe()
  } else if (missionType === 'mine' && options.target && options.target.key === 'ancient_debris' && !toolHelpers.hasPickaxeAtLeast(toolHelpers.pickaxeRank('diamond_pickaxe'))) {
    const ready = await ensureDiamondPickaxeForAncientDebris()
    if (!ready) {
      stopRequested = true
      return finishPrepare(false, 'outil_manquant')
    }
  }

  if (missionType === 'hunt' && !toolHelpers.hasUsableWeapon()) {
    safeChat("Attention: je n'ai pas d'arme. Je peux chasser, mais ce sera moins fiable.", 8000)
  }

  if (!quiet) safeChat('✅ Prêt.')
  return finishPrepare(true)
}

function countItems(names) {
  const accepted = new Set(names)
  return bot.inventory.items()
    .filter(item => accepted.has(item.name))
    .reduce((total, item) => total + item.count, 0)
}

function chatResourceLabel(target) {
  const labels = {
    ancient_debris: 'Ancient debris',
    coal: 'Charbon',
    cobblestone: 'Pierre',
    copper: 'Cuivre',
    diamond: 'Diamant',
    dirt: 'Terre',
    emerald: 'Émeraude',
    gold: 'Or',
    iron: 'Fer',
    lapis: 'Lapis',
    nether_gold: 'Or du Nether',
    netherrack: 'Netherrack',
    quartz: 'Quartz',
    redstone: 'Redstone',
    sand: 'Sable',
    wood: 'Bois'
  }
  return labels[target.key] || target.label || target.key
}

function isCollectionTarget(target) {
  return target && (target.kind === 'material' || target.key === 'wood' || target.key === 'cobblestone')
}

function isNetherTarget(target) {
  return Boolean(target && target.dimension === 'nether')
}

function resourceProgressIcon(target) {
  if (target.key === 'wood') return '🪓'
  if (target.key === 'cobblestone') return '🪨'
  if (target.key === 'sand') return '🏖️'
  if (target.key === 'dirt') return '🟫'
  if (target.key === 'netherrack') return '🔥'
  return '⛏️'
}

function reportResourceProgress(mission, target, options = {}) {
  if (!mission || !target) return
  const amount = Math.max(1, mission.amount || 1)
  const progress = Math.min(mission.progress || 0, amount)
  const bucket = progressBucket(progress, amount)
  if (!options.force && progress < amount && bucket === 0) return
  if (!options.force && bucket <= (mission.chatProgressBucket ?? -1) && progress < amount) return

  mission.chatProgressBucket = bucket
  safeChat(`${resourceProgressIcon(target)} ${chatResourceLabel(target)} : ${progress}/${amount} ${progressBar(progress, amount)} ${progressPercent(progress, amount)}%`)
}

function announceResourceMissionStart(target, amount) {
  const label = chatResourceLabel(target)
  if (target && target.dimension === 'nether') {
    safeChat(`🔥 Mission Nether acceptée : ${label} x${amount}.`)
    safeChat('Je passe par le portail, puis retour base après dépôt.')
    return
  }

  if (isCollectionTarget(target)) {
    safeChat('🌲 Collecte lancée.')
    safeChat(`🎯 Matériau cible : ${label} x${amount}.`)
    return
  }

  safeChat(`⛏️ Mission minage acceptée : ${label} x${amount}.`)
  safeChat('Départ vers la zone de minage...')
}

function announceResourceMissionComplete(mission, target) {
  const label = chatResourceLabel(target)
  const amount = Math.max(0, mission.amount || 0)
  const progress = Math.min(mission.progress || 0, amount)
  if (isCollectionTarget(target)) {
    safeChat('✅ Collecte terminée.')
    safeChat(`📦 ${label} récolté : ${progress}/${amount}.`)
  } else {
    safeChat('✅ Minage terminé.')
    safeChat(`📦 ${label} récupéré : ${progress}/${amount}.`)
  }
  safeChat('🏠 Retour à la base.')
}

function reportHuntProgress(mission, options = {}) {
  if (!mission) return
  const amount = Math.max(1, mission.amount || 1)
  const progress = Math.min(mission.progress || 0, amount)
  const bucket = progressBucket(progress, amount)
  if (!options.force && progress < amount && bucket === 0) return
  if (!options.force && bucket <= (mission.chatProgressBucket ?? -1) && progress < amount) return

  mission.chatProgressBucket = bucket
  safeChat(`🏹 Chasse : ${progress}/${amount} ${progressBar(progress, amount)} ${progressPercent(progress, amount)}%`)
}

function protectedZones() {
  const inNether = portalHelpers.isNether()
  return createProtectedZones({
    basePos: inNether ? null : basePos,
    farmZones: inNether ? {} : farmZones,
    buildSite: inNether ? null : buildSite,
    netherPortals
  }, CONFIG, farmKindLabel)
}

function protectedZoneReason(pos) {
  return findProtectedZoneReason(pos, protectedZones())
}

function isProtectedBreakPosition(pos) {
  return Boolean(protectedZoneReason(pos))
}

async function moveAwayFromBaseForMining() {
  if (!basePos) return true

  let distance = bot.entity.position.distanceTo(basePos)
  const targetDistance = CONFIG.mineStartDistanceFromBase
  const safeDistance = Math.max(CONFIG.baseProtectionRadius + 8, Math.min(targetDistance, 72))
  if (distance >= targetDistance) return true

  logTag('mine', `depart zone minage distance=${Math.round(distance)}/${targetDistance}`)

  // Priorite: si la base a une porte, le bot doit essayer de la passer seul
  // avant de chercher un point lointain au hasard.
  await doorHelpers.forceExitThroughNearestDoor()
  distance = bot.entity.position.distanceTo(basePos)
  if (distance >= CONFIG.baseProtectionRadius + 2) {
    logTag('mine', `hors base distance=${Math.round(distance)}`)
    return true
  }

  let current = bot.entity.position
  let dx = current.x - basePos.x
  let dz = current.z - basePos.z
  let length = Math.sqrt(dx * dx + dz * dz)

  if (length < 1) {
    dx = 1
    dz = 0
    length = 1
  }

  dx /= length
  dz /= length

  const angleOffsets = [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2]
  const stepDistance = 20
  let bestDistance = distance

  for (let step = 0; step < 4 && !stopRequested; step++) {
    distance = bot.entity.position.distanceTo(basePos)
    if (distance >= safeDistance) {
      logTag('mine', `distance base ok=${Math.round(distance)}`)
      return true
    }

    current = bot.entity.position
    let moved = false

    for (const angle of angleOffsets) {
      const dir = rotatedVector(dx, dz, angle)
      const targetX = current.x + dir.x * stepDistance
      const targetZ = current.z + dir.z * stepDistance
      const before = bot.entity.position.distanceTo(basePos)

      await doorHelpers.openNearbyDoors(7, { quiet: true })
      const exitGoal = goals.GoalNearXZ
        ? new goals.GoalNearXZ(targetX, targetZ, 7)
        : new goals.GoalNear(targetX, current.y, targetZ, 7)

      const reached = await safeGoto(exitGoal, 'sortie base', {
        attempts: 2,
        timeoutMs: 9000,
        canDig: false,
        quiet: true,
        successCheck: () => bot.entity.position.distanceTo(basePos) >= before + 6 || bot.entity.position.distanceTo(basePos) >= safeDistance
      })

      const after = bot.entity.position.distanceTo(basePos)
      bestDistance = Math.max(bestDistance, after)

      if (reached || after > before + 4) {
        moved = true
        dx = bot.entity.position.x - basePos.x
        dz = bot.entity.position.z - basePos.z
        length = Math.sqrt(dx * dx + dz * dz) || 1
        dx /= length
        dz /= length
        break
      }
    }

    if (!moved) {
      // Derniere tentative autonome: le bot ne bloque plus la mission juste parce qu'il n'a pas
      // reussi a atteindre la distance ideale. Il ouvre les portes/portillons proches et avance
      // vers l'exterieur avec un objectif X/Z, sans casser de blocs.
      await doorHelpers.openNearbyDoors(8, { quiet: true })
      const farX = basePos.x + dx * Math.max(safeDistance, CONFIG.baseProtectionRadius + 16)
      const farZ = basePos.z + dz * Math.max(safeDistance, CONFIG.baseProtectionRadius + 16)
      const escapeGoal = goals.GoalNearXZ
        ? new goals.GoalNearXZ(farX, farZ, 10)
        : new goals.GoalNear(farX, current.y, farZ, 10)
      await safeGoto(escapeGoal, 'sortie autonome base', {
        attempts: 3,
        timeoutMs: 12000,
        canDig: false,
        quiet: true,
        successCheck: () => bot.entity.position.distanceTo(basePos) >= CONFIG.baseProtectionRadius + 2
      })
      break
    }
  }

  distance = bot.entity.position.distanceTo(basePos)
  if (distance >= CONFIG.baseProtectionRadius + 2) {
    logTag('mine', `hors zone protegee distance=${Math.round(distance)}`)
    return true
  }

  // Avant, le bot mettait la mission en pause ici et demandait au joueur de l'accompagner.
  // Maintenant il continue quand meme: la protection de base empeche deja de casser les blocs
  // proches de la base, et le bot explorera pour trouver la ressource plus loin.
  logTag('mine', `distance ideale non atteinte, continuation prudente best=${Math.round(bestDistance)}`)
  return true
}

function getBlockIds(blockNames) {
  return blockNames
    .map(name => mcData.blocksByName[name])
    .filter(Boolean)
    .map(block => block.id)
}

function findTargetBlock(target, options = {}) {
  const ids = getBlockIds(target.blocks)
  if (ids.length === 0) return null

  const maxDistance = options.maxDistance || CONFIG.mineSearchRadius
  const positions = bot.findBlocks({
    matching: ids,
    maxDistance,
    count: options.count || 32
  })

  const candidates = positions
    .map(position => bot.blockAt(position))
    .filter(Boolean)
    .sort((a, b) => a.position.distanceTo(bot.entity.position) - b.position.distanceTo(bot.entity.position))

  for (const block of candidates) {
    const protectedReason = protectedZoneReason(block.position)
    if (protectedReason) {
      logTag('scan', `ignore ${block.name} zone protegee ${protectedReason}`)
      continue
    }

    try {
      if (defaultMove && typeof defaultMove.safeToBreak === 'function' && !defaultMove.safeToBreak(block)) {
        logTag('danger', `ignore ${block.name} unsafeToBreak ${block.position}`)
        continue
      }
    } catch {}

    return block
  }

  return null
}

function isLogBlockName(name) {
  return Boolean(name && (name.endsWith('_log') || name.endsWith('_wood') || name === 'mushroom_stem'))
}

function isLeafBlockName(name) {
  return Boolean(name && (name.endsWith('_leaves') || name === 'azalea_leaves' || name === 'flowering_azalea_leaves'))
}

function hasNearbyLeaves(pos, radius = 3) {
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = 0; dy <= radius; dy++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const block = bot.blockAt(pos.offset(dx, dy, dz))
        if (isLeafBlockName(block && block.name)) return true
      }
    }
  }

  return false
}

function woodProtectedReason(block) {
  const reason = protectedZoneReason(block.position)
  if (!reason) return null

  // V2: on protege toujours le coeur de base, mais on autorise les vrais arbres
  // naturels autour de la base pour que "collect bois" ne soit pas aveugle.
  if (
    reason === 'base' &&
    basePos &&
    block.position.distanceTo(basePos) > 14 &&
    hasNearbyLeaves(block.position)
  ) {
    return null
  }

  return reason
}

function canHarvest(block) {
  if (!block || typeof block.canHarvest !== 'function') return true

  // Les troncs peuvent etre casses a la main. Sans ca, la commande bois et l'auto-craft
  // d'une premiere pioche peuvent croire a tort qu'un outil est obligatoire.
  if (isLogBlockName(block.name)) return true
  if (!toolHelpers.blockNeedsPickaxe(block)) return true
  if (!bot.heldItem) return false

  try {
    return block.canHarvest(bot.heldItem.type)
  } catch {
    return true
  }
}

function isAirLike(block) {
  if (!block) return false
  if (block.name === 'water' || block.name === 'lava') return false
  return block.boundingBox === 'empty' || block.name === 'air' || block.name === 'cave_air' || block.name === 'void_air'
}

function isStableFloor(block) {
  if (!block) return false
  if (dangerHelpers.blockIsHazard(block)) return false
  if (block.name === 'water' || block.name === 'lava') return false
  return block.boundingBox === 'block'
}

function isWaterLikeBlock(block) {
  if (!block || !block.name) return false
  return block.name === 'water' || block.name.includes('kelp') || block.name.includes('seagrass')
}

function isLavaLikeBlock(block) {
  if (!block || !block.name) return false
  return block.name === 'lava' || block.name === 'flowing_lava' || block.name === 'fire' || block.name === 'soul_fire'
}

function lavaRiskNear(pos) {
  if (!isValidPos(pos)) return null

  const offsets = [
    [0, 1, 0],
    [0, 2, 0],
    [1, 0, 0],
    [-1, 0, 0],
    [0, 0, 1],
    [0, 0, -1],
    [1, 1, 0],
    [-1, 1, 0],
    [0, 1, 1],
    [0, 1, -1]
  ]

  for (const [dx, dy, dz] of offsets) {
    const block = bot.blockAt(pos.offset(dx, dy, dz))
    if (isLavaLikeBlock(block)) return block
  }

  return null
}

function isSafeToBreakWithoutLavaSurprise(block) {
  if (!block || !block.position) return false
  const risk = lavaRiskNear(block.position)
  if (!risk) return true

  const key = `${block.position.x},${block.position.y},${block.position.z}`
  const now = Date.now()
  if (!lavaRiskLogAt.has(key) || now - lavaRiskLogAt.get(key) > 15000) {
    lavaRiskLogAt.set(key, now)
    logTag('nether', `bloc ignore: lave proche ${block.name} ${block.position.x} ${block.position.y} ${block.position.z}`)
  }
  return false
}

function isSafeStandingColumn(pos) {
  if (!isValidPos(pos)) return false

  const floor = bot.blockAt(pos.offset(0, -1, 0))
  const feet = bot.blockAt(pos)
  const head = bot.blockAt(pos.offset(0, 1, 0))

  if (!isStableFloor(floor)) return false
  if (isLavaLikeBlock(feet) || isLavaLikeBlock(head)) return false
  if (lavaRiskNear(pos) || lavaRiskNear(pos.offset(0, 1, 0))) return false

  return true
}

function canBreakForPath(block) {
  if (!block || !block.name) return false
  if (!block.diggable) return false
  if (block.name === 'nether_portal' || block.name === 'obsidian' || block.name === 'crying_obsidian') return false
  if (block.name === 'bedrock' || block.name === 'end_portal_frame' || block.name === 'end_portal') return false
  if (dangerHelpers.blockIsHazard(block)) return false
  if (protectedZoneReason(block.position)) return false

  const above = bot.blockAt(block.position.offset(0, 1, 0))
  if (above && ['lava', 'water'].includes(above.name)) return false
  if (!isSafeToBreakWithoutLavaSurprise(block)) return false

  return true
}

function miningDirectionVector() {
  const current = bot.entity.position
  let dx = 0
  let dz = 1

  if (!portalHelpers.isNether() && basePos && current.distanceTo(basePos) < Math.max(CONFIG.baseProtectionRadius + 48, CONFIG.mineStartDistanceFromBase)) {
    dx = current.x - basePos.x
    dz = current.z - basePos.z
  } else {
    dx = -Math.sin(bot.entity.yaw || 0)
    dz = -Math.cos(bot.entity.yaw || 0)
  }

  if (Math.abs(dx) < 0.2 && Math.abs(dz) < 0.2) {
    dx = 1
    dz = 0
  }

  if (Math.abs(dx) > Math.abs(dz)) {
    return { x: dx > 0 ? 1 : -1, z: 0 }
  }

  return { x: 0, z: dz > 0 ? 1 : -1 }
}

function alternateDirections(primary) {
  return [
    primary,
    { x: -primary.x, z: -primary.z },
    { x: primary.z, z: primary.x },
    { x: -primary.z, z: -primary.x }
  ].filter((dir, index, dirs) =>
    dirs.findIndex(other => other.x === dir.x && other.z === dir.z) === index
  )
}

function sideDirections(direction) {
  return [
    { x: direction.z, z: -direction.x },
    { x: -direction.z, z: direction.x }
  ]
}

async function digSideProbe(direction, side, target) {
  const origin = floorVec(bot.entity.position)
  let revealed = false

  for (let depth = 1; depth <= 2 && !stopRequested; depth++) {
    const feetPos = origin.offset(side.x * depth, 0, side.z * depth)
    const headPos = origin.offset(side.x * depth, 1, side.z * depth)
    const feet = bot.blockAt(feetPos)
    const head = bot.blockAt(headPos)

    if (target && (target.blocks.includes(feet && feet.name) || target.blocks.includes(head && head.name))) {
      return true
    }

    if (head && !isAirLike(head) && !await digBlockSafely(head, `branche ${target.label}`)) return revealed
    if (feet && !isAirLike(feet) && !await digBlockSafely(feet, `branche ${target.label}`)) return revealed
    revealed = true

    const visible = findTargetBlock(target, { maxDistance: 8, count: 16 })
    if (visible) return true
  }

  return Boolean(findTargetBlock(target, { maxDistance: 8, count: 16 }))
}

async function digBlockSafely(block, label = 'bloc') {
  if (farmProtectionActive) {
    console.log(`[farm][protect] dig bloqué ${blockLabel(block)}`)
    return false
  }

  if (!block || isAirLike(block)) return true
  if (!canBreakForPath(block)) return false
  if (!block.diggable) return false
  if (dangerHelpers.blockIsHazard(block)) return false
  if (!isSafeToBreakWithoutLavaSurprise(block)) return false

  const protectedReason = protectedZoneReason(block.position)
  if (protectedReason) {
    logTag('danger', `dig refuse ${block.name} zone protegee ${protectedReason}`)
    return false
  }

  const hasTool = await ensureToolForBlock(block)
  if (!hasTool) return false

  if (!bot.canDigBlock(block)) {
    const reached = await safeGoto(
      new goals.GoalLookAtBlock(block.position, bot.world, { reach: 4.5 }),
      label,
      { attempts: 1, timeoutMs: 6000, canDig: true, safeToBreak: canBreakForPath, quiet: true }
    )
    if (!reached || !bot.canDigBlock(block)) return false
  }

  await bot.dig(block, true)
  await sleep(120)
  return true
}

async function moveIntoMinedStep(targetPos, label = 'pas mine') {
  if (!isValidPos(targetPos)) return false
  if (bot.entity.position.distanceTo(targetPos) <= 1.4) return true

  const reached = await safeGoto(new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 1), label, {
    attempts: 1,
    timeoutMs: 2500,
    canDig: false,
    quiet: true
  })
  if (reached || bot.entity.position.distanceTo(targetPos) <= 1.5) return true

  try {
    await bot.lookAt(targetPos.offset(0.5, 0.8, 0.5), true)
    bot.setControlState('forward', true)
    bot.setControlState('jump', true)

    for (let i = 0; i < 10; i++) {
      await sleep(120)
      if (bot.entity.position.distanceTo(targetPos) <= 1.5) break
    }
  } finally {
    bot.setControlState('forward', false)
    bot.setControlState('jump', false)
  }

  return bot.entity.position.distanceTo(targetPos) <= 1.8
}

async function digForwardTunnelStep(direction, label = 'tunnel') {
  const origin = floorVec(bot.entity.position)
  const feetPos = origin.offset(direction.x, 0, direction.z)
  const headPos = origin.offset(direction.x, 1, direction.z)
  const floor = bot.blockAt(feetPos.offset(0, -1, 0))

  if (!isStableFloor(floor)) {
    logTag('danger', `${label}: sol instable devant ${feetPos}`)
    return false
  }

  const feet = bot.blockAt(feetPos)
  const head = bot.blockAt(headPos)

  if (!await digBlockSafely(head, label)) return false
  if (!await digBlockSafely(feet, label)) return false

  return moveIntoMinedStep(feetPos, label)
}

async function digStairStepDown(direction) {
  const origin = floorVec(bot.entity.position)
  const feetPos = origin.offset(direction.x, -1, direction.z)
  const headPos = origin.offset(direction.x, 0, direction.z)
  const upperHeadPos = origin.offset(direction.x, 1, direction.z)
  const floorPos = origin.offset(direction.x, -2, direction.z)
  const floor = bot.blockAt(floorPos)

  if (!isStableFloor(floor)) {
    logTag('danger', `descente refusee: sol instable ${floorPos}`)
    return false
  }

  const head = bot.blockAt(headPos)
  const feet = bot.blockAt(feetPos)
  const upperHead = bot.blockAt(upperHeadPos)

  if (!await digBlockSafely(upperHead, 'descente mine')) return false
  if (!await digBlockSafely(head, 'descente mine')) return false
  if (!await digBlockSafely(feet, 'descente mine')) return false

  return moveIntoMinedStep(feetPos, 'descente mine')
}

async function digStairStepUp(direction, label = 'montee mine') {
  const origin = floorVec(bot.entity.position)
  const floorPos = origin.offset(direction.x, 0, direction.z)
  const feetPos = origin.offset(direction.x, 1, direction.z)
  const headPos = origin.offset(direction.x, 2, direction.z)
  const floor = bot.blockAt(floorPos)

  if (!isStableFloor(floor)) {
    logTag('danger', `${label}: marche instable ${floorPos}`)
    return false
  }

  const feet = bot.blockAt(feetPos)
  const head = bot.blockAt(headPos)

  if (!await digBlockSafely(head, label)) return false
  if (!await digBlockSafely(feet, label)) return false
  if (!isSafeStandingColumn(feetPos)) {
    logTag('danger', `${label}: passage refuse lave proche ${feetPos}`)
    return false
  }

  return moveIntoMinedStep(feetPos, label)
}

function directionToward(pos) {
  const current = bot.entity.position
  const dx = pos.x - current.x
  const dz = pos.z - current.z

  if (Math.abs(dx) > Math.abs(dz)) {
    return { x: dx > 0 ? 1 : -1, z: 0 }
  }

  if (Math.abs(dz) > 0.2) return { x: 0, z: dz > 0 ? 1 : -1 }
  return miningDirectionVector()
}

async function digTowardPosition(pos, label = 'tunnel', options = {}) {
  if (!isValidPos(pos)) return false

  const range = options.range || 3
  const maxSteps = options.maxSteps || 64
  const quiet = options.quiet === true
  let failedSteps = 0

  for (let step = 0; step < maxSteps && !stopRequested; step++) {
    const distance = bot.entity.position.distanceTo(pos)
    if (distance <= range) return true

    if (step % 4 === 0) {
      const reached = await safeGoto(new goals.GoalNear(pos.x, pos.y, pos.z, range), label, {
        attempts: 1,
        timeoutMs: 3500,
        canDig: true,
        canPlace: false,
        safeToBreak: canBreakForPath,
        quiet,
        successCheck: () => bot.entity.position.distanceTo(pos) <= range
      })
      if (reached) return true
    }

    const currentY = Math.floor(bot.entity.position.y)
    const targetY = Math.floor(pos.y)
    const primary = directionToward(pos)
    const directions = alternateDirections(primary)
    let moved = false

    for (const direction of directions) {
      if (targetY > currentY + 1) moved = await digStairStepUp(direction, label)
      else if (targetY < currentY - 1) moved = await digStairStepDown(direction)
      else moved = await digForwardTunnelStep(direction, label)

      if (moved) break
    }

    if (!moved) {
      failedSteps++
      if (!quiet) logTag('path', `${label} creusage bloque ${failedSteps}/${maxSteps} distance=${Math.round(distance)}`)
      if (failedSteps >= 6) return false
      await sleep(250)
    } else {
      failedSteps = 0
    }
  }

  return bot.entity.position.distanceTo(pos) <= range
}

async function relocateMiningStart(strategy) {
  const current = bot.entity.position
  const primary = miningDirectionVector()

  if (Math.floor(current.y) > 45) {
    const offset = explorationOffset(Math.floor(Math.random() * 8), Math.max(10, strategy.exploreStep || 12))
    return travelToPosition(current.offset(offset.x, 0, offset.z), 'nouveau depart mine', {
      finalRange: 4,
      stepDistance: 12,
      maxSteps: 8,
      timeoutMs: 7000,
      canDig: false,
      quiet: true
    })
  }

  for (const direction of alternateDirections(primary)) {
    let moved = false
    for (let i = 0; i < 4 && !stopRequested; i++) {
      moved = await digForwardTunnelStep(direction, 'reposition mine')
      if (!moved) break
    }
    if (moved) return true
  }

  return false
}

async function descendForMining(strategy) {
  if (typeof strategy.preferredY !== 'number') return true
  if (Math.floor(bot.entity.position.y) <= strategy.preferredY + 3) return true

  logTag('mine', `descend currentY=${Math.floor(bot.entity.position.y)} targetY=${strategy.preferredY}`)

  const primary = miningDirectionVector()
  let failedSteps = 0
  let relocations = 0

  for (let step = 0; step < 160 && !stopRequested; step++) {
    if (Math.floor(bot.entity.position.y) <= strategy.preferredY + 3) return true

    const safe = await dangerHelpers.ensureSurvival({ allowReturn: true })
    if (!safe) return false

    let moved = false
    for (const direction of alternateDirections(primary)) {
      moved = await digStairStepDown(direction)
      if (moved) break
    }

    if (!moved) {
      failedSteps++
      if (failedSteps >= 3) {
        relocations++
        logTag('mine', `descente bloquee, nouveau depart ${relocations}`)
        if (relocations > 8) return false
        const relocated = await relocateMiningStart(strategy)
        if (!relocated) return false
        failedSteps = 0
      }
    } else {
      failedSteps = 0
    }
  }

  return Math.floor(bot.entity.position.y) <= strategy.preferredY + 3
}

async function stripMineStep(target, strategy) {
  const direction = miningDirectionVector()
  const steps = isStripMiningTarget(target)
    ? Math.min(18, Math.max(10, Math.ceil((strategy.stripLength || 96) / 8)))
    : Math.min(8, Math.max(3, Math.ceil((strategy.stripLength || 24) / 8)))

  logTag('mine', `strip step target=${target.key} y=${Math.floor(bot.entity.position.y)} steps=${steps}`)

  for (let i = 0; i < steps && !stopRequested; i++) {
    const visible = findTargetBlock(target, { maxDistance: strategy.scanRadius, count: 48 })
    if (visible) return true

    const safe = await dangerHelpers.ensureSurvival({ allowReturn: true })
    if (!safe) return false

    const moved = await digForwardTunnelStep(direction, `strip ${target.label}`)
    if (!moved) return false

    if (isStripMiningTarget(target) && i % 3 === 1) {
      for (const side of sideDirections(direction)) {
        const found = await digSideProbe(direction, side, target)
        if (found) return true
      }
    }

    await collectNearbyDrops(4)
  }

  return Boolean(findTargetBlock(target, { maxDistance: strategy.scanRadius, count: 48 }))
}

async function netherResourceExploreStep(target, attempt, strategy) {
  const visible = findTargetBlock(target, { maxDistance: strategy.scanRadius, count: 48 })
  if (visible) return true

  const current = bot.entity.position
  const offset = explorationOffset(attempt, strategy.exploreStep)
  const targetX = current.x + offset.x
  const targetZ = current.z + offset.z
  const goal = goals.GoalNearXZ
    ? new goals.GoalNearXZ(targetX, targetZ, 5)
    : new goals.GoalNear(targetX, current.y, targetZ, 5)

  logTag('nether', `scan ${target.key} step=${attempt} -> ${Math.round(targetX)} ${Math.round(targetZ)}`)

  const reached = await safeGoto(goal, `scan nether ${target.label}`, {
    attempts: 1,
    timeoutMs: 7000,
    canDig: true,
    canPlace: false,
    safeToBreak: canBreakForPath,
    quiet: true,
    successCheck: () => Boolean(findTargetBlock(target, { maxDistance: Math.min(strategy.scanRadius, 48), count: 24 }))
  })

  if (reached || findTargetBlock(target, { maxDistance: Math.min(strategy.scanRadius, 48), count: 24 })) return true
  if (stopRequested) return false

  const directions = alternateDirections(miningDirectionVector())
  const direction = directions[attempt % directions.length]
  const tunnelSteps = strategy.mode === 'nether_material' ? 2 : 4

  for (let i = 0; i < tunnelSteps && !stopRequested; i++) {
    const safe = await dangerHelpers.ensureSurvival({ allowReturn: true })
    if (!safe) return false

    const moved = await digForwardTunnelStep(direction, `explore nether ${target.label}`)
    if (!moved) return false

    await collectNearbyDrops(4)
    if (findTargetBlock(target, { maxDistance: Math.min(strategy.scanRadius, 48), count: 24 })) return true
  }

  return false
}

async function exploreForResource(target, attempt, strategy) {
  logTag('scan', `no visible ${target.key}, cycle=${attempt}, mode=${strategy.mode}`)

  if (isStripMiningTarget(target)) {
    const descended = await descendForMining(strategy)
    if (!descended) return false
    return stripMineStep(target, strategy)
  }

  if (isNetherTarget(target) || strategy.dimension === 'nether') {
    return netherResourceExploreStep(target, attempt, strategy)
  }

  if (strategy.mode === 'short_tunnel' && bot.entity.position.y < 70) {
    return stripMineStep(target, strategy)
  }

  const current = bot.entity.position
  const offset = explorationOffset(attempt, strategy.exploreStep)
  const targetX = current.x + offset.x
  const targetZ = current.z + offset.z
  const goal = goals.GoalNearXZ
    ? new goals.GoalNearXZ(targetX, targetZ, 6)
    : new goals.GoalNear(targetX, current.y, targetZ, 6)

  logTag('chunk', `explore step for ${target.key} -> ${Math.round(targetX)} ${Math.round(targetZ)}`)

  const reached = await safeGoto(goal, `scan ${target.label}`, {
    attempts: 1,
    timeoutMs: isWoodTarget(target) ? 6500 : 8000,
    canDig: false,
    avoidWater: isWoodTarget(target),
    quiet: true,
    successCheck: () => Boolean(findTargetBlock(target, { maxDistance: Math.min(strategy.scanRadius, 48), count: 24 }))
  })

  if (reached) return true

  return explore(Math.min(CONFIG.exploreRadius, strategy.exploreStep + 6))
}

function isReachableWoodCandidate(block) {
  if (!block || !isLogBlockName(block.name)) return false
  if (woodProtectedReason(block)) return false

  const below = bot.blockAt(block.position.offset(0, -1, 0))
  if (!below || dangerHelpers.blockIsHazard(below)) return false

  const nearbyWalkable = [
    block.position.offset(1, 0, 0),
    block.position.offset(-1, 0, 0),
    block.position.offset(0, 0, 1),
    block.position.offset(0, 0, -1),
    block.position.offset(1, -1, 0),
    block.position.offset(-1, -1, 0),
    block.position.offset(0, -1, 1),
    block.position.offset(0, -1, -1)
  ].some(pos => {
    const feet = bot.blockAt(pos)
    const head = bot.blockAt(pos.offset(0, 1, 0))
    const floor = bot.blockAt(pos.offset(0, -1, 0))
    return doorHelpers.isWalkableBlock(feet) && doorHelpers.isWalkableBlock(head) && isStableFloor(floor)
  })

  return nearbyWalkable
}

function nearbyWaterPenalty(position, radius = 2) {
  let penalty = 0

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      for (const dy of [-1, 0]) {
        const block = bot.blockAt(position.offset(dx, dy, dz))
        if (isWaterLikeBlock(block)) penalty += 8
      }
    }
  }

  return penalty
}

function woodCandidateScore(block) {
  const botDistance = block.position.distanceTo(bot.entity.position)
  const baseDistance = basePos ? block.position.distanceTo(basePos) : 0
  const heightPenalty = Math.max(0, Math.abs(block.position.y - bot.entity.position.y) - 2) * 3
  const waterPenalty = nearbyWaterPenalty(block.position, 2)
  const farFromBasePenalty = basePos ? Math.max(0, baseDistance - Math.max(CONFIG.baseProtectionRadius + 48, 64)) : 0

  return botDistance + heightPenalty + waterPenalty + farFromBasePenalty
}

function findWoodCandidates(target, maxDistance) {
  const ids = getBlockIds(target.blocks)
  if (ids.length === 0) return []
  const seen = new Set()
  const candidates = []
  const searchPoints = [bot.entity.position]

  if (basePos && basePos.distanceTo(bot.entity.position) > 2) {
    searchPoints.push(basePos)
  }

  const radii = [16, 32, 48, 64].filter(radius => radius <= Math.max(16, maxDistance))
  if (radii.length === 0) radii.push(Math.min(16, maxDistance))

  for (const point of searchPoints) {
    for (const radius of radii) {
      const positions = bot.findBlocks({
        point,
        matching: ids,
        maxDistance: radius,
        count: 96
      })

      for (const position of positions) {
        const key = `${position.x},${position.y},${position.z}`
        if (seen.has(key)) continue
        seen.add(key)

        const block = bot.blockAt(position)
        if (block) candidates.push(block)
      }

      if (point === bot.entity.position && candidates.some(isReachableWoodCandidate)) break
    }
  }

  return candidates
    .filter(isReachableWoodCandidate)
    .sort((a, b) => {
      const distanceDiff = a.position.distanceTo(bot.entity.position) - b.position.distanceTo(bot.entity.position)
      if (Math.abs(distanceDiff) > 6) return distanceDiff
      return woodCandidateScore(a) - woodCandidateScore(b)
    })
}

async function findReachableWoodBlock(target, strategy) {
  const candidates = findWoodCandidates(target, strategy.scanRadius || CONFIG.mineSearchRadius).slice(0, 18)

  for (const block of candidates) {
    if (stopRequested) return null
    console.log(`[wood] arbre candidat ${block.name} ${block.position.x} ${block.position.y} ${block.position.z}`)
    const reached = await safeGoto(
      new goals.GoalLookAtBlock(block.position, bot.world, { reach: 4.5 }),
      'arbre',
      {
        attempts: 1,
        timeoutMs: 3500,
        canDig: false,
        avoidWater: true,
        quiet: true,
        successCheck: () => bot.entity.position.distanceTo(block.position) <= 5 && bot.canDigBlock(bot.blockAt(block.position) || block)
      }
    )

    if (stopRequested) return null
    const fresh = bot.blockAt(block.position)
    if (reached && fresh && target.blocks.includes(fresh.name) && bot.canDigBlock(fresh)) return fresh

    console.log(`[wood] path impossible ${block.position.x} ${block.position.y} ${block.position.z}`)
    console.log('[wood] changement de cible')
  }

  return null
}

function adjacentTreeLogs(origin, target, radius = 4) {
  const logs = []
  const seen = new Set()
  const queue = [origin.position]

  while (queue.length > 0 && logs.length < 24) {
    const pos = queue.shift()
    const key = `${pos.x},${pos.y},${pos.z}`
    if (seen.has(key)) continue
    seen.add(key)

    const block = bot.blockAt(pos)
    if (!block || !target.blocks.includes(block.name)) continue
    if (block.position.distanceTo(origin.position) > radius) continue
    if (woodProtectedReason(block)) continue

    logs.push(block)

    for (const [dx, dy, dz] of [
      [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
      [0, 1, 0], [0, -1, 0], [1, 1, 0], [-1, 1, 0], [0, 1, 1], [0, 1, -1]
    ]) {
      queue.push(pos.offset(dx, dy, dz))
    }
  }

  return logs.sort((a, b) => a.position.y - b.position.y)
}

async function harvestWoodTree(startBlock, target, neededCount) {
  let gained = 0
  const beforeTotal = countItems(target.drops)
  const logs = adjacentTreeLogs(startBlock, target)

  for (const log of logs) {
    if (stopRequested || gained >= neededCount) break
    const fresh = bot.blockAt(log.position)
    if (!fresh || !target.blocks.includes(fresh.name)) continue

    const reached = await safeGoto(
      new goals.GoalLookAtBlock(fresh.position, bot.world, { reach: 4.5 }),
      'tronc',
      { attempts: 1, timeoutMs: 3500, canDig: false, quiet: true }
    )
    if (stopRequested) break
    if (!reached || !bot.canDigBlock(fresh)) {
      console.log(`[wood] path impossible ${fresh.position.x} ${fresh.position.y} ${fresh.position.z}`)
      continue
    }

    try {
      const axeReady = await equipAxeForWoodLog()
      if (!axeReady) {
        console.log(`[wood] path impossible ${fresh.position.x} ${fresh.position.y} ${fresh.position.z}`)
        continue
      }
      if (stopRequested) break
      await bot.dig(fresh, true)
      console.log(`[wood] log cassé ${fresh.name} ${fresh.position.x} ${fresh.position.y} ${fresh.position.z}`)
      await collectNearbyDrops(6)
      gained = Math.max(0, countItems(target.drops) - beforeTotal)
      await sleep(150)
    } catch (err) {
      console.log(`[wood] path impossible ${fresh.position.x} ${fresh.position.y} ${fresh.position.z}`)
      logError('wood dig error', err)
    }
  }

  await collectNearbyDrops(8)
  return Math.max(0, countItems(target.drops) - beforeTotal)
}

function remainingDurability(item) {
  if (!item || !item.maxDurability) return Infinity
  return item.maxDurability - (item.durabilityUsed || 0)
}

async function equipForBlock(block) {
  if (!block) return false

  if (toolHelpers.blockNeedsPickaxe(block)) {
    const requiredRank = requiresDiamondPickaxe(block)
      ? toolHelpers.pickaxeRank('diamond_pickaxe')
      : (requiresIronPickaxe(block) ? toolHelpers.pickaxeRank('iron_pickaxe') : toolHelpers.pickaxeRank('wooden_pickaxe'))
    if (await toolHelpers.equipPickaxe(requiredRank)) return canHarvest(block)
  }

  const preferredTool = toolHelpers.preferredToolPartForBlock(block)
  if (preferredTool && preferredTool !== 'pickaxe') {
    await toolHelpers.equipBestToolByNamePart(preferredTool)
    return true
  }

  if (bot.tool) {
    try {
      await bot.tool.equipForBlock(block, { requireHarvest: true, getFromChest: false })
      if (remainingDurability(bot.heldItem) <= 3) {
        safeChat('Mon outil est presque casse, je cherche un remplacement.', 8000)
        return false
      }
      return canHarvest(block)
    } catch (err) {
      logError('tool plugin error', err)
    }
  }

  try {
    const tool = bot.pathfinder.bestHarvestTool(block)
    if (tool) await bot.equip(tool, 'hand')
  } catch (err) {
    logError('best tool error', err)
  }

  if (remainingDurability(bot.heldItem) <= 3) {
    safeChat('Mon outil est presque casse, je cherche un remplacement.', 8000)
    return false
  }

  return canHarvest(block)
}

async function collectNearbyDrops(radius = 6, options = {}) {
  const ignoredDropIds = new Set()
  const farmMode = options.farm === true || farmNoDigActive === true
  // Use a while loop instead of a fixed cap of 5 so all nearby drops are collected
  // (e.g. after felling a full tree, there can easily be 10+ drops).
  // A safety counter still prevents infinite loops if entities keep spawning.
  const maxAttempts = 64
  let attempts = 0

  while (attempts < maxAttempts) {
    attempts++
    const drop = bot.nearestEntity(entity => {
      if (!entity || entity.name !== 'item' || !entity.position) return false
      if (ignoredDropIds.has(entity.id)) return false
      if (!isValidPos(entity.position)) return false
      return entity.position.distanceTo(bot.entity.position) <= radius
    })

    if (!drop) return

    if (!isValidPos(drop.position)) {
      console.log('[farm][path] cible invalide ignorée drop')
      ignoredDropIds.add(drop.id)
      continue
    }
    const reached = await safeGoto(new goals.GoalNear(drop.position.x, drop.position.y, drop.position.z, 1), 'drop', {
      attempts: 1,
      timeoutMs: options.timeoutMs || (farmMode ? 2500 : 6000),
      canDig: farmMode ? false : undefined,
      canPlace: farmMode ? false : undefined,
      canOpenDoors: farmMode ? false : undefined,
      quiet: farmMode
    })
    if (!reached) {
      if (farmMode) {
        console.log('[farm][drop] timeout')
        console.log('[farm][drop] drop inaccessible ignoré')
        ignoredDropIds.add(drop.id)
        continue
      }
      return
    }
    if (farmMode) console.log('[farm][drop] ramassé')
    await sleep(200)
  }
}

// Tracks zones already explored (grid of 16-block cells) to avoid revisiting them.
const exploredZoneKeys = new Set()

function exploredZoneKey(x, z, gridSize = 16) {
  return `${Math.floor(x / gridSize)},${Math.floor(z / gridSize)}`
}

async function explore(radius = CONFIG.exploreRadius) {
  const safe = await dangerHelpers.ensureSurvival({ allowReturn: true })
  if (!safe && missionActive) return false

  const current = bot.entity.position
  const candidates = []

  // Generate 8 candidates and prefer ones in not-yet-visited zones
  for (let i = 0; i < 8; i++) {
    candidates.push({
      x: current.x + (Math.random() * radius * 2 - radius),
      z: current.z + (Math.random() * radius * 2 - radius)
    })
  }

  // Sort so fresh zones come first; visited zones are used as fallback
  candidates.sort((a, b) => {
    const aVisited = exploredZoneKeys.has(exploredZoneKey(a.x, a.z)) ? 1 : 0
    const bVisited = exploredZoneKeys.has(exploredZoneKey(b.x, b.z)) ? 1 : 0
    return aVisited - bVisited
  })

  // Only test the 4 best candidates
  for (const candidate of candidates.slice(0, 4)) {
    const reached = await safeGoto(new goals.GoalNear(candidate.x, current.y, candidate.z, 3), 'exploration', {
      attempts: 1,
      timeoutMs: 7000,
      quiet: true
    })

    exploredZoneKeys.add(exploredZoneKey(candidate.x, candidate.z))
    // Limit memory size to avoid accumulation across very long sessions
    if (exploredZoneKeys.size > 512) {
      const [first] = exploredZoneKeys
      exploredZoneKeys.delete(first)
    }

    if (reached) return true
    if (stopRequested) return false
  }

  safeChat("Exploration bloquee: zone difficile ou chunks non charges.", 10000)
  return false
}

async function mine(target, amount, options = {}) {
  const mission = options.resume && currentMission
    ? currentMission
    : missionRuntime.createMission(isCollectionTarget(target) ? 'collect' : 'mine', { targetKey: target.key, amount })

  target = resourceTargetByKey(mission.targetKey) || target

  missionActive = true
  stopRequested = false
  missionRuntime.setMissionStatus('running')
  warnIfCreativeGameMode()
  let searchFails = 0
  let minedTunnelCycles = 0
  const strategy = miningStrategyFor(target, CONFIG)

  announceResourceMissionStart(target, mission.amount)

  if (isDiamondTarget(target)) {
    logTag('mine', `diamond quiet mode objective=0/${mission.amount}`)
  } else if (isAncientDebrisTarget(target)) {
    logTag('mine', `ancient_debris quiet mode objective=0/${mission.amount}`)
  }
  logTag('mine', `start target=${target.key} amount=${mission.amount} mode=${strategy.mode}`)

  if (target.dimension === 'nether' || strategy.dimension === 'nether') {
    if (!basePos) {
      missionRuntime.pauseMission('Nether: base non définie. Fais setbase avant de partir.')
      return
    }

    const reachedNether = await portalHelpers.ensureNether()
    if (!reachedNether) {
      missionRuntime.pauseMission('Minage Nether en pause: portail Nether introuvable ou impossible a utiliser.')
      return
    }

    const awayFromPortal = await portalHelpers.moveAwayFromCurrentPortal(22)
    if (!awayFromPortal) {
      logTag('nether', 'sortie portail difficile, scan local prudent')
      await sleep(800)
      await portalHelpers.moveAwayFromCurrentPortal(10)
    }
  } else {
    const awayFromBase = await moveAwayFromBaseForMining()
    if (!awayFromBase) {
      missionRuntime.pauseMission('Minage en pause: zone de base protegee.')
      return
    }
  }

  while (currentMission === mission && missionActive && !stopRequested && mission.progress < mission.amount) {
    const safe = await dangerHelpers.ensureSurvival({ allowReturn: true })
    if (!safe) {
      await sleep(500)
      if (!missionActive || stopRequested) break
      continue
    }

    if (bot.inventory.emptySlotCount() <= CONFIG.minEmptySlots) {
      if (!basePos) {
        missionRuntime.pauseMission("Inventaire plein et base non définie. Fais setbase puis relance.")
        break
      }

      const deposited = await missionRuntime.depositForMission('Inventaire presque plein, dépôt à la base.')
      if (!deposited || stopRequested || !missionActive) break

      if (isNetherTarget(target) || strategy.dimension === 'nether') {
        const backToNether = await portalHelpers.ensureNether()
        if (!backToNether) {
          missionRuntime.pauseMission('Retour Nether impossible après dépôt. Mission stoppée proprement.')
          break
        }
        const awayFromPortal = await portalHelpers.moveAwayFromCurrentPortal(22)
        if (!awayFromPortal) {
          logTag('nether', 'sortie portail difficile apres depot')
          await sleep(800)
          await portalHelpers.moveAwayFromCurrentPortal(10)
        }
      }
      continue
    }

    const block = isWoodTarget(target)
      ? await findReachableWoodBlock(target, strategy)
      : findTargetBlock(target, { maxDistance: strategy.scanRadius, count: 48 })
    if (!block) {
      searchFails++
      if (isStripMiningTarget(target)) minedTunnelCycles++
      if (!isStripMiningTarget(target) && searchFails % 3 === 0) {
        const progressText = isStripMiningTarget(target)
          ? `tunnels ${minedTunnelCycles}, objectif ${mission.progress}/${mission.amount}`
          : `scan ${searchFails}/${strategy.maxScanCycles}`
        logTag('scan', `recherche ${target.key}: ${progressText}`)
      }
      if (searchFails >= strategy.maxScanCycles) {
        const reason = isWoodTarget(target)
          ? '⚠️ Aucun arbre accessible trouvé proche de moi.'
          : `Je ne trouve pas ${target.label} apres une recherche progressive. Cause probable: chunks non charges, zone trop dangereuse ou ressource trop rare.`
        missionRuntime.pauseMission(reason)
        break
      }
      const progressed = await exploreForResource(target, searchFails, strategy)
      if (isStripMiningTarget(target) && progressed) {
        searchFails = Math.max(0, searchFails - 1)
      }
      continue
    }

    searchFails = 0

    try {
      bot.pathfinder.setMovements(defaultMove)
      const reached = await safeGoto(
        new goals.GoalLookAtBlock(block.position, bot.world, { reach: 4.5 }),
        `${target.label}`,
        {
          attempts: isWoodTarget(target) ? 1 : 2,
          canDig: !isWoodTarget(target),
          avoidWater: isWoodTarget(target),
          quiet: isWoodTarget(target),
          safeToBreak: canBreakForPath
        }
      )
      if (!reached) {
        if (isWoodTarget(target)) {
          searchFails++
          continue
        }
        const tunneled = await digTowardPosition(block.position, `tunnel ${target.label}`, {
          range: 4,
          maxSteps: target.dimension === 'nether' ? 56 : 36,
          quiet: true
        })
        if (!tunneled) {
          searchFails++
          continue
        }
      }

      if (bot.entity.position.distanceTo(block.position) > 5) {
        searchFails++
        continue
      }

      const freshBlock = bot.blockAt(block.position)
      if (!freshBlock || !target.blocks.includes(freshBlock.name)) continue
      const protectedReason = isWoodTarget(target) ? woodProtectedReason(freshBlock) : protectedZoneReason(freshBlock.position)
      if (protectedReason) {
        safeChat(`Bloc ignore: zone protegee (${protectedReason}).`, 10000)
        continue
      }

      const before = countItems(target.drops)
      let hasTool = await equipForBlock(freshBlock)
      if (!hasTool) {
        hasTool = await ensureToolForBlock(freshBlock)
      }
      if (!hasTool) {
        safeChat(`Je n'ai pas l'outil pour miner ${freshBlock.name}.`, 7000)
        if (basePos) {
          const reachedBase = await safeGoBase({ force: true, ignoreStop: true })
          if (!reachedBase) {
            missionRuntime.pauseMission("Outil manquant et base inaccessible. Donne-moi l'outil puis relance.")
            break
          }
          await chestHelpers.takeLoadoutFromChest()
        } else {
          missionRuntime.pauseMission("Outil manquant. Donne-moi une pioche ou fais setbase puis relance.")
          break
        }
        continue
      }

      if (isWoodTarget(target)) {
        await harvestWoodTree(freshBlock, target, Math.max(1, mission.amount - mission.progress))
      } else {
        if (!canBreakForPath(freshBlock)) {
          searchFails++
          continue
        }
        await bot.dig(freshBlock, true)
        await collectNearbyDrops(6)
        await sleep(300)
      }

      const after = countItems(target.drops)
      const gained = Math.max(after - before, 0)
      if (gained > 0) {
        missionRuntime.addMissionProgress(gained)
        reportResourceProgress(mission, target)
      } else {
        await sleep(500)
        await collectNearbyDrops(8)
        const retryAfter = countItems(target.drops)
        const retryGained = Math.max(retryAfter - before, 0)
        if (retryGained > 0) {
          missionRuntime.addMissionProgress(retryGained)
          reportResourceProgress(mission, target)
        } else {
          logTag('mine', `drop non confirme target=${target.key}`)
        }
      }
    } catch (err) {
      logError('mine error', err)
      await sleep(500)
    }
  }

  if (currentMission === mission && !stopRequested && mission.progress >= mission.amount) {
    reportResourceProgress(mission, target, { force: true })
    await missionRuntime.finalizeMissionWithBaseDeposit(mission, isCollectionTarget(target) ? 'Collecte terminee.' : 'Minage termine.')
  }
}

function nearestAnimal() {
  return bot.nearestEntity(entity => {
    if (!entity || !entity.name || !entity.position) return false
    if (!HUNT_TARGETS.has(entity.name)) return false
    if (isBabyAnimal(entity)) return false
    return entity.position.distanceTo(bot.entity.position) <= 32
  })
}

async function hunt(amount, options = {}) {
  const mission = options.resume && currentMission
    ? currentMission
    : missionRuntime.createMission('hunt', { amount })

  missionActive = true
  stopRequested = false
  missionRuntime.setMissionStatus('running')
  let searchFails = 0

  safeChat('🏹 Chasse en cours.')
  safeChat(`🎯 Objectif : ${mission.amount} animaux.`)

  while (currentMission === mission && missionActive && !stopRequested && mission.progress < mission.amount) {
    const safe = await dangerHelpers.ensureSurvival({ allowReturn: true })
    if (!safe) {
      await sleep(500)
      if (!missionActive || stopRequested) break
      continue
    }

    if (bot.inventory.emptySlotCount() <= CONFIG.minEmptySlots) {
      if (!basePos) {
        missionRuntime.pauseMission("Inventaire plein et base non définie. Fais setbase puis relance.")
        break
      }

      await missionRuntime.depositForMission('Inventaire presque plein, dépôt à la base.')
      continue
    }

    const animal = nearestAnimal()
    if (!animal) {
      searchFails++
      if (searchFails >= 8) {
        missionRuntime.pauseMission("Je ne trouve plus assez d'animaux proches. Rapproche-moi puis relance.")
        break
      }
      await explore()
      continue
    }

    searchFails = 0

    try {
      const reached = await safeGoto(new goals.GoalFollow(animal, 2), `animal ${animal.name}`, {
        attempts: 2,
        timeoutMs: 10000
      })
      if (!reached) {
        searchFails++
        continue
      }
      await toolHelpers.equipWeapon()

      let hits = 0
      // Cap per-target attack attempts: if the animal keeps backing away and stays
      // just out of range (distance > 4) we exit after maxChaseAttempts retries
      // rather than looping forever on the outer while.
      let chaseAttempts = 0
      const maxChaseAttempts = 6
      while (missionActive && !stopRequested && animal.isValid && hits < 12 && chaseAttempts < maxChaseAttempts) {
        if (animal.position.distanceTo(bot.entity.position) > 4) {
          chaseAttempts++
          const chaseReached = await safeGoto(new goals.GoalFollow(animal, 2), `chasse ${animal.name}`, {
            attempts: 1,
            timeoutMs: 3000
          })
          if (!chaseReached) continue
        }
        bot.attack(animal)
        hits++
        await sleep(550)
      }

      await collectNearbyDrops(8)
      if (!animal.isValid || !bot.entities[animal.id]) {
        missionRuntime.addMissionProgress(1)
        reportHuntProgress(mission)
      } else {
        safeChat(`Je n'ai pas reussi a tuer ${animal.name}, je cherche une autre cible.`, 8000)
      }
    } catch (err) {
      logError('hunt error', err)
      await sleep(500)
    }
  }

  if (currentMission === mission && !stopRequested && mission.progress >= mission.amount) {
    reportHuntProgress(mission, { force: true })
    safeChat('✅ Chasse terminée.')
    safeChat('🏠 Retour à la base.')
    await missionRuntime.finalizeMissionWithBaseDeposit(mission, 'Chasse terminee.')
  }
}

function farmKindLabel(kind) {
  if (kind === 'animals') return 'animaux'
  if (kind === 'sugarcane') return 'canne a sucre'
  return 'complete'
}

function setFarm(kind) {
  const normalizedKind = kind === 'all' ? 'all' : kind
  const container = chestHelpers.findNearestLocalContainer(10, bot.entity.position)
  const door = doorHelpers.nearestFarmDoor(bot.entity.position, 12)

  if (normalizedKind === 'all' || normalizedKind === 'animals') {
    farmZones.animals = floorVec(bot.entity.position)
    if (container) farmContainerPos.animals = container.position.clone()
    if (door) farmDoorPos.animals = door.position.clone()
    automationHelpers.startAnimalFarmTimer()
    console.log(`[farm] position ferme enregistrée ${farmZones.animals.x} ${farmZones.animals.y} ${farmZones.animals.z}`)
    if (container) console.log(`[farm] coffre ferme utilisé ${container.position.x} ${container.position.y} ${container.position.z}`)
    if (door) console.log(`[farm][door] entrée candidate ${door.position.x} ${door.position.y} ${door.position.z}`)
  }

  if (normalizedKind === 'all' || normalizedKind === 'sugarcane') {
    farmZones.sugarcane = floorVec(bot.entity.position)
    if (container) farmContainerPos.sugarcane = container.position.clone()
    if (door) farmDoorPos.sugarcane = door.position.clone()
  }

  runtimeMemory.saveMemory()

  if (normalizedKind === 'all') safeChat('🌾 Fermes ajoutées.')
  else safeChat('🌾 Ferme ajoutée.')
}

function setFarmEntry(kind, username) {
  const normalizedKind = kind === 'all' ? 'animals' : kind
  if (normalizedKind !== 'animals' && normalizedKind !== 'sugarcane') {
    safeChat("Entree de ferme inconnue. Exemple: setentree animaux.")
    return
  }

  const player = followHelpers.playerEntity(username)
  const point = player && player.position ? player.position : bot.entity.position
  const door = doorHelpers.nearestFarmDoor(point, 5)

  if (!door || !doorHelpers.isFarmEntryBlock(door)) {
    safeChat("Aucune porte ou portillon proche trouve. Place-toi devant le portillon puis dis setentree animaux.")
    return
  }

  farmDoorPos[normalizedKind] = door.position.clone()
  runtimeMemory.saveMemory()
  console.log(`[farm][entry] entree officielle enregistrée ${door.position.x} ${door.position.y} ${door.position.z}`)
  safeChat(`Entree officielle ferme ${farmKindLabel(normalizedKind)} enregistree: ${door.position.x} ${door.position.y} ${door.position.z}.`)
}

function farmZoneFor(kind, options = {}) {
  if (!farmZones[kind]) {
    if (!options.autoCreate) return null

    farmZones[kind] = floorVec(bot.entity.position)
    runtimeMemory.saveMemory()
    safeChat(`Ferme ${farmKindLabel(kind)} non definie, j'utilise ma position actuelle.`)
  }

  return farmZones[kind]
}

function isEnclosureBlock(block) {
  if (!block || !block.name) return false
  return block.name.includes('fence') ||
    block.name.includes('fence_gate') ||
    block.name.includes('wall') ||
    (block.name.includes('door') && !block.name.includes('trapdoor'))
}

function hasBarrierBetweenPoints(from, to, door) {
  if (!isValidPos(from) || !isValidPos(to)) return true

  const dx = to.x - from.x
  const dz = to.z - from.z
  const steps = Math.max(2, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) * 2))

  for (let i = 1; i < steps; i++) {
    const t = i / steps
    const pos = new Vec3(
      Math.floor(from.x + dx * t),
      Math.floor(from.y),
      Math.floor(from.z + dz * t)
    )
    const block = bot.blockAt(pos)
    if (!isEnclosureBlock(block)) continue
    if (door && isValidPos(door.position) && block.position.equals(door.position)) continue
    return true
  }

  return false
}

function isConfirmedInsideFarmPen(passResult, zone) {
  const pos = bot.entity.position
  console.log(`[farm][pen] position bot ${pos.x.toFixed(1)} ${pos.y.toFixed(1)} ${pos.z.toFixed(1)}`)
  if (isValidPos(zone)) console.log(`[farm][pen] position ferme ${zone.x} ${zone.y} ${zone.z}`)

  if (!passResult || !passResult.ok || !passResult.closed || !isValidPos(passResult.target) || !isValidPos(passResult.beforePosition) || !isValidPos(zone) || !passResult.door || !isValidPos(passResult.door.position)) {
    console.log('[farm][pen] inside refusé')
    return false
  }

  const door = passResult.door
  const doorPos = door.position
  const target = passResult.target
  const before = passResult.beforePosition
  const after = passResult.afterPosition || pos
  const stepX = Math.sign(target.x - doorPos.x)
  const stepZ = Math.sign(target.z - doorPos.z)
  const opposite = new Vec3(doorPos.x - stepX, target.y, doorPos.z - stepZ)

  console.log(`[farm][pen] point extérieur ${opposite.x} ${opposite.y} ${opposite.z}`)
  console.log(`[farm][pen] point intérieur attendu ${target.x} ${target.y} ${target.z}`)
  console.log(`[farm][pen] position bot après passage ${after.x.toFixed(1)} ${after.y.toFixed(1)} ${after.z.toFixed(1)}`)

  const reachedInteriorTarget = pos.distanceTo(passResult.target) <= 2.4
  const beforeWasOutside = before.distanceTo(zone) > doorPos.distanceTo(zone) + 0.75
  const expectedInteriorCloserThanOutside = target.distanceTo(zone) + 0.75 < opposite.distanceTo(zone)
  const movedCloserToFarm = after.distanceTo(zone) + 0.75 < before.distanceTo(zone)
  const finalOnInteriorSide = (pos.x - doorPos.x) * stepX + (pos.z - doorPos.z) * stepZ > 0.15
  const noFenceBetweenInteriorAndFarm = !hasBarrierBetweenPoints(target, zone, door)

  if (
    reachedInteriorTarget &&
    beforeWasOutside &&
    expectedInteriorCloserThanOutside &&
    movedCloserToFarm &&
    finalOnInteriorSide &&
    noFenceBetweenInteriorAndFarm
  ) {
    console.log('[farm][pen] inside confirmé strict')
    return true
  }

  console.log('[farm][pen] inside refusé')
  return false
}

function isStillInsideFarmPen(kind) {
  const zone = farmZoneFor(kind)
  const door = doorHelpers.savedFarmDoor(kind)
  const pos = bot.entity.position

  console.log(`[farm][pen] position bot ${pos.x.toFixed(1)} ${pos.y.toFixed(1)} ${pos.z.toFixed(1)}`)
  if (isValidPos(zone)) console.log(`[farm][pen] position ferme ${zone.x} ${zone.y} ${zone.z}`)

  if (!isValidPos(zone) || !door || !isValidPos(door.position)) {
    console.log('[farm][pen] inside refusé')
    return false
  }

  const closeToFarm = pos.distanceTo(zone) <= 4
  const noBarrierToFarm = !hasBarrierBetweenPoints(pos, zone, door)
  const closerThanDoorOutside = pos.distanceTo(zone) + 0.75 < door.position.distanceTo(zone) + 2

  if (closeToFarm && noBarrierToFarm && closerThanDoorOutside) {
    console.log('[farm][pen] inside confirmé strict')
    return true
  }

  console.log('[farm][pen] inside refusé')
  return false
}

function isLikelyOutsideFarmPen(kind) {
  const zone = farmZoneFor(kind)
  const door = doorHelpers.savedFarmDoor(kind)
  if (!zone || !door || !isValidPos(door.position)) return false

  return isOutsideFarmPenPosition(bot.entity.position, door, zone)
}

function isOutsideFarmPenPosition(pos, door, zone) {
  if (!isValidPos(pos) || !door || !isValidPos(door.position) || !isValidPos(zone)) return false

  const outsideX = Math.sign(door.position.x - zone.x)
  const outsideZ = Math.sign(door.position.z - zone.z)
  const relX = pos.x - door.position.x
  const relZ = pos.z - door.position.z
  const outsideScore = relX * outsideX + relZ * outsideZ

  return outsideScore > 0.8 && pos.distanceTo(zone) > door.position.distanceTo(zone) + 0.6
}

async function goToFarmZone(kind, options = {}) {
  const zone = farmZoneFor(kind)
  if (!zone) {
    safeChat(`Ferme ${farmKindLabel(kind)} non definie. Place-moi a la ferme puis dis setfarm ${farmKindLabel(kind)}.`, 8000)
    return false
  }
  if (!isValidPos(zone)) {
    console.log('[farm][path] cible invalide ignorée ferme animaux')
    safeChat('Ferme animaux stoppée : erreur navigation entrée/coffre.')
    return false
  }

  if (farmNoDigActive && kind === 'animals') {
    console.log('[farm][path] canDig=false')
    console.log('[farm][path] placement bloc interdit')
    console.log('[farm][path] entrée obligatoire par porte/portillon')

    if (options.forceEntry !== true && isStillInsideFarmPen(kind)) {
      return options.detailed ? { ok: true, inside: true, passResult: null } : true
    }

    const officialDoor = doorHelpers.savedFarmDoor(kind)
    if (officialDoor) console.log('[farm][entry] entree officielle utilisée')
    else console.log('[farm][entry] aucune entree officielle, detection automatique')
    const doors = officialDoor
      ? [officialDoor]
      : doorHelpers.doorsNearPoint(zone, 12)

    for (const door of doors) {
      const passed = await doorHelpers.passDoor(door, 'towards', {
        logPrefix: '[farm][door]',
        label: `entree ferme ${farmKindLabel(kind)}`,
        referencePoint: zone
      })
      if (!passed.ok) continue
      if (!passed.closed) {
        farmDoorIssues.push('fermeture entree echouee')
        safeChat("Je stoppe la ferme animaux : je n'arrive pas a securiser l'entree.")
        return false
      }
      const inside = isConfirmedInsideFarmPen(passed, zone)
      if (inside) return options.detailed ? { ok: true, inside: true, passResult: passed } : true

      safeChat("Je ne suis pas dans l’enclos, je stoppe pour éviter une erreur.", 8000)
      return options.detailed ? { ok: false, inside: false, passResult: passed } : false
    }

    console.log('[farm][path] entree introuvable')
    safeChat("Entrée de ferme introuvable, je n'abîme pas et je ne traverse pas l'enclos.", 8000)
    return options.detailed ? { ok: false, inside: false, passResult: null } : false
  }

  if (bot.entity.position.distanceTo(zone) <= 4) return true

  console.log('[farm][path] canDig=false')
  console.log('[farm][path] placement bloc interdit')
  console.log('[farm][path] entrée obligatoire par porte/portillon')
  console.log(`[farm][path] goto intérieur ${zone.x} ${zone.y} ${zone.z}`)
  const zoneGoal = farmGoalNear(zone, 3, `ferme ${farmKindLabel(kind)}`)
  if (!zoneGoal) return false
  const reached = await safeGoto(zoneGoal, `ferme ${farmKindLabel(kind)}`, {
    attempts: 2,
    canDig: false,
    canOpenDoors: false,
    timeoutMs: 9000,
    quiet: true
  })

  if (reached) return true

  const officialDoor = doorHelpers.savedFarmDoor(kind)
  const doors = officialDoor
    ? [officialDoor]
    : doorHelpers.doorsNearPoint(zone, 12)
  for (const door of doors) {
    const passed = await doorHelpers.passDoor(door, 'towards', {
      logPrefix: '[farm][door]',
      label: `entree ferme ${farmKindLabel(kind)}`,
      referencePoint: zone
    })
    if (!passed.ok) continue
    if (!passed.closed) {
      farmDoorIssues.push('fermeture entree echouee')
      safeChat("Je stoppe la ferme animaux : je n'arrive pas a securiser l'entree.")
      return false
    }

    console.log(`[farm][path] goto intérieur ${zone.x} ${zone.y} ${zone.z}`)
    const afterDoorGoal = farmGoalNear(zone, 3, `ferme ${farmKindLabel(kind)}`)
    if (!afterDoorGoal) return false
    const afterDoor = await safeGoto(afterDoorGoal, `ferme ${farmKindLabel(kind)}`, {
      attempts: 1,
      canDig: false,
      canOpenDoors: false,
      timeoutMs: 7000,
      quiet: true
    })
    if (afterDoor || bot.entity.position.distanceTo(zone) <= 5) return true
  }

  console.log('[farm][path] entree introuvable')
  safeChat("Entrée de ferme introuvable, je n'abîme pas et je ne traverse pas l'enclos.", 8000)
  return false
}

async function exitFarmZone(kind) {
  const zone = farmZoneFor(kind)
  if (!zone) return true

  const officialDoor = doorHelpers.savedFarmDoor(kind)
  const doors = officialDoor
    ? [officialDoor]
    : doorHelpers.doorsNearPoint(zone, 12)
  for (const door of doors) {
    const before = bot.entity.position.distanceTo(zone)
    const passed = await doorHelpers.passDoor(door, 'away', {
      logPrefix: '[farm][door]',
      label: `sortie ferme ${farmKindLabel(kind)}`,
      referencePoint: zone
    })
    if (!passed.ok) continue
    if (!passed.closed) {
      farmDoorIssues.push('fermeture sortie echouee')
      safeChat("Sortie de ferme non securisee, je le signale dans le rapport.", 8000)
      return false
    }
    if (isOutsideFarmPenPosition(bot.entity.position, door, zone) || bot.entity.position.distanceTo(zone) >= before + 2) return true

    const dirX = Math.sign(passed.target.x - door.position.x)
    const dirZ = Math.sign(passed.target.z - door.position.z)
    const exitTargets = [
      new Vec3(door.position.x + dirX * 3, door.position.y, door.position.z + dirZ * 3),
      new Vec3(door.position.x + dirX * 4, door.position.y, door.position.z + dirZ * 4)
    ].filter(isValidPos)

    for (const target of exitTargets) {
      const goal = farmGoalNear(target, 1, 'sortie ferme')
      if (!goal) continue
      await safeGoto(goal, 'sortie ferme', {
        attempts: 1,
        timeoutMs: 3500,
        canDig: false,
        canPlace: false,
        canOpenDoors: false,
        quiet: true,
        successCheck: () => bot.entity.position.distanceTo(target) <= 1.25
      })
      if (isOutsideFarmPenPosition(bot.entity.position, door, zone)) return true
    }
  }

  console.log('[farm][path] entree introuvable')
  safeChat("Entrée de ferme introuvable, je n'abîme pas et je ne traverse pas l'enclos.", 8000)
  return false
}

function allAnimalDropNames() {
  return [...new Set(
    Object.values(ANIMAL_FARMS)
      .flatMap(farm => farm.drops)
      .concat(Object.values(RAW_TO_COOKED))
  )]
}

function allAnimalFoodNames() {
  return [...new Set(Object.values(ANIMAL_FARMS).flatMap(farm => farm.foods || []))]
}

async function clearFarmFoodFromHand() {
  if (!bot.heldItem || !allAnimalFoodNames().includes(bot.heldItem.name)) return true

  try {
    await bot.unequip('hand')
    console.log('[farm][breed] nourriture retirée de la main')
    return true
  } catch (err) {
    logError('farm unequip food error', err)
    return false
  }
}

async function moveToFarmPenCenter() {
  const zone = farmZoneFor('animals')
  if (!zone) return false

  console.log('[farm][pen] scan enclos')
  console.log(`[farm][pen] centre enclos ${zone.x} ${zone.y} ${zone.z}`)
  const goal = farmGoalNear(zone, 1, 'centre enclos')
  if (!goal) return false

  const reached = await safeGoto(goal, 'centre enclos', {
    attempts: 2,
    timeoutMs: 5000,
    canDig: false,
    canPlace: false,
    canOpenDoors: false,
    quiet: true,
    successCheck: () => bot.entity.position.distanceTo(zone) <= 2
  })

  return reached && isStillInsideFarmPen('animals')
}

function findInventoryItemByNames(names) {
  const accepted = new Set(names)
  return bot.inventory.items().find(item => accepted.has(item.name)) || null
}

async function withdrawNamedItemsFromBase(names, targetCount = 16) {
  if (!basePos) return false

  try {
    const blocks = await chestHelpers.baseContainerBlocks(12)
    if (blocks.length === 0) return false
    let withdrewSomething = false

    for (const block of blocks) {
      let container = null
      try {
        container = await chestHelpers.openContainerBlock(block)
        if (!container) continue

        for (const name of names) {
          let missing = Math.max(0, targetCount - inventoryCount(name))
          if (missing <= 0) continue

          for (const item of container.containerItems().filter(candidate => candidate.name === name)) {
            if (missing <= 0) break

            const before = inventoryCount(name)
            const count = Math.min(item.count, missing)
            try {
              await container.withdraw(item.type, null, count)
            } catch (err) {
              logError('farm withdraw error', err)
            }

            const gained = Math.max(0, inventoryCount(name) - before)
            missing -= gained
            if (gained > 0) withdrewSomething = true
          }
        }
      } finally {
        if (container) container.close()
      }
    }

    return withdrewSomething
  } catch (err) {
    logError('farm supply error', err)
    return false
  }
}

async function withdrawNamedItemsFromFarm(kind, names, targetCount = 16) {
  try {
    const blocks = await farmContainerBlocks(kind)
    if (blocks.length === 0) return false
    let withdrewSomething = false

    for (const block of blocks) {
      let container = null
      try {
        container = await chestHelpers.openContainerBlock(block)
        if (!container) continue

        for (const name of names) {
          let missing = Math.max(0, targetCount - inventoryCount(name))
          if (missing <= 0) continue

          for (const item of container.containerItems().filter(candidate => candidate.name === name)) {
            if (missing <= 0) break

            const before = inventoryCount(name)
            const count = Math.min(item.count, missing)
            try {
              await container.withdraw(item.type, null, count)
            } catch (err) {
              logError('farm chest withdraw error', err)
            }

            const gained = Math.max(0, inventoryCount(name) - before)
            missing -= gained
            if (gained > 0) withdrewSomething = true
          }
        }
      } finally {
        if (container) container.close()
      }
    }

    return withdrewSomething
  } catch (err) {
    logError('farm supply chest error', err)
    return false
  }
}

function farmChestAccessPositions(containerBlock) {
  if (!containerBlock || !isValidPos(containerBlock.position)) {
    console.log('[farm][path] cible invalide ignorée coffre')
    return []
  }

  const pos = containerBlock.position
  const candidates = [
    bot.entity.position.floored(),
    new Vec3(pos.x + 1, pos.y, pos.z),
    new Vec3(pos.x - 1, pos.y, pos.z),
    new Vec3(pos.x, pos.y, pos.z + 1),
    new Vec3(pos.x, pos.y, pos.z - 1),
    new Vec3(pos.x + 1, pos.y - 1, pos.z),
    new Vec3(pos.x - 1, pos.y - 1, pos.z),
    new Vec3(pos.x, pos.y - 1, pos.z + 1),
    new Vec3(pos.x, pos.y - 1, pos.z - 1),
    new Vec3(pos.x + 1, pos.y + 1, pos.z),
    new Vec3(pos.x - 1, pos.y + 1, pos.z),
    new Vec3(pos.x, pos.y + 1, pos.z + 1),
    new Vec3(pos.x, pos.y + 1, pos.z - 1)
  ]

  return candidates
    .filter(target => {
    if (!isValidPos(target)) return false
    const feet = bot.blockAt(target)
    const head = bot.blockAt(target.offset(0, 1, 0))
    const floor = bot.blockAt(target.offset(0, -1, 0))
    return doorHelpers.isWalkableBlock(feet) && doorHelpers.isWalkableBlock(head) && floor && floor.boundingBox !== 'empty'
    })
    .sort((a, b) => a.distanceTo(bot.entity.position) - b.distanceTo(bot.entity.position))
}

async function farmContainerBlocks(kind) {
  const savedPos = farmContainerPos[kind]
  if (savedPos) {
    if (!isValidPos(savedPos)) {
      console.log('[farm][path] cible invalide ignorée coffre')
      console.log('[farm][chest] coffre inaccessible')
      safeChat('Coffre ferme inaccessible sans casser ni poser de bloc, je garde les items.', 8000)
      return []
    }

    console.log(`[farm][chest] coffre enregistré utilisé ${savedPos.x} ${savedPos.y} ${savedPos.z}`)
    const saved = bot.blockAt(savedPos)
    if (chestHelpers.isContainerBlock(saved)) {
      if (saved.position.distanceTo(bot.entity.position) > 5.5) {
        console.log('[farm][path] canDig=false')
        const accessPositions = farmChestAccessPositions(saved).slice(0, 8)
        let reached = false

        for (let i = 0; i < accessPositions.length; i++) {
          const target = accessPositions[i]
          if (!isValidPos(target)) {
            console.log('[farm][path] cible invalide ignorée coffre')
            continue
          }

          console.log(`[farm][chest] tentative position ${i + 1}/${accessPositions.length}`)
          console.log(`[farm][path] goto coffre ${target.x} ${target.y} ${target.z}`)
          const chestGoal = farmGoalNear(target, 1, 'coffre ferme officiel')
          if (!chestGoal) continue

          reached = await safeGoto(chestGoal, 'coffre ferme officiel', {
            attempts: 1,
            timeoutMs: 5000,
            canDig: false,
            canPlace: false,
            canOpenDoors: false,
            quiet: true,
            successCheck: () => bot.entity.position.distanceTo(target) <= 2.2 || saved.position.distanceTo(bot.entity.position) <= 5.5
          })
          if (reached) break
        }

        if (!reached) {
          console.log('[farm][chest] inaccessible sans casse')
          safeChat('Coffre ferme inaccessible sans casser ni poser de bloc, je garde les items.', 8000)
          return []
        }
      }

      return [saved]
    }

    console.log('[farm][chest] coffre inaccessible')
    safeChat('Coffre ferme inaccessible sans casser ni poser de bloc, je garde les items.', 8000)
    return []
  }

  if (farmZones[kind]) {
    await goToFarmZone(kind)
  }

  const blocks = []
  blocks.push(...chestHelpers.findNearbyContainers(12, bot.entity.position, {
    includeSavedBase: false,
    excludeBase: true,
    count: 16
  }))

  const unique = chestHelpers.uniqueBlocks(blocks)
  if (unique.length > 0) {
    farmContainerPos[kind] = unique[0].position.clone()
    runtimeMemory.saveMemory()
    return unique
  }

  if (baseContainerPos && bot.entity.position.distanceTo(baseContainerPos) <= 10) {
    return chestHelpers.baseContainerBlocks(12, { travel: false })
  }

  safeChat('Aucun coffre de ferme proche. Je ne retourne pas a la base juste pour ca.', 10000)
  return []
}

async function depositNamedItems(names, kind) {
  try {
    if (kind === 'animals') {
      lastFarmDepositOpened = false
      lastFarmDepositedCount = 0
    }
    const plan = chestHelpers.buildDepositPlan(names, {
      keepFood: false,
      keepLoadout: false
    })
    if (chestHelpers.planRemainingCount(plan) === 0) return true

    const blocks = await farmContainerBlocks(kind)
    const deposited = await chestHelpers.depositPlanToContainers(plan, blocks, `Ferme ${farmKindLabel(kind)}`)
    if (!deposited && kind === 'animals') {
      if (!lastFarmDepositOpened) {
        console.log('[farm][chest] toutes positions échouées')
        safeChat('Coffre ferme inaccessible, items gardés.', 8000)
      } else {
        safeChat('Depot ferme incomplet, je garde les items restants.', 8000)
      }
    }
    return deposited
  } catch (err) {
    logError('farm deposit container error', err)
    return false
  }
}

function isFurnaceBlock(block) {
  return Boolean(block && ['furnace', 'smoker', 'lit_furnace'].includes(block.name))
}

function findNearestFurnace(maxDistance = 12, point = bot.entity.position) {
  return bot.findBlock({
    point,
    matching: block => isFurnaceBlock(block),
    maxDistance
  })
}

async function openNearestFurnace(kind) {
  let furnaceBlock = findNearestFurnace(12, bot.entity.position)

  if (!furnaceBlock && farmZones[kind]) {
    furnaceBlock = findNearestFurnace(12, farmZones[kind])
  }

  if (!furnaceBlock && kind !== 'animals' && basePos) {
    if (bot.entity.position.distanceTo(basePos) > 8) {
      await safeGoBase()
    }

    furnaceBlock = findNearestFurnace(12, basePos)
  }

  if (!furnaceBlock) return null

  if (furnaceBlock.position.distanceTo(bot.entity.position) > 4) {
    const reached = await safeGoto(new goals.GoalNear(
      furnaceBlock.position.x,
      furnaceBlock.position.y,
      furnaceBlock.position.z,
      2
    ), 'four')
    if (!reached) return null
  }

  return bot.openFurnace(furnaceBlock)
}

function findFuelItem() {
  return bot.inventory.items()
    .filter(item => FUEL_VALUES[item.name])
    .sort((a, b) => FUEL_VALUES[b.name] - FUEL_VALUES[a.name])[0] || null
}

function rawMeatItems() {
  return bot.inventory.items().filter(item => RAW_TO_COOKED[item.name])
}

async function ensureFarmFuel(kind) {
  if (findFuelItem()) return true

  if (kind === 'animals') {
    await withdrawNamedItemsFromFarm(kind, Object.keys(FUEL_VALUES), 4)
    return Boolean(findFuelItem())
  }

  if (basePos) {
    await withdrawNamedItemsFromBase(Object.keys(FUEL_VALUES), 4)
    if (kind && farmZones[kind]) {
      await goToFarmZone(kind)
    }
  }

  return Boolean(findFuelItem())
}

async function waitForCookedOutput(furnace, cookedName, expectedCount) {
  let cooked = 0
  const timeoutAt = Date.now() + expectedCount * 12500 + 5000

  while (!stopRequested && cooked < expectedCount && Date.now() < timeoutAt) {
    const output = furnace.outputItem()

    if (output) {
      if (output.name !== cookedName) return cooked

      cooked += output.count
      await furnace.takeOutput()
      continue
    }

    const input = furnace.inputItem()
    if (!input && cooked > 0) break

    await sleep(1000)
  }

  return cooked
}

async function cookFarmMeat(kind) {
  let remainingCookLimit = CONFIG.maxCookItemsPerFarmRun
  let totalCooked = 0

  while (!stopRequested && remainingCookLimit > 0) {
    const rawItem = rawMeatItems()[0]
    if (!rawItem) break

    const cookedName = RAW_TO_COOKED[rawItem.name]
    const cookCount = Math.min(rawItem.count, remainingCookLimit)

    const hasFuel = await ensureFarmFuel(kind)
    if (!hasFuel) {
      safeChat('Pas de combustible pour cuire la viande, depot cru.', 8000)
      break
    }

    let furnace = null

    try {
      furnace = await openNearestFurnace(kind)
      if (!furnace) {
        safeChat('Aucun four/smoker trouve, depot cru.', 8000)
        break
      }

      const existingInput = furnace.inputItem()
      if (existingInput && existingInput.name !== rawItem.name) {
        safeChat('Four occupe par un autre item, depot cru.', 8000)
        break
      }

      const existingOutput = furnace.outputItem()
      if (existingOutput) {
        if (existingOutput.name !== cookedName) {
          safeChat('Sortie du four occupee, depot cru.', 8000)
          break
        }

        await furnace.takeOutput()
      }

      const fuelSlot = furnace.fuelItem()
      let actualCookCount = cookCount

      if (!fuelSlot) {
        const fuel = findFuelItem()
        if (!fuel) break

        const cookCapacity = Math.max(1, Math.floor(fuel.count * FUEL_VALUES[fuel.name]))
        actualCookCount = Math.min(cookCount, cookCapacity)
        const fuelCount = Math.max(1, Math.ceil(actualCookCount / FUEL_VALUES[fuel.name]))
        await furnace.putFuel(fuel.type, null, Math.min(fuel.count, fuelCount))
      }

      await furnace.putInput(rawItem.type, null, actualCookCount)
      const cooked = await waitForCookedOutput(furnace, cookedName, actualCookCount)
      totalCooked += cooked
      remainingCookLimit -= actualCookCount

      if (cooked < actualCookCount) break
    } catch (err) {
      logError('cook farm meat error', err)
      break
    } finally {
      if (furnace) furnace.close()
    }
  }

  if (totalCooked > 0) safeChat(`Viande cuite: ${totalCooked}.`)
  return totalCooked
}

function animalsNearFarm() {
  const zone = farmZoneFor('animals')
  if (!zone) return []

  return Object.values(bot.entities)
    .filter(entity => {
      if (!entity || !entity.name || !entity.position) return false
      if (entity.isValid === false) return false
      if (!ANIMAL_FARMS[entity.name]) return false
      return entity.position.distanceTo(zone) <= CONFIG.farmRadius
    })
    .sort((a, b) => a.position.distanceTo(bot.entity.position) - b.position.distanceTo(bot.entity.position))
}

function groupByName(entities) {
  return entities.reduce((groups, entity) => {
    if (!groups[entity.name]) groups[entity.name] = []
    groups[entity.name].push(entity)
    return groups
  }, {})
}

function entityMetadataValue(entity, key) {
  const metadataKeys = bot.registry.entitiesByName[entity.name] && bot.registry.entitiesByName[entity.name].metadataKeys
  if (!metadataKeys) return undefined

  const index = metadataKeys.indexOf(key)
  if (index === -1) return undefined

  const raw = entity.metadata[index]
  if (raw && typeof raw === 'object' && Object.prototype.hasOwnProperty.call(raw, 'value')) {
    return raw.value
  }

  return raw
}

function isBabyAnimal(entity) {
  const value = entityMetadataValue(entity, 'baby')
  return value === true || value === 1
}

function adultAnimals(animals) {
  return animals.filter(entity => !isBabyAnimal(entity))
}

function neededAnimalFoodNames(animals) {
  const groups = groupByName(animals)
  const needed = new Set()

  for (const [animalName, group] of Object.entries(groups)) {
    const config = ANIMAL_FARMS[animalName]
    if (!config) continue
    if (adultAnimals(group).length < 2) continue
    if (findInventoryItemByNames(config.foods)) continue

    for (const foodName of config.foods) {
      needed.add(foodName)
    }
  }

  return [...needed]
}

async function feedAnimal(entity) {
  const farm = ANIMAL_FARMS[entity.name]
  if (!farm) return false

  const food = findInventoryItemByNames(farm.foods)
  if (!food) return false

  try {
    await bot.equip(food, 'hand')
    if (!isValidPos(entity.position)) {
      console.log('[farm][path] cible invalide ignorée animal')
      return false
    }
    const animalGoal = farmGoalNear(entity.position, 2, `nourrir ${entity.name}`)
    if (!animalGoal) return false
    const reached = await safeGoto(animalGoal, `nourrir ${entity.name}`, {
      attempts: 1,
      timeoutMs: 7000,
      canDig: false,
      canOpenDoors: false
    })
    if (!reached) return false
    await bot.activateEntity(entity)
    await sleep(450)
    return true
  } catch (err) {
    logError('animal feed error', err)
    return false
  }
}

async function breedFarmAnimals() {
  const allGroups = groupByName(animalsNearFarm())
  let fed = 0

  for (const [animalName, animals] of Object.entries(allGroups)) {
    const config = ANIMAL_FARMS[animalName]
    if (!config) continue

    const adults = adultAnimals(animals)
    let feedCount = Math.min(adults.length, Math.max(4, config.keep || 4))
    if (feedCount % 2 === 1) feedCount--

    for (const animal of adults.slice(0, feedCount)) {
      const ok = await feedAnimal(animal)
      if (ok) fed++
    }
  }

  console.log(`[farm][breed] animaux nourris ${fed}`)
  if (fed > 0) safeChat(`Ferme animaux: ${fed} animaux nourris.`)
  return fed
}

async function harvestAnimalSurplus(options = {}) {
  const nearbyAnimals = animalsNearFarm()
  const babies = nearbyAnimals.filter(isBabyAnimal)
  const adultsNearFarm = adultAnimals(nearbyAnimals)
  const isInsideFarmPen = options.isInsideFarmPen === true
  console.log(`[farm][kill] dans enclos=${isInsideFarmPen}`)
  if (!isInsideFarmPen) {
    console.log('[farm][kill] refusé car bot hors enclos')
    return { harvested: 0, inaccessible: 0 }
  }
  console.log(`[farm][kill] adultes trouvés ${adultsNearFarm.length}`)
  console.log(`[farm][kill] bébés ignorés ${babies.length}`)

  const groups = groupByName(adultsNearFarm)
  let harvested = 0
  let surplusFound = 0
  let inaccessibleSurplus = 0

  for (const [animalName, animals] of Object.entries(groups)) {
    const config = ANIMAL_FARMS[animalName]
    if (!config) continue

    const keepAlive = Math.max(4, config.keep || 4)
    if (animals.length <= keepAlive) continue

    const surplus = Math.max(0, animals.length - keepAlive)
    surplusFound += surplus
    console.log(`[farm][kill] surplus calculé ${surplus}`)
    console.log(`[farm][kill] animaux laissés ${keepAlive}`)
    let killedForGroup = 0
    let inaccessibleForGroup = 0
    const ignoredTargets = new Set()

    while (!stopRequested && killedForGroup < surplus) {
      const currentAdults = adultAnimals(animalsNearFarm())
        .filter(candidate => candidate.name === animalName && candidate.isValid !== false && !isBabyAnimal(candidate) && !ignoredTargets.has(candidate.id))
        .sort((a, b) => a.position.distanceTo(bot.entity.position) - b.position.distanceTo(bot.entity.position))

      if (currentAdults.length <= keepAlive) break
      const target = currentAdults[0]
      if (!target || !isValidPos(target.position)) break

      try {
        await toolHelpers.equipWeapon()

        if (target.position.distanceTo(bot.entity.position) <= 4) {
          console.log('[farm][kill] cible proche')
          console.log('[farm][kill] attaque directe')
        } else {
          const surplusGoal = farmGoalNear(target.position, 1, `surplus ${config.label}`)
          if (!surplusGoal) break
          const reached = await safeGoto(surplusGoal, `surplus ${config.label}`, {
            attempts: 1,
            timeoutMs: 2500,
            canDig: false,
            canPlace: false,
            canOpenDoors: false,
            quiet: true
          })
          if (!reached) {
            console.log('[farm][kill] cible ignorée timeout')
            inaccessibleSurplus++
            inaccessibleForGroup++
            ignoredTargets.add(target.id)
            if (inaccessibleForGroup >= Math.max(1, currentAdults.length - keepAlive)) break
            continue
          }
          console.log('[farm][kill] cible accessible')
        }

        let hits = 0
        while (!stopRequested && target.isValid && bot.entities[target.id] && hits < 16) {
          if (!isValidPos(target.position)) {
            console.log('[farm][path] cible invalide ignorée animal')
            break
          }
          if (target.position.distanceTo(bot.entity.position) > 4) {
            const chaseGoal = farmGoalNear(target.position, 1, `surplus ${config.label}`)
            if (!chaseGoal) break
            await safeGoto(chaseGoal, `surplus ${config.label}`, {
              attempts: 1,
              timeoutMs: 1800,
              canDig: false,
              canPlace: false,
              canOpenDoors: false,
              quiet: true
            })
          }

          await bot.lookAt(target.position.offset(0, 1, 0), true)
          bot.attack(target, true)
          hits++
          await sleep(550)
        }

        for (let wait = 0; wait < 6 && target.isValid && bot.entities[target.id]; wait++) {
          await sleep(250)
        }

        if (!target.isValid || !bot.entities[target.id]) {
          harvested++
          killedForGroup++
          console.log(`[farm][kill] tué ${harvested}/${surplusFound}`)
        } else {
          ignoredTargets.add(target.id)
          inaccessibleForGroup++
          safeChat(`Je n'arrive pas a abattre ${config.label}, verifie l'acces a l'enclos.`, 8000)
        }

        await collectNearbyDrops(8, { farm: true })
      } catch (err) {
        logError('animal surplus harvest error', err)
      }
    }
  }

  if (harvested > 0) safeChat(`Ferme animaux: ${harvested} surplus recoltes.`)
  if (surplusFound === 0) safeChat('Ferme animaux: pas assez d adultes en surplus pour abattre.', 10000)
  if (inaccessibleSurplus > 0 && harvested < surplusFound) {
    console.log(`[farm][kill] restant inaccessible ${surplusFound - harvested}`)
    safeChat('Ferme animaux: surplus restant inaccessible, je le laisse vivant.', 8000)
  }
  return {
    harvested,
    inaccessible: Math.max(0, surplusFound - harvested)
  }
}

async function farmAnimals(options = {}) {
  if (!options.resume && missionRuntime.isMissionRunning('farmAnimals')) {
    safeChat('Mission déjà en cours : ferme animaux.', 5000)
    return
  }

  const mission = options.resume && currentMission
    ? currentMission
    : missionRuntime.createMission('farmAnimals', { targetKey: 'animals', amount: 1 })

  missionActive = true
  stopRequested = false
  missionRuntime.setMissionStatus('running')
  farmDoorIssues = []
  farmNoDigActive = true
  farmProtectionActive = true
  console.log('[farm] ferme animaux start')
  if (farmZones.animals) console.log(`[farm] position ferme enregistrée ${farmZones.animals.x} ${farmZones.animals.y} ${farmZones.animals.z}`)
  if (farmContainerPos.animals) console.log(`[farm] coffre ferme utilisé ${farmContainerPos.animals.x} ${farmContainerPos.animals.y} ${farmContainerPos.animals.z}`)
  if (farmDoorPos.animals) console.log(`[farm][door] entrée candidate ${farmDoorPos.animals.x} ${farmDoorPos.animals.y} ${farmDoorPos.animals.z}`)
  safeChat('Mission ferme animaux.')

  try {
  const safe = await dangerHelpers.ensureSurvival({ allowReturn: true })
  if (!safe || stopRequested) return

  if (isStillInsideFarmPen('animals')) {
    console.log('[farm][order] bot deja dans enclos, sortie avant preparation coffre')
    await clearFarmFoodFromHand()
    const exitedBeforePrepare = await exitFarmZone('animals')
    if (!exitedBeforePrepare) {
      missionRuntime.pauseMission('Ferme animaux en pause : impossible de sortir avant preparation.')
      return
    }
  }

  let animals = animalsNearFarm()
  let foundCount = animals.length
  const dropsBefore = countItems(allAnimalDropNames())
  let neededFood = neededAnimalFoodNames(animals)
  let missingFood = neededFood.length > 0

  if (neededFood.length > 0) {
    safeChat('Je prends la nourriture de reproduction dans le coffre de ferme avant dentrer.')
    const gotFarmFood = await withdrawNamedItemsFromFarm('animals', neededFood, 8)
    const hasFoodNow = neededFood.some(name => inventoryCount(name) > 0)
    missingFood = !gotFarmFood && !hasFoodNow
    if (missingFood) {
      console.log('[farm][breed] nourriture absente')
      safeChat('Nourriture de reproduction non disponible dans le coffre de ferme.', 10000)
    } else {
      console.log('[farm][breed] nourriture trouvée')
    }
  } else {
    console.log('[farm][breed] nourriture trouvée')
  }

  const entry = await goToFarmZone('animals', {
    detailed: true,
    forceEntry: true
  })
  if (!entry || !entry.ok || !entry.inside) {
    safeChat("Je ne suis pas dans l’enclos, je stoppe pour éviter une erreur.", 8000)
    missionRuntime.pauseMission("Impossible d'aller a la ferme animaux. Mission en pause.")
    return
  }
  let isInsideFarmPen = true

  const centered = await moveToFarmPenCenter()
  if (!centered) {
    safeChat("Je n'arrive pas a me placer au centre de l'enclos, je stoppe pour eviter une erreur.", 8000)
    missionRuntime.pauseMission("Ferme animaux stoppée : centre enclos inaccessible.")
    return
  }

  animals = animalsNearFarm()
  foundCount = animals.length
  neededFood = neededAnimalFoodNames(animals)
  missingFood = neededFood.length > 0 && !neededFood.some(name => inventoryCount(name) > 0)

  let fed = 0
  let harvested = 0
  let surplusInaccessible = 0

  if (animals.length === 0) {
    safeChat('Aucun animal trouve dans la zone de ferme.')
  } else {
    if (!isInsideFarmPen) {
      console.log('[farm][breed] refusé car bot hors enclos')
      console.log('[farm][kill] refusé car bot hors enclos')
      safeChat("Je ne suis pas dans l’enclos, je stoppe pour éviter une erreur.", 8000)
      missionRuntime.pauseMission("Ferme animaux stoppée : bot hors enclos.")
      return
    }
    fed = await breedFarmAnimals()
    await collectNearbyDrops(8, { farm: true })
    const killReport = await harvestAnimalSurplus({ isInsideFarmPen })
    harvested = killReport.harvested || 0
    surplusInaccessible = killReport.inaccessible || 0
    await collectNearbyDrops(8, { farm: true })
  }

  await clearFarmFoodFromHand()

  let hasExitedFarmPen = false
  let exitProblem = null
  if (isInsideFarmPen) {
    const exited = await exitFarmZone('animals')
    hasExitedFarmPen = exited === true
    isInsideFarmPen = !hasExitedFarmPen
    if (!exited) {
      exitProblem = "Sortie de ferme non confirmee, verifie le portillon."
      farmDoorIssues.push('sortie non confirmee')
    }
  } else {
    hasExitedFarmPen = true
  }

  let cooked = 0
  if (options.cookMeat === true) {
    console.log('[farm][cook] cuisson demandée avant dépôt')
    cooked = await cookFarmMeat('animals')
  } else {
    console.log('[farm][deposit] dépôt coffre ferme sans cuisson')
  }

  const beforeDeposit = countItems(allAnimalDropNames())
  const deposited = await depositNamedItems(allAnimalDropNames(), 'animals')
  const depositedCount = Math.max(0, beforeDeposit - countItems(allAnimalDropNames()))
  const depositSuccess = deposited === true || depositedCount > 0 || (lastFarmDepositOpened && beforeDeposit === 0)
  const depositProblem = depositSuccess
    ? null
    : (lastFarmDepositOpened
        ? 'Depot ferme incomplet, je garde les items restants.'
        : 'Coffre ferme inaccessible, je garde les items.')
  if (depositSuccess) console.log(`[farm][chest] dépôt réussi ${depositedCount} items`)

  const leftCount = animalsNearFarm().length
  const dropsCollected = Math.max(0, beforeDeposit - dropsBefore)
  const doorReport = farmDoorIssues.length > 0 ? ` portes: ${farmDoorIssues.join(', ')}.` : ' portes OK.'
  const farmUsed = farmZones.animals ? `${farmZones.animals.x} ${farmZones.animals.y} ${farmZones.animals.z}` : 'non definie'
  const chestUsed = farmContainerPos.animals ? `${farmContainerPos.animals.x} ${farmContainerPos.animals.y} ${farmContainerPos.animals.z}` : 'non defini'
  const doorUsed = farmDoorPos.animals ? `${farmDoorPos.animals.x} ${farmDoorPos.animals.y} ${farmDoorPos.animals.z}` : 'non definie'
  const problemReport = depositProblem || exitProblem || farmDoorIssues.join(', ') || 'aucun'
  const cookingReport = options.cookMeat === true ? `oui (${cooked})` : 'non'
  console.log(`[farm][report] entree=${doorUsed} porteRefermee=${farmDoorIssues.length === 0 ? 'oui' : 'non'} dedans=${isInsideFarmPen ? 'oui' : 'non'} sorti=${hasExitedFarmPen ? 'oui' : 'non'} depot=${depositSuccess ? 'oui' : 'non'} trouves=${foundCount} nourris=${fed} tues=${harvested} surplusInaccessible=${surplusInaccessible} laisses=${leftCount} nourritureManquante=${missingFood ? 'oui' : 'non'} drops=${dropsCollected} deposes=${depositedCount} cuisson=${cookingReport} probleme=${problemReport}`)
  safeChat(`Rapport animaux: entree ${doorUsed} | sortie ${hasExitedFarmPen ? 'oui' : 'non'} | depot ${depositSuccess ? 'oui' : 'non'} | trouves ${foundCount}, nourris ${fed}, tues ${harvested}, surplus inaccessible ${surplusInaccessible}, laisses ${leftCount}, nourriture manquante ${missingFood ? 'oui' : 'non'}, drops +${dropsCollected}, deposes ${depositedCount}, cuisson ${cookingReport}.${doorReport}${depositProblem ? ` ${depositProblem}` : ''}${exitProblem ? ` ${exitProblem}` : ''}`)

  if (!hasExitedFarmPen) {
    missionRuntime.pauseMission('Ferme animaux en pause : sortie non confirmee.')
    return
  }

  if (currentMission === mission && !stopRequested) {
    if (!options.auto) automationHelpers.markAnimalFarmDone()
    missionRuntime.addMissionProgress(1)
    console.log('[farm][finish] mission terminée proprement')
    missionRuntime.finishMission()
  }

  } catch (err) {
    logError('farm animals navigation error', err)
    missionRuntime.pauseMission('Ferme animaux stoppée : erreur navigation entrée/coffre.')
  } finally {
    farmNoDigActive = false
    farmProtectionActive = false
  }
}

function findSugarCaneBlocks() {
  const sugarCane = mcData.blocksByName.sugar_cane
  if (!sugarCane) return []

  const zone = farmZoneFor('sugarcane')
  if (!zone) return []
  const positions = bot.findBlocks({
    point: zone,
    matching: sugarCane.id,
    maxDistance: CONFIG.sugarCaneRadius,
    count: 128
  })

  return positions
    .map(position => bot.blockAt(position))
    .filter(block => {
      if (!block || block.name !== 'sugar_cane') return false
      const below = bot.blockAt(block.position.offset(0, -1, 0))
      const belowBelow = bot.blockAt(block.position.offset(0, -2, 0))
      return below && below.name === 'sugar_cane' && (!belowBelow || belowBelow.name !== 'sugar_cane')
    })
    .sort((a, b) => a.position.distanceTo(zone) - b.position.distanceTo(zone))
}

async function digSugarCaneBlock(block) {
  const target = bot.blockAt(block.position)
  if (!target || target.name !== 'sugar_cane') return false

  const below = bot.blockAt(target.position.offset(0, -1, 0))
  if (!below || below.name !== 'sugar_cane') return false

  try {
    const reached = await safeGoto(new goals.GoalNear(
      target.position.x,
      target.position.y - 1,
      target.position.z,
      2
    ), 'canne a sucre', {
      attempts: 2,
      timeoutMs: 9000
    })
    if (!reached) return false

    const freshBlock = bot.blockAt(target.position)
    if (!freshBlock || freshBlock.name !== 'sugar_cane') return false

    const freshBelow = bot.blockAt(freshBlock.position.offset(0, -1, 0))
    if (!freshBelow || freshBelow.name !== 'sugar_cane') return false

    await bot.lookAt(freshBlock.position.offset(0.5, 0.5, 0.5), true)

    if (!bot.canDigBlock(freshBlock)) {
      await safeGoto(new goals.GoalNear(
        freshBlock.position.x,
        freshBlock.position.y - 1,
        freshBlock.position.z,
        2
      ), 'canne a sucre', {
        attempts: 1,
        timeoutMs: 6000
      })
      await bot.lookAt(freshBlock.position.offset(0.5, 0.5, 0.5), true)
    }

    if (!bot.canDigBlock(freshBlock)) {
      safeChat('Canne detectee mais encore hors de portee.', 8000)
      return false
    }

    await bot.dig(freshBlock, 'ignore')
    return true
  } catch (err) {
    logError('sugar cane dig error', err)
    return false
  }
}

async function farmSugarCane(options = {}) {
  const mission = options.resume && currentMission
    ? currentMission
    : missionRuntime.createMission('farmSugarCane', { targetKey: 'sugarcane', amount: 1 })

  missionActive = true
  stopRequested = false
  missionRuntime.setMissionStatus('running')
  safeChat('Mission ferme canne a sucre.')

  const reached = await goToFarmZone('sugarcane')
  if (!reached) {
    missionRuntime.pauseMission("Impossible d'aller a la ferme canne. Mission en pause.")
    return
  }

  let harvested = 0
  const sugarBefore = inventoryCount('sugar_cane')
  const blocks = findSugarCaneBlocks()

  for (const block of blocks) {
    if (stopRequested) break

    const freshBlock = bot.blockAt(block.position)
    if (!freshBlock || freshBlock.name !== 'sugar_cane') continue

    const below = bot.blockAt(freshBlock.position.offset(0, -1, 0))
    if (!below || below.name !== 'sugar_cane') continue

    try {
      const dug = await digSugarCaneBlock(freshBlock)
      if (!dug) continue

      harvested++
      if (harvested % 8 === 0) await collectNearbyDrops(8)
    } catch (err) {
      logError('sugar cane harvest error', err)
    }
  }

  await collectNearbyDrops(8)
  const sugarAfterHarvest = inventoryCount('sugar_cane')
  const pickedUp = Math.max(0, sugarAfterHarvest - sugarBefore)

  const deposited = await depositNamedItems(['sugar_cane'], 'sugarcane')
  if (!deposited) {
    missionRuntime.pauseMission("Depot canne impossible. Verifie le coffre puis dis 'reprendre'.")
    return
  }
  const depositedCount = Math.max(0, sugarAfterHarvest - inventoryCount('sugar_cane'))
  safeChat(`Rapport canne: blocs casses ${harvested}, items recuperes ${pickedUp}, deposes ${depositedCount}.`)

  if (currentMission === mission && !stopRequested) {
    missionRuntime.addMissionProgress(1)
    missionRuntime.finishMission()
  }
}

async function runFarm(kind, options = {}) {
  if (kind === 'animals') {
    await farmAnimals({ cookMeat: options.cookMeat === true })
    if (!stopRequested) safeChat('Ferme animaux terminee.')
    return
  }

  if (kind === 'sugarcane') {
    await farmSugarCane()
    if (!stopRequested) safeChat('Ferme canne terminee.')
    return
  }

  safeChat('Ferme complete: animaux puis canne.')
  await farmAnimals({ cookMeat: options.cookMeat === true })
  if (stopRequested) return
  await farmSugarCane()
  if (!stopRequested) safeChat('Rapport global ferme: animaux + canne termines.')
}

const commandContext = createCommandContextFactory({
  bot,
  config: CONFIG,
  constants: { FOOD_NAMES, VILLAGE_HINT_BLOCKS },
  getMcData: () => mcData,
  getState: () => ({ basePos, baseContainerPos, farmZones, farmContainerPos, farmDoorPos, netherPortals, buildSite, currentMission, automationState, defendMode, followTargetUsername }),
  getMemory: () => ({ basePos, baseContainerPos, farmZones, farmContainerPos, farmDoorPos, netherPortals, buildSite, currentMission, automationState }),
  state: {
    getStopRequested: () => stopRequested, setStopRequested: value => { stopRequested = value },
    setMissionActive: value => { missionActive = value }, setCurrentMission: mission => { currentMission = mission },
    setCommandRunning: value => { commandRunning = value }, setCombatRunning: value => { combatRunning = value },
    setSafetyRunning: value => { safetyRunning = value }, setDefendMode: value => { defendMode = value },
    setBasePos: value => { basePos = value }, setBaseContainerPos: value => { baseContainerPos = value },
    setNetherPortals: value => { netherPortals = value || { overworld: null, nether: null } },
    setBuildSite: value => { buildSite = value }, incrementCommandRunId: () => { runExclusive.cancel() },
    setLastBasePathFailureAt: value => { lastBasePathFailureAt = value }, stopFollow: () => { followHelpers.stopFollowPlayer(null) }
  },
  missionManager: { missionLabel: missionRuntime.missionLabel, missionProgressText: missionRuntime.missionProgressText, isMissionRunning: missionRuntime.isMissionRunning },
  say: safeChat,
  safeChat,
  helpers: {
    countInventoryByName: buildHelpers.countInventoryByName, buildBlueprintStructure: buildHelpers.buildBlueprintStructure, comeToPlayer: followHelpers.comeToPlayer, depositForMission: missionRuntime.depositForMission,
    exploreAroundBase: explorationHelpers.exploreAroundBase, exploreNether: netherHelpers.exploreNether, farmAnimals, farmSugarCane, findNearestContainer: chestHelpers.findNearestContainer, finishMission: missionRuntime.finishMission, floorVec,
    forceEat: foodHelpers.forceEat, hunt, isLoadoutItem: foodHelpers.isLoadoutItem, logMission, mine, pauseMission: missionRuntime.pauseMission, prepareMission,
    prepareBlueprintResources: buildHelpers.prepareBlueprintResources, resourceTargetByKey, returnBase, runExclusive, runFarm,
    safeGoBase, saveMemory: runtimeMemory.saveMemory, saveMission: missionRuntime.saveMission, scanAndSetBuildSite: buildHelpers.scanAndSetBuildSite, sendBlueprintList: buildHelpers.sendBlueprintList, sendBlueprintStatus: buildHelpers.sendBlueprintStatus,
    setFarm, setFarmEntry, startFollowPlayer: followHelpers.startFollowPlayer, stopFollowPlayer: followHelpers.stopFollowPlayer,
    storeItems: chestHelpers.storeItems, findNearestBed: sleepHelpers.findNearestBed,
    sleepInNearestBed: sleepHelpers.sleepInNearestBed
  }
})

process.on('uncaughtException', err => {
  if (isNetworkDisconnect(err)) {
    logConnectionProblem('connexion coupee', err)
    return
  }
  logError('uncaught exception', err)
})

process.on('unhandledRejection', err => {
  if (isNetworkDisconnect(err)) {
    logConnectionProblem('connexion coupee', err)
    return
  }
  logError('unhandled rejection', err)
})

bot.on('spawn', () => {
  botConnected = true
  console.log(`[connection] bot connecte`)
  console.log(`[guide] Aiko est en ligne. Consulte l'application > Commandes pour voir les actions disponibles.`)
  mcData = minecraftData(bot.version)
  runtimeMemory.loadMemory()
  installFarmBlockProtectionGuard()
  configureMovements()
  warnIfCreativeGameMode()

  if (baseContainerPos && bot.tool && bot.tool.chestLocations) {
    bot.tool.chestLocations.length = 0
    bot.tool.chestLocations.push(baseContainerPos)
  }

  if (!startupAnnounced) {
    startupAnnounced = true
    safeChat('Bonjour, je suis Aiko, ton assistant survival.')
    safeChat("Je n'ecoute que les owners configures.")
    safeChat('Commandes bot: écris dans le chat sans slash. Exemple: stop, pas /stop.')
    safeChat("Essaie: status, setbase, prepare, mine 16 fer, retour base.")
    safeChat("La liste complete est dans l'app: Commandes. Feature incoming = en developpement.")
  }
  if (currentMission) {
    safeChat(`Mission sauvegardée: ${missionRuntime.missionProgressText()}`)
  }
})

bot.on('death', () => {
  missionActive = false
  commandRunning = false
  stopRequested = true
  currentMission = null
  followTargetUsername = null
  followHelpers.stopFollowPlayer(null)
  missionRuntime.saveMission()
  bot.pathfinder.setGoal(null)
  safeChat('Je suis mort, mission arretee.')
})

bot.on('chat', async (username, rawMessage) => {
  if (username === bot.username) return
  if (!mcData) return

  if (!auth.isAuthorizedUser(username)) {
    console.log(`[security] commande ignoree de ${username}: ${rawMessage}`)
    return
  }

  if (await commandHandler.handle(commandContext(), rawMessage, username)) return

  const intent = parseIntent(rawMessage)
  await handleLegacyCommand(commandContext(), intent, username)
})

setInterval(() => {
  if (!botConnected || !mcData || !bot.entity || bot.health <= 0) return
  if (commandRunning) return
  if (stopRequested) return
  // Guard against overlapping calls: if ensureSurvival is already running (takes > 1500ms),
  // skip this tick instead of launching a second concurrent call.
  if (safetyRunning) return

  dangerHelpers.ensureSurvival({ allowReturn: false }).catch(err => {
    logError('background safety error', err)
  })
}, 1500)

setInterval(() => {
  if (!botConnected || !mcData || !bot.entity || bot.health <= 0) return
  if (autoSleepRunning) return

  automationHelpers.maybeAutoSleepAtBase().catch(err => {
    logError('auto sleep error', err)
  })
}, 20000)

setInterval(() => {
  if (!botConnected || !mcData || !bot.entity || bot.health <= 0) return
  if (autoFarmRunning) return

  automationHelpers.maybeAutoFarmAnimals().catch(err => {
    logError('auto farm animals error', err)
  })
}, 45000)

