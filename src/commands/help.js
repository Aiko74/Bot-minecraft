module.exports = {
  name: 'help',
  aliases: ['help', 'aide', '?'],
  intentTypes: ['help'],
  run: async ctx => {
    ctx.say('💬 Commandes bot : écris dans le chat sans slash. Exemple: stop, pas /stop.')
    ctx.say('V2 stable: status, coords, inventaire, base, setbase.')
    ctx.say('Actions: viens, suis moi, stop follow, retour base, depot, range, prepare, stop/annule.')
    ctx.say('Ressources: mine 64 fer, mine 16 diamant, collect 64 bois, collect 64 pierre.')
    ctx.say('Beta: chasse, explore, minage Nether. Incoming: farms, builds, blueprints.')
  }
}
