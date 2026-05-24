function createChestHelpers(deps) {
  const MEAT_FOOD_NAMES = new Set([
    'cooked_beef',
    'cooked_porkchop',
    'cooked_mutton',
    'cooked_chicken',
    'cooked_rabbit',
    'beef',
    'porkchop',
    'mutton',
    'chicken',
    'rabbit'
  ])
  const PATH_BLOCK_NAMES = new Set(['cobblestone', 'stone', 'dirt', 'netherrack'])

  function desiredWithdrawCount(item) {
    if (deps.food.isFood(item)) {
      const desiredCarry = MEAT_FOOD_NAMES.has(item.name)
        ? Math.max(deps.config.foodCarry, 64)
        : deps.config.foodCarry
      const currentFood = MEAT_FOOD_NAMES.has(item.name)
        ? meatFoodCount()
        : deps.food.foodCount()
      return Math.min(item.count, Math.max(0, desiredCarry - currentFood))
    }

    if (deps.shouldWithdrawUpgrade(item, 'pickaxe')) return 1
    if (deps.shouldWithdrawUpgrade(item, 'sword')) return 1
    if (deps.shouldWithdrawUpgrade(item, 'axe')) return 1
    if (deps.shouldWithdrawUpgrade(item, 'shovel')) return 1
    if (deps.shouldWithdrawUpgrade(item, 'helmet')) return 1
    if (deps.shouldWithdrawUpgrade(item, 'chestplate')) return 1
    if (deps.shouldWithdrawUpgrade(item, 'leggings')) return 1
    if (deps.shouldWithdrawUpgrade(item, 'boots')) return 1
    if (item.name.includes('shield')) return deps.ownedItems().some(owned => owned.name.includes('shield')) ? 0 : 1
    if (item.name === 'torch') return Math.min(item.count, Math.max(0, 32 - deps.inventoryCount('torch')))
    if (item.name === 'arrow') return Math.min(item.count, Math.max(0, 32 - deps.inventoryCount('arrow')))
    if (deps.fuelValues[item.name]) return Math.min(item.count, Math.max(0, 8 - deps.inventoryCount(item.name)))

    return 0
  }

  function isContainerBlock(block) {
    return Boolean(
      block &&
      (
        block.name === 'chest' ||
        block.name === 'trapped_chest' ||
        block.name === 'barrel' ||
        block.name.endsWith('shulker_box')
      )
    )
  }

  function meatFoodCount() {
    return deps.bot.inventory.items()
      .filter(item => MEAT_FOOD_NAMES.has(item.name))
      .reduce((total, item) => total + item.count, 0)
  }

  function sameBlockPos(a, b) {
    return Boolean(a && b && a.x === b.x && a.y === b.y && a.z === b.z)
  }

  function farmContainerPositions() {
    const saved = deps.getFarmContainerPos ? deps.getFarmContainerPos() : null
    if (!saved) return []
    return Object.values(saved).filter(Boolean)
  }

  function isSavedFarmContainer(pos) {
    const baseContainerPos = deps.getBaseContainerPos()
    return farmContainerPositions().some(farmPos =>
      sameBlockPos(pos, farmPos) && !sameBlockPos(pos, baseContainerPos)
    )
  }

  function uniqueBlocks(blocks) {
    const seen = new Set()
    const unique = []

    for (const block of blocks.filter(Boolean)) {
      const key = `${block.position.x},${block.position.y},${block.position.z}`
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(block)
    }

    return unique
  }

  function findNearbyContainers(maxDistance = 8, point = deps.bot.entity.position, options = {}) {
    const blocks = []
    const baseContainerPos = deps.getBaseContainerPos()

    if (options.includeSavedBase !== false && baseContainerPos) {
      const savedContainer = deps.bot.blockAt(baseContainerPos)
      if (isContainerBlock(savedContainer) && savedContainer.position.distanceTo(point) <= maxDistance + 2) {
        blocks.push(savedContainer)
      }
    }

    const positions = deps.bot.findBlocks({
      point,
      matching: block => {
        if (!isContainerBlock(block)) return false
        if (options.excludeFarm && isSavedFarmContainer(block.position)) return false
        if (!options.excludeBase || !baseContainerPos) return true
        return !sameBlockPos(block.position, baseContainerPos)
      },
      maxDistance,
      count: options.count || 16
    })

    for (const position of positions) {
      const block = deps.bot.blockAt(position)
      if (isContainerBlock(block)) blocks.push(block)
    }

    return uniqueBlocks(blocks)
      .sort((a, b) => a.position.distanceTo(point) - b.position.distanceTo(point))
  }

  function findNearestContainer(maxDistance = 8, point = deps.bot.entity.position) {
    return findNearbyContainers(maxDistance, point, { includeSavedBase: true })[0] || null
  }

  function findNearestLocalContainer(maxDistance = 8, point = deps.bot.entity.position) {
    return findNearbyContainers(maxDistance, point, {
      includeSavedBase: false,
      excludeBase: true
    })[0] || null
  }

  async function baseContainerBlocks(maxDistance = 12, options = {}) {
    const travel = options.travel !== false
    const basePos = deps.getBasePos()

    if (basePos && deps.bot.entity.position.distanceTo(basePos) > 8) {
      if (!travel) return []

      const reachedBase = await deps.safeGoBase()
      if (!reachedBase) return []
    }

    const blocks = findNearbyContainers(maxDistance, deps.bot.entity.position, {
      includeSavedBase: true,
      excludeFarm: true,
      count: 24
    })

    if (blocks.length === 0) {
      deps.safeChat('Aucun coffre ou baril proche de la base.', 5000)
      return []
    }

    const baseContainerPos = deps.getBaseContainerPos()
    blocks.sort((a, b) => {
      const aSaved = baseContainerPos && sameBlockPos(a.position, baseContainerPos) ? 0 : 1
      const bSaved = baseContainerPos && sameBlockPos(b.position, baseContainerPos) ? 0 : 1
      if (aSaved !== bSaved) return aSaved - bSaved
      return a.position.distanceTo(deps.bot.entity.position) - b.position.distanceTo(deps.bot.entity.position)
    })

    if (!baseContainerPos) {
      deps.setBaseContainerPos(blocks[0].position.clone())
      deps.saveMemory()
    }
    return blocks
  }

  function buildDepositPlan(names = null, options = {}) {
    const accepted = names ? new Set(names) : null
    const keepFood = options.keepFood !== false
    const keepLoadout = options.keepLoadout !== false
    const keepPathBlocks = options.keepPathBlocks === true
    const plan = new Map()
    let keptFood = 0
    let keptPathBlocks = 0

    for (const item of deps.bot.inventory.items()) {
      if (accepted && !accepted.has(item.name)) continue

      let countToDeposit = item.count

      if (!accepted && keepFood && deps.food.isFood(item)) {
        const keep = Math.max(0, deps.config.foodCarry - keptFood)
        const keptFromStack = Math.min(item.count, keep)
        keptFood += keptFromStack
        countToDeposit = item.count - keptFromStack
      } else if (!accepted && keepLoadout && deps.food.isLoadoutItem(item)) {
        countToDeposit = 0
      } else if (!accepted && keepPathBlocks && PATH_BLOCK_NAMES.has(item.name)) {
        const keep = Math.max(0, 32 - keptPathBlocks)
        const keptFromStack = Math.min(item.count, keep)
        keptPathBlocks += keptFromStack
        countToDeposit = item.count - keptFromStack
      }

      if (countToDeposit <= 0) continue

      const current = plan.get(item.name) || {
        name: item.name,
        type: item.type,
        remaining: 0
      }
      current.remaining += countToDeposit
      plan.set(item.name, current)
    }

    return plan
  }

  function planRemainingCount(plan) {
    return [...plan.values()].reduce((total, entry) => total + Math.max(0, entry.remaining), 0)
  }

  async function depositPlanToContainers(plan, blocks, label = 'coffre') {
    const startingCount = planRemainingCount(plan)
    if (deps.getFarmNoDigActive()) console.log(`[farm][chest] items à déposer ${startingCount}`)
    if (startingCount === 0) {
      if (deps.getFarmNoDigActive()) console.log('[farm][chest] rien à déposer')
      return true
    }
    if (!blocks || blocks.length === 0) return false

    for (const block of blocks) {
      if (planRemainingCount(plan) === 0) break

      let container = null
      try {
        container = await openContainerBlock(block)
        if (!container) continue
        if (deps.getFarmNoDigActive()) deps.setLastFarmDepositOpened(true)

        for (const entry of plan.values()) {
          if (entry.remaining <= 0) continue

          const before = deps.inventoryCount(entry.name)
          const count = Math.min(entry.remaining, before)
          if (count <= 0) {
            entry.remaining = 0
            continue
          }

          try {
            await container.deposit(entry.type, null, count)
          } catch (err) {
            deps.logError(`${label} deposit ${entry.name} error`, err)
          }

          const after = deps.inventoryCount(entry.name)
          const depositedNow = Math.max(0, before - after)
          entry.remaining -= depositedNow
          if (deps.getFarmNoDigActive() && depositedNow > 0) {
            deps.addLastFarmDepositedCount(depositedNow)
            console.log(`[farm][chest] item déposé ${entry.name} x${depositedNow}`)
          }
        }
      } finally {
        if (container) {
          if (deps.getFarmNoDigActive()) console.log('[farm][chest] fermeture coffre')
          container.close()
        }
      }
    }

    const remaining = planRemainingCount(plan)
    if (deps.getFarmNoDigActive() && deps.getLastFarmDepositedCount() > 0) {
      console.log(`[farm][chest] dépôt réussi ${deps.getLastFarmDepositedCount()} items`)
      return true
    }

    if (remaining > 0) {
      deps.safeChat(`${label}: depot incomplet, coffre plein ou item refuse (${remaining} items).`, 8000)
      return false
    }

    if (deps.getFarmNoDigActive()) console.log(`[farm][chest] dépôt réussi ${startingCount} items`)
    return true
  }

  async function openContainerBlock(containerBlock) {
    if (!containerBlock) return null
    if (!deps.isValidPos(containerBlock.position)) {
      if (deps.getFarmNoDigActive()) console.log('[farm][path] cible invalide ignorée coffre')
      return null
    }

    if (containerBlock.position.distanceTo(deps.bot.entity.position) <= 5.5) {
      try {
        await deps.bot.lookAt(containerBlock.position.offset(0.5, 0.5, 0.5), true)
        const opened = deps.getFarmNoDigActive()
          ? await openContainerWithTimeout(containerBlock, 3500, 'direct')
          : await deps.bot.openContainer(containerBlock)
        if (deps.getFarmNoDigActive()) console.log('[farm][chest] ouverture réussie position directe')
        return opened
      } catch (err) {
        deps.logError('direct open container error', err)
      }
    }

    if (deps.getFarmNoDigActive()) {
      const accessPositions = deps.farmChestAccessPositions(containerBlock).slice(0, 8)
      for (let i = 0; i < accessPositions.length; i++) {
        const target = accessPositions[i]
        console.log(`[farm][chest] tentative position ${i + 1}/${accessPositions.length}`)
        const chestGoal = deps.farmGoalNear(target, 1, 'coffre ferme officiel')
        if (!chestGoal) continue

        const reached = await deps.safeGoto(chestGoal, `coffre ${containerBlock.position.x} ${containerBlock.position.y} ${containerBlock.position.z}`, {
          attempts: 1,
          timeoutMs: 4500,
          canDig: false,
          canPlace: false,
          canOpenDoors: false,
          quiet: true,
          successCheck: () => deps.bot.entity.position.distanceTo(target) <= 2.2 || containerBlock.position.distanceTo(deps.bot.entity.position) <= 5.5
        })
        if (!reached) continue

        try {
          await deps.bot.lookAt(containerBlock.position.offset(0.5, 0.5, 0.5), true)
          const opened = await openContainerWithTimeout(containerBlock, 3500, `position ${i + 1}`)
          console.log(`[farm][chest] ouverture réussie position ${i + 1}`)
          return opened
        } catch (err) {
          deps.logError('farm open container from access position error', err)
        }
      }

      console.log('[farm][chest] toutes positions échouées')
      return null
    }

    if (containerBlock.position.distanceTo(deps.bot.entity.position) > 4) {
      if (deps.getFarmNoDigActive()) console.log(`[farm][path] goto coffre ${containerBlock.position.x} ${containerBlock.position.y} ${containerBlock.position.z}`)
      const containerGoal = deps.getFarmNoDigActive()
        ? deps.farmGoalNear(containerBlock.position, 2, 'coffre')
        : new deps.goals.GoalNear(containerBlock.position.x, containerBlock.position.y, containerBlock.position.z, 2)
      if (!containerGoal) return null
      const reached = await deps.safeGoto(containerGoal, `coffre ${containerBlock.position.x} ${containerBlock.position.y} ${containerBlock.position.z}`, {
        attempts: 1,
        timeoutMs: 7000,
        canDig: false,
        canPlace: deps.getFarmNoDigActive() ? false : undefined,
        canOpenDoors: deps.getFarmNoDigActive() ? false : undefined,
        successCheck: () => containerBlock.position.distanceTo(deps.bot.entity.position) <= 4.5
      })
      if (!reached) return null
    }

    try {
      const opened = deps.getFarmNoDigActive()
        ? await openContainerWithTimeout(containerBlock, 3500, 'final')
        : await deps.bot.openContainer(containerBlock)
      if (deps.getFarmNoDigActive()) console.log('[farm][chest] ouverture réussie position finale')
      return opened
    } catch (err) {
      deps.logError('open container error', err)
      deps.safeChat("Impossible d'ouvrir ce coffre/baril.", 8000)
      return null
    }
  }

  async function openContainerWithTimeout(containerBlock, timeoutMs = 4000, label = 'coffre') {
    try {
      return await deps.withTimeout(
        deps.bot.openContainer(containerBlock),
        timeoutMs,
        () => {
          try {
            if (deps.bot.currentWindow) deps.bot.closeWindow(deps.bot.currentWindow)
          } catch {}
        }
      )
    } catch (err) {
      if (deps.getFarmNoDigActive()) console.log(`[farm][chest] ouverture timeout ${label}`)
      throw err
    }
  }

  async function openBaseContainer() {
    const blocks = await baseContainerBlocks(12)
    const containerBlock = blocks[0]
    if (!containerBlock) return null
    return openContainerBlock(containerBlock)
  }

  async function takeLoadoutFromChest() {
    try {
      const blocks = await baseContainerBlocks(12)
      if (blocks.length === 0) return false
      let withdrewSomething = false

      for (const block of blocks) {
        let container = null
        try {
          container = await openContainerBlock(block)
          if (!container) continue

          for (const item of container.containerItems()) {
            const count = desiredWithdrawCount(item)
            if (count <= 0) continue

            try {
              await container.withdraw(item.type, null, count)
              withdrewSomething = true
            } catch (err) {
              deps.logError('withdraw error', err)
            }
          }
        } finally {
          if (container) container.close()
        }
      }

      return withdrewSomething
    } catch (err) {
      deps.logError('loadout chest error', err)
      return false
    }
  }

  async function storeItems(options = {}) {
    try {
      if (options.unequip === true) await unequipCarriedEquipment()

      const blocks = await baseContainerBlocks(12)
      if (blocks.length === 0) return false

      const plan = buildDepositPlan(null, {
        keepFood: options.keepFood !== false,
        keepLoadout: options.keepLoadout !== false,
        keepPathBlocks: options.keepPathBlocks === true
      })

      return depositPlanToContainers(plan, blocks, 'Base')
    } catch (err) {
      deps.logError('store error', err)
      return false
    }
  }

  async function unequipCarriedEquipment() {
    for (const destination of ['hand', 'off-hand', 'head', 'torso', 'legs', 'feet']) {
      try {
        await deps.bot.unequip(destination)
      } catch {}
    }
  }

  return {
    baseContainerBlocks,
    buildDepositPlan,
    depositPlanToContainers,
    findNearbyContainers,
    findNearestContainer,
    findNearestLocalContainer,
    isContainerBlock,
    openBaseContainer,
    openContainerBlock,
    openContainerWithTimeout,
    planRemainingCount,
    storeItems,
    takeLoadoutFromChest,
    uniqueBlocks,
    unequipCarriedEquipment
  }
}

module.exports = {
  createChestHelpers
}
