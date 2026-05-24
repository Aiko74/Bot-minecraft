const { Vec3 } = require('vec3')

function floorVec(pos) {
  return new Vec3(Math.floor(pos.x), Math.floor(pos.y), Math.floor(pos.z))
}

function isValidPos(pos) {
  return Boolean(
    pos &&
    typeof pos.x === 'number' &&
    Number.isFinite(pos.x) &&
    typeof pos.y === 'number' &&
    Number.isFinite(pos.y) &&
    typeof pos.z === 'number' &&
    Number.isFinite(pos.z)
  )
}

function blockLabel(block) {
  if (!block) return 'unknown'
  const pos = isValidPos(block.position)
    ? `${block.position.x} ${block.position.y} ${block.position.z}`
    : 'unknown'
  return `block=${block.name || block.type || 'unknown'} pos=${pos}`
}

module.exports = {
  blockLabel,
  floorVec,
  isValidPos
}
