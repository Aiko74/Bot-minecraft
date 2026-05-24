module.exports = {
  name: 'reprendre',
  aliases: ['reprendre', 'resume', 'continue'],
  intentTypes: ['resume'],
  run: async ctx => {
    await ctx.helpers.runExclusive(async () => {
      await resumeCurrentMission(ctx)
    })
  }
}

async function resumeCurrentMission(ctx) {
  let mission = ctx.getState().currentMission
  if (!mission) {
    ctx.say('Aucune mission a reprendre.')
    return
  }

  if (mission.progress >= mission.amount) {
    const deposited = await ctx.helpers.depositForMission('Mission deja complete, depot final.')
    if (deposited) ctx.helpers.finishMission()
    return
  }

  ctx.say(`Reprise: ${ctx.missionManager.missionProgressText(mission)}`)
  await ctx.helpers.prepareMission({ missionType: mission.type })
  if (ctx.state.getStopRequested() || !ctx.getState().currentMission) return

  mission = ctx.getState().currentMission
  if (mission.type === 'mine') {
    const target = ctx.helpers.resourceTargetByKey(mission.targetKey)
    if (!target) {
      ctx.say('Mission minage invalide, annulation.')
      ctx.state.setCurrentMission(null)
      ctx.helpers.saveMission()
      return
    }

    await ctx.helpers.mine(target, mission.amount, { resume: true })
    return
  }

  if (mission.type === 'hunt') {
    await ctx.helpers.hunt(mission.amount, { resume: true })
    return
  }

  if (mission.type === 'farmAnimals') {
    await ctx.helpers.farmAnimals({ resume: true })
    return
  }

  if (mission.type === 'farmSugarCane') {
    await ctx.helpers.farmSugarCane({ resume: true })
    return
  }

  if (mission.type === 'farmAll') {
    await ctx.helpers.runFarm('all')
  }
}
