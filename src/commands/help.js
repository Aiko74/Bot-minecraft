module.exports = {
  name: 'help',
  aliases: ['help', 'aide', '?'],
  intentTypes: ['help'],
  run: async ctx => {
    ctx.say('Commandes: help, status, mission, pause, reprendre, stop/annule, inventaire, coords, base, farms.')
    ctx.say('Actions: viens, suis moi, stop follow, retour base, depot, range, prepare, mange, sleep, explore, explore nether.')
    ctx.say('Survie: mine 64 fer, mine 64 quartz, mine 8 ancient debris, chasse 5, ferme animaux, ferme canne, defend on/off.')
    ctx.say('Build: blueprints, maison, scan maison, preparebuild maison/enclos/ferme canne, build maison/enclos/ferme canne.')
    ctx.say('Recherche: trouve coffre, trouve lit, trouve village.')
  }
}
