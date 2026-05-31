function createRunExclusive(deps) {
  let activeCommandName = null
  let commandRunId = 0

  async function runExclusive(task, options = {}) {
    if (deps.isCommandRunning() || deps.isMissionActive() || deps.isMissionRunning()) {
      if (options.name === 'farmAnimals' && (activeCommandName === 'farmAnimals' || deps.isMissionRunning('farmAnimals'))) {
        deps.safeChat('Mission déjà en cours : ferme animaux.', 5000)
        return
      }

      deps.safeChat("Je suis deja en mission. Dis 'stop' pour annuler.", 5000)
      return
    }

    const runId = ++commandRunId
    deps.setCommandRunning(true)
    activeCommandName = options.name || null
    deps.setStopRequested(false)
    try {
      await task()
    } catch (err) {
      deps.logError('command error', err)
      deps.setMissionActive(false)
      deps.setStopRequested(true)
      deps.bot.pathfinder.setGoal(null)
      deps.bot.clearControlStates()
      const currentMission = deps.getCurrentMission()
      if (currentMission) {
        currentMission.status = 'paused'
        deps.saveMission()
        deps.safeChat('Erreur pendant la commande. Je repasse en état stable.')
      } else {
        deps.safeChat('Erreur pendant la commande, retour a un etat stable.')
      }
    } finally {
      if (commandRunId === runId) {
        deps.setCommandRunning(false)
        activeCommandName = null
      }
    }
  }

  runExclusive.cancel = () => {
    commandRunId++
    activeCommandName = null
  }

  return runExclusive
}

module.exports = {
  createRunExclusive
}
