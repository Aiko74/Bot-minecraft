function createAutomationHelpers(deps) {
  let lastAutoFarmBusyLogAt = 0

  function isNightTime() {
    const timeOfDay = deps.bot.time && typeof deps.bot.time.timeOfDay === 'number'
      ? deps.bot.time.timeOfDay
      : null
    if (timeOfDay === null) return false
    return timeOfDay >= 12542 && timeOfDay <= 23460
  }

  function minecraftDay() {
    const rawAge = deps.bot.time && (typeof deps.bot.time.age === 'number'
      ? deps.bot.time.age
      : (typeof deps.bot.time.bigAge === 'number' ? deps.bot.time.bigAge : null))
    if (rawAge === null) return null
    return Math.floor(rawAge / 24000)
  }

  function animalFarmIntervalDays() {
    return Number(deps.config.autoFarmAnimalsDays) || 0
  }

  function automationState() {
    const state = deps.getAutomationState() || {}
    if (typeof state.lastAnimalFarmDay !== 'number') state.lastAnimalFarmDay = null
    if (typeof state.nextAnimalFarmDay !== 'number') state.nextAnimalFarmDay = null
    return state
  }

  function logNextAnimalFarm(day) {
    const intervalDays = animalFarmIntervalDays()
    if (intervalDays <= 0) return
    const state = automationState()
    if (typeof state.nextAnimalFarmDay === 'number') {
      deps.logTag('farm', `auto ferme: prochaine ferme animaux au jour ${state.nextAnimalFarmDay}`)
      return
    }
    if (typeof day === 'number') {
      deps.logTag('farm', `auto ferme: prochaine ferme animaux au jour ${day + intervalDays}`)
    }
  }

  function startAnimalFarmTimer(day = minecraftDay()) {
    const intervalDays = animalFarmIntervalDays()
    if (intervalDays <= 0 || day === null) return
    const state = automationState()
    state.lastAnimalFarmDay = day
    state.nextAnimalFarmDay = day + intervalDays
    deps.saveMemory()
    logNextAnimalFarm(day)
  }

  function ensureAnimalFarmTimer(day, intervalDays) {
    const state = automationState()
    let changed = false

    if (state.lastAnimalFarmDay === null) {
      state.lastAnimalFarmDay = day
      changed = true
    }

    if (state.nextAnimalFarmDay === null) {
      state.nextAnimalFarmDay = state.lastAnimalFarmDay + intervalDays
      changed = true
    }

    if (changed) {
      deps.saveMemory()
      logNextAnimalFarm(day)
    }

    return state
  }

  function advanceAnimalFarmTimerAfterSuccess(day, intervalDays) {
    const state = ensureAnimalFarmTimer(day, intervalDays)
    let nextDay = state.nextAnimalFarmDay

    while (nextDay <= day) {
      nextDay += intervalDays
    }

    state.lastAnimalFarmDay = day
    state.nextAnimalFarmDay = nextDay
    deps.saveMemory()
    logNextAnimalFarm(day)
  }

  function markAnimalFarmDone(day = minecraftDay()) {
    const intervalDays = animalFarmIntervalDays()
    if (intervalDays <= 0 || day === null) return
    const state = automationState()
    state.lastAnimalFarmDay = day
    state.nextAnimalFarmDay = day + intervalDays
    deps.saveMemory()
    logNextAnimalFarm(day)
  }

  function hasActiveMission() {
    const currentMission = deps.getCurrentMission()
    return deps.isCommandRunning() ||
      deps.isMissionActive() ||
      deps.isStopRequested() ||
      (currentMission && currentMission.status === 'running')
  }

  function logAutoFarmBusy(currentMission) {
    const now = Date.now()
    if (now - lastAutoFarmBusyLogAt < 60000) return
    lastAutoFarmBusyLogAt = now
    const label = currentMission && currentMission.type ? currentMission.type : 'commande'
    deps.logTag('farm', `auto ferme ignoree: mission en cours (${label})`)
  }

  async function maybeAutoSleepAtBase() {
    if (!deps.config.autoSleepAtBase) return
    if (deps.isAutoSleepRunning() || deps.isStopRequested()) return
    if (deps.isCommandRunning() || deps.isMissionActive() || deps.isFarmNoDigActive() || (deps.getCurrentMission() && deps.getCurrentMission().status === 'running')) {
      deps.logTag('sleep', 'ignore: mission active')
      return
    }
    if (!deps.getBasePos() || !isNightTime()) return

    deps.setAutoSleepRunning(true)
    try {
      deps.logTag('sleep', 'auto sleep check')
      if (!deps.isNearBase(16)) {
        const reached = await deps.safeGoBase({ force: true, quiet: true })
        if (!reached) {
          deps.safeChat('Nuit detectee, mais je ne peux pas revenir dormir a la base.', 12000)
          return
        }
      }

      const slept = await deps.sleepInNearestBed({ baseOnly: true, maxDistance: 28, quiet: true })
      if (slept) deps.safeChat('Nuit: je dors a la base.', 12000)
      else deps.safeChat('Nuit: aucun lit trouve pres de la base.', 12000)
    } finally {
      deps.setAutoSleepRunning(false)
    }
  }

  async function maybeAutoFarmAnimals() {
    const intervalDays = animalFarmIntervalDays()
    if (intervalDays <= 0) return
    if (deps.isAutoFarmRunning()) return
    if (!deps.getFarmZones().animals) return

    const day = minecraftDay()
    if (day === null) return

    const state = ensureAnimalFarmTimer(day, intervalDays)
    if (day < state.nextAnimalFarmDay) return

    const currentMission = deps.getCurrentMission()
    if (hasActiveMission()) {
      logAutoFarmBusy(currentMission)
      return
    }

    deps.logTag('farm', `auto ferme animaux: jour ${day}, seuil ${state.nextAnimalFarmDay}`)
    deps.setAutoFarmRunning(true)
    try {
      deps.safeChat(`Auto ferme animaux: jour ${day}, je m'en occupe.`, 12000)
      await deps.runExclusive(async () => {
        await deps.farmAnimals({ auto: true })
      }, { name: 'farmAnimals' })

      const afterMission = deps.getCurrentMission()
      const farmStillActive = afterMission && afterMission.type === 'farmAnimals'
      if (farmStillActive || deps.isMissionActive() || deps.isStopRequested()) {
        deps.logTag('farm', 'auto ferme non validee: mission en pause ou interrompue')
        return
      }

      advanceAnimalFarmTimerAfterSuccess(day, intervalDays)
    } catch (err) {
      if (deps.logError) deps.logError('auto farm animals error', err)
      else deps.logTag('farm', `auto farm animals error ${err && err.message ? err.message : err}`)
    } finally {
      deps.setAutoFarmRunning(false)
    }
  }

  return {
    markAnimalFarmDone,
    maybeAutoFarmAnimals,
    maybeAutoSleepAtBase,
    minecraftDay,
    startAnimalFarmTimer
  }
}

module.exports = {
  createAutomationHelpers
}
