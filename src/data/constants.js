const FOOD_PRIORITY = [
  'golden_carrot',
  'cooked_beef',
  'cooked_porkchop',
  'cooked_mutton',
  'cooked_chicken',
  'cooked_rabbit',
  'bread',
  'baked_potato',
  'cooked_salmon',
  'cooked_cod',
  'apple',
  'carrot',
  'beef',
  'porkchop',
  'mutton',
  'chicken',
  'rabbit',
  'potato',
  'salmon',
  'cod'
]

const FOOD_NAMES = new Set(FOOD_PRIORITY)

const HAZARD_BLOCK_NAMES = [
  'lava',
  'fire',
  'soul_fire',
  'magma_block',
  'campfire',
  'soul_campfire',
  'cactus',
  'sweet_berry_bush',
  'powder_snow'
]

const HOSTILE_ENTITIES = new Set([
  'blaze',
  'cave_spider',
  'creeper',
  'drowned',
  'elder_guardian',
  'ender_dragon',
  'enderman',
  'endermite',
  'evoker',
  'ghast',
  'guardian',
  'hoglin',
  'husk',
  'magma_cube',
  'phantom',
  'piglin_brute',
  'pillager',
  'ravager',
  'shulker',
  'silverfish',
  'skeleton',
  'slime',
  'spider',
  'stray',
  'vex',
  'vindicator',
  'warden',
  'witch',
  'wither',
  'wither_skeleton',
  'zoglin',
  'zombie',
  'zombie_villager',
  'zombified_piglin'
])

const HUNT_TARGETS = new Set([
  'cow',
  'pig',
  'chicken',
  'sheep',
  'rabbit'
])

const UNFIGHTABLE_ENTITIES = new Set([
  'creeper',
  'warden',
  'ender_dragon',
  'wither',
  'ghast'
])

const BED_BLOCK_NAMES = [
  'white_bed',
  'orange_bed',
  'magenta_bed',
  'light_blue_bed',
  'yellow_bed',
  'lime_bed',
  'pink_bed',
  'gray_bed',
  'light_gray_bed',
  'cyan_bed',
  'purple_bed',
  'blue_bed',
  'brown_bed',
  'green_bed',
  'red_bed',
  'black_bed'
]

const VILLAGE_HINT_BLOCKS = [
  'bell',
  'composter',
  'blast_furnace',
  'smoker',
  'cartography_table',
  'fletching_table',
  'grindstone',
  'lectern',
  'loom',
  'smithing_table',
  'stonecutter',
  'brewing_stand'
]

const SWORD_PRIORITY = [
  'netherite_sword',
  'diamond_sword',
  'iron_sword',
  'stone_sword',
  'golden_sword',
  'wooden_sword'
]

const SWORD_MATERIAL_ITEMS = [
  'diamond',
  'iron_ingot',
  'cobblestone',
  'blackstone',
  'gold_ingot',
  'oak_planks',
  'spruce_planks',
  'birch_planks',
  'jungle_planks',
  'acacia_planks',
  'dark_oak_planks',
  'mangrove_planks',
  'cherry_planks',
  'bamboo_planks'
]

const RAW_TO_COOKED = {
  beef: 'cooked_beef',
  porkchop: 'cooked_porkchop',
  chicken: 'cooked_chicken',
  mutton: 'cooked_mutton',
  rabbit: 'cooked_rabbit',
  cod: 'cooked_cod',
  salmon: 'cooked_salmon'
}

const FUEL_VALUES = {
  coal: 8,
  charcoal: 8,
  dried_kelp_block: 20,
  blaze_rod: 12,
  oak_planks: 1.5,
  spruce_planks: 1.5,
  birch_planks: 1.5,
  jungle_planks: 1.5,
  acacia_planks: 1.5,
  dark_oak_planks: 1.5,
  mangrove_planks: 1.5,
  cherry_planks: 1.5,
  bamboo_planks: 1.5
}

module.exports = {
  BED_BLOCK_NAMES,
  FOOD_NAMES,
  FOOD_PRIORITY,
  FUEL_VALUES,
  HAZARD_BLOCK_NAMES,
  HOSTILE_ENTITIES,
  HUNT_TARGETS,
  RAW_TO_COOKED,
  SWORD_MATERIAL_ITEMS,
  SWORD_PRIORITY,
  UNFIGHTABLE_ENTITIES,
  VILLAGE_HINT_BLOCKS
}
