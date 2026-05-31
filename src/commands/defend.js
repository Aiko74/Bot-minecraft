module.exports = {
  name: 'defend',
  aliases: ['defend on', 'defense on', 'defense active', 'defend off', 'defense off', 'defense inactive'],
  intentTypes: ['defendOn', 'defendOff'],
  run: async ctx => {
    ctx.say('🛡️ Défense manuelle désactivée en V2. La survie automatique reste active.')
  }
}
