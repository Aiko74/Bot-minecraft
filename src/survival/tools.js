const PICKAXE_PRIORITY = [
  'diamond_pickaxe',
  'netherite_pickaxe',
  'iron_pickaxe',
  'stone_pickaxe',
  'wooden_pickaxe'
]

const TOOL_MATERIAL_PRIORITY = ['netherite', 'diamond', 'iron', 'stone', 'golden', 'wooden']

const SHOVEL_BLOCKS = new Set([
  'dirt',
  'grass_block',
  'coarse_dirt',
  'rooted_dirt',
  'podzol',
  'mycelium',
  'mud',
  'clay',
  'gravel',
  'sand',
  'red_sand',
  'soul_sand',
  'soul_soil',
  'snow',
  'snow_block'
])

function createToolHelpers(deps) {
  function materialScore(name) {
    if (name.includes('netherite')) return 6
    if (name.includes('diamond')) return 5
    if (name.includes('iron')) return 4
    if (name.includes('stone')) return 3
    if (name.includes('gold')) return 2
    if (name.includes('chainmail')) return 2
    if (name.includes('wooden')) return 1
    if (name.includes('leather')) return 1
    return 0
  }

  function pickaxeRank(itemOrName) {
    const name = typeof itemOrName === 'string' ? itemOrName : itemOrName && itemOrName.name
    if (name === 'diamond_pickaxe' || name === 'netherite_pickaxe') return 5
    if (name === 'iron_pickaxe') return 4
    if (name === 'stone_pickaxe') return 3
    if (name === 'golden_pickaxe') return 2
    if (name === 'wooden_pickaxe') return 1
    const index = PICKAXE_PRIORITY.indexOf(name)
    return index === -1 ? -1 : PICKAXE_PRIORITY.length - index
  }

  function pickaxeMeetsRequirement(item, requiredRank) {
    return Boolean(
      item &&
      pickaxeRank(item) >= requiredRank &&
      deps.remainingDurability(item) > 3
    )
  }

  function findBestPickaxe(requiredRank = 1) {
    const pickaxe = deps.ownedItems()
      .filter(item => pickaxeMeetsRequirement(item, requiredRank))
      .sort((a, b) => pickaxeRank(b) - pickaxeRank(a))[0] || null

    if (pickaxe) console.log(`[tool] outil trouve: ${pickaxe.name}`)
    return pickaxe
  }

  async function equipPickaxe(requiredRank = 1) {
    const pickaxe = findBestPickaxe(requiredRank)
    if (!pickaxe) return false

    try {
      if (!deps.bot.heldItem || deps.bot.heldItem.name !== pickaxe.name) {
        await deps.bot.equip(pickaxe, 'hand')
      }
      return true
    } catch (err) {
      deps.logError('pickaxe equip error', err)
      return false
    }
  }

  function bestToolByNamePart(namePart) {
    return deps.bot.inventory.items()
      .filter(item => item.name.includes(namePart) && deps.remainingDurability(item) > 3)
      .sort((a, b) => {
        const materialA = TOOL_MATERIAL_PRIORITY.findIndex(material => a.name.startsWith(material))
        const materialB = TOOL_MATERIAL_PRIORITY.findIndex(material => b.name.startsWith(material))
        return (materialA === -1 ? 999 : materialA) - (materialB === -1 ? 999 : materialB)
      })[0] || null
  }

  async function equipBestToolByNamePart(namePart) {
    const tool = bestToolByNamePart(namePart)
    if (!tool) return false

    try {
      if (!deps.bot.heldItem || deps.bot.heldItem.name !== tool.name) await deps.bot.equip(tool, 'hand')
      console.log(`[tool] outil trouve: ${tool.name}`)
      return true
    } catch (err) {
      deps.logError(`${namePart} equip error`, err)
      return false
    }
  }

  async function equipArmor() {
    const slots = [
      ['helmet', 'head'],
      ['chestplate', 'torso'],
      ['leggings', 'legs'],
      ['boots', 'feet']
    ]

    for (const [namePart, slot] of slots) {
      const item = deps.bot.inventory.items()
        .filter(candidate => candidate.name.includes(namePart))
        .sort((a, b) => materialScore(b.name) - materialScore(a.name))[0]

      if (!item) continue

      try {
        await deps.bot.equip(item, slot)
      } catch (err) {
        deps.logError('armor equip error', err)
      }
    }
  }

  function findBestSword() {
    return deps.bot.inventory.items()
      .filter(item => item.name.includes('sword'))
      .sort((a, b) => {
        const aRank = deps.swordPriority.indexOf(a.name)
        const bRank = deps.swordPriority.indexOf(b.name)
        return (aRank === -1 ? 99 : aRank) - (bRank === -1 ? 99 : bRank)
      })[0] || null
  }

  function findBestWeapon() {
    const sword = findBestSword()
    if (sword) return sword

    return deps.bot.inventory.items()
      .filter(item => item.name.includes('axe'))
      .sort((a, b) => materialScore(b.name) - materialScore(a.name))[0] || null
  }

  async function equipWeapon() {
    const weapon = findBestWeapon()
    if (!weapon) return false

    try {
      await deps.bot.equip(weapon, 'hand')
      return true
    } catch (err) {
      deps.logError('weapon equip error', err)
      return false
    }
  }

  async function equipShield() {
    const shield = deps.bot.inventory.items().find(item => item.name.includes('shield'))
    if (!shield) return false

    try {
      await deps.bot.equip(shield, 'off-hand')
      return true
    } catch (err) {
      deps.logError('shield equip error', err)
      return false
    }
  }

  function hasPickaxeAtLeast(requiredRank) {
    return Boolean(findBestPickaxe(requiredRank))
  }

  function blockNeedsPickaxe(block) {
    if (!block || !block.name) return false
    return block.name.includes('ore') || block.name === 'ancient_debris' || block.name === 'stone' || block.name === 'cobblestone' || block.name.includes('deepslate')
  }

  function preferredToolPartForBlock(block) {
    if (!block || !block.name) return null
    if (blockNeedsPickaxe(block)) return 'pickaxe'
    if (SHOVEL_BLOCKS.has(block.name)) return 'shovel'
    if (deps.isLogBlockName(block.name) || block.name.includes('planks')) return 'axe'
    return null
  }

  function hasUsablePickaxe() {
    return deps.ownedItems().some(item => item.name.includes('pickaxe') && deps.remainingDurability(item) > 3)
  }

  function hasUsableWeapon() {
    return Boolean(findBestWeapon() && deps.remainingDurability(findBestWeapon()) > 3)
  }

  function shouldWithdrawUpgrade(item, namePart) {
    if (!item.name.includes(namePart)) return false
    return materialScore(item.name) > deps.bestOwnedScore(namePart)
  }

  return {
    blockNeedsPickaxe,
    equipArmor,
    equipBestToolByNamePart,
    equipPickaxe,
    equipShield,
    equipWeapon,
    findBestPickaxe,
    findBestSword,
    findBestWeapon,
    hasPickaxeAtLeast,
    hasUsablePickaxe,
    hasUsableWeapon,
    materialScore,
    pickaxeRank,
    preferredToolPartForBlock,
    shouldWithdrawUpgrade
  }
}

module.exports = {
  createToolHelpers
}
