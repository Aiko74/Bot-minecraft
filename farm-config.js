const ANIMAL_FARMS = {
  cow: {
    label: 'vaches',
    foods: ['wheat'],
    keep: 4,
    max: 8,
    drops: ['beef', 'leather']
  },
  sheep: {
    label: 'moutons',
    foods: ['wheat'],
    keep: 4,
    max: 8,
    drops: [
      'mutton',
      'white_wool',
      'orange_wool',
      'magenta_wool',
      'light_blue_wool',
      'yellow_wool',
      'lime_wool',
      'pink_wool',
      'gray_wool',
      'light_gray_wool',
      'cyan_wool',
      'purple_wool',
      'blue_wool',
      'brown_wool',
      'green_wool',
      'red_wool',
      'black_wool'
    ]
  },
  pig: {
    label: 'cochons',
    foods: ['carrot', 'potato', 'beetroot'],
    keep: 4,
    max: 8,
    drops: ['porkchop']
  },
  chicken: {
    label: 'poulets',
    foods: ['wheat_seeds', 'melon_seeds', 'pumpkin_seeds', 'beetroot_seeds'],
    keep: 4,
    max: 10,
    drops: ['chicken', 'feather', 'egg']
  },
  rabbit: {
    label: 'lapins',
    foods: ['carrot', 'golden_carrot', 'dandelion'],
    keep: 4,
    max: 8,
    drops: ['rabbit', 'rabbit_hide', 'rabbit_foot']
  }
}

const FARM_RESOURCE_ITEMS = [
  'wheat',
  'wheat_seeds',
  'melon_seeds',
  'pumpkin_seeds',
  'beetroot_seeds',
  'carrot',
  'potato',
  'beetroot',
  'dandelion',
  'sugar_cane'
]

module.exports = {
  ANIMAL_FARMS,
  FARM_RESOURCE_ITEMS
}
