const { normalizeMessage, parseIntent } = require('../chat/intents')

const commands = [
  require('./help'),
  require('./status'),
  require('./coords'),
  require('./inventaire'),
  require('./mission'),
  require('./stop'),
  require('./pause'),
  require('./reprendre'),
  require('./base'),
  require('./farms'),
  require('./findChest'),
  require('./findBed'),
  require('./findVillage'),
  require('./setBase'),
  require('./setBuildSite'),
  require('./defend'),
  require('./come'),
  require('./follow'),
  require('./stopFollow'),
  require('./eat'),
  require('./sleep'),
  require('./prepare'),
  require('./depot'),
  require('./depotForce'),
  require('./range'),
  require('./explore'),
  require('./exploreNether'),
  require('./collect'),
  require('./mine'),
  require('./listBlueprints'),
  require('./setFarm'),
  require('./setFarmEntry'),
  require('./unknown')
]

function intentKey(intent) {
  if (!intent || !intent.type) return null
  if (intent.type === 'farm' && intent.farmKind) return `farm:${intent.farmKind}`
  return intent.type
}

function createCommandHandler() {
  const byIntent = new Map()
  const byAlias = new Map()

  for (const command of commands) {
    for (const type of command.intentTypes || []) byIntent.set(type, command)
    for (const alias of command.aliases || []) byAlias.set(normalizeMessage(alias), command)
  }

  async function handle(ctx, rawMessage, username) {
    const normalized = normalizeMessage(rawMessage)
    const intent = parseIntent(rawMessage)
    const command = byIntent.get(intentKey(intent)) || byAlias.get(normalized)

    if (!command) return false

    const args = normalized.split(/\s+/).slice(1)
    await command.run(ctx, args, rawMessage, intent, username)
    return true
  }

  return {
    commands,
    handle
  }
}

module.exports = {
  createCommandHandler
}
