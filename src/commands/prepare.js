module.exports = {
  name: 'prepare',
  aliases: ['prepare', 'equip', 'prepare toi', 'prepares toi'],
  intentTypes: ['prepare'],
  run: async ctx => {
    await ctx.helpers.runExclusive(async () => {
      const prepared = await ctx.helpers.prepareMission({ visitBase: true, quiet: true, details: true })
      if (!prepared || !prepared.ok) {
        ctx.say('⚠️ Préparation incomplète.')
        return
      }

      if (!prepared.loadoutTaken) {
        ctx.say('⚠️ Aucun équipement utile trouvé dans le coffre de base.')
        return
      }

      ctx.say('🎒 Préparation terminée.')
    })
  }
}
