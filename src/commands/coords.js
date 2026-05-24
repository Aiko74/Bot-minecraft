module.exports = {
  name: 'coords',
  aliases: ['coords', 'coordonnees', 'position'],
  intentTypes: ['coords'],
  run: async ctx => {
    const pos = ctx.bot.entity.position
    ctx.say(`📍 Position actuelle : X: ${Math.floor(pos.x)} | Y: ${Math.floor(pos.y)} | Z: ${Math.floor(pos.z)}`)
  }
}
