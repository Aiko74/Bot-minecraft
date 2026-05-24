module.exports = {
  name: 'mange',
  aliases: ['mange', 'eat'],
  intentTypes: ['eat'],
  run: async ctx => {
    await ctx.helpers.runExclusive(async () => {
      await ctx.helpers.forceEat()
    })
  }
}
