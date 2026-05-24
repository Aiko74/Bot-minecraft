module.exports = {
  name: 'prepare',
  aliases: ['prepare', 'equip', 'prepare toi', 'prepares toi'],
  intentTypes: ['prepare'],
  run: async ctx => {
    await ctx.helpers.runExclusive(async () => {
      await ctx.helpers.prepareMission({ visitBase: true })
    })
  }
}
