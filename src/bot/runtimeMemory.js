function createRuntimeMemory(deps) {
  function loadMemory() {
    const memory = deps.readMemory()
    deps.setBasePos(memory.basePos)
    deps.setBaseContainerPos(memory.baseContainerPos)
    deps.setFarmZones(memory.farmZones)
    deps.setFarmContainerPos(memory.farmContainerPos)
    deps.setFarmDoorPos(memory.farmDoorPos || { animals: null, sugarcane: null })
    deps.setNetherPortals(memory.netherPortals || { overworld: null, nether: null })
    deps.setBuildSite(memory.buildSite)
    deps.setCurrentMission(memory.currentMission)
    deps.setAutomationState(memory.automation || { lastAnimalFarmDay: null, nextAnimalFarmDay: null })
  }

  function saveMemory() {
    deps.writeMemory({
      basePos: deps.getBasePos(),
      baseContainerPos: deps.getBaseContainerPos(),
      farmZones: deps.getFarmZones(),
      farmContainerPos: deps.getFarmContainerPos(),
      farmDoorPos: deps.getFarmDoorPos(),
      netherPortals: deps.getNetherPortals(),
      buildSite: deps.getBuildSite(),
      currentMission: deps.getCurrentMission(),
      automation: deps.getAutomationState()
    }, deps.logError)
  }

  return {
    loadMemory,
    saveMemory
  }
}

module.exports = {
  createRuntimeMemory
}
