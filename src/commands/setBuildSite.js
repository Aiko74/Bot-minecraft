module.exports = {
  name: 'setbuild',
  aliases: ['setbuild', 'set build', 'setconstruction', 'set construction'],
  intentTypes: ['setBuildSite'],
  run: async ctx => {
    const buildSite = ctx.helpers.floorVec(ctx.bot.entity.position)
    ctx.state.setBuildSite(buildSite)
    ctx.helpers.saveMemory()
    ctx.say('🏗️ Chantier ajouté.')
  }
}
