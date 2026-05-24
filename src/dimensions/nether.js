function createNetherHelpers(deps) {
  async function exploreNether() {
    deps.setMissionActive(true)
    deps.setStopRequested(false)

    try {
      const quartzTarget = deps.resourceTargetByKey('quartz')
      const prepared = await deps.prepareMission({ missionType: 'mine', target: quartzTarget })
      if (!prepared || deps.isStopRequested()) return false

      const reachedNether = await deps.portals.ensureNether()
      if (!reachedNether) {
        deps.safeChat('Exploration Nether impossible: portail introuvable ou inaccessible.', 9000)
        return false
      }

      await deps.portals.moveAwayFromCurrentPortal(18)
      deps.safeChat('Exploration Nether prudente. Je reviens deposer apres le tour.', 9000)

      let moved = 0
      for (let i = 0; i < 8 && !deps.isStopRequested(); i++) {
        const safe = await deps.danger.ensureSurvival({ allowReturn: true })
        if (!safe) {
          await deps.sleep(500)
          if (!deps.portals.isNether()) break
          continue
        }

        const ok = await deps.explore(Math.min(deps.config.exploreRadius, 22))
        if (ok) moved++
        await deps.collectNearbyDrops(6)
      }

      deps.safeChat(`Exploration Nether terminee: ${moved} zones visitees. Retour base.`, 9000)
      const reachedBase = await deps.safeGoBase({ force: true, ignoreStop: true })
      if (reachedBase) await deps.storeItems()
      return reachedBase
    } finally {
      deps.setMissionActive(false)
    }
  }

  return {
    exploreNether
  }
}

module.exports = {
  createNetherHelpers
}
