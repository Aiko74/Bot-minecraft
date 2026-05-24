const RESOURCE_TARGETS = [
  {
    key: 'cobblestone',
    label: 'pierre',
    aliases: ['cobble', 'cobblestone', 'pierre'],
    blocks: ['stone', 'cobblestone'],
    drops: ['cobblestone', 'stone'],
    defaultAmount: 64
  },
  {
    key: 'wood',
    label: 'bois',
    aliases: [
      'bois', 'wood', 'buche', 'buches', 'bûche', 'bûches',
      'tronc', 'troncs', 'log', 'logs', 'arbre', 'arbres',
      'coupe des arbres', 'ramene des buches', 'ramene du bois',
      'va chercher du bois', 'prends du bois'
    ],
    blocks: [
      'oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log',
      'mangrove_log', 'cherry_log', 'crimson_stem', 'warped_stem'
    ],
    drops: [
      'oak_log', 'spruce_log', 'birch_log', 'jungle_log', 'acacia_log', 'dark_oak_log',
      'mangrove_log', 'cherry_log', 'crimson_stem', 'warped_stem'
    ],
    defaultAmount: 64
  },
  {
    key: 'diamond',
    label: 'diamants',
    aliases: ['diamant', 'diamants', 'diamond', 'diamonds'],
    blocks: ['diamond_ore', 'deepslate_diamond_ore'],
    drops: ['diamond', 'diamond_ore', 'deepslate_diamond_ore'],
    defaultAmount: 10
  },
  {
    key: 'iron',
    label: 'fer',
    aliases: ['fer', 'iron'],
    blocks: ['iron_ore', 'deepslate_iron_ore'],
    drops: ['raw_iron', 'iron_ore', 'deepslate_iron_ore', 'iron_ingot'],
    defaultAmount: 16
  },
  {
    key: 'coal',
    label: 'charbon',
    aliases: ['charbon', 'coal'],
    blocks: ['coal_ore', 'deepslate_coal_ore'],
    drops: ['coal', 'coal_ore', 'deepslate_coal_ore'],
    defaultAmount: 32
  },
  {
    key: 'gold',
    label: 'or',
    aliases: ['or', 'gold'],
    blocks: ['gold_ore', 'deepslate_gold_ore'],
    drops: ['raw_gold', 'gold_ore', 'deepslate_gold_ore', 'gold_ingot'],
    defaultAmount: 16
  },
  {
    key: 'lapis',
    label: 'lapis',
    aliases: ['lapis', 'lapis lazuli'],
    blocks: ['lapis_ore', 'deepslate_lapis_ore'],
    drops: ['lapis_lazuli', 'lapis_ore', 'deepslate_lapis_ore'],
    defaultAmount: 24
  },
  {
    key: 'redstone',
    label: 'redstone',
    aliases: ['redstone'],
    blocks: ['redstone_ore', 'deepslate_redstone_ore'],
    drops: ['redstone', 'redstone_ore', 'deepslate_redstone_ore'],
    defaultAmount: 32
  },
  {
    key: 'quartz',
    label: 'quartz du nether',
    aliases: ['quartz', 'nether quartz', 'quartz nether', 'quartz du nether'],
    blocks: ['nether_quartz_ore'],
    drops: ['quartz', 'nether_quartz_ore'],
    defaultAmount: 64,
    dimension: 'nether'
  },
  {
    key: 'nether_gold',
    label: 'or du nether',
    aliases: ['or du nether', 'or nether', 'nether gold', 'nether_gold', 'gold nether'],
    blocks: ['nether_gold_ore'],
    drops: ['gold_nugget', 'nether_gold_ore'],
    defaultAmount: 64,
    dimension: 'nether'
  },
  {
    key: 'ancient_debris',
    label: 'ancient debris',
    aliases: [
      'ancient debris',
      'ancient_debris',
      'debris antique',
      'debris anciens',
      'debris ancien',
      'ancien debris',
      'ancien débris',
      'ancient debrit',
      'encient debrit',
      'netherite',
      'nether'
    ],
    blocks: ['ancient_debris'],
    drops: ['ancient_debris'],
    defaultAmount: 8,
    dimension: 'nether',
    requiresPickaxe: 'diamond'
  }
]

function resourceTargetByKey(key) {
  return RESOURCE_TARGETS.find(target => target.key === key) || null
}

module.exports = {
  RESOURCE_TARGETS,
  resourceTargetByKey
}
