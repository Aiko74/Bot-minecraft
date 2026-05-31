module.exports = {
  name: 'setbase',
  aliases: ['setbase', 'set base'],
  intentTypes: ['setbase'],
  run: async ctx => {
    const basePos = ctx.helpers.floorVec(ctx.bot.entity.position)
    const container = ctx.helpers.findNearestContainer(10)
    const baseContainerPos = container ? container.position.clone() : null

    ctx.state.setBasePos(basePos)
    if (baseContainerPos) ctx.state.setBaseContainerPos(baseContainerPos)
    ctx.helpers.saveMemory()

    ctx.say(baseContainerPos ? '🏠 Base ajoutée.' : '🏠 Base ajoutée. Aucun coffre proche détecté.')
  }
}
