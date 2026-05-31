module.exports = {
  name: 'reprendre',
  aliases: ['reprendre', 'resume', 'continue'],
  intentTypes: ['resume'],
  run: async ctx => {
    ctx.say('▶️ Reprendre est désactivé en V2. Relance la commande quand le bot est prêt.')
  }
}
