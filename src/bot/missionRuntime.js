function createMissionRuntime(deps) {
  function missionLabel(mission = deps.getCurrentMission()) {
    return deps.missionText.missionLabel(mission)
  }

  function missionProgressText(mission = deps.getCurrentMission()) {
    return deps.missionText.missionProgressText(mission)
  }

  function saveMission() {
    deps.saveMemory()
  }

  function createMission(type, options = {}) {
    deps.logMission(`start ${type}`)
    const mission = {
      type,
      targetKey: options.targetKey || null,
      amount: Number(options.amount) || 0,
      progress: 0,
      deposited: 0,
      trips: 0,
      status: 'running',
      priority: Number(options.priority) || 0,
      startedAt: Date.now()
    }

    deps.setCurrentMission(mission)
    saveMission()
    return mission
  }

  function isMissionRunning(type = null) {
    const currentMission = deps.getCurrentMission()
    if (!currentMission || currentMission.status !== 'running') return false
    if (type && currentMission.type !== type) return false
    return deps.isMissionActive() === true
  }

  function setMissionStatus(status) {
    const currentMission = deps.getCurrentMission()
    if (!currentMission) return
    currentMission.status = status
    deps.logMission(`${missionLabel()} -> ${status}`)
    saveMission()
  }

  function addMissionProgress(count) {
    const currentMission = deps.getCurrentMission()
    if (!currentMission) return
    currentMission.progress = Math.min(currentMission.amount, (currentMission.progress || 0) + Math.max(0, count))
    saveMission()
  }

  function finishMission() {
    const currentMission = deps.getCurrentMission()
    if (!currentMission) return
    deps.logMission(`finish ${missionLabel()}`)
    deps.safeChat(`Mission terminee: ${missionLabel()}.`)
    deps.setCurrentMission(null)
    deps.setMissionActive(false)
    deps.setStopRequested(false)
    saveMission()
  }

  function pauseMission(reason = 'Mission mise en pause.') {
    const currentMission = deps.getCurrentMission()
    deps.setMissionActive(false)
    deps.setStopRequested(true)
    deps.bot.pathfinder.setGoal(null)
    deps.bot.clearControlStates()

    if (currentMission) {
      deps.logMission(`pause ${missionLabel()}: ${reason}`)
      currentMission.status = 'paused'
      saveMission()
    }

    deps.safeChat(reason)
  }

  async function depositForMission(reason = 'Depot mission.') {
    if (!deps.getBasePos()) {
      pauseMission("Base non definie. Dis 'setbase' pres du coffre puis 'reprendre'.")
      return false
    }

    const currentMission = deps.getCurrentMission()
    const target = currentMission && currentMission.type === 'mine'
      ? deps.resourceTargetByKey(currentMission.targetKey)
      : null
    const itemsBefore = target ? deps.countItems(target.drops) : 0

    deps.safeChat(reason, 5000)

    const reached = await deps.safeGoBase({ force: true })
    if (!reached) {
      pauseMission("Impossible de revenir a la base. Mission en pause.")
      return false
    }

    const stored = await deps.storeItems()
    if (!stored) {
      pauseMission("Depot impossible. Verifie le coffre de base puis dis 'reprendre'.")
      return false
    }

    const updatedMission = deps.getCurrentMission()
    if (updatedMission) {
      updatedMission.trips = (updatedMission.trips || 0) + 1

      if (target) {
        const itemsAfter = deps.countItems(target.drops)
        updatedMission.deposited = (updatedMission.deposited || 0) + Math.max(0, itemsBefore - itemsAfter)
      }

      saveMission()
    }

    await deps.takeLoadoutFromChest()
    return true
  }

  async function finalizeMissionWithBaseDeposit(mission, reason) {
    if (deps.getCurrentMission() !== mission || deps.isStopRequested()) return false

    await deps.collectNearbyDrops(8)

    if (!deps.getBasePos()) {
      deps.safeChat(`${reason} Base non definie, je ne peux pas deposer automatiquement.`)
      finishMission()
      return true
    }

    const deposited = await depositForMission(reason || 'Retour base et depot.')
    if (deposited && deps.getCurrentMission() === mission && !deps.isStopRequested()) {
      finishMission()
      return true
    }

    return false
  }

  async function recoverAtBase(reason) {
    deps.safeChat(`${reason}, retour securite base.`, 8000)

    const deposited = await depositForMission('Depot securite avant reprise.')
    if (!deposited) return false

    await deps.food.autoEat(true)
    await deps.sleep(1000)
    return true
  }

  return {
    addMissionProgress,
    createMission,
    depositForMission,
    finalizeMissionWithBaseDeposit,
    finishMission,
    isMissionRunning,
    missionLabel,
    missionProgressText,
    pauseMission,
    recoverAtBase,
    saveMission,
    setMissionStatus
  }
}

module.exports = {
  createMissionRuntime
}
