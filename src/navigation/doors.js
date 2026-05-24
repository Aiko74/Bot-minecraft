const { Vec3 } = require('vec3')

function createDoorHelpers(deps) {
  function doorBlockIds() {
    const mcData = deps.getMcData()
    if (!mcData || !mcData.blocksByName) return []
    return Object.values(mcData.blocksByName)
      .filter(block => {
        if (!block || !block.name) return false
        return (block.name.includes('door') && !block.name.includes('trapdoor')) || block.name.includes('fence_gate')
      })
      .map(block => block.id)
  }

  function isDoorOpen(block) {
    if (!block || typeof block.getProperties !== 'function') return false

    try {
      const properties = block.getProperties()
      return properties && properties.open === true
    } catch {
      return false
    }
  }

  function isOpenableDoor(block) {
    return Boolean(block && block.name && ((block.name.includes('door') && !block.name.includes('trapdoor')) || block.name.includes('fence_gate')))
  }

  async function openDoorBlock(block) {
    if (!isOpenableDoor(block)) return false
    if (isDoorOpen(block)) return false

    try {
      await deps.bot.lookAt(block.position.offset(0.5, 0.5, 0.5), true)
      await deps.bot.activateBlock(block)
      return true
    } catch (err) {
      deps.logError('open door error', err)
      return false
    }
  }

  async function closeDoorBlock(block) {
    if (!isOpenableDoor(block)) return false

    const fresh = deps.bot.blockAt(block.position) || block
    if (!isDoorOpen(fresh)) return true

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await deps.bot.lookAt(fresh.position.offset(0.5, 0.5, 0.5), true)
        await deps.bot.activateBlock(fresh)
        await deps.sleep(300)
        if (!isDoorOpen(deps.bot.blockAt(fresh.position) || fresh)) return true
      } catch (err) {
        deps.logError(`close door error attempt ${attempt}`, err)
      }
    }

    return false
  }

  async function openNearbyDoors(maxDistance = 5, options = {}) {
    const ids = doorBlockIds()
    if (ids.length === 0) return false

    let positions = []
    try {
      positions = deps.bot.findBlocks({ matching: ids, maxDistance, count: 12 })
    } catch {
      return false
    }

    const doors = positions
      .map(position => deps.bot.blockAt(position))
      .filter(Boolean)
      .sort((a, b) => a.position.distanceTo(deps.bot.entity.position) - b.position.distanceTo(deps.bot.entity.position))

    for (const door of doors) {
      if (door.position.distanceTo(deps.bot.entity.position) > 5.2) continue
      const opened = await openDoorBlock(door)
      if (opened) {
        if (!options.quiet) deps.safeChat('Porte ouverte.', 5000)
        await deps.sleep(250)
        return true
      }
    }

    return false
  }

  function isWalkableBlock(block) {
    if (!block) return false
    return block.boundingBox === 'empty' || block.name === 'water'
  }

  function doorPassTargets(door, mode = 'away', referencePoint = deps.getBasePos()) {
    if (!door || !deps.isValidPos(door.position) || !deps.isValidPos(referencePoint)) {
      console.log('[farm][path] cible invalide ignorée porte')
      return []
    }

    const baseY = Math.floor(door.position.y)
    const candidates = [
      new Vec3(door.position.x + 1, baseY, door.position.z),
      new Vec3(door.position.x - 1, baseY, door.position.z),
      new Vec3(door.position.x, baseY, door.position.z + 1),
      new Vec3(door.position.x, baseY, door.position.z - 1),
      new Vec3(door.position.x + 2, baseY, door.position.z),
      new Vec3(door.position.x - 2, baseY, door.position.z),
      new Vec3(door.position.x, baseY, door.position.z + 2),
      new Vec3(door.position.x, baseY, door.position.z - 2)
    ]

    return candidates
      .filter(pos => {
        if (!deps.isValidPos(pos)) {
          console.log('[farm][path] cible invalide ignorée passage porte')
          return false
        }
        const feet = deps.bot.blockAt(pos)
        const head = deps.bot.blockAt(pos.offset(0, 1, 0))
        const floor = deps.bot.blockAt(pos.offset(0, -1, 0))
        if (!isWalkableBlock(feet) || !isWalkableBlock(head)) return false
        if (!floor || floor.boundingBox === 'empty') return false
        return true
      })
      .sort((a, b) => {
        const distanceA = a.distanceTo(referencePoint)
        const distanceB = b.distanceTo(referencePoint)
        return mode === 'towards' ? distanceA - distanceB : distanceB - distanceA
      })
  }

  function doorsNearPoint(point, maxDistance = 14) {
    if (!deps.isValidPos(point) || !deps.getMcData()) {
      console.log('[farm][path] cible invalide ignorée recherche porte')
      return []
    }

    const ids = doorBlockIds()
    if (ids.length === 0) return []

    try {
      return deps.bot.findBlocks({ point, matching: ids, maxDistance, count: 24 })
        .map(position => deps.bot.blockAt(position))
        .filter(Boolean)
        .sort((a, b) => a.position.distanceTo(point) - b.position.distanceTo(point))
    } catch {
      return []
    }
  }

  function nearestFarmDoor(point = deps.bot.entity.position, maxDistance = 12) {
    return doorsNearPoint(point, maxDistance)[0] || null
  }

  function isFarmEntryBlock(block) {
    return isOpenableDoor(block)
  }

  function savedFarmDoor(kind) {
    const farmDoorPos = deps.getFarmDoorPos()
    const savedPos = farmDoorPos[kind]
    if (!savedPos) return null
    const block = deps.bot.blockAt(savedPos)
    if (!block || !block.name) return null
    return isFarmEntryBlock(block) ? block : null
  }

  async function passDoor(door, mode = 'towards', options = {}) {
    if (!door || !deps.isValidPos(door.position)) {
      console.log('[farm][path] cible invalide ignorée porte')
      return { ok: false, closed: false }
    }

    const basePos = deps.getBasePos()
    const logPrefix = options.logPrefix || '[door]'
    const label = options.label || 'porte'
    const beforeDistance = basePos ? deps.bot.entity.position.distanceTo(basePos) : null
    const beforePosition = deps.bot.entity.position.clone()
    const referencePoint = options.referencePoint || basePos
    if (logPrefix === '[farm][door]' && deps.isValidPos(referencePoint)) {
      console.log(`[farm][door] côté avant porte bot=${beforePosition.x.toFixed(1)} ${beforePosition.y.toFixed(1)} ${beforePosition.z.toFixed(1)} distanceFerme=${beforePosition.distanceTo(referencePoint).toFixed(2)}`)
    }

    console.log(`${logPrefix} entree candidate ${door.name} ${door.position.x} ${door.position.y} ${door.position.z}`)
    console.log(`${logPrefix} ouverture ${door.name} ${door.position.x} ${door.position.y} ${door.position.z}`)
    const doorGoal = deps.farmGoalNear(door.position, 2, 'porte')
    if (!doorGoal) return { ok: false, closed: false }
    console.log(`[farm][path] goto porte ${door.position.x} ${door.position.y} ${door.position.z}`)
    await deps.safeGoto(doorGoal, label, {
      attempts: 2,
      timeoutMs: 7000,
      canDig: false,
      canOpenDoors: false,
      quiet: true,
      successCheck: () => door.position.distanceTo(deps.bot.entity.position) <= 3
    })

    await openDoorBlock(deps.bot.blockAt(door.position) || door)
    await deps.sleep(200)

    const passTargets = doorPassTargets(door, mode, referencePoint)
    for (const target of passTargets) {
      if (!deps.isValidPos(target)) {
        console.log('[farm][path] cible invalide ignorée passage')
        continue
      }
      console.log(`${logPrefix} passage ${target.x} ${target.y} ${target.z}`)
      console.log(`[farm][path] goto intérieur ${target.x} ${target.y} ${target.z}`)
      const targetGoal = deps.farmGoalNear(target, 1, 'passage porte')
      if (!targetGoal) continue
      const reached = await deps.safeGoto(targetGoal, `${label} passage`, {
        attempts: 2,
        timeoutMs: 7000,
        canDig: false,
        canOpenDoors: false,
        quiet: true,
        successCheck: () => deps.bot.entity.position.distanceTo(target) <= 2
      })

      if (!reached) continue

      const afterPosition = deps.bot.entity.position.clone()
      if (logPrefix === '[farm][door]' && deps.isValidPos(referencePoint)) {
        console.log(`[farm][door] côté après porte bot=${afterPosition.x.toFixed(1)} ${afterPosition.y.toFixed(1)} ${afterPosition.z.toFixed(1)} target=${target.x} ${target.y} ${target.z} distanceFerme=${afterPosition.distanceTo(referencePoint).toFixed(2)}`)
      }

      const closed = await closeDoorBlock(deps.bot.blockAt(door.position) || door)
      if (closed) {
        console.log(`${logPrefix} fermeture ${door.position.x} ${door.position.y} ${door.position.z}`)
        console.log(`${logPrefix} fermeture confirmee ${door.position.x} ${door.position.y} ${door.position.z}`)
      } else {
        console.log(`${logPrefix} fermeture echouee ${door.position.x} ${door.position.y} ${door.position.z}`)
      }

      return {
        ok: true,
        closed,
        door,
        target,
        beforePosition,
        afterPosition,
        beforeDistance,
        afterDistance: basePos ? deps.bot.entity.position.distanceTo(basePos) : null
      }
    }

    return { ok: false, closed: false }
  }

  async function forceExitThroughNearestDoor() {
    const basePos = deps.getBasePos()
    if (!basePos || !deps.getMcData()) return false

    const ids = doorBlockIds()
    if (ids.length === 0) return false

    const positions = deps.bot.findBlocks({ matching: ids, maxDistance: 12, count: 16 })
    const doors = positions
      .map(position => deps.bot.blockAt(position))
      .filter(Boolean)
      .sort((a, b) => a.position.distanceTo(deps.bot.entity.position) - b.position.distanceTo(deps.bot.entity.position))

    for (const door of doors) {
      const beforeDistance = deps.bot.entity.position.distanceTo(basePos)

      await deps.safeGoto(new deps.goals.GoalNear(door.position.x, door.position.y, door.position.z, 2), 'porte de sortie', {
        attempts: 2,
        timeoutMs: 8000,
        canDig: false,
        quiet: true,
        successCheck: () => door.position.distanceTo(deps.bot.entity.position) <= 3
      })

      await openDoorBlock(deps.bot.blockAt(door.position) || door)
      await deps.sleep(250)

      const passTargets = doorPassTargets(door, 'away')
      for (const target of passTargets) {
        const reached = await deps.safeGoto(new deps.goals.GoalNear(target.x, target.y, target.z, 1), 'passage porte', {
          attempts: 2,
          timeoutMs: 7000,
          canDig: false,
          quiet: true,
          successCheck: () => deps.bot.entity.position.distanceTo(basePos) >= beforeDistance + 2 || deps.bot.entity.position.distanceTo(target) <= 2
        })

        const afterDistance = deps.bot.entity.position.distanceTo(basePos)
        if (reached && afterDistance > beforeDistance + 1) {
          deps.safeChat('Sortie de base trouvee, je continue seul.', 8000)
          return true
        }
      }
    }

    return false
  }

  return {
    closeDoorBlock,
    doorPassTargets,
    doorsNearPoint,
    forceExitThroughNearestDoor,
    isDoorOpen,
    isFarmEntryBlock,
    isWalkableBlock,
    nearestFarmDoor,
    openDoorBlock,
    openNearbyDoors,
    passDoor,
    savedFarmDoor
  }
}

module.exports = {
  createDoorHelpers
}
