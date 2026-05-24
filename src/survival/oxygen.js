function createOxygenSafety({ bot, CONFIG, safeChat, logTag, sleep }) {
  let lastOxygenLogAt = 0

  function isBotInWater() {
    if (!bot.entity) return false
    if (bot.entity.isInWater) return true

    const pos = bot.entity.position
    const blocks = [
      bot.blockAt(pos),
      bot.blockAt(pos.offset(0, 1, 0))
    ]

    return blocks.some(block => block && (block.name === 'water' || block.name === 'bubble_column'))
  }

  function shouldEscapeForOxygen() {
    const oxygen = typeof bot.oxygenLevel === 'number' ? bot.oxygenLevel : 20
    if (!isBotInWater()) {
      if (oxygen <= CONFIG.oxygenCriticalAt) console.log('[survival][oxygen] ignore: oxygen ok')
      return false
    }

    if (oxygen <= 0 || oxygen > CONFIG.oxygenCriticalAt) {
      console.log('[survival][oxygen] ignore: oxygen ok')
      return false
    }

    return true
  }

  async function escapeWater() {
    const now = Date.now()
    if (now - lastOxygenLogAt < 8000) {
      console.log('[survival][oxygen] message cooldown')
    } else {
      console.log('[survival][oxygen] low, remontée')
      safeChat('Oxygene bas, je remonte.', 8000)
      lastOxygenLogAt = now
    }
    bot.pathfinder.setGoal(null)
    bot.setControlState('jump', true)
    await sleep(1800)
    bot.setControlState('jump', false)
  }

  return {
    escapeWater,
    isBotInWater,
    shouldEscapeForOxygen
  }
}

module.exports = {
  createOxygenSafety
}
