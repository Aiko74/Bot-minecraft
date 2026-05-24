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

    if (container) {
      ctx.say(`Base enregistree avec coffre: ${basePos.x} ${basePos.y} ${basePos.z}.`)
    } else {
      ctx.say(`Base enregistree: ${basePos.x} ${basePos.y} ${basePos.z}. Aucun coffre trouve proche.`)
    }
    ctx.say("Astuce: si la base a des portes, laisse une entree simple ou refais setbase pres de l'entree/coffre.")
  }
}
