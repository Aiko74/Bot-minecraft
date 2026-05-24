function createExplorationHelpers(deps) {
  async function exploreAroundBase() {
    const basePos = deps.getBasePos()
    if (!basePos) {
      deps.safeChat("Base non definie. Dis setbase avant explore pour que je sache ou revenir.")
      return false
    }

    deps.safeChat(`Exploration autour de la base rayon ${deps.config.exploreRadius}.`)
    for (let i = 0; i < 4 && !deps.isStopRequested(); i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = deps.config.exploreRadius * (0.55 + Math.random() * 0.45)
      const targetX = basePos.x + Math.cos(angle) * radius
      const targetZ = basePos.z + Math.sin(angle) * radius

      await deps.safeGoto(new deps.goals.GoalNear(targetX, basePos.y, targetZ, 3), 'exploration base', {
        attempts: 1,
        timeoutMs: 12000
      })
      await deps.ensureSurvival({ allowReturn: true })
    }

    const returned = await deps.safeGoBase()
    if (returned) deps.safeChat('Exploration terminee, retour base.')
    return returned
  }

  return {
    exploreAroundBase
  }
}

module.exports = {
  createExplorationHelpers
}
