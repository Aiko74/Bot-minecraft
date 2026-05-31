function rangeSucceeded(result) {
  return Boolean(result && (result.ok || result.depositedCount > 0 || result.startingCount === 0))
}

module.exports = {
  name: 'range',
  aliases: ['range', 'range tout', 'trie inventaire', 'range le stuff'],
  intentTypes: ['sortStorage'],
  run: async ctx => {
    await ctx.helpers.runExclusive(async () => {
      ctx.state.setStopRequested(false)
      const reached = await ctx.helpers.safeGoBase({ force: true, ignoreStop: true, quiet: true })
      if (!reached) {
        ctx.say('⚠️ Coffre inaccessible.')
        return
      }

      const stored = await ctx.helpers.storeItems({
        keepFood: true,
        keepLoadout: true,
        keepPathBlocks: true,
        baseOnly: true,
        details: true,
        quiet: true
      })

      if (rangeSucceeded(stored)) ctx.say('✅ Inventaire rangé.')
      else ctx.say('⚠️ Coffre inaccessible.')
    })
  }
}
