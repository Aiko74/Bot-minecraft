module.exports = {
  name: 'viens',
  aliases: ['viens', 'viens ici', 'come', 'come here', 'viens vers moi'],
  intentTypes: ['come'],
  run: async (ctx, args, rawMessage, intent, username) => {
    await ctx.helpers.runExclusive(async () => {
      await ctx.helpers.comeToPlayer(username)
    })
  }
}
