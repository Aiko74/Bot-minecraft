function createMissionText({ resourceTargetByKey }) {
  function missionLabel(mission) {
    if (!mission) return 'aucune mission'

    if (mission.type === 'mine') {
      const target = resourceTargetByKey(mission.targetKey)
      return target ? `minage ${target.label}` : 'minage'
    }

    if (mission.type === 'collect') {
      const target = resourceTargetByKey(mission.targetKey)
      return target ? `collecte ${target.label}` : 'collecte'
    }

    if (mission.type === 'hunt') return 'chasse'
    if (mission.type === 'farmAnimals') return 'ferme animaux'
    if (mission.type === 'farmSugarCane') return 'ferme canne a sucre'
    if (mission.type === 'farmAll') return 'ferme complete'

    return mission.type
  }

  function missionProgressText(mission) {
    if (!mission) return 'Aucune mission active.'

    const amount = Math.max(0, mission.amount || 0)
    const progress = Math.min(mission.progress || 0, amount)
    const remaining = Math.max(0, amount - progress)
    const deposited = (mission.type === 'mine' || mission.type === 'collect') ? ` | dépôt ${mission.deposited || 0}` : ''

    return `🎯 ${missionLabel(mission)} : ${progress}/${amount}, reste ${remaining}${deposited}.`
  }

  return {
    missionLabel,
    missionProgressText
  }
}

module.exports = {
  createMissionText
}
