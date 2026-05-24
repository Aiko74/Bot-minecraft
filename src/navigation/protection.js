function createProtectedZones(state, config, farmKindLabel) {
  const zones = []

  if (state.basePos) {
    zones.push({
      label: 'base',
      pos: state.basePos,
      radius: config.baseProtectionRadius
    })
  }

  for (const [kind, pos] of Object.entries(state.farmZones || {})) {
    if (!pos) continue
    zones.push({
      label: `ferme ${farmKindLabel(kind)}`,
      pos,
      radius: config.farmProtectionRadius
    })
  }

  if (state.buildSite) {
    zones.push({
      label: 'chantier',
      pos: state.buildSite,
      radius: config.buildProtectionRadius
    })
  }

  for (const [dimension, pos] of Object.entries(state.netherPortals || {})) {
    if (!pos) continue
    zones.push({
      label: `portail ${dimension}`,
      pos,
      radius: config.portalProtectionRadius || 8
    })
  }

  return zones
}

function protectedZoneReason(pos, zones) {
  if (!pos) return null

  for (const zone of zones) {
    if (pos.distanceTo(zone.pos) <= zone.radius) {
      return zone.label
    }
  }

  return null
}

module.exports = {
  createProtectedZones,
  protectedZoneReason
}
