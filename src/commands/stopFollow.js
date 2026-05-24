module.exports = {
  name: 'stopFollow',
  aliases: ['stop follow', 'stopfollow', 'arrete de me suivre', 'ne me suis plus', 'stop suivi'],
  intentTypes: ['stopFollow'],
  run: async ctx => {
    ctx.helpers.stopFollowPlayer('Suivi arrete.')
  }
}
