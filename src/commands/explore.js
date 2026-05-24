module.exports = {
  name: 'explore',
  aliases: ['explore', 'explorer', 'exploration'],
  intentTypes: ['explore'],
  run: async (ctx, args, rawMessage, intent) => {
    await ctx.helpers.runExclusive(async () => {
      ctx.state.setMissionActive(true)
      await ctx.helpers.exploreAroundBase({
        radius: intent.radius,
        direction: intent.direction,
        biome: intent.biome === true
      })
      ctx.state.setMissionActive(false)
    })
  }
}
