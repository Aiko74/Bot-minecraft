async function handleLegacyCommand(ctx, intent, username) {
  const h = ctx.helpers

  if (intent.type === 'farm') {
    ctx.say(farmDisabledMessage(intent.farmKind))
    return true
  }

  await h.runExclusive(async () => {
    if (intent.type === 'return') {
      await h.returnBase({ stopMission: true })
    } else if (intent.type === 'hunt') {
      await h.prepareMission({ missionType: 'hunt', quiet: true })
      if (ctx.state.getStopRequested()) return
      await h.hunt(intent.amount)
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

function farmDisabledMessage(farmKind) {
  if (farmKind === 'animals') return '🐄 Ferme animaux désactivée en V2. Refonte prévue plus tard.'
  if (farmKind === 'sugarcane') return '🌾 Ferme canne désactivée en V2. Refonte prévue plus tard.'
  return '🌾 Farms désactivées en V2. Refonte prévue plus tard.'
}

module.exports = {
  handleLegacyCommand
}
