module.exports = {
  name: 'pause',
  aliases: ['pause', 'pause mission'],
  intentTypes: ['pause'],
  run: async ctx => {
    ctx.helpers.pauseMission('Mission en pause. Dis reprendre pour continuer.')
  }
}
