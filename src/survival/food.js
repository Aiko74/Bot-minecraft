function createFoodHelpers(deps) {
  let isEating = false
  let lastNoFoodWarningAt = 0

  function isFood(item) {
    return Boolean(item && deps.foodNames.has(item.name))
  }

  function foodScore(item) {
    const index = deps.foodPriority.indexOf(item.name)
    return index === -1 ? 999 : index
  }

  function findBestFood() {
    return deps.bot.inventory.items()
      .filter(isFood)
      .sort((a, b) => foodScore(a) - foodScore(b))[0] || null
  }

  function foodCount() {
    return deps.bot.inventory.items()
      .filter(isFood)
      .reduce((total, item) => total + item.count, 0)
  }

  async function autoEat(force = false) {
    if (isEating) return false
    if (deps.bot.food >= 20) return true
    if (!force && deps.bot.food >= deps.config.foodEatAt) return true

    const food = findBestFood()
    if (!food) {
      const now = Date.now()
      if (now - lastNoFoodWarningAt > 15000) {
        deps.safeChat("J'ai faim mais je n'ai pas de nourriture.", 10000)
        lastNoFoodWarningAt = now
      }
      return false
    }

    isEating = true
    try {
      console.log(`[survival][food] eat ${food.name} hunger=${deps.bot.food}/20`)
      await deps.bot.equip(food, 'hand')
      await deps.bot.consume()
      return true
    } catch (err) {
      deps.logError('eat error', err)
      return false
    } finally {
      isEating = false
    }
  }

  async function forceEat() {
    const ate = await autoEat(true)
    if (ate) deps.safeChat('Je mange.')
    else deps.safeChat("Je n'ai rien a manger.")
  }

  function isLoadoutItem(item) {
    if (!item) return false
    return (
      item.name.includes('pickaxe') ||
      item.name.includes('axe') ||
      item.name.includes('shovel') ||
      item.name.includes('hoe') ||
      item.name.includes('sword') ||
      item.name.includes('bow') ||
      item.name.includes('crossbow') ||
      item.name.includes('helmet') ||
      item.name.includes('chestplate') ||
      item.name.includes('leggings') ||
      item.name.includes('boots') ||
      item.name.includes('shield') ||
      item.name.includes('bucket') ||
      item.name === 'arrow' ||
      item.name === 'torch'
    )
  }

  return {
    autoEat,
    findBestFood,
    foodCount,
    forceEat,
    isFood,
    isLoadoutItem
  }
}

module.exports = {
  createFoodHelpers
}
