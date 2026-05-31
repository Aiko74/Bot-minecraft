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

  function depositSucceeded(result) {
    return Boolean(result && (result.ok || result.depositedCount > 0 || result.startingCount === 0))
  }

  function targetDepositLabel(target) {
    const labels = {
      ancient_debris: 'Ancient debris',
      coal: 'Charbon',
      copper: 'Cuivre',
      diamond: 'Diamant',
      emerald: 'Émeraude',
      gold: 'Or',
      iron: 'Fer',
      lapis: 'Lapis',
      nether_gold: 'Or du Nether',
      netherrack: 'Netherrack',
      quartz: 'Quartz',
      redstone: 'Redstone',
      wood: 'Bois',
      cobblestone: 'Pierre',
      sand: 'Sable',
      dirt: 'Terre'
    }

    return labels[target && target.key] || (target && target.label) || 'Ressource'
  }

  function logDepositFinal(stored, success, targetDepositedCount, targetRemaining) {
    const opened = Boolean(stored && stored.opened)
    const depositedCount = stored && typeof stored.depositedCount === 'number' ? stored.depositedCount : 0
    const remaining = stored && typeof stored.remaining === 'number' ? stored.remaining : 'unknown'
    console.log(`[deposit-final] opened=${opened} depositedCount=${depositedCount} remaining=${remaining} targetDeposited=${targetDepositedCount} targetRemaining=${targetRemaining} success=${success}`)
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

  function finishMission(options = {}) {
    const currentMission = deps.getCurrentMission()
    if (!currentMission) return
    deps.logMission(`finish ${missionLabel()}`)
    if (!options.quiet) deps.safeChat('✅ Mission terminée.')
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

  function formatDepositMissionResult(result, details) {
    return details ? result : result.ok
  }

  async function depositForMission(reason = 'Dépôt mission.', options = {}) {
    if (!deps.getBasePos()) {
      pauseMission('Base non définie. Fais setbase puis relance la commande.')
      return formatDepositMissionResult({ ok: false }, options.details === true)
    }

    const currentMission = deps.getCurrentMission()
    const target = currentMission && (currentMission.type === 'mine' || currentMission.type === 'collect')
      ? deps.resourceTargetByKey(currentMission.targetKey)
      : null
    const itemsBefore = target ? deps.countItems(target.drops) : 0

    if (reason) deps.safeChat(reason, 5000)

    const reached = await deps.safeGoBase({ force: true, quiet: true })
    if (deps.isStopRequested()) {
      return formatDepositMissionResult({ ok: false, cancelled: true }, options.details === true)
    }

    const finalAtBase = reached || (deps.isNearBase && deps.isNearBase(10))
    if (!finalAtBase) {
      pauseMission('Retour base impossible. Mission stoppée proprement.')
      return formatDepositMissionResult({ ok: false }, options.details === true)
    }

    const stored = await deps.storeItems({ baseOnly: true, details: true, quiet: true })
    const itemsAfter = target ? deps.countItems(target.drops) : 0
    const targetDepositedCount = target ? Math.max(0, itemsBefore - itemsAfter) : 0
    const targetItemsDeposited = Boolean(target && itemsBefore > 0 && (targetDepositedCount > 0 || itemsAfter === 0))
    const success = depositSucceeded(stored) || targetItemsDeposited

    logDepositFinal(stored, success, targetDepositedCount, itemsAfter)

    if (!success) {
      pauseMission('Dépôt impossible. Vérifie le coffre de base puis relance la commande.')
      return formatDepositMissionResult({
        ok: false,
        stored,
        target,
        targetDepositedCount,
        targetRemaining: itemsAfter
      }, options.details === true)
    }

    const updatedMission = deps.getCurrentMission()
    if (updatedMission) {
      updatedMission.trips = (updatedMission.trips || 0) + 1

      if (target) {
        updatedMission.deposited = (updatedMission.deposited || 0) + targetDepositedCount
      }

      saveMission()
    }

    if (target && targetDepositedCount > 0 && options.announceDeposit !== false) {
      deps.safeChat(`📦 ${targetDepositLabel(target)} déposé : ${targetDepositedCount}.`, 6000)
    }

    await deps.takeLoadoutFromChest({ baseOnly: true, quiet: true })
    return formatDepositMissionResult({
      ok: true,
      stored,
      target,
      targetDepositedCount,
      targetRemaining: itemsAfter
    }, options.details === true)
  }

  async function finalizeMissionWithBaseDeposit(mission, reason) {
    if (deps.getCurrentMission() !== mission || deps.isStopRequested()) return false

    await deps.collectNearbyDrops(8)

    if (!deps.getBasePos()) {
      deps.safeChat(`${reason} Base non définie, je ne peux pas déposer automatiquement.`)
      finishMission()
      return true
    }

    const deposited = await depositForMission(null, { details: true, announceDeposit: false })
    if (deposited.ok && deps.getCurrentMission() === mission && !deps.isStopRequested()) {
      deps.safeChat('✅ Mission terminée.')
      if (deposited.target && deposited.targetDepositedCount > 0) {
        deps.safeChat(`📦 ${targetDepositLabel(deposited.target)} déposé : ${deposited.targetDepositedCount}.`)
      }
      deps.safeChat('🏠 Retour à la base.', 6000)
      finishMission({ quiet: true })
      return true
    }

    return false
  }

  async function recoverAtBase(reason) {
    deps.safeChat(`${reason}, retour sécurité base.`, 8000)

    const deposited = await depositForMission('Dépôt sécurité avant reprise.')
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
