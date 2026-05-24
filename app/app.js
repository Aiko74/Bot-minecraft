let overview = null

const panels = document.querySelectorAll('.panel')
const navItems = document.querySelectorAll('.nav-item')

navItems.forEach(button => {
  button.addEventListener('click', () => {
    navItems.forEach(item => item.classList.remove('active'))
    button.classList.add('active')
    panels.forEach(panel => panel.classList.toggle('active', panel.id === button.dataset.panel))
  })
})

async function api(path, options = {}) {
  const response = await fetch(path, options)
  if (!response.ok) throw new Error(`API ${path} ${response.status}`)
  return response.json()
}

function coord(value) {
  if (!value) return 'non defini'
  return `${value.x} ${value.y} ${value.z}`
}

function renderOverview() {
  if (!overview) return

  const config = overview.config || {}
  const server = config.server || {}
  const behavior = config.behavior || {}
  const memory = overview.memory || {}
  const bot = overview.bot || {}

  document.getElementById('command-count').textContent = overview.commands
    .reduce((total, category) => total + category.commands.length, 0)
  document.getElementById('blueprint-count').textContent = overview.blueprints.length
  document.getElementById('base-state').textContent = memory.base ? 'OK' : '--'
  document.getElementById('server-target').textContent = `${server.host || '--'}:${server.port || '--'}`
  document.getElementById('mission-state').textContent = memory.mission
    ? `${memory.mission.type} ${memory.mission.status}`
    : 'aucune'
  document.getElementById('protection-state').textContent = behavior.baseProtectionRadius
    ? `${behavior.baseProtectionRadius} blocs`
    : '--'

  const pill = document.getElementById('bot-status-pill')
  pill.textContent = bot.running ? `Bot en ligne PID ${bot.pid}` : 'Bot hors ligne'
  pill.classList.toggle('online', Boolean(bot.running))

  const logs = (bot.logs || []).map(entry => `[${entry.at.slice(11, 19)}] ${entry.text}`).join('\n')
  document.getElementById('logs').textContent = logs || 'Aucun log.'

  const memoryRows = [
    ['Base', coord(memory.base)],
    ['Coffre', coord(memory.container)],
    ['Farm animaux', coord(memory.farms && memory.farms.animals)],
    ['Farm canne', coord(memory.farms && memory.farms.sugarcane)],
    ['Chantier', coord(memory.buildSite)]
  ]

  document.getElementById('memory-list').innerHTML = memoryRows
    .map(([label, value]) => `<div class="memory-item"><span>${label}</span><strong>${value}</strong></div>`)
    .join('')

  document.getElementById('config-output').textContent = JSON.stringify(config, null, 2)
}

function renderCommands() {
  if (!overview) return
  const query = document.getElementById('command-search').value.toLowerCase().trim()
  const container = document.getElementById('command-grid')
  const chunks = []

  for (const category of overview.commands) {
    const cards = category.commands
      .filter(command => {
        const haystack = `${command.name} ${command.summary} ${category.title}`.toLowerCase()
        return !query || haystack.includes(query)
      })
      .map(command => `
        <article class="command-card">
          <strong>${command.name}</strong>
          <small>${command.summary}</small>
          <div class="risk ${command.risk}">${command.risk}</div>
        </article>
      `)

    if (cards.length > 0) {
      chunks.push(`<h3 class="category">${category.title} <small>${category.tone}</small></h3>`)
      chunks.push(...cards)
    }
  }

  container.innerHTML = chunks.join('') || '<p>Aucune commande trouvee.</p>'
}

function renderBlueprints() {
  if (!overview) return
  document.getElementById('blueprint-grid').innerHTML = overview.blueprints.map(blueprint => {
    const materials = Object.entries(blueprint.materials || {})
      .map(([name, count]) => `${name} x${count}`)
      .join(', ')

    return `
      <article class="blueprint-card">
        <strong>${blueprint.name}</strong>
        <small>${blueprint.description || 'Aucune description'}</small>
        <p>Taille: <code>${(blueprint.size || []).join('x')}</code></p>
        <p>Etat: <code>${blueprint.valid ? 'valide' : 'a corriger'}</code></p>
        <p>${materials || 'Aucun materiau'}</p>
      </article>
    `
  }).join('')
}

async function refresh() {
  overview = await api('/api/overview')
  renderOverview()
  renderCommands()
  renderBlueprints()
}

document.getElementById('refresh').addEventListener('click', refresh)
document.getElementById('command-search').addEventListener('input', renderCommands)

document.getElementById('start-bot').addEventListener('click', async () => {
  await api('/api/bot/start', { method: 'POST' })
  await refresh()
})

document.getElementById('stop-bot').addEventListener('click', async () => {
  await api('/api/bot/stop', { method: 'POST' })
  await refresh()
})

document.getElementById('copy-help').addEventListener('click', async () => {
  if (!overview) return
  const lines = overview.commands.flatMap(category =>
    category.commands.map(command => `${command.name} -> ${command.summary}`)
  )
  await navigator.clipboard.writeText(lines.join('\n'))
})

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

refresh()
setInterval(refresh, 3500)
