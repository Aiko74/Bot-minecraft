module.exports = {
  name: 'base',
  aliases: ['base', 'ma base', 'coord base'],
  intentTypes: ['baseInfo'],
  run: async ctx => {
    const state = ctx.getState()
    if (!state.basePos) {
      ctx.say("Base non definie. Place-moi a la base puis dis setbase.")
      return
    }

    const chest = state.baseContainerPos
      ? ` | coffre ${state.baseContainerPos.x} ${state.baseContainerPos.y} ${state.baseContainerPos.z}`
      : ' | coffre non defini'
    ctx.say(`Base: ${state.basePos.x} ${state.basePos.y} ${state.basePos.z}${chest}.`)
  }
}
