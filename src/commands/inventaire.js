module.exports = {
  name: 'inventaire',
  aliases: ['inventaire', 'inventory', 'montre ton inventaire'],
  intentTypes: ['inventory'],
  run: async ctx => {
    const usedSlots = 36 - ctx.bot.inventory.emptySlotCount()
    ctx.say(`Inventaire ${usedSlots}/36: ${countSummaryFromInventory(ctx, 14)}`)
  }
}

function countSummaryFromInventory(ctx, limit = 12) {
  const counts = ctx.helpers.countInventoryByName()
  const mcData = ctx.getMcData()
  const entries = Object.entries(counts)
    .filter(([name]) => {
      const item = mcData.itemsByName[name]
      return (
        ctx.constants.FOOD_NAMES.has(name) ||
        ctx.helpers.isLoadoutItem(item) ||
        name.includes('ore') ||
        name.includes('ingot') ||
        name.includes('diamond') ||
        name.includes('coal') ||
        name.includes('redstone') ||
        name.includes('lapis') ||
        name.includes('sugar_cane') ||
        name.includes('leather') ||
        name.includes('wool') ||
        name.includes('beef') ||
        name.includes('porkchop') ||
        name.includes('chicken') ||
        name.includes('mutton') ||
        name.includes('rabbit') ||
        name.includes('cobblestone') ||
        name.includes('oak_') ||
        name.includes('sand')
      )
    })
    .sort((a, b) => b[1] - a[1])

  const shown = entries.slice(0, limit).map(([name, count]) => `${name} x${count}`)
  if (entries.length > limit) shown.push(`+${entries.length - limit} autres`)
  return shown.join(', ') || 'rien d important'
}
