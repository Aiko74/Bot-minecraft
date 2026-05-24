module.exports = {
  name: 'status',
  aliases: ['status', 'etat', 'statut'],
  intentTypes: ['status'],
  run: async ctx => {
    const state = ctx.getState()
    const usedSlots = 36 - ctx.bot.inventory.emptySlotCount()
    const mission = state.currentMission
      ? ` | 🎯 Mission: ${ctx.missionManager.missionLabel(state.currentMission)} ${state.currentMission.progress || 0}/${state.currentMission.amount || 0}`
      : ''
    const follow = state.followTargetUsername ? ` | 🚶 Suit: ${state.followTargetUsername}` : ''
    ctx.say(`❤️ Vie: ${Math.round(ctx.bot.health)}/20 | 🍗 Nourriture: ${ctx.bot.food}/20 | 🎒 Inventaire: ${usedSlots}/36${follow}${mission}`)
  }
}
