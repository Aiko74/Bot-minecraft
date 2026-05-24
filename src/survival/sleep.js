function createSleepHelpers(deps) {
  function findNearestBed(maxDistance = 24, point = deps.bot.entity.position) {
    const mcData = deps.getMcData()
    const ids = deps.bedBlockNames
      .map(name => mcData.blocksByName[name])
      .filter(Boolean)
      .map(block => block.id)

    if (ids.length === 0) return null

    const positions = deps.bot.findBlocks({
      point,
      matching: ids,
      maxDistance,
      count: 16
    })

    return positions
      .map(position => deps.bot.blockAt(position))
      .filter(Boolean)
      .sort((a, b) => a.position.distanceTo(point) - b.position.distanceTo(point))[0] || null
  }

  async function sleepInNearestBed(options = {}) {
    if (deps.bot.isSleeping || deps.bot.sleeping) {
      deps.logTag('sleep', 'ignore: already sleeping')
      return true
    }

    const basePos = deps.getBasePos()
    const point = options.baseOnly && basePos ? basePos : deps.bot.entity.position
    const bed = findNearestBed(options.maxDistance || 24, point)
    if (!bed) {
      if (!options.quiet) deps.safeChat('Aucun lit proche trouve.')
      return false
    }

    const reached = await deps.safeGoto(new deps.goals.GoalNear(bed.position.x, bed.position.y, bed.position.z, 2), 'lit', {
      attempts: 2
    })
    if (!reached) return false

    try {
      if (deps.bot.isSleeping || deps.bot.sleeping) {
        deps.logTag('sleep', 'ignore: already sleeping')
        return true
      }
      await deps.bot.sleep(bed)
      if (!options.quiet) deps.safeChat('Je dors.')
      return true
    } catch (err) {
      if (String(err && (err.message || err)).includes('already sleeping')) {
        deps.logTag('sleep', 'ignore: already sleeping')
        return true
      }
      deps.logError('sleep error', err)
      if (!options.quiet) deps.safeChat(`Impossible de dormir: ${deps.shortError(err)}.`)
      return false
    }
  }

  return {
    findNearestBed,
    sleepInNearestBed
  }
}

module.exports = {
  createSleepHelpers
}
