module.exports = {
  name: 'findVillage',
  aliases: ['trouve village', 'cherche village', 'village'],
  intentTypes: ['findVillage'],
  run: async ctx => {
    const bed = ctx.helpers.findNearestBed(64)
    const mcData = ctx.getMcData()
    const hintIds = ctx.constants.VILLAGE_HINT_BLOCKS
      .map(name => mcData.blocksByName[name])
      .filter(Boolean)
      .map(block => block.id)

    const hintBlocks = hintIds.length > 0
      ? ctx.bot.findBlocks({ matching: hintIds, maxDistance: 64, count: 8 })
      : []

    if (bed || hintBlocks.length > 0) {
      const first = bed || ctx.bot.blockAt(hintBlocks[0])
      if (first) {
        ctx.say(`Signes de village possibles vers ${first.position.x} ${first.position.y} ${first.position.z}. Pas fiable sans exploration.`)
      } else {
        ctx.say('Signes de village possibles, mais le chunk semble instable/non charge.')
      }
      return
    }

    ctx.say("Aucun signe de village proche. Sans carte ni exploration chargee, je ne peux pas garantir qu'il n'y en a pas.")
  }
}
