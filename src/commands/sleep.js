module.exports = {
  name: 'sleep',
  aliases: ['sleep', 'dors', 'va dormir'],
  intentTypes: ['sleep'],
  run: async ctx => {
    await ctx.helpers.runExclusive(async () => {
      await ctx.helpers.sleepInNearestBed()
    })
  }
}
