module.exports = {
  name: 'coords',
  aliases: ['coords', 'coordonnees', 'position'],
  intentTypes: ['coords'],
  run: async ctx => {
    const pos = ctx.bot.entity.position
    ctx.say(`Coords: ${Math.floor(pos.x)} ${Math.floor(pos.y)} ${Math.floor(pos.z)}.`)
  }
}
