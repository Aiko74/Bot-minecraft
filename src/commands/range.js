module.exports = {
  name: 'range',
  aliases: ['range', 'range tout', 'trie inventaire'],
  intentTypes: ['sortStorage'],
  run: async ctx => {
    await ctx.helpers.runExclusive(async () => {
      ctx.state.setStopRequested(false)
      await ctx.helpers.safeGoBase({ force: true, ignoreStop: true })
      const stored = await ctx.helpers.storeItems({ keepFood: false, keepLoadout: false })
      if (stored) ctx.say('Inventaire range dans les coffres de base.')
    })
  }
}
