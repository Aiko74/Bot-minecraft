module.exports = {
  name: 'status',
  aliases: ['status', 'etat', 'statut'],
  intentTypes: ['status'],
  run: async ctx => {
    const state = ctx.getState()
    const base = state.basePos ? `${state.basePos.x} ${state.basePos.y} ${state.basePos.z}` : 'non definie'
    const animals = state.farmZones.animals ? 'ok' : 'non'
    const cane = state.farmZones.sugarcane ? 'ok' : 'non'
    const usedSlots = 36 - ctx.bot.inventory.emptySlotCount()
    const mission = state.currentMission
      ? ` | mission ${ctx.missionManager.missionLabel(state.currentMission)} ${state.currentMission.status} ${state.currentMission.progress}/${state.currentMission.amount}`
      : ' | mission aucune'
    const follow = state.followTargetUsername ? ` | suit ${state.followTargetUsername}` : ''
    ctx.say(`HP ${Math.round(ctx.bot.health)}/20 | faim ${ctx.bot.food}/20 | air ${ctx.bot.oxygenLevel}/20 | inv ${usedSlots}/36 | base ${base} | farms A:${animals} C:${cane} | defense ${state.defendMode ? 'on' : 'off'}${follow}${mission}`)
  }
}
