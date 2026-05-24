const fs = require('fs')
const path = require('path')

const BLUEPRINT_DIR = path.join(__dirname, 'blueprints')

function normalizeBlueprintName(name) {
  if (!name || name === 'maison' || name === 'house') return 'starter-house'
  return name
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function loadBlueprint(name) {
  const blueprintName = normalizeBlueprintName(name)
  const filePath = path.join(BLUEPRINT_DIR, `${blueprintName}.json`)
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))

  return {
    ...data,
    key: blueprintName,
    filePath
  }
}

function listBlueprints() {
  if (!fs.existsSync(BLUEPRINT_DIR)) return []

  return fs.readdirSync(BLUEPRINT_DIR)
    .filter(fileName => fileName.endsWith('.json'))
    .map(fileName => fileName.replace(/\.json$/, ''))
}

function countMaterialsFromLayers(blueprint) {
  const counts = {}
  const legend = blueprint.legend || {}

  for (const layer of blueprint.layers || []) {
    for (const row of layer.rows || []) {
      for (const symbol of row) {
        const name = legend[symbol] || 'air'
        if (!name || name === 'air') continue
        counts[name] = (counts[name] || 0) + 1
      }
    }
  }

  return counts
}

function validateBlueprint(blueprint) {
  const errors = []

  if (!blueprint || typeof blueprint !== 'object') {
    return ['Blueprint invalide: objet JSON attendu.']
  }

  if (!blueprint.name || typeof blueprint.name !== 'string') {
    errors.push('name manquant ou invalide')
  }

  if (!Array.isArray(blueprint.size) || blueprint.size.length !== 3) {
    errors.push('size doit etre un tableau [x, y, z]')
  }

  if (!blueprint.legend || typeof blueprint.legend !== 'object') {
    errors.push('legend manquant ou invalide')
  }

  if (!Array.isArray(blueprint.layers) || blueprint.layers.length === 0) {
    errors.push('layers manquant ou vide')
  }

  const size = Array.isArray(blueprint.size) ? blueprint.size : [0, 0, 0]
  const width = Number(size[0]) || 0
  const depth = Number(size[2]) || 0

  for (const [index, layer] of (blueprint.layers || []).entries()) {
    if (typeof layer.y !== 'number') {
      errors.push(`layers[${index}].y doit etre un nombre`)
    }

    if (!Array.isArray(layer.rows)) {
      errors.push(`layers[${index}].rows doit etre un tableau`)
      continue
    }

    if (depth > 0 && layer.rows.length !== depth) {
      errors.push(`layers[${index}].rows doit contenir ${depth} lignes`)
    }

    for (const [rowIndex, row] of layer.rows.entries()) {
      if (typeof row !== 'string') {
        errors.push(`layers[${index}].rows[${rowIndex}] doit etre une chaine`)
        continue
      }

      if (width > 0 && row.length !== width) {
        errors.push(`layers[${index}].rows[${rowIndex}] doit faire ${width} caracteres`)
      }

      for (const symbol of row) {
        if (!Object.prototype.hasOwnProperty.call(blueprint.legend || {}, symbol)) {
          errors.push(`symbole "${symbol}" absent de legend`)
        }
      }
    }
  }

  return [...new Set(errors)]
}

function normalizeBlueprintData(data) {
  const materials = data.materials && typeof data.materials === 'object'
    ? data.materials
    : countMaterialsFromLayers(data)

  return {
    ...data,
    materials
  }
}

function saveBlueprint(name, data) {
  if (!fs.existsSync(BLUEPRINT_DIR)) {
    fs.mkdirSync(BLUEPRINT_DIR, { recursive: true })
  }

  const blueprintName = normalizeBlueprintName(name || data.name)
  const normalized = normalizeBlueprintData({
    ...data,
    name: data.name || blueprintName
  })
  const errors = validateBlueprint(normalized)
  if (errors.length > 0) {
    const err = new Error(`Blueprint invalide: ${errors.join(', ')}`)
    err.validationErrors = errors
    throw err
  }

  const filePath = path.join(BLUEPRINT_DIR, `${blueprintName}.json`)
  fs.writeFileSync(filePath, JSON.stringify(normalized, null, 2))
  return filePath
}

function importBlueprint(filePath, name = null) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  return saveBlueprint(name || data.name || path.basename(filePath, path.extname(filePath)), data)
}

function missingMaterials(materials, available) {
  return Object.entries(materials)
    .map(([name, count]) => ({
      name,
      required: count,
      available: available[name] || 0,
      missing: Math.max(0, count - (available[name] || 0))
    }))
    .filter(item => item.missing > 0)
}

function summarizeMissing(missing, limit = 5) {
  if (missing.length === 0) return 'materiaux ok'

  const shown = missing
    .slice(0, limit)
    .map(item => `${item.name} ${item.missing}`)
    .join(', ')

  if (missing.length <= limit) return shown
  return `${shown}, +${missing.length - limit} autres`
}

module.exports = {
  BLUEPRINT_DIR,
  countMaterialsFromLayers,
  importBlueprint,
  listBlueprints,
  loadBlueprint,
  missingMaterials,
  normalizeBlueprintData,
  saveBlueprint,
  validateBlueprint,
  summarizeMissing
}
