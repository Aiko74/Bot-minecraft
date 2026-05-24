module.exports = {
  name: 'follow',
  aliases: ['suis moi', 'follow me', 'suivez moi'],
  intentTypes: ['follow'],
  run: async (ctx, args, rawMessage, intent, username) => {
    ctx.helpers.startFollowPlayer(username)
  }
}
