module.exports = {
  name: 'exploreNether',
  aliases: ['explore nether', 'explorer nether', 'exploration nether'],
  intentTypes: ['exploreNether'],
  run: async ctx => {
    await ctx.helpers.runExclusive(async () => {
      await ctx.helpers.exploreNether()
    })
  }
}
