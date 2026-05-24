const { RESOURCE_TARGETS } = require('../data/resources')

function normalizeMessage(message) {
  return message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function extractNumber(message) {
  const match = message.match(/\d+/)
  return match ? Number(match[0]) : null
}

function hasAlias(message, alias) {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`(^|[^a-z0-9_])${escaped}([^a-z0-9_]|$)`)
  return pattern.test(message)
}

function parseFarmKind(message) {
  if (
    message.includes('animal') ||
    message.includes('animaux') ||
    message.includes('vache') ||
    message.includes('cochon') ||
    message.includes('poulet') ||
    message.includes('mouton') ||
    message.includes('lapin')
  ) {
    return 'animals'
  }

  if (
    message.includes('canne') ||
    message.includes('sucre') ||
    message.includes('sugar') ||
    message.includes('sugarcane')
  ) {
    return 'sugarcane'
  }

  return 'all'
}

function wantsFarmCooking(message) {
  return (
    message.includes('cuisson') ||
    message.includes('cuire') ||
    message.includes('cuit') ||
    message.includes('cuite')
  )
}

function parseDirection(message) {
  if (message.includes('nord')) return 'nord'
  if (message.includes('sud')) return 'sud'
  if (message.includes('ouest')) return 'ouest'
  if (message.includes('est')) return 'est'
  return null
}

function parseBlueprintName(message) {
  if (message.includes('animal-pen') || message.includes('enclos')) {
    return 'animal-pen'
  }

  if (message.includes('sugar-cane-farm') || message.includes('canne') || message.includes('sucre')) {
    return 'sugar-cane-farm'
  }

  if (message.includes('ferme') || message.includes('farm hut') || message.includes('farm-hut')) {
    return 'farm-hut'
  }

  return 'starter-house'
}

