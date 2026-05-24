async function handleLegacyCommand(ctx, intent, username) {
  const h = ctx.helpers

  await h.runExclusive(async () => {
    if (intent.type === 'return') {
      await h.returnBase({ stopMission: true })
    } else if (intent.type === 'hunt') {
      await h.prepareMission({ missionType: 'hunt', quiet: true })
      if (ctx.state.getStopRequested()) return
      await h.hunt(intent.amount)
    } else if (intent.type === 'farm') {
      await h.prepareMission({ missionType: 'farm' })
      if (ctx.state.getStopRequested()) return
      await h.runFarm(intent.farmKind, { cookMeat: intent.cookMeat === true })
    } else if (intent.type === 'scanBuildSite') {
      await h.scanAndSetBuildSite(intent.blueprint)
    } else if (intent.type === 'prepareBlueprint') {
      await h.prepareBlueprintResources(intent.blueprint)
    } else if (intent.type === 'buildBlueprint') {
      await h.buildBlueprintStructure(intent.blueprint)
    } else if (intent.type === 'blueprintStatus') {
      await h.sendBlueprintStatus(intent.blueprint)
    }
  }, {
    name: intent.type === 'farm' && intent.farmKind === 'animals' ? 'farmAnimals' : null
  })

  return true
}

module.exports = {
  handleLegacyCommand
}
