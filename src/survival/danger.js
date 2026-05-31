function createDangerHelpers(deps) {
  const nearbyCriticalHazards = new Set([
    'lava',
    'fire',
    'soul_fire',
    'campfire',
    'soul_campfire',
    'powder_snow'
  ])
  const retreatOnlyEntities = new Set([
    'creeper',
    'warden',
    'ender_dragon',
    'wither',
    'ghast'
  ])
  let lastRetreatMessageAt = 0

  function blockIsHazard(block) {
    return Boolean(block && deps.hazardBlockNames.includes(block.name))
  }

  function nearbyCriticalHazardBlock(maxDistance = 2) {
    const mcData = deps.getMcData && deps.getMcData()
    if (!mcData || !deps.bot.findBlock) return null

    const ids = [...nearbyCriticalHazards]
      .map(name => mcData.blocksByName[name] && mcData.blocksByName[name].id)
      .filter(id => typeof id === 'number')

    if (ids.length === 0) return null

    return deps.bot.findBlock({
      matching: ids,
      maxDistance
    })
  }

  function currentHazardBlock() {
    if (!deps.bot.entity) return null

    const pos = deps.bot.entity.position
    const blocks = [
      deps.bot.blockAt(pos),
      deps.bot.blockAt(pos.offset(0, 1, 0)),
      deps.bot.blockAt(pos.offset(0, -1, 0))
    ]

    return blocks.find(blockIsHazard) || nearbyCriticalHazardBlock(2)
  }

  function nearestHostile(maxDistance) {
    return deps.bot.nearestEntity(entity => {
      if (!entity || !entity.name || !entity.position) return false
      if (deps.neutralEntities && deps.neutralEntities.has(entity.name)) return false
      if (!deps.hostileEntities.has(entity.name)) return false
      return entity.position.distanceTo(deps.bot.entity.position) <= maxDistance
    })
  }

  function isNeutralEntity(entity) {
    return Boolean(entity && entity.name && deps.neutralEntities && deps.neutralEntities.has(entity.name))
  }

  function shouldRetreatOnly(entity) {
    return Boolean(entity && entity.name && (retreatOnlyEntities.has(entity.name) || deps.unfightableEntities.has(entity.name)))
  }

  async function retreatFrom(position, reason) {
    if (deps.isStopRequested()) return false

    const now = Date.now()
    if (now - lastRetreatMessageAt > 5000) {
      deps.safeChat(`${reason}: esquive.`, 5000)
      lastRetreatMessageAt = now
    }
    deps.bot.pathfinder.setGoal(null)

    const current = deps.bot.entity.position
    let awayX = current.x - position.x
    let awayZ = current.z - position.z
    const length = Math.sqrt(awayX * awayX + awayZ * awayZ) || 1

    awayX /= length
    awayZ /= length

    const targetX = current.x + awayX * 14 + (Math.random() * 6 - 3)
    const targetZ = current.z + awayZ * 14 + (Math.random() * 6 - 3)

    const reached = await deps.safeGoto(new deps.goals.GoalNear(targetX, current.y, targetZ, 3), 'esquive', {
      attempts: 1,
      timeoutMs: 5000,
      canDig: false,
      canPlace: false,
      quiet: true
    })

    if (reached || deps.isStopRequested()) return reached

    deps.bot.setControlState('back', true)
    deps.bot.setControlState('jump', true)
    await deps.sleep(900)
    deps.bot.setControlState('back', false)
    deps.bot.setControlState('jump', false)
    return false
  }

  async function fightHostile(hostile) {
    if (!hostile || !hostile.isValid || deps.isCombatRunning()) return false
    if (isNeutralEntity(hostile)) {
      console.log(`[danger] neutral mob ignored ${hostile.name}`)
      return false
    }
    if (deps.bot.health > 0 && deps.bot.health <= deps.config.healthReturnAt) return false
    if (deps.isStopRequested()) return false

    deps.setCombatRunning(true)

    try {
      const distance = hostile.position.distanceTo(deps.bot.entity.position)

      if (shouldRetreatOnly(hostile)) {
        await retreatFrom(hostile.position, `Mob trop dangereux ${hostile.name}`)
        return false
      }

      const armed = await deps.ensureCombatGear({ allowBaseTrip: false })
      if (deps.isStopRequested()) return false
      if (!armed) {
        await retreatFrom(hostile.position, "Pas d'arme de combat")
        return false
      }

      deps.safeChat(`Defense: j'attaque ${hostile.name}.`, 5000)

      let hits = 0

      while (
        !deps.isStopRequested() &&
        hostile.isValid &&
        deps.bot.health > deps.config.healthReturnAt &&
        hostile.position.distanceTo(deps.bot.entity.position) <= deps.config.hostileDistance + 8 &&
        hits < 18
      ) {
        await deps.food.autoEat()
        if (deps.isStopRequested()) break
        await deps.tools.equipWeapon()
        if (deps.isStopRequested()) break

        const currentDistance = hostile.position.distanceTo(deps.bot.entity.position)
        if (currentDistance > 3) {
          await deps.safeGoto(new deps.goals.GoalFollow(hostile, 2), `mob ${hostile.name}`, {
            attempts: 1,
            timeoutMs: 6000
          })
        }

        if (!hostile.isValid) break

        if (hostile.position.distanceTo(deps.bot.entity.position) <= 4) {
          deps.bot.attack(hostile)
          hits++
          await deps.sleep(650)
        } else {
          break
        }
      }

      await deps.collectNearbyDrops(8)
      return !hostile.isValid
    } catch (err) {
      deps.logError('combat error', err)
      return false
    } finally {
      deps.setCombatRunning(false)
    }
  }

  async function ensureSurvival(options = {}) {
    const allowReturn = options.allowReturn !== false

    if (!deps.getMcData() || !deps.bot.entity || deps.bot.health <= 0) return false
    if (deps.isSafetyRunning()) return false

    deps.setSafetyRunning(true)
    try {
      const hazard = currentHazardBlock()
      if (hazard) {
        await retreatFrom(hazard.position, `Bloc dangereux ${hazard.name}`)
        return false
      }

      if (deps.isStopRequested()) return false

      if (deps.oxygen.shouldEscapeForOxygen()) {
        await deps.oxygen.escapeWater()
        return false
      }

      if (deps.isStopRequested()) return false

      const ate = await deps.food.autoEat()
      if (deps.isStopRequested()) return false
      if (!ate && deps.bot.food <= deps.config.foodCriticalAt && allowReturn && deps.getBasePos()) {
        deps.safeChat('Plus assez de nourriture, retour base.', 8000)
        await deps.safeGoBase()
        if (deps.isStopRequested()) return false
        await deps.chests.takeLoadoutFromChest()
        await deps.food.autoEat(true)
        return false
      }

      if (deps.bot.health > 0 && deps.bot.health <= deps.config.healthReturnAt) {
        const stable = await deps.stabilizeHealthBeforeRetreat()
        if (stable) return true

        if (allowReturn && deps.getBasePos() && deps.bot.health <= Math.max(4, deps.config.healthReturnAt - 3)) {
          await deps.missionRuntime.recoverAtBase('Vie basse critique')
          return false
        }

        if (allowReturn && deps.getBasePos() && !deps.food.findBestFood() && deps.bot.food <= deps.config.foodCriticalAt) {
          await deps.missionRuntime.recoverAtBase('Vie basse et plus de nourriture')
          return false
        }

        deps.safeChat('Vie basse: je mange/temporise au lieu de rentrer direct.', 8000)
        return true
      }

      const hostile = nearestHostile(deps.config.hostileDistance)
      if (hostile) {
        const distance = hostile.position.distanceTo(deps.bot.entity.position)
        if (shouldRetreatOnly(hostile)) {
          await retreatFrom(hostile.position, `Mob dangereux ${hostile.name}`)
          return false
        }

        if (!deps.getDefendMode()) {
          if (distance <= deps.config.hostileCriticalDistance || hostile.name === 'creeper') {
            await retreatFrom(hostile.position, `Mob proche ${hostile.name}`)
            return false
          }

          return true
        }

        if (distance <= deps.config.hostileCriticalDistance) {
          await fightHostile(hostile)
          return false
        }

        await fightHostile(hostile)
        return false
      }

      return true
    } finally {
      deps.setSafetyRunning(false)
    }
  }

  return {
    blockIsHazard,
    ensureSurvival,
    fightHostile,
    nearestHostile
  }
}

module.exports = {
  createDangerHelpers
}
