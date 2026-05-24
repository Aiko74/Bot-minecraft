module.exports = {
  name: 'findChest',
  aliases: ['trouve coffre', 'cherche coffre', 'coffre proche'],
  intentTypes: ['findChest'],
  run: async ctx => {
    const chest = ctx.helpers.findNearestContainer(32, ctx.bot.entity.position)
    if (!chest) {
      ctx.say('Aucun coffre/baril trouve dans un rayon de 32 blocs.')
      return
    }

    const distance = Math.round(chest.position.distanceTo(ctx.bot.entity.position))
    ctx.say(`Coffre proche: ${chest.position.x} ${chest.position.y} ${chest.position.z}, distance ${distance}.`)
  }
}
