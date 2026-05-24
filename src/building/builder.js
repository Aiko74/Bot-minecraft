const { Vec3 } = require('vec3')
const { createBlueprintStatusHelpers } = require('./blueprintStatus')
const { createTerrainScanHelpers } = require('./terrainScan')

function createBuildHelpers(deps) {
  const terrain = createTerrainScanHelpers({
    bot: deps.bot,
    floorVec: deps.floorVec,
    getBuildSite: deps.getBuildSite,
    listBlueprints: deps.listBlueprints,
    loadBlueprint: deps.loadBlueprint,
    safeChat: deps.safeChat,
    saveMemory: deps.saveMemory,
    setBuildSite: deps.setBuildSite
  })

  const scanAndSetBuildSite = terrain.scanAndSetBuildSite
  function countInventoryByName() {
    return deps.bot.inventory.items().reduce((counts, item) => {
      counts[item.name] = (counts[item.name] || 0) + item.count
      return counts
    }, {})
  }

  const {
    currentBlueprintMissing,
    sendBlueprintList,
    sendBlueprintStatus
  } = createBlueprintStatusHelpers({
    baseContainerBlocks: deps.chests.baseContainerBlocks,
    countInventoryByName,
    getBasePos: deps.getBasePos,
    getBuildSite: deps.getBuildSite,
    listBlueprints: deps.listBlueprints,
    loadBlueprint: deps.loadBlueprint,
    logError: deps.logError,
    missingMaterials: deps.missingMaterials,
    openContainerBlock: deps.chests.openContainerBlock,
    safeChat: deps.safeChat,
    summarizeMissing: deps.summarizeMissing
  })

  function missingCount(missing, name) {
    const item = missing.find(entry => entry.name === name)
    return item ? item.missing : 0
  }

  async function withdrawUsefulBuildInputs(blueprint, missing) {
    if (!deps.getBasePos()) return

    for (const [name, count] of Object.entries(blueprint.materials || {})) {
      await deps.withdrawNamedItemsFromBase([name], count)
    }

    const plankNeed = missingCount(missing, 'oak_planks')
    const logNeed = missingCount(missing, 'oak_log')
    if (plankNeed > 0 || logNeed > 0) {
      await deps.withdrawNamedItemsFromBase(['oak_log'], logNeed + Math.ceil(plankNeed / 4))
    }

    if (missingCount(missing, 'torch') > 0) {
      await deps.withdrawNamedItemsFromBase(['coal', 'charcoal', 'stick'], 16)
    }

    if (missingCount(missing, 'oak_door') > 0 || missingCount(missing, 'chest') > 0) {
      await deps.withdrawNamedItemsFromBase(['oak_planks'], 64)
    }

    if (
      missingCount(missing, 'oak_fence') > 0 ||
      missingCount(missing, 'oak_fence_gate') > 0 ||
      missingCount(missing, 'oak_slab') > 0
    ) {
      await deps.withdrawNamedItemsFromBase(['oak_planks', 'stick'], 64)
      await deps.withdrawNamedItemsFromBase(['oak_log'], 24)
    }

    if (missingCount(missing, 'glass_pane') > 0) {
      await deps.withdrawNamedItemsFromBase(['glass', 'sand'], 32)
    }
  }

  async function moveToBuildGatherZone(label = 'ressources') {
    const basePos = deps.getBasePos()
    if (!basePos) return true

    const distance = deps.bot.entity.position.distanceTo(basePos)
    const minDistance = Math.max(deps.config.baseProtectionRadius + 12, 96)
    if (distance >= minDistance) return true

    deps.safeChat(`Je m'eloigne de la base pour recuperer ${label} sans l'abimer.`, 9000)

    const origin = deps.floorVec(deps.bot.entity.position)
    const candidates = []
    const directions = [
      deps.explorationOffset(0, minDistance, 0),
      deps.explorationOffset(1, minDistance, 0),
      deps.explorationOffset(2, minDistance, 0),
      deps.explorationOffset(3, minDistance, 0),
      deps.explorationOffset(4, minDistance, 0),
      deps.explorationOffset(5, minDistance, 0),
      deps.explorationOffset(6, minDistance, 0),
      deps.explorationOffset(7, minDistance, 0)
    ]

    for (const offset of directions) {
      const target = origin.offset(offset.x, 0, offset.z)
      if (target.distanceTo(basePos) < minDistance) continue
      candidates.push(target)
    }

    candidates.sort((a, b) => b.distanceTo(basePos) - a.distanceTo(basePos))

    for (const target of candidates.slice(0, 4)) {
      const reached = await deps.travelToPosition(target, `zone ${label}`, {
        finalRange: 8,
        stepDistance: 18,
        maxSteps: 10,
        timeoutMs: 7000,
        canDig: false,
        quiet: true
      })
      if (reached) return true
    }

    deps.safeChat(`Je n'arrive pas a m'eloigner proprement pour ${label}.`, 8000)
    return false
  }

  function findNearestBlockByNames(blockNames, maxDistance = deps.config.mineSearchRadius) {
    const ids = deps.getBlockIds(blockNames)
    if (ids.length === 0) return null

    const positions = deps.bot.findBlocks({
      matching: ids,
      maxDistance,
      count: 32
    })

    return positions
      .map(position => deps.bot.blockAt(position))
      .filter(Boolean)
      .filter(block => !deps.isProtectedBreakPosition(block.position))
      .sort((a, b) => a.position.distanceTo(deps.bot.entity.position) - b.position.distanceTo(deps.bot.entity.position))[0] || null
  }

  async function gatherBuildBlocks(label, blockNames, dropNames, neededCount, options = {}) {
    if (neededCount <= 0) return 0

    let gathered = 0
    let searchFails = 0
    deps.safeChat(`Je rassemble ${neededCount} ${label}.`)

    if (options.moveAwayFromBase !== false) {
      const moved = await moveToBuildGatherZone(label)
      if (!moved) return 0
    }

    while (!deps.isStopRequested() && gathered < neededCount && searchFails < 8) {
      const safe = await deps.danger.ensureSurvival({ allowReturn: true })
      if (!safe) {
        await deps.sleep(500)
        continue
      }

      if (deps.bot.inventory.emptySlotCount() <= deps.config.minEmptySlots && deps.getBasePos()) {
        await deps.safeGoBase()
        await deps.chests.storeItems()
      }

      const block = findNearestBlockByNames(blockNames)
      if (!block) {
        searchFails++
        await deps.explore()
        continue
      }

      try {
        const defaultMove = deps.getDefaultMove()
        if (defaultMove) deps.bot.pathfinder.setMovements(defaultMove)

        const reached = await deps.safeGoto(
          new deps.goals.GoalLookAtBlock(block.position, deps.bot.world, { reach: 4.5 }),
          label,
          { attempts: 2 }
        )
        if (!reached) {
          searchFails++
          continue
        }

        const freshBlock = deps.bot.blockAt(block.position)
        if (!freshBlock || !blockNames.includes(freshBlock.name)) continue
        const protectedReason = deps.protectedZoneReason(freshBlock.position)
        if (protectedReason) {
          deps.safeChat(`Bloc ignore: zone protegee (${protectedReason}).`, 10000)
          continue
        }

        const before = deps.countItems(dropNames)
        await deps.equipForBlock(freshBlock)
        await deps.bot.dig(freshBlock, true)
        await deps.collectNearbyDrops(6)
        await deps.sleep(250)

        const gained = Math.max(0, deps.countItems(dropNames) - before)
        gathered += gained || 1
      } catch (err) {
        deps.logError('build gather error', err)
        await deps.sleep(500)
      }
    }

    if (gathered > 0) deps.safeChat(`${label}: ${gathered}/${neededCount} recuperes.`)
    return gathered
  }

  async function collectOakLogs(count) {
    return gatherBuildBlocks('buches de chene', ['oak_log'], ['oak_log'], count)
  }

  async function collectSand(count) {
    return gatherBuildBlocks('sable', ['sand'], ['sand'], count)
  }

  async function smeltItem(inputName, outputName, count, kind = 'build') {
    let remaining = count
    let total = 0

    while (!deps.isStopRequested() && remaining > 0 && deps.inventoryCount(inputName) > 0) {
      const hasFuel = await deps.ensureFarmFuel(kind)
      if (!hasFuel) {
        deps.safeChat('Pas de combustible pour le four.', 8000)
        return total
      }

      const furnace = await deps.openNearestFurnace(kind)
      if (!furnace) {
        deps.safeChat('Aucun four proche pour cuire les ressources.', 8000)
        return total
      }

      try {
        const input = deps.bot.inventory.items().find(item => item.name === inputName)
        const fuel = deps.findFuelItem()
        if (!input || !fuel) break

        const cookCount = Math.min(input.count, remaining)
        const fuelCount = Math.max(1, Math.ceil(cookCount / deps.fuelValues[fuel.name]))
        await furnace.putFuel(fuel.type, null, Math.min(fuel.count, fuelCount))
        await furnace.putInput(input.type, null, cookCount)

        const cooked = await deps.waitForCookedOutput(furnace, outputName, cookCount)
        total += cooked
        remaining -= cooked
        if (cooked < cookCount) break
      } catch (err) {
        deps.logError('build smelt error', err)
        break
      } finally {
        if (furnace) furnace.close()
      }
    }

    if (total > 0) deps.safeChat(`${outputName}: ${total} cuits.`)
    return total
  }

  function buildWoodIngredientPlan(missing) {
    const fenceCrafts = Math.ceil(missingCount(missing, 'oak_fence') / 3)
    const gateCrafts = missingCount(missing, 'oak_fence_gate')
    const slabCrafts = Math.ceil(missingCount(missing, 'oak_slab') / 6)
    const doorCrafts = Math.ceil(missingCount(missing, 'oak_door') / 3)
    const chestCrafts = missingCount(missing, 'chest')
    const torchCrafts = Math.ceil(missingCount(missing, 'torch') / 4)

    const planks =
      fenceCrafts * 4 +
      gateCrafts * 2 +
      slabCrafts * 3 +
      doorCrafts * 6 +
      chestCrafts * 8

    const sticks =
      fenceCrafts * 2 +
      gateCrafts * 4 +
      torchCrafts

    return { planks, sticks }
  }

  async function ensureOakPlanks(minCount, reservedLogs = 0) {
    if (deps.inventoryCount('oak_planks') >= minCount) return true

    const missingPlanks = minCount - deps.inventoryCount('oak_planks')
    const logsToCraft = Math.ceil(missingPlanks / 4)
    const availableLogs = Math.max(0, deps.inventoryCount('oak_log') - reservedLogs)

    if (availableLogs < logsToCraft) {
      await collectOakLogs(logsToCraft - availableLogs)
    }

    const craftableLogs = Math.min(logsToCraft, Math.max(0, deps.inventoryCount('oak_log') - reservedLogs))
    if (craftableLogs > 0) {
      await deps.craftItemByName('oak_planks', craftableLogs, null)
    }

    return deps.inventoryCount('oak_planks') >= minCount
  }

  async function craftBlueprintItems(blueprint) {
    let missing = await currentBlueprintMissing(blueprint)

    const planksMissing = missingCount(missing, 'oak_planks')
    const logsReserved = missingCount(missing, 'oak_log')
    const woodPlan = buildWoodIngredientPlan(missing)
    const stickPlanks = Math.max(0, Math.ceil((woodPlan.sticks - deps.inventoryCount('stick')) / 4) * 2)
    const requiredPlanks = planksMissing + woodPlan.planks + stickPlanks

    if (requiredPlanks > 0) {
      await ensureOakPlanks(requiredPlanks, logsReserved)
    }

    missing = await currentBlueprintMissing(blueprint)

    const updatedWoodPlan = buildWoodIngredientPlan(missing)
    if (updatedWoodPlan.sticks > 0) {
      await deps.ensureSticks(updatedWoodPlan.sticks)
    }

    const torchMissing = missingCount(missing, 'torch')
    if (torchMissing > 0) {
      const crafts = Math.ceil(torchMissing / 4)
      if (deps.inventoryCount('coal') + deps.inventoryCount('charcoal') < crafts) {
        const coalTarget = deps.resourceTargetByKey('coal')
        if (coalTarget) await deps.mine(coalTarget, crafts)
        await deps.safeGoBase()
        await deps.withdrawNamedItemsFromBase(['coal', 'charcoal'], crafts)
      }
      await deps.craftItemByName('torch', crafts, null)
    }

    missing = await currentBlueprintMissing(blueprint)

    const table = await deps.ensureCraftingTable()
    if (!table) {
      deps.safeChat('Table de craft manquante pour les items en bois.', 8000)
    }

    const doorMissing = missingCount(missing, 'oak_door')
    if (doorMissing > 0 && table) {
      const crafts = Math.ceil(doorMissing / 3)
      await deps.craftItemByName('oak_door', crafts, table)
    }

    const chestMissing = missingCount(missing, 'chest')
    if (chestMissing > 0 && table) {
      await deps.craftItemByName('chest', chestMissing, table)
    }

    missing = await currentBlueprintMissing(blueprint)

    const fenceMissing = missingCount(missing, 'oak_fence')
    if (fenceMissing > 0 && table) {
      await deps.craftItemByName('oak_fence', Math.ceil(fenceMissing / 3), table)
    }

    const gateMissing = missingCount(missing, 'oak_fence_gate')
    if (gateMissing > 0 && table) {
      await deps.craftItemByName('oak_fence_gate', gateMissing, table)
    }

    const slabMissing = missingCount(missing, 'oak_slab')
    if (slabMissing > 0 && table) {
      await deps.craftItemByName('oak_slab', Math.ceil(slabMissing / 6), table)
    }

    missing = await currentBlueprintMissing(blueprint)

    const glassPaneMissing = missingCount(missing, 'glass_pane')
    if (glassPaneMissing > 0) {
      const glassCrafts = Math.ceil(glassPaneMissing / 16)
      const glassNeeded = glassCrafts * 6
      if (deps.inventoryCount('glass') < glassNeeded) {
        const sandNeeded = glassNeeded - deps.inventoryCount('glass')
        if (deps.inventoryCount('sand') < sandNeeded) {
          await collectSand(sandNeeded - deps.inventoryCount('sand'))
        }
        await smeltItem('sand', 'glass', sandNeeded, 'build')
      }

      const glassTable = table || await deps.ensureCraftingTable()
      if (glassTable) await deps.craftItemByName('glass_pane', glassCrafts, glassTable)
      else deps.safeChat('Table de craft manquante pour fabriquer les vitres.', 8000)
    }
  }

  async function prepareBlueprintResources(blueprintName = 'starter-house') {
    let blueprint

    try {
      blueprint = deps.loadBlueprint(blueprintName)
    } catch (err) {
      deps.safeChat(`Modele introuvable. Modeles: ${deps.listBlueprints().join(', ')}`)
      return
    }

    if (!deps.getBuildSite()) {
      const scanned = await scanAndSetBuildSite(blueprintName)
      if (!scanned) return
    }

    let missing = await currentBlueprintMissing(blueprint)
    if (missing.length === 0) {
      const buildSite = deps.getBuildSite()
      deps.safeChat(`Materiaux deja prets pour ${blueprint.name}. Site: ${buildSite ? `${buildSite.x} ${buildSite.y} ${buildSite.z}` : 'non defini'}.`)
      deps.safeChat(`Dis build ${blueprint.key || blueprint.name} pour lancer la pose.`, 10000)
      return
    }

    if (!deps.getBasePos()) {
      deps.safeChat("Base non definie. Fais setbase pres d'un coffre si les materiaux ne sont pas deja dans mon inventaire.")
      deps.safeChat(`Il manque: ${deps.summarizeMissing(missing)}.`)
      return
    }

    await deps.safeGoBase()
    await deps.chests.takeLoadoutFromChest()
    missing = await currentBlueprintMissing(blueprint)

    deps.safeChat(`Preparation ${blueprint.name}: ${deps.summarizeMissing(missing)}.`)
    await withdrawUsefulBuildInputs(blueprint, missing)
    missing = await currentBlueprintMissing(blueprint)

    const cobbleMissing = missingCount(missing, 'cobblestone')
    if (cobbleMissing > 0) {
      await gatherBuildBlocks('pierre', ['stone', 'cobblestone'], ['cobblestone', 'stone'], cobbleMissing)
      if (deps.isStopRequested()) return
      await deps.safeGoBase()
      await withdrawUsefulBuildInputs(blueprint, await currentBlueprintMissing(blueprint))
    }

    missing = await currentBlueprintMissing(blueprint)
    const sandMissing = missingCount(missing, 'sand')
    if (sandMissing > 0) {
      await collectSand(sandMissing)
      if (deps.getBasePos()) await deps.safeGoBase()
    }

    missing = await currentBlueprintMissing(blueprint)
    const woodPlan = buildWoodIngredientPlan(missing)
    const stickPlanks = Math.max(0, Math.ceil((woodPlan.sticks - deps.inventoryCount('stick')) / 4) * 2)
    const totalPlanksNeeded = missingCount(missing, 'oak_planks') + woodPlan.planks + stickPlanks
    const logsNeeded = missingCount(missing, 'oak_log') + Math.ceil(totalPlanksNeeded / 4)
    if (logsNeeded > deps.inventoryCount('oak_log')) {
      await collectOakLogs(logsNeeded - deps.inventoryCount('oak_log'))
      if (deps.getBasePos()) await deps.safeGoBase()
    }

    await craftBlueprintItems(blueprint)

    if (deps.getBasePos()) {
      await deps.safeGoBase()
      await deps.chests.storeItems()
    }

    await sendBlueprintStatus(blueprintName)

    const finalMissing = await currentBlueprintMissing(blueprint)
    if (finalMissing.length === 0) {
      deps.safeChat(`Preparation construction terminee pour ${blueprint.name}.`)
      deps.safeChat(`Materiaux prets. Dis build ${blueprint.key || blueprint.name} pour lancer la pose.`, 10000)
    } else {
      deps.safeChat(`Il manque encore: ${deps.summarizeMissing(finalMissing)}.`)
    }
  }

  function blueprintBlocks(blueprint) {
    const blocks = []
    const legend = blueprint.legend || {}
    const buildSite = deps.getBuildSite()
    if (!buildSite) return blocks

    for (const layer of blueprint.layers || []) {
      const y = Number(layer.y) || 0
      const rows = layer.rows || []

      for (let z = 0; z < rows.length; z++) {
        const row = rows[z]
        for (let x = 0; x < row.length; x++) {
          const symbol = row[x]
          const name = legend[symbol] || 'air'
          if (name === 'air') continue

          blocks.push({
            name,
            position: buildSite.offset(x, y, z)
          })
        }
      }
    }

    return blocks
  }

  function isSameBlockName(block, desiredName) {
    if (!block) return false
    if (desiredName === 'water') return block.name === 'water'
    return block.name === desiredName
  }

  function canUseBuildTarget(block, desiredName) {
    if (!block) return false
    if (isSameBlockName(block, desiredName)) return true
    return terrain.isClearForBuild(block)
  }

  function placementReference(targetPos) {
    const candidates = [
      { offset: new Vec3(0, -1, 0), face: new Vec3(0, 1, 0) },
      { offset: new Vec3(0, 1, 0), face: new Vec3(0, -1, 0) },
      { offset: new Vec3(-1, 0, 0), face: new Vec3(1, 0, 0) },
      { offset: new Vec3(1, 0, 0), face: new Vec3(-1, 0, 0) },
      { offset: new Vec3(0, 0, -1), face: new Vec3(0, 0, 1) },
      { offset: new Vec3(0, 0, 1), face: new Vec3(0, 0, -1) }
    ]

    for (const candidate of candidates) {
      const reference = deps.bot.blockAt(targetPos.plus(candidate.offset))
      if (!reference || reference.boundingBox !== 'block') continue
      return { reference, face: candidate.face }
    }

    return null
  }

  function buildItemName(blockName) {
    if (blockName === 'water') return 'water_bucket'
    return blockName
  }

  async function goToBuildSite() {
    const buildSite = deps.getBuildSite()
    if (!buildSite) return false

    return deps.travelToPosition(buildSite, 'chantier', {
      finalRange: 4,
      stepDistance: 18,
      maxSteps: 80,
      timeoutMs: 6500,
      canDig: false
    })
  }

  async function ensureBuildItem(itemName) {
    if (deps.inventoryCount(itemName) > 0) return true

    if (!deps.getBasePos()) return false

    const reachedBase = await deps.safeGoBase({ force: true })
    if (!reachedBase) return false

    await deps.withdrawNamedItemsFromBase([itemName], itemName === 'water_bucket' ? 1 : 64)
    await goToBuildSite()

    return deps.inventoryCount(itemName) > 0
  }

  async function placeBlueprintBlock(target) {
    if (deps.isFarmProtectionActive()) {
      console.log(`[farm][protect] place bloque block=${target && target.name ? target.name : 'unknown'} pos=${target && target.position ? `${target.position.x} ${target.position.y} ${target.position.z}` : 'unknown'}`)
      return false
    }

    const desiredName = target.name
    const itemName = buildItemName(desiredName)
    const current = deps.bot.blockAt(target.position)

    if (isSameBlockName(current, desiredName)) return true

    if (!canUseBuildTarget(current, desiredName)) {
      deps.safeChat(`Construction bloquee: bloc deja present a ${target.position.x} ${target.position.y} ${target.position.z} (${current ? current.name : 'inconnu'}).`, 10000)
      return false
    }

    const hasItem = await ensureBuildItem(itemName)
    if (!hasItem) {
      deps.safeChat(`Materiau manquant pour construire: ${itemName}.`, 8000)
      return false
    }

    const reached = await deps.safeGoto(new deps.goals.GoalNear(target.position.x, target.position.y, target.position.z, 4), `pose ${desiredName}`, {
      attempts: 2,
      timeoutMs: 6500,
      canDig: false,
      quiet: true
    })
    if (!reached && deps.bot.entity.position.distanceTo(target.position) > 5) return false

    try {
      await deps.bot.lookAt(target.position.offset(0.5, 0.5, 0.5), true)

      if (desiredName === 'water') {
        const bucket = deps.bot.inventory.items().find(item => item.name === 'water_bucket')
        if (!bucket) return false
        await deps.bot.equip(bucket, 'hand')
        const reference = deps.bot.blockAt(target.position.offset(0, -1, 0))
        if (!reference) return false
        await deps.bot.activateBlock(reference)
        await deps.sleep(300)
        return true
      }

      const item = deps.bot.inventory.items().find(candidate => candidate.name === itemName)
      if (!item) return false
      await deps.bot.equip(item, 'hand')

      const placement = placementReference(target.position)
      if (!placement) {
        deps.safeChat(`Aucun support pour poser ${desiredName}.`, 8000)
        return false
      }

      await deps.bot.placeBlock(placement.reference, placement.face)
      await deps.sleep(200)

      const placed = deps.bot.blockAt(target.position)
      return isSameBlockName(placed, desiredName) || desiredName.endsWith('_door')
    } catch (err) {
      deps.logError(`place ${desiredName} error`, err)
      return false
    }
  }

  async function placeBlueprint(blueprint) {
    const reachedSite = await goToBuildSite()
    if (!reachedSite) {
      deps.safeChat("Je n'arrive pas a rejoindre le chantier.")
      return false
    }

    const targets = blueprintBlocks(blueprint)
    let placed = 0
    let skipped = 0

    for (const target of targets) {
      if (deps.isStopRequested()) return false

      const ok = await placeBlueprintBlock(target)
      if (ok) placed++
      else {
        skipped++
        if (skipped >= 6) {
          deps.safeChat('Trop de blocs impossibles a poser, construction arretee pour eviter les degats.')
          return false
        }
      }

      if (placed > 0 && placed % 20 === 0) {
        deps.safeChat(`Construction: ${placed}/${targets.length} blocs traites.`)
      }
    }

    deps.safeChat(`Construction terminee ou presque: ${placed}/${targets.length} blocs traites.`)
    return skipped === 0
  }

  async function buildBlueprintStructure(blueprintName = 'starter-house') {
    let blueprint

    try {
      blueprint = deps.loadBlueprint(blueprintName)
    } catch (err) {
      deps.safeChat(`Modele introuvable. Modeles: ${deps.listBlueprints().join(', ')}`)
      return
    }

    deps.safeChat(`Build ${blueprint.name}: verification du terrain et des ressources.`)

    if (!deps.getBuildSite()) {
      const scanned = await scanAndSetBuildSite(blueprintName)
      if (!scanned) return
    }

    await prepareBlueprintResources(blueprintName)

    const missing = await currentBlueprintMissing(blueprint)
    if (missing.length > 0) {
      deps.safeChat(`Construction bloquee, il manque encore: ${deps.summarizeMissing(missing)}.`)
      return
    }

    const buildSite = deps.getBuildSite()
    deps.safeChat(`Ressources OK. Construction de ${blueprint.name} au site ${buildSite.x} ${buildSite.y} ${buildSite.z}.`)

    if (deps.getBasePos()) {
      await deps.safeGoBase({ force: true })
      await withdrawUsefulBuildInputs(blueprint, deps.missingMaterials(blueprint.materials || {}, countInventoryByName()))
    }

    await placeBlueprint(blueprint)
  }

  return {
    buildBlueprintStructure,
    countInventoryByName,
    currentBlueprintMissing,
    findBestBuildSite: terrain.findBestBuildSite,
    prepareBlueprintResources,
    scanAndSetBuildSite,
    sendBlueprintList,
    sendBlueprintStatus,
    smeltItem
  }
}

module.exports = {
  createBuildHelpers
}
