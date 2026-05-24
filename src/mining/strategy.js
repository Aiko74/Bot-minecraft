const DEFAULT_MINING_STRATEGIES = {
  wood: {
    mode: 'surface',
    scanRadius: 72,
    exploreStep: 20,
    maxScanCycles: 18,
    finalAction: 'return_base'
  },
  coal: {
    mode: 'cave_or_surface',
    scanRadius: 64,
    exploreStep: 18,
    maxScanCycles: 18,
    finalAction: 'return_base'
  },
  iron: {
    mode: 'cave_or_stair',
    scanRadius: 64,
    exploreStep: 18,
    maxScanCycles: 22,
    preferredY: 16,
    finalAction: 'return_base'
  },
  diamond: {
    mode: 'strip',
    scanRadius: 32,
    exploreStep: 12,
    maxScanCycles: 240,
    preferredY: -58,
    stripLength: 96,
    finalAction: 'return_base'
  },
  ancient_debris: {
    mode: 'strip',
    scanRadius: 24,
    exploreStep: 10,
    maxScanCycles: 180,
    preferredY: 15,
    stripLength: 96,
    finalAction: 'return_base',
    dimension: 'nether'
  },
  quartz: {
    mode: 'nether_surface',
    scanRadius: 64,
    exploreStep: 16,
    maxScanCycles: 24,
    finalAction: 'return_base',
    dimension: 'nether'
  },
  nether_gold: {
    mode: 'nether_surface',
    scanRadius: 64,
    exploreStep: 16,
    maxScanCycles: 24,
    finalAction: 'return_base',
    dimension: 'nether'
  },
  cobblestone: {
    mode: 'short_tunnel',
    scanRadius: 48,
    exploreStep: 14,
    maxScanCycles: 14,
    finalAction: 'return_base'
  },
  default: {
    mode: 'cave_or_surface',
    scanRadius: 56,
    exploreStep: 16,
    maxScanCycles: 18,
    finalAction: 'return_base'
  }
}

function miningStrategyFor(target, config = {}) {
  const base = DEFAULT_MINING_STRATEGIES[target && target.key] || DEFAULT_MINING_STRATEGIES.default

  return {
    ...base,
    scanRadius: Number(config.mineSearchRadius) || base.scanRadius,
    exploreStep: Number(config.miningExploreStep) || base.exploreStep,
    maxScanCycles: target && isStripMiningTarget(target)
      ? Math.max(Number(config.miningMaxScanCycles) || 0, base.maxScanCycles)
      : Number(config.miningMaxScanCycles) || base.maxScanCycles,
    preferredY: target && target.key === 'diamond'
      ? Number(config.diamondTargetY) || base.preferredY
      : base.preferredY,
    stripLength: target && isStripMiningTarget(target)
      ? Math.max(Number(config.miningStripLength) || 0, base.stripLength || 96)
      : Number(config.miningStripLength) || base.stripLength || 24
  }
}

function explorationOffset(attempt, distance) {
  const ring = Math.floor(attempt / 8) + 1
  const slot = attempt % 8
  const angle = slot * (Math.PI / 4)
  const radius = distance * ring

  return {
    x: Math.cos(angle) * radius,
    z: Math.sin(angle) * radius
  }
}

function isWoodTarget(target) {
  return Boolean(target && target.key === 'wood')
}

function isDiamondTarget(target) {
  return Boolean(target && target.key === 'diamond')
}

function isAncientDebrisTarget(target) {
  return Boolean(target && target.key === 'ancient_debris')
}

function isStripMiningTarget(target) {
  return isDiamondTarget(target) || isAncientDebrisTarget(target)
}

module.exports = {
  explorationOffset,
  isAncientDebrisTarget,
  isDiamondTarget,
  isStripMiningTarget,
  isWoodTarget,
  miningStrategyFor
}
