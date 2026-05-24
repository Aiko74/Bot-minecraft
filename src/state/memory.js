const fs = require('fs')
const path = require('path')
const { Vec3 } = require('vec3')
const { resourceTargetByKey } = require('../data/resources')

const MEMORY_FILE = process.env.AIKO_MEMORY_FILE || path.join(__dirname, '..', '..', 'bot-memory.json')

function vecToJSON(pos) {
  if (!pos) return null
  return { x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) }
}

function vecFromJSON(value) {
  if (!value || typeof value.x !== 'number' || typeof value.y !== 'number' || typeof value.z !== 'number') {
    return null
  }

  return new Vec3(value.x, value.y, value.z)
}

function loadVecMap(value) {
  return {
    animals: vecFromJSON(value && value.animals),
    sugarcane: vecFromJSON(value && value.sugarcane)
  }
}

function saveVecMap(value) {
  return {
    animals: vecToJSON(value.animals),
    sugarcane: vecToJSON(value.sugarcane)
  }
}

function loadPortalMap(value) {
  return {
    overworld: vecFromJSON(value && value.overworld),
    nether: vecFromJSON(value && value.nether)
  }
}

function savePortalMap(value = {}) {
  return {
    overworld: vecToJSON(value.overworld),
    nether: vecToJSON(value.nether)
  }
}

function serializeMission(mission) {
  if (!mission) return null

  return {
    type: mission.type,
    targetKey: mission.targetKey || null,
    amount: mission.amount,
    progress: mission.progress || 0,
    deposited: mission.deposited || 0,
    trips: mission.trips || 0,
    status: mission.status || 'paused',
    priority: mission.priority || 0,
    startedAt: mission.startedAt || Date.now()
  }
}

function deserializeMission(mission) {
  if (!mission || typeof mission !== 'object') return null
  if (mission.type === 'mine' && !resourceTargetByKey(mission.targetKey)) return null
  if (!['mine', 'hunt', 'farmAnimals', 'farmSugarCane', 'farmAll'].includes(mission.type)) return null

  return {
    type: mission.type,
    targetKey: mission.targetKey || null,
    amount: Number(mission.amount) || 0,
    progress: Number(mission.progress) || 0,
    deposited: Number(mission.deposited) || 0,
    trips: Number(mission.trips) || 0,
    status: mission.status === 'running' ? 'paused' : (mission.status || 'paused'),
    priority: Number(mission.priority) || 0,
    startedAt: mission.startedAt || Date.now()
  }
}

function loadMemory() {
  try {
    const memory = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'))
    return {
      basePos: vecFromJSON(memory.base),
      baseContainerPos: vecFromJSON(memory.container),
      farmZones: loadVecMap(memory.farms),
      farmContainerPos: loadVecMap(memory.farmContainers),
      farmDoorPos: loadVecMap(memory.farmDoors),
      netherPortals: loadPortalMap(memory.netherPortals),
      buildSite: vecFromJSON(memory.buildSite),
      currentMission: deserializeMission(memory.mission),
      automation: {
        lastAnimalFarmDay: typeof memory.lastAnimalFarmDay === 'number'
          ? memory.lastAnimalFarmDay
          : (memory.automation && typeof memory.automation.lastAnimalFarmDay === 'number'
              ? memory.automation.lastAnimalFarmDay
              : null),
        nextAnimalFarmDay: memory.automation && typeof memory.automation.nextAnimalFarmDay === 'number'
          ? memory.automation.nextAnimalFarmDay
          : null
      }
    }
  } catch {
    return {
      basePos: null,
      baseContainerPos: null,
      farmZones: { animals: null, sugarcane: null },
      farmContainerPos: { animals: null, sugarcane: null },
      farmDoorPos: { animals: null, sugarcane: null },
      netherPortals: { overworld: null, nether: null },
      buildSite: null,
      currentMission: null,
      automation: { lastAnimalFarmDay: null, nextAnimalFarmDay: null }
    }
  }
}

function saveMemory(state, logError = () => {}) {
  try {
    fs.writeFileSync(
      MEMORY_FILE,
      JSON.stringify({
        base: vecToJSON(state.basePos),
        container: vecToJSON(state.baseContainerPos),
        farms: saveVecMap(state.farmZones),
        farmContainers: saveVecMap(state.farmContainerPos),
        farmDoors: saveVecMap(state.farmDoorPos || { animals: null, sugarcane: null }),
        netherPortals: savePortalMap(state.netherPortals),
        buildSite: vecToJSON(state.buildSite),
        mission: serializeMission(state.currentMission),
        automation: state.automation || { lastAnimalFarmDay: null, nextAnimalFarmDay: null }
      }, null, 2)
    )
  } catch (err) {
    logError('memory save error', err)
  }
}

module.exports = {
  deserializeMission,
  loadMemory,
  saveMemory,
  serializeMission,
  vecFromJSON,
  vecToJSON
}
