function createAutomationHelpers(deps) {
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
    const intervalDays = Number(deps.config.autoFarmAnimalsDays) || 0
    if (intervalDays <= 0) return
    if (deps.isAutoFarmRunning() || deps.isCommandRunning() || deps.isMissionActive() || deps.isStopRequested()) return
    if (!deps.getFarmZones().animals) return

    const day = minecraftDay()
    if (day === null) return

    const automationState = deps.getAutomationState()
    if (automationState.lastAnimalFarmDay === null) {
      automationState.lastAnimalFarmDay = day
      deps.saveMemory()
      return
    }

    if (day - automationState.lastAnimalFarmDay < intervalDays) return

    deps.setAutoFarmRunning(true)
    try {
      deps.safeChat(`Auto ferme animaux: ${intervalDays} jours Minecraft ecoules.`, 12000)
      await deps.runExclusive(async () => {
        await deps.farmAnimals({ auto: true })
      })
      if (!deps.getCurrentMission() || deps.getCurrentMission().type !== 'farmAnimals') {
        automationState.lastAnimalFarmDay = day
        deps.saveMemory()
      }
    } finally {
      deps.setAutoFarmRunning(false)
    }
  }

  return {
    maybeAutoFarmAnimals,
    maybeAutoSleepAtBase,
    minecraftDay
  }
}

module.exports = {
  createAutomationHelpers
}
