function depositSucceeded(result) {
  return Boolean(result && (result.ok || result.depositedCount > 0 || result.startingCount === 0))
}

module.exports = {
  name: 'depot',
  aliases: ['depot', 'depose', 'depose tout'],
  intentTypes: ['deposit'],
  run: async ctx => {
    await ctx.helpers.runExclusive(async () => {
      ctx.state.setStopRequested(false)
      const reached = await ctx.helpers.safeGoBase({ force: true, ignoreStop: true, quiet: true })
      if (!reached) {
        ctx.say('⚠️ Coffre inaccessible.')
        return
      }

      const stored = await ctx.helpers.storeItems({
        keepFood: false,
        keepLoadout: false,
        baseOnly: true,
        details: true,
        quiet: true
      })

      if (depositSucceeded(stored)) ctx.say('✅ Dépôt terminé.')
      else ctx.say('⚠️ Coffre inaccessible.')
    })
  }
}
