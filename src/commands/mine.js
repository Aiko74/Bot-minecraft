module.exports = {
  name: 'mine',
  aliases: ['mine', 'miner', 'va miner', 'va chercher'],
  intentTypes: ['mine'],
  run: async (ctx, args, rawMessage, intent) => {
    if (!intent.target) {
      ctx.say('⛏️ Miner quoi ? Exemple : mine 32 fer.')
      return
    }

    await ctx.helpers.runExclusive(async () => {
      if (intent.target.kind === 'material') {
        await ctx.helpers.prepareMission({ missionType: 'collect', target: intent.target, quiet: true })
      } else {
        await ctx.helpers.prepareMission({ missionType: 'mine', target: intent.target, quiet: true })
      }
      if (ctx.state.getStopRequested()) return
      await ctx.helpers.mine(intent.target, intent.amount)
    })
  }
}
