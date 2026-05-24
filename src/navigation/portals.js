const { Vec3 } = require('vec3')

function createPortalHelpers(deps) {
  function currentDimension() {
    const raw = deps.bot.game && deps.bot.game.dimension
    if (raw === -1) return 'nether'
    if (raw === 0) return 'overworld'
    if (raw === 1) return 'end'

    const value = String(
      raw && typeof raw === 'object'
        ? (raw.name || raw.type || raw.id || '')
        : (raw || '')
    ).toLowerCase()

    if (value.includes('nether')) return 'nether'
    if (value.includes('overworld') || value.includes('normal')) return 'overworld'
    if (value.includes('end')) return 'end'

    return 'overworld'
  }

  function isNether() {
    return currentDimension() === 'nether'
  }

  function isOverworld() {
    return currentDimension() === 'overworld'
  }

  function isNetherPortalBlock(block) {
    return Boolean(block && block.name === 'nether_portal')
  }

  function savedPortalForDimension(dimension = currentDimension()) {
    const portals = deps.getNetherPortals()
    const pos = portals && portals[dimension]
    if (!deps.isValidPos(pos)) return null

    const block = deps.bot.blockAt(pos)
    return isNetherPortalBlock(block) ? block : null
  }

  function savedPortalPosition(dimension = currentDimension()) {
    const portals = deps.getNetherPortals()
    const pos = portals && portals[dimension]
    return deps.isValidPos(pos) ? pos : null
  }

  function rememberPortal(dimension, blockOrPos) {
    const pos = blockOrPos && blockOrPos.position ? blockOrPos.position : blockOrPos
    if (!deps.isValidPos(pos)) return

    const current = {
      overworld: null,
      nether: null,
      ...(deps.getNetherPortals() || {})
    }

    current[dimension] = new Vec3(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z))
    deps.setNetherPortals(current)
    deps.saveMemory()
    console.log(`[portal] portail ${dimension} memorise ${current[dimension].x} ${current[dimension].y} ${current[dimension].z}`)
  }

  function findNearestNetherPortal(maxDistance = 48) {
    let positions = []

    try {
      positions = deps.bot.findBlocks({
        matching: block => isNetherPortalBlock(block),
        maxDistance,
        count: 32
      })
    } catch {
      return null
    }

    return positions
      .map(position => deps.bot.blockAt(position))
      .filter(isNetherPortalBlock)
      .sort((a, b) => a.position.distanceTo(deps.bot.entity.position) - b.position.distanceTo(deps.bot.entity.position))[0] || null
  }

  async function waitForDimensionChange(previousDimension, timeoutMs = 18000) {
    const timeoutAt = Date.now() + timeoutMs

    while (Date.now() < timeoutAt && !deps.isStopRequested()) {
      const dimension = currentDimension()
      if (dimension !== previousDimension) return dimension
      await deps.sleep(500)
    }

    return currentDimension() === previousDimension ? null : currentDimension()
  }

  async function moveIntoPortal(portalBlock, label) {
    let reached = await deps.safeGoto(
      new deps.goals.GoalNear(portalBlock.position.x, portalBlock.position.y, portalBlock.position.z, 1),
      label,
      {
        attempts: 3,
        timeoutMs: 12000,
        canDig: true,
        canPlace: false,
        safeToBreak: deps.canBreakForPath,
        quiet: true,
        successCheck: () => portalBlock.position.distanceTo(deps.bot.entity.position) <= 1.8
      }
    )

    if (!reached && portalBlock.position.distanceTo(deps.bot.entity.position) > 3 && deps.digTowardPosition) {
      console.log('[portal] chemin portail bloque, creusage prudent')
      reached = await deps.digTowardPosition(portalBlock.position, 'tunnel portail nether', {
        range: 2,
        maxSteps: 72,
        quiet: true
      })
    }

    if (!reached && portalBlock.position.distanceTo(deps.bot.entity.position) > 3) return false

    try {
      await deps.bot.lookAt(portalBlock.position.offset(0.5, 1, 0.5), true)
      deps.bot.setControlState('forward', true)
      deps.bot.setControlState('jump', false)
      await deps.sleep(4500)
    } finally {
      deps.bot.setControlState('forward', false)
      deps.bot.setControlState('jump', false)
    }

    return true
  }

  async function enterNearestPortal(targetDimension, options = {}) {
    const fromDimension = currentDimension()
    const savedPos = savedPortalPosition(fromDimension)
    let portal = savedPortalForDimension(fromDimension)

    if (!portal) portal = findNearestNetherPortal(options.searchRadius || 56)
    if (!portal && savedPos) {
      deps.safeChat('Je retourne vers le portail Nether memorise.', 9000)
      await deps.travelToPosition(savedPos, 'portail nether memorise', {
        finalRange: 8,
        stepDistance: 12,
        maxSteps: 48,
        timeoutMs: 9000,
        canDig: true,
        safeToBreak: deps.canBreakForPath,
        quiet: true
      })

      if (deps.bot.entity.position.distanceTo(savedPos) > 10 && deps.digTowardPosition) {
        await deps.digTowardPosition(savedPos, 'tunnel portail nether memorise', {
          range: 8,
          maxSteps: 96,
          quiet: true
        })
      }

      portal = savedPortalForDimension(fromDimension) || findNearestNetherPortal(32)
    }

    if (!portal) {
      deps.safeChat("Je ne vois pas de portail Nether charge proche de moi.", 9000)
      return false
    }

    rememberPortal(fromDimension, portal)
    deps.safeChat(targetDimension === 'nether' ? 'Je prends le portail vers le Nether.' : 'Je reprends le portail vers le monde normal.', 7000)

    const moved = await moveIntoPortal(portal, 'portail nether')
    if (!moved) {
      deps.safeChat("Je n'arrive pas a entrer dans le portail Nether.", 9000)
      return false
    }

    const arrivedDimension = await waitForDimensionChange(fromDimension, options.timeoutMs || 20000)
    if (arrivedDimension !== targetDimension) {
      deps.safeChat('Le portail ne m’a pas teleporte comme prevu.', 9000)
      return false
    }

    await deps.sleep(2500)
    const arrivalPortal = findNearestNetherPortal(32)
    if (arrivalPortal) rememberPortal(targetDimension, arrivalPortal)

    return true
  }

  async function ensureNether() {
    if (isNether()) return true
    return enterNearestPortal('nether')
  }

  async function ensureOverworld() {
    if (isOverworld()) return true
    if (!isNether()) return false
    return enterNearestPortal('overworld')
  }

  async function moveAwayFromCurrentPortal(minDistance = 20) {
    const portal = savedPortalForDimension(currentDimension()) || findNearestNetherPortal(32)
    if (!portal) return true
    if (portal.position.distanceTo(deps.bot.entity.position) >= minDistance) return true

    let dx = deps.bot.entity.position.x - portal.position.x
    let dz = deps.bot.entity.position.z - portal.position.z
    let length = Math.sqrt(dx * dx + dz * dz)
    if (length < 1) {
      dx = 1
      dz = 0
      length = 1
    }

    dx /= length
    dz /= length

    const target = deps.bot.entity.position.offset(dx * minDistance, 0, dz * minDistance)
    const reached = await deps.travelToPosition(target, 'sortie portail nether', {
      finalRange: 5,
      stepDistance: 10,
      maxSteps: 8,
      timeoutMs: 7000,
      canDig: true,
      safeToBreak: deps.canBreakForPath,
      quiet: true
    })

    return reached || portal.position.distanceTo(deps.bot.entity.position) >= 8
  }

  return {
    currentDimension,
    ensureNether,
    ensureOverworld,
    findNearestNetherPortal,
    isNether,
    isOverworld,
    moveAwayFromCurrentPortal,
    rememberPortal,
    savedPortalForDimension,
    savedPortalPosition
  }
}

module.exports = {
  createPortalHelpers
}
