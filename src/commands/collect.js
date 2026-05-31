module.exports = {
  name: 'collect',
  aliases: ['collect', 'collecte', 'ramasse', 'coupe des arbres'],
  intentTypes: ['collect'],
  run: async (ctx, args, rawMessage, intent) => {
    if (!intent.target) {
      ctx.say('📦 Collecter quoi ? Exemple : collect 64 bois.')
      return
    }

    await ctx.helpers.runExclusive(async () => {
      await ctx.helpers.prepareMission({ missionType: 'collect', target: intent.target, quiet: true })
      if (ctx.state.getStopRequested()) return
      await ctx.helpers.mine(intent.target, intent.amount)
    })
  }
}
