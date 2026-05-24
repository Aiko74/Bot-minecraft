function createDefaultMovements(deps) {
  const move = new deps.Movements(deps.bot)
  move.canDig = true
  move.canOpenDoors = true
  move.dontCreateFlow = true
  move.dontMineUnderFallingBlock = true
  move.allow1by1towers = false
  move.allowParkour = false
  move.allowSprinting = true
  move.liquidCost = 8
  move.entityCost = 3
  move.maxDropDown = 2
  move.infiniteLiquidDropdownDistance = false

  for (const blockName of deps.hazardBlockNames) {
    const block = deps.mcData.blocksByName[blockName]
    if (block) move.blocksToAvoid.add(block.id)
  }

  for (const entityName of deps.hostileEntities) {
    move.entitiesToAvoid.add(entityName)
  }

  return move
}

module.exports = {
  createDefaultMovements
}
