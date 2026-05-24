function createFollowHelpers(deps) {
  let followTimer = null

  function playerEntity(username) {
    return deps.bot.players[username] && deps.bot.players[username].entity
  }

  async function comeToPlayer(username) {
    const player = playerEntity(username)
    if (!player) {
      deps.safeChat("Je ne te vois pas. Rapproche-toi ou attends que le chunk soit charge.")
      return false
    }

    deps.safeChat(`J'arrive vers ${username}.`)
    return deps.safeGoto(new deps.goals.GoalFollow(player, 2), `joueur ${username}`, {
      attempts: 2,
      timeoutMs: 12000
    })
  }

  function stopFollowPlayer(message = 'Je ne suis plus personne.') {
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
      deps.safeChat("Je suis deja occupe. Dis stop puis suis moi si tu veux interrompre la mission.", 5000)
      return
    }

    const player = playerEntity(username)
    if (!player) {
      deps.safeChat("Je ne te vois pas, impossible de te suivre pour l'instant.")
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
        deps.safeChat("Je ne vois plus le joueur a suivre.", 10000)
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
    deps.safeChat('🚶 Je te suis...')
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
