module.exports = {
  name: 'status',
  aliases: ['status', 'etat', 'statut'],
  intentTypes: ['status'],
  run: async ctx => {
    const state = ctx.getState()
    const usedSlots = 36 - ctx.bot.inventory.emptySlotCount()

    ctx.say(`❤️ Vie: ${Math.round(ctx.bot.health)}/20 | 🍗 Nourriture: ${ctx.bot.food}/20`)
    ctx.say(`🎒 Inventaire: ${usedSlots}/36`)

    if (state.currentMission) {
      ctx.say(`🎯 Mission: ${ctx.missionManager.missionLabel(state.currentMission)} ${state.currentMission.progress || 0}/${state.currentMission.amount || 0}`)
    } else if (state.followTargetUsername) {
      ctx.say(`🚶 Suivi: ${state.followTargetUsername}`)
    }
  }
}
