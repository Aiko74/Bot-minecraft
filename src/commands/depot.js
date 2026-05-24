module.exports = {
  name: 'depot',
  aliases: ['depot', 'depose', 'depose tout', 'range le stuff'],
  intentTypes: ['deposit'],
  run: async ctx => {
    await ctx.helpers.runExclusive(async () => {
      ctx.state.setStopRequested(false)
      await ctx.helpers.safeGoBase({ force: true, ignoreStop: true })
      const stored = await ctx.helpers.storeItems({ keepFood: false, keepLoadout: false })
      if (stored) ctx.say('📦 Dépôt terminé.')
      else ctx.say('⚠️ Dépôt incomplet : coffre de base plein ou inaccessible.')
    })
  }
}
