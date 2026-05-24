module.exports = {
  name: 'defend',
  aliases: ['defend on', 'defense on', 'defense active', 'defend off', 'defense off', 'defense inactive'],
  intentTypes: ['defendOn', 'defendOff'],
  run: async (ctx, args, rawMessage, intent) => {
    const enabled = intent.type === 'defendOn'
    ctx.state.setDefendMode(enabled)
    ctx.say(enabled ? 'Mode defense active.' : 'Mode defense desactive. Je recule quand meme si danger proche.')
  }
}
