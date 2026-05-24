function createMissionText({ resourceTargetByKey }) {
  function missionLabel(mission) {
    if (!mission) return 'aucune mission'

    if (mission.type === 'mine') {
      const target = resourceTargetByKey(mission.targetKey)
      return target ? `minage ${target.label}` : 'minage'
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
    const deposited = mission.type === 'mine' ? ` | depose ${mission.deposited || 0}` : ''

    return `Mission ${missionLabel(mission)}: ${progress}/${amount}, reste ${remaining}${deposited}, trajets ${mission.trips || 0}, priorite ${mission.priority || 0}, statut ${mission.status}.`
  }

  return {
    missionLabel,
    missionProgressText
  }
}

module.exports = {
  createMissionText
}
