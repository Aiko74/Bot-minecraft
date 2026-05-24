function createBlueprintStatusHelpers(deps) {
  async function countBaseStorageByName(options = {}) {
    const counts = {}

    try {
      const blocks = await deps.baseContainerBlocks(12, {
        travel: options.travel === true
      })

      for (const block of blocks) {
        let container = null
        try {
          container = await deps.openContainerBlock(block)
          if (!container) continue

          for (const item of container.containerItems()) {
            counts[item.name] = (counts[item.name] || 0) + item.count
          }
        } finally {
          if (container) container.close()
        }
      }
    } catch (err) {
      deps.logError('blueprint storage count error', err)
    }

    return counts
  }

  function mergeCounts(...sources) {
    return sources.reduce((merged, source) => {
      for (const [name, count] of Object.entries(source)) {
        merged[name] = (merged[name] || 0) + count
      }

      return merged
    }, {})
  }

  async function sendBlueprintStatus(blueprintName = 'starter-house') {
    let blueprint

    try {
      blueprint = deps.loadBlueprint(blueprintName)
    } catch (err) {
      deps.safeChat(`Modele introuvable. Modeles: ${deps.listBlueprints().join(', ')}`)
      return
    }

    const inventoryCounts = deps.countInventoryByName()
    const baseCounts = deps.getBasePos() ? await countBaseStorageByName() : {}
    const available = mergeCounts(inventoryCounts, baseCounts)
    const missing = deps.missingMaterials(blueprint.materials || {}, available)
    const buildSite = deps.getBuildSite()
    const site = buildSite ? `${buildSite.x} ${buildSite.y} ${buildSite.z}` : 'non definie'

    deps.safeChat(`Blueprint ${blueprint.name}: taille ${blueprint.size.join('x')} | site ${site} | ${deps.summarizeMissing(missing)}`)
  }

  function sendBlueprintList() {
    deps.safeChat(`Modeles disponibles: ${deps.listBlueprints().join(', ') || 'aucun'}`)
  }

  async function currentBlueprintMissing(blueprint, options = {}) {
    const inventoryCounts = deps.countInventoryByName()
    const baseCounts = deps.getBasePos()
      ? await countBaseStorageByName({ travel: options.travelToBase === true })
      : {}
    const available = mergeCounts(inventoryCounts, baseCounts)
    return deps.missingMaterials(blueprint.materials || {}, available)
  }

  return {
    currentBlueprintMissing,
    sendBlueprintList,
    sendBlueprintStatus
  }
}

module.exports = {
  createBlueprintStatusHelpers
}
