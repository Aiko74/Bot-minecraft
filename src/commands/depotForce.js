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
      if (stored) ctx.say('Depot force termine: inventaire et equipement ranges.')
      else ctx.say('Depot force incomplet: coffre plein ou inaccessible.')
    })
  }
}
