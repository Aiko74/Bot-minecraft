module.exports = {
  name: 'pause',
  aliases: ['pause', 'pause mission'],
  intentTypes: ['pause'],
  run: async ctx => {
    ctx.say('⏸️ Pause désactivée en V2. Utilise stop si tu veux annuler.')
  }
}
