const RESOURCE_TARGETS = [
  {
    key: 'cobblestone',
    kind: 'material',
    label: 'pierre',
    aliases: ['cobble', 'cobblestone', 'pierre', 'stone', 'caillou', 'cailloux'],
    blocks: ['stone', 'cobblestone'],
    drops: ['cobblestone', 'stone'],
    defaultAmount: 64
  },
  {
    key: 'wood',
    kind: 'material',
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
    key: 'sand',
    kind: 'material',
    label: 'sable',
    aliases: ['sable', 'sand', 'red sand', 'sable rouge'],
    blocks: ['sand', 'red_sand'],
    drops: ['sand', 'red_sand'],
    defaultAmount: 64
  },
  {
    key: 'dirt',
    kind: 'material',
    label: 'terre',
    aliases: ['terre', 'dirt', 'grass', 'grass block', 'bloc herbe', 'herbe'],
    blocks: ['dirt', 'grass_block', 'coarse_dirt', 'rooted_dirt'],
    drops: ['dirt'],
    defaultAmount: 64
  },
  {
    key: 'netherrack',
    kind: 'material',
    label: 'netherrack',
    aliases: ['netherrack', 'nether rack', 'pierre du nether', 'bloc nether', 'nether'],
    blocks: ['netherrack'],
    drops: ['netherrack'],
    defaultAmount: 64,
    dimension: 'nether'
  },
  {
    key: 'diamond',
    kind: 'ore',
    label: 'diamants',
    aliases: ['diamant', 'diamants', 'diamond', 'diamonds'],
    blocks: ['diamond_ore', 'deepslate_diamond_ore'],
    drops: ['diamond', 'diamond_ore', 'deepslate_diamond_ore'],
    defaultAmount: 10
  },
  {
    key: 'iron',
    kind: 'ore',
    label: 'fer',
    aliases: ['fer', 'iron'],
    blocks: ['iron_ore', 'deepslate_iron_ore'],
    drops: ['raw_iron', 'iron_ore', 'deepslate_iron_ore', 'iron_ingot'],
    defaultAmount: 16
  },
  {
    key: 'coal',
    kind: 'ore',
    label: 'charbon',
    aliases: ['charbon', 'coal'],
    blocks: ['coal_ore', 'deepslate_coal_ore'],
    drops: ['coal', 'coal_ore', 'deepslate_coal_ore'],
    defaultAmount: 32
  },
  {
    key: 'gold',
    kind: 'ore',
    label: 'or',
    aliases: ['or', 'gold'],
    blocks: ['gold_ore', 'deepslate_gold_ore'],
    drops: ['raw_gold', 'gold_ore', 'deepslate_gold_ore', 'gold_ingot'],
    defaultAmount: 16
  },
  {
    key: 'copper',
    kind: 'ore',
    label: 'cuivre',
    aliases: ['cuivre', 'copper'],
    blocks: ['copper_ore', 'deepslate_copper_ore'],
    drops: ['raw_copper', 'copper_ore', 'deepslate_copper_ore', 'copper_ingot'],
    defaultAmount: 32
  },
  {
    key: 'emerald',
    kind: 'ore',
    label: 'émeraude',
    aliases: ['emeraude', 'emeraudes', 'émeraude', 'émeraudes', 'emerald', 'emeralds'],
    blocks: ['emerald_ore', 'deepslate_emerald_ore'],
    drops: ['emerald', 'emerald_ore', 'deepslate_emerald_ore'],
    defaultAmount: 8
  },
  {
    key: 'lapis',
    kind: 'ore',
    label: 'lapis',
    aliases: ['lapis', 'lapis lazuli'],
    blocks: ['lapis_ore', 'deepslate_lapis_ore'],
    drops: ['lapis_lazuli', 'lapis_ore', 'deepslate_lapis_ore'],
    defaultAmount: 24
  },
  {
    key: 'redstone',
    kind: 'ore',
    label: 'redstone',
    aliases: ['redstone'],
    blocks: ['redstone_ore', 'deepslate_redstone_ore'],
    drops: ['redstone', 'redstone_ore', 'deepslate_redstone_ore'],
    defaultAmount: 32
  },
  {
    key: 'quartz',
    kind: 'ore',
    label: 'quartz du nether',
    aliases: ['quartz', 'nether quartz', 'quartz nether', 'quartz du nether'],
    blocks: ['nether_quartz_ore'],
    drops: ['quartz', 'nether_quartz_ore'],
    defaultAmount: 64,
    dimension: 'nether'
  },
  {
    key: 'nether_gold',
    kind: 'ore',
    label: 'or du nether',
    aliases: ['or du nether', 'or nether', 'nether gold', 'nether_gold', 'gold nether'],
    blocks: ['nether_gold_ore'],
    drops: ['gold_nugget', 'nether_gold_ore'],
    defaultAmount: 64,
    dimension: 'nether'
  },
  {
    key: 'ancient_debris',
    kind: 'ore',
    label: 'ancient debris',
    aliases: [
      'ancient debris',
      'ancient_debris',
      'debris antique',
      'debris antiques',
      'debris ancien',
      'debris anciens',
      'ancien debris',
      'ancien débris',
      'ancient debrit',
      'encient debrit',
      'netherite'
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
