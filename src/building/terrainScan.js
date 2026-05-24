const CLEAR_BUILD_BLOCKS = new Set([
  'air',
  'cave_air',
  'void_air',
  'grass',
  'tall_grass',
  'short_grass',
  'fern',
  'large_fern',
  'snow',
  'torch',
  'seagrass',
  'tall_seagrass'
])

const BAD_BUILD_GROUND = new Set([
  'water',
  'lava',
  'fire',
  'soul_fire',
  'cactus',
  'magma_block',
  'powder_snow',
  'ice',
  'packed_ice',
  'blue_ice'
])

function createTerrainScanHelpers(deps) {
  function isClearForBuild(block) {
    if (!block) return false
    if (CLEAR_BUILD_BLOCKS.has(block.name)) return true
    return block.boundingBox === 'empty' && block.name !== 'water' && block.name !== 'lava'
  }

  function isSafeBuildGround(block) {
    if (!block) return false
    if (BAD_BUILD_GROUND.has(block.name)) return false
    if (CLEAR_BUILD_BLOCKS.has(block.name)) return false
    return block.boundingBox === 'block'
  }

  function buildGroundBonus(block) {
    if (!block) return 0
    if (block.name.includes('grass') || block.name === 'dirt') return 3
    if (block.name.includes('sand')) return 1
    if (block.name.includes('stone') || block.name.includes('deepslate')) return 1
    return 2
  }

  function scoreBuildOrigin(origin, blueprint) {
    const size = blueprint.size || [7, 5, 7]
    const width = size[0]
    const height = size[1]
    const depth = size[2]
    let score = 0

    for (let x = 0; x < width; x++) {
      for (let z = 0; z < depth; z++) {
        const ground = deps.bot.blockAt(origin.offset(x, -1, z))
        if (!isSafeBuildGround(ground)) return null

        score += buildGroundBonus(ground)

        for (let y = 0; y < height + 1; y++) {
          const block = deps.bot.blockAt(origin.offset(x, y, z))
          if (!isClearForBuild(block)) return null
        }
      }
    }

    const center = origin.offset(Math.floor(width / 2), 0, Math.floor(depth / 2))
    score -= Math.floor(center.distanceTo(deps.bot.entity.position))
    return score
  }

  function findBestBuildSite(blueprintName = 'starter-house', radius = 18) {
    const blueprint = deps.loadBlueprint(blueprintName)
    const center = deps.floorVec(deps.bot.entity.position)
    let best = null

    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const origin = center.offset(dx, 0, dz)
        const score = scoreBuildOrigin(origin, blueprint)
        if (score === null) continue

        if (!best || score > best.score) {
          best = { origin, score, blueprint }
        }
      }
    }

    return best
  }

  async function scanAndSetBuildSite(blueprintName = 'starter-house') {
    let result

    try {
      result = findBestBuildSite(blueprintName)
    } catch (err) {
      deps.safeChat(`Modele introuvable. Modeles: ${deps.listBlueprints().join(', ')}`)
      return false
    }

    if (!result) {
      deps.safeChat('Aucun terrain plat et degage trouve autour de moi.')
      return false
    }

    deps.setBuildSite(result.origin)
    deps.saveMemory()

    const buildSite = deps.getBuildSite()
    deps.safeChat(`Terrain choisi pour ${result.blueprint.name}: ${buildSite.x} ${buildSite.y} ${buildSite.z} score ${result.score}.`)
    return true
  }

  return {
    findBestBuildSite,
    isClearForBuild,
    scanAndSetBuildSite
  }
}

module.exports = {
  createTerrainScanHelpers
}
