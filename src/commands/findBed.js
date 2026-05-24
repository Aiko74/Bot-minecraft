module.exports = {
  name: 'findBed',
  aliases: ['trouve lit', 'cherche lit', 'lit proche'],
  intentTypes: ['findBed'],
  run: async ctx => {
    const bed = ctx.helpers.findNearestBed(48)
    if (!bed) {
      ctx.say('Aucun lit trouve dans un rayon de 48 blocs.')
      return
    }

    const distance = Math.round(bed.position.distanceTo(ctx.bot.entity.position))
    ctx.say(`Lit proche: ${bed.position.x} ${bed.position.y} ${bed.position.z}, distance ${distance}.`)
  }
}
