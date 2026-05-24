const readline = require('readline')
const path = require('path')
const {
  importBlueprint,
  listBlueprints,
  loadBlueprint,
  saveBlueprint,
  validateBlueprint,
  countMaterialsFromLayers
} = require('./blueprint-utils')

function printHelp() {
  console.log(`
Commandes console:
  help                         Affiche cette aide
  list                         Liste les blueprints
  show <nom>                   Affiche taille et materiaux
  validate <fichier.json>      Verifie un fichier blueprint externe
  import <fichier.json> [nom]  Importe un blueprint dans blueprints/
  create-sample <nom>          Cree un modele exemple simple
  exit                         Quitte
`)
}

function printBlueprint(name) {
  const blueprint = loadBlueprint(name)
  console.log(`\n${blueprint.name}`)
  console.log(`Taille: ${blueprint.size.join('x')}`)
  console.log(`Description: ${blueprint.description || 'aucune'}`)
  console.log('Materiaux:')
  for (const [material, count] of Object.entries(blueprint.materials || {})) {
    console.log(`  - ${material}: ${count}`)
  }
}

function sampleBlueprint(name) {
  return {
    name,
    description: 'Modele exemple 3x3x3 genere par la console.',
    size: [3, 3, 3],
    origin: [0, 0, 0],
    legend: {
      ' ': 'air',
      P: 'oak_planks',
      G: 'glass_pane',
      T: 'torch'
    },
    layers: [
      { y: 0, rows: ['PPP', 'PPP', 'PPP'] },
      { y: 1, rows: ['PPP', 'P G', 'PPP'] },
      { y: 2, rows: ['PPP', 'P T', 'PPP'] }
    ]
  }
}

function handleCommand(line) {
  const parts = line.trim().split(/\s+/).filter(Boolean)
  const command = parts.shift()
  if (!command) return true

  try {
    if (command === 'help' || command === '?') {
      printHelp()
      return true
    }

    if (command === 'list') {
      const names = listBlueprints()
      console.log(names.length > 0 ? names.join('\n') : 'Aucun blueprint.')
      return true
    }

    if (command === 'show') {
      if (!parts[0]) throw new Error('Usage: show <nom>')
      printBlueprint(parts[0])
      return true
    }

    if (command === 'validate') {
      if (!parts[0]) throw new Error('Usage: validate <fichier.json>')
      const filePath = path.resolve(parts[0])
      const data = require(filePath)
      const errors = validateBlueprint(data)
      if (errors.length > 0) {
        console.log(`Invalide:\n- ${errors.join('\n- ')}`)
      } else {
        const materials = data.materials || countMaterialsFromLayers(data)
        console.log('Blueprint valide. Materiaux:')
        for (const [material, count] of Object.entries(materials)) {
          console.log(`  - ${material}: ${count}`)
        }
      }
      return true
    }

    if (command === 'import') {
      if (!parts[0]) throw new Error('Usage: import <fichier.json> [nom]')
      const filePath = path.resolve(parts[0])
      const saved = importBlueprint(filePath, parts[1] || null)
      console.log(`Blueprint importe: ${saved}`)
      return true
    }

    if (command === 'create-sample') {
      if (!parts[0]) throw new Error('Usage: create-sample <nom>')
      const data = sampleBlueprint(parts[0])
      const saved = saveBlueprint(parts[0], data)
      console.log(`Modele exemple cree: ${saved}`)
      return true
    }

    if (command === 'exit' || command === 'quit') {
      return false
    }

    console.log(`Commande inconnue: ${command}`)
  } catch (err) {
    console.log(`Erreur: ${err.message}`)
  }

  return true
}

function startConsole() {
  console.log('Console Blueprints Minecraft Bot')
  printHelp()

  if (process.argv.includes('--help')) {
    return
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'blueprints> '
  })

  rl.prompt()
  rl.on('line', line => {
    const keepGoing = handleCommand(line)
    if (!keepGoing) {
      rl.close()
      return
    }
    rl.prompt()
  })

  rl.on('close', () => {
    process.exit(0)
  })
}

startConsole()
