module.exports = {
  name: 'mission',
  aliases: ['mission'],
  intentTypes: ['missionStatus'],
  run: async ctx => {
    ctx.say(ctx.missionManager.missionProgressText(ctx.getState().currentMission))
  }
}
