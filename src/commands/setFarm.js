module.exports = {
  name: 'setfarm',
  aliases: ['setfarm', 'set farm', 'setferme', 'set ferme'],
  intentTypes: ['setFarm'],
  run: async (ctx, args, rawMessage, intent) => {
    ctx.helpers.setFarm(intent.farmKind)
  }
}
