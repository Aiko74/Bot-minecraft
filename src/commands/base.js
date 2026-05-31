module.exports = {
  name: 'base',
  aliases: ['base', 'ma base', 'coord base'],
  intentTypes: ['baseInfo'],
  run: async ctx => {
    const state = ctx.getState()
    if (!state.basePos) {
      ctx.say('Base non définie. Place-moi à la base puis dis setbase.')
      return
    }

    ctx.say(`🏠 Base : X: ${state.basePos.x} | Y: ${state.basePos.y} | Z: ${state.basePos.z}`)
  }
}
