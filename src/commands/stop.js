module.exports = {
  name: 'stop',
  aliases: ['stop', 'annule', 'arrete', 'stop mission'],
  intentTypes: ['stop'],
  run: async ctx => {
    ctx.state.incrementCommandRunId()
    ctx.state.setMissionActive(false)
    ctx.state.setStopRequested(true)
    ctx.state.setCurrentMission(null)
    ctx.state.setCommandRunning(false)
    if (ctx.state.setCombatRunning) ctx.state.setCombatRunning(false)
    if (ctx.state.setSafetyRunning) ctx.state.setSafetyRunning(false)
    ctx.state.stopFollow()
    ctx.state.setLastBasePathFailureAt(Date.now())
    ctx.helpers.saveMission()
    ctx.bot.pathfinder.setGoal(null)
    ctx.bot.clearControlStates()
    ctx.helpers.logMission('stop all')
    ctx.say('🛑 Mission arrêtée.')
  }
}
