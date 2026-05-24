module.exports = {
  name: 'farms',
  aliases: ['farms', 'fermes', 'farm'],
  intentTypes: ['farmsInfo'],
  run: async ctx => {
    const state = ctx.getState()
    const animals = state.farmZones.animals
      ? `${state.farmZones.animals.x} ${state.farmZones.animals.y} ${state.farmZones.animals.z}`
      : 'non definie'
    const cane = state.farmZones.sugarcane
      ? `${state.farmZones.sugarcane.x} ${state.farmZones.sugarcane.y} ${state.farmZones.sugarcane.z}`
      : 'non definie'
    ctx.say(`Farms: animaux ${animals} | canne ${cane}.`)
  }
}
