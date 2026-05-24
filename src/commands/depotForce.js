module.exports = {
  name: 'depotForce',
  aliases: ['depot forcer', 'depot force', 'depose vraiment tout', 'vide tout', 'vide inventaire'],
  intentTypes: ['forceDeposit'],
  run: async ctx => {
    await ctx.helpers.runExclusive(async () => {
      ctx.state.setStopRequested(false)
      await ctx.helpers.safeGoBase({ force: true, ignoreStop: true })
      const stored = await ctx.helpers.storeItems({
        keepFood: false,
        keepLoadout: false,
        unequip: true
      })
      if (stored) ctx.say('📦 Dépôt forcé terminé : inventaire et équipement rangés.')
      else ctx.say('⚠️ Dépôt forcé incomplet : coffre de base plein ou inaccessible.')
    })
  }
}
