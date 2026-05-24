const { progressBar, progressPercent } = require('../chat/progress')

function createExplorationHelpers(deps) {
  async function exploreAroundBase(options = {}) {
    const basePos = deps.getBasePos()
    if (!basePos) {
      deps.safeChat("Base non definie. Dis setbase avant explore pour que je sache ou revenir.")
      return false
    }

    const radiusTarget = Math.max(24, Math.min(800, Number(options.radius) || deps.config.exploreRadius))
    const direction = options.direction || null
    deps.safeChat('🧭 Exploration lancée.')
    deps.safeChat(`🎯 Rayon cible : ${Math.round(radiusTarget)} blocs.`)
    deps.safeChat('📡 Recherche de zones intéressantes...')

    let bestDistance = 0
    for (let i = 0; i < 4 && !deps.isStopRequested(); i++) {
      const angle = directionAngle(direction) ?? Math.random() * Math.PI * 2
      const spread = direction ? (Math.random() - 0.5) * 0.7 : 0
      const radius = radiusTarget * (0.55 + Math.random() * 0.45)
      const targetX = basePos.x + Math.cos(angle + spread) * radius
      const targetZ = basePos.z + Math.sin(angle + spread) * radius

      await deps.safeGoto(new deps.goals.GoalNear(targetX, basePos.y, targetZ, 3), 'exploration base', {
        attempts: 1,
        timeoutMs: 12000
      })
      bestDistance = Math.max(bestDistance, deps.bot.entity.position.distanceTo(basePos))
      deps.safeChat(`🧭 Explore : ${Math.round(Math.min(bestDistance, radiusTarget))}/${Math.round(radiusTarget)} ${progressBar(bestDistance, radiusTarget)} ${progressPercent(bestDistance, radiusTarget)}%`, 7000)
      await deps.ensureSurvival({ allowReturn: true })
    }

    const returned = await deps.safeGoBase()
    if (returned) {
      deps.safeChat('✅ Exploration terminée.')
      deps.safeChat(`📍 Zone scannée : ${Math.round(Math.min(bestDistance, radiusTarget))} blocs.`)
      deps.safeChat('🏠 Retour à la base.')
    }
    return returned
  }

  return {
    exploreAroundBase
  }
}

function directionAngle(direction) {
  if (direction === 'est') return 0
  if (direction === 'sud') return Math.PI / 2
  if (direction === 'ouest') return Math.PI
  if (direction === 'nord') return -Math.PI / 2
  return null
}

module.exports = {
  createExplorationHelpers
}
