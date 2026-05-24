module.exports = {
  name: 'mine',
  aliases: ['mine', 'miner', 'va miner', 'va chercher'],
  intentTypes: ['mine'],
  run: async (ctx, args, rawMessage, intent) => {
    await ctx.helpers.runExclusive(async () => {
      await ctx.helpers.prepareMission({ missionType: 'mine', target: intent.target, quiet: true })
      if (ctx.state.getStopRequested()) return
      await ctx.helpers.mine(intent.target, intent.amount)
    })
  }
}
