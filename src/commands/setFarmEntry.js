module.exports = {
  name: 'setentree',
  aliases: ['setentree', 'set entree', 'setentry'],
  intentTypes: ['setFarmEntry'],
  run: async (ctx, args, rawMessage, intent, username) => {
    ctx.helpers.setFarmEntry(intent.farmKind, username)
  }
}