function parseIntent(rawMessage) {
  const message = normalizeMessage(rawMessage)

  if (message === 'help' || message === 'aide' || message === '?') {
    return { type: 'help' }
  }

  if (message === 'setbase' || message === 'set base' || message.includes('definis la base')) {
    return { type: 'setbase' }
  }

  if (
    message.startsWith('setfarm') ||
    message.startsWith('set farm') ||
    message.startsWith('setferme') ||
    message.startsWith('set ferme') ||
    message.includes('definis la ferme')
  ) {
    return { type: 'setFarm', farmKind: parseFarmKind(message) }
  }

  if (
    message.startsWith('setentree') ||
    message.startsWith('set entree') ||
    message.startsWith('setentry') ||
    message.includes('definis entree')
  ) {
    return { type: 'setFarmEntry', farmKind: parseFarmKind(message) }
  }

  if (
    message === 'setbuild' ||
    message === 'set build' ||
    message === 'setconstruction' ||
    message === 'set construction' ||
    message.includes('definis construction')
  ) {
    return { type: 'setBuildSite' }
  }

  if (
    message === 'stop follow' ||
    message === 'stopfollow' ||
    message === 'arrete de me suivre' ||
    message === 'ne me suis plus' ||
    message === 'stop suivi'
  ) {
    return { type: 'stopFollow' }
  }

  if (
    message === 'stop' ||
    message === 'cancel' ||
    message === 'annule' ||
    message === 'arrete' ||
    message === 'arret' ||
    message === 'stop mission'
  ) {
    return { type: 'stop' }
  }

  if (message === 'pause' || message.includes('pause mission')) {
    return { type: 'pause' }
  }

  if (
    message === 'reprendre' ||
    message === 'resume' ||
    message === 'continue' ||
    message.includes('reprendre') ||
    message.includes('resume') ||
    message.includes('continuer') ||
    message.includes('reprends') ||
    message.includes('reprend la mission') ||
    message.includes('continue la mission')
  ) {
    return { type: 'resume' }
  }

  if (message === 'status' || message === 'etat' || message === 'statut') {
    return { type: 'status' }
  }

  if (message === 'mission') {
    return { type: 'missionStatus' }
  }

  if (
    message === 'inventaire' ||
    message === 'inventory' ||
    message.includes('montre ton inventaire') ||
    message.includes('affiche ton inventaire')
  ) {
    return { type: 'inventory' }
  }

  if (message === 'coords' || message === 'coordonnees' || message === 'position') {
    return { type: 'coords' }
  }

  if (message === 'base' || message === 'ma base' || message === 'coord base') {
    return { type: 'baseInfo' }
  }

  if (message === 'farms' || message === 'fermes' || message === 'farm') {
    return { type: 'farmsInfo' }
  }

  if (
    message === 'viens' ||
    message === 'vien' ||
    message === 'viens ici' ||
    message === 'vien ici' ||
    message === 'come' ||
    message === 'come here' ||
    message === 'viens vers moi' ||
    message === 'vien vers moi'
  ) {
    return { type: 'come' }
  }

  if (message === 'suis moi' || message === 'follow me' || message === 'suivez moi') {
    return { type: 'follow' }
  }

  if (message === 'mange' || message === 'eat') {
    return { type: 'eat' }
  }

  if (message === 'sleep' || message === 'dors' || message === 'va dormir') {
    return { type: 'sleep' }
  }

  if (message === 'defend on' || message === 'defense on' || message === 'defense active') {
    return { type: 'defendOn' }
  }

  if (message === 'defend off' || message === 'defense off' || message === 'defense inactive') {
    return { type: 'defendOff' }
  }

  if (message === 'range' || message === 'range tout' || message === 'trie inventaire') {
    return { type: 'sortStorage' }
  }

  if (
    message === 'depot forcer' ||
    message === 'depot force' ||
    message === 'depose vraiment tout' ||
    message === 'vide tout' ||
    message === 'vide inventaire'
  ) {
    return { type: 'forceDeposit' }
  }

  if (message === 'trouve coffre' || message === 'cherche coffre' || message === 'coffre proche') {
    return { type: 'findChest' }
  }

  if (message === 'trouve lit' || message === 'cherche lit' || message === 'lit proche') {
    return { type: 'findBed' }
  }

  if (message === 'trouve village' || message === 'cherche village' || message === 'village') {
    return { type: 'findVillage' }
  }

  if (
    message === 'blueprints' ||
    message === 'modeles' ||
    message === 'liste maisons'
  ) {
    return { type: 'listBlueprints' }
  }

  if (
    message === 'va a la base' ||
    message === 'rentre a la base' ||
    message === 'retour base' ||
    message === 'retourne base' ||
    message === 'retourne a la base' ||
    message === 'reviens base' ||
    message === 'reviens a la base' ||
    message === 'revien a la base' ||
    message === 'revient a la base' ||
    message === 'rentre a la maison' ||
    message === 'va a la maison'
  ) {
    return { type: 'return' }
  }

  if (message === 'explore' || message === 'explorer' || message === 'exploration') {
    return { type: 'explore', radius: extractNumber(message) || null, direction: parseDirection(message) }
  }

  if (
    (message.includes('explore') || message.includes('explorer') || message.includes('exploration')) &&
    message.includes('nether')
  ) {
    return { type: 'exploreNether' }
  }

  if (
    message.includes('scanbuild') ||
    message.includes('scan build') ||
    message.includes('scan maison') ||
    message.includes('terrain maison') ||
    message.includes('cherche terrain') ||
    message.includes('trouve terrain') ||
    message.includes('zone construction')
  ) {
    return { type: 'scanBuildSite', blueprint: parseBlueprintName(message) }
  }

  if (
    message.startsWith('build ') ||
    message.startsWith('construis ') ||
    message.startsWith('construire ') ||
    message === 'build maison' ||
    message === 'build enclos' ||
    message === 'build ferme' ||
    message === 'build ferme canne'
  ) {
    return { type: 'buildBlueprint', blueprint: parseBlueprintName(message) }
  }

  if (
    message.includes('preparebuild') ||
    message.includes('prepare build') ||
    message.includes('preparer maison') ||
    message.includes('ressource maison') ||
    message.includes('ressources maison') ||
    message.includes('prepare maison')
  ) {
    return { type: 'prepareBlueprint', blueprint: parseBlueprintName(message) }
  }

  if (
    message.includes('maison') ||
    message.includes('blueprint') ||
    message.includes('materiaux maison')
  ) {
    return { type: 'blueprintStatus', blueprint: parseBlueprintName(message) }
  }

  if (
    message === 'ferme' ||
    message.startsWith('ferme ') ||
    message.includes('fais la ferme') ||
    message.includes('occupe toi de la ferme') ||
    message.includes('occupe toi des animaux') ||
    message.includes('nourris animaux') ||
    message.includes('nourris les animaux') ||
    message.includes('nourri les animaux') ||
    message.includes('reproduis animaux') ||
    message.includes('reproduis les animaux') ||
    message.includes('reproduction animaux') ||
    message.includes('farm animaux') ||
    message.includes('gere la ferme') ||
    message.includes('recolte ferme') ||
    message.includes('recolte la canne') ||
    message.includes('recolte canne') ||
    message.includes('ferme animaux') ||
    message.includes('ferme canne') ||
    message === 'ferme_animaux' ||
    message === 'farm_animaux' ||
    message === 'animaux'
  ) {
    return { type: 'farm', farmKind: parseFarmKind(message), cookMeat: wantsFarmCooking(message) }
  }

  if (
    message.includes('prepare') ||
    message.includes('equip') ||
    message.includes('prepare toi') ||
    message.includes('prepares toi')
  ) {
    return { type: 'prepare' }
  }

  if (
    message.includes('depose') ||
    message.includes('depot') ||
    message.includes('range le stuff') ||
    message.includes('depose tout')
  ) {
    return { type: 'deposit' }
  }

  if (
    message.includes('retour') ||
    message.includes('retourne') ||
    message.includes('rentre') ||
    message.includes('reviens') ||
    message.includes('revien') ||
    message.includes('revient') ||
    message.includes('base')
  ) {
    return { type: 'return' }
  }

  if (
    message.includes('chasse') ||
    message.includes('chasser') ||
    message.includes('hunt') ||
    message.includes('viande') ||
    message.includes('vache') ||
    message.includes('cochon') ||
    message.includes('poulet') ||
    message.includes('mouton')
  ) {
    return { type: 'hunt', amount: extractNumber(message) || 5 }
  }

  for (const target of RESOURCE_TARGETS) {
    if (target.aliases.some(alias => hasAlias(message, alias))) {
      return {
        type: 'mine',
        target,
        amount: extractNumber(message) || target.defaultAmount
      }
    }
  }

  if (message.includes('mine')) {
    const target = RESOURCE_TARGETS.find(resource => resource.key === 'diamond')
    return { type: 'mine', target, amount: extractNumber(message) || target.defaultAmount }
  }

  if (message.includes('explore') || message.includes('explorer') || message.includes('exploration')) {
    return { type: 'explore', radius: extractNumber(message) || null, direction: parseDirection(message), biome: message.includes('biome') }
  }

  return { type: 'unknown' }
}

module.exports = {
  extractNumber,
  normalizeMessage,
  parseBlueprintName,
  parseDirection,
  parseFarmKind,
  parseIntent
}
