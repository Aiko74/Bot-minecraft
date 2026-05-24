module.exports = {
  name: 'range',
  aliases: ['range', 'range tout', 'trie inventaire'],
  intentTypes: ['sortStorage'],
  run: async ctx => {
    await ctx.helpers.runExclusive(async () => {
      ctx.state.setStopRequested(false)
      await ctx.helpers.safeGoBase({ force: true, ignoreStop: true })
      const stored = await ctx.helpers.storeItems({ keepPathBlocks: true })
      if (stored) ctx.say('📦 Inventaire rangé, équipement de survie gardé.')
      else ctx.say('⚠️ Rangement incomplet : coffre de base plein ou inaccessible.')
    })
  }
}
