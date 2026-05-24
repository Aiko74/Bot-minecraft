module.exports = {
  name: 'viens',
  aliases: ['viens', 'vien', 'viens ici', 'vien ici', 'come', 'come here', 'viens vers moi', 'vien vers moi'],
  intentTypes: ['come'],
  run: async (ctx, args, rawMessage, intent, username) => {
    await ctx.helpers.runExclusive(async () => {
      await ctx.helpers.comeToPlayer(username)
    })
  }
}
