module.exports = {
  name: 'explore',
  aliases: ['explore', 'explorer', 'exploration'],
  intentTypes: ['explore'],
  run: async ctx => {
    await ctx.helpers.runExclusive(async () => {
      ctx.state.setMissionActive(true)
      await ctx.helpers.exploreAroundBase()
      ctx.state.setMissionActive(false)
    })
  }
}
