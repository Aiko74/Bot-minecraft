function createFollowHelpers(deps) {
  let followTimer = null

  function playerEntity(username) {
    return deps.bot.players[username] && deps.bot.players[username].entity
  }

  async function comeToPlayer(username) {
    const player = playerEntity(username)
    if (!player) {
      deps.safeChat("Je ne te vois pas. Rapproche-toi.")
      return false
    }

    deps.safeChat("J'arrive.")
    return deps.safeGoto(new deps.goals.GoalFollow(player, 2), `joueur ${username}`, {
      attempts: 2,
      timeoutMs: 12000
    })
  }

  function stopFollowPlayer(message = '🟡 Suivi terminé, retour aux occupations.') {
    deps.setFollowTargetUsername(null)
    if (followTimer) {
      clearInterval(followTimer)
      followTimer = null
    }
    deps.bot.pathfinder.setGoal(null)
    deps.bot.clearControlStates()
    if (message) deps.safeChat(message)
  }

  function startFollowPlayer(username) {
    if (deps.isCommandRunning() || deps.isMissionActive()) {
      deps.safeChat("Je suis déjà en mission. Dis stop avant de me faire suivre.", 5000)
      return
    }

    const player = playerEntity(username)
    if (!player) {
      deps.safeChat("Je ne te vois pas, impossible de te suivre.")
      return
    }

    deps.setFollowTargetUsername(username)
    deps.setStopRequested(false)
    if (followTimer) clearInterval(followTimer)

    followTimer = setInterval(() => {
      const followTargetUsername = deps.getFollowTargetUsername()
      if (!followTargetUsername || deps.isCommandRunning() || deps.isMissionActive() || deps.isStopRequested()) return

      const target = playerEntity(followTargetUsername)
      if (!target) {
        deps.safeChat('Je ne te vois plus.', 10000)
        return
      }

      try {
        deps.bot.pathfinder.setMovements(deps.getDefaultMove())
        deps.bot.pathfinder.setGoal(new deps.goals.GoalFollow(target, 2), true)
      } catch (err) {
        deps.logError('follow error', err)
      }
    }, 1200)

    deps.bot.pathfinder.setGoal(new deps.goals.GoalFollow(player, 2), true)
    deps.safeChat('🟢 Mode suivi activé, je reste avec toi.')
  }

  return {
    comeToPlayer,
    playerEntity,
    startFollowPlayer,
    stopFollowPlayer
  }
}

module.exports = {
  createFollowHelpers
}
