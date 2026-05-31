module.exports = {
  name: 'mange',
  aliases: ['mange', 'eat'],
  intentTypes: ['eat'],
  run: async ctx => {
    ctx.say('🍗 Mange est automatique en V2. Je mangerai quand ce sera utile.')
  }
}
