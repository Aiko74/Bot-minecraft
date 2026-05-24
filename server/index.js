const http = require('http')
const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const { commandCategories, flattenCommands } = require('../bot-core/commands/catalog')
const { listBlueprints, loadBlueprint, validateBlueprint } = require('../blueprint-utils')

const ROOT = path.join(__dirname, '..')
const APP_DIR = path.join(ROOT, 'app')
const CONFIG_FILE = path.join(ROOT, 'config.json')
const MEMORY_FILE = path.join(ROOT, 'bot-memory.json')
const PORT = Number(process.env.APP_PORT || 3077)

let botProcess = null
let botStartedAt = null
const botLogs = []

function pushLog(line) {
  const text = String(line).replace(/\r?\n$/, '')
  if (!text) return
  botLogs.push({
    at: new Date().toISOString(),
    text
  })
  while (botLogs.length > 300) botLogs.shift()
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return fallback
  }
}

function sendJson(res, value, status = 200) {
  const body = JSON.stringify(value, null, 2)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  })
  res.end(body)
}

function sendText(res, text, status = 200, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store'
  })
  res.end(text)
}

function contentTypeFor(filePath) {
  const ext = path.extname(filePath)
  if (ext === '.html') return 'text/html; charset=utf-8'
  if (ext === '.css') return 'text/css; charset=utf-8'
  if (ext === '.js') return 'application/javascript; charset=utf-8'
  if (ext === '.json') return 'application/json; charset=utf-8'
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.png') return 'image/png'
  return 'application/octet-stream'
}

function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`)
  const rawPath = decodeURIComponent(requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname)
  const filePath = path.normalize(path.join(APP_DIR, rawPath))

  if (!filePath.startsWith(APP_DIR)) {
    sendText(res, 'Forbidden', 403)
    return
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendText(res, 'Not found', 404)
      return
    }

    res.writeHead(200, {
      'Content-Type': contentTypeFor(filePath)
    })
    res.end(data)
  })
}

function botStatus() {
  return {
    running: Boolean(botProcess),
    pid: botProcess ? botProcess.pid : null,
    startedAt: botStartedAt,
    logs: botLogs.slice(-80)
  }
}

function startBot() {
  if (botProcess) return botStatus()

  botStartedAt = new Date().toISOString()
  pushLog('[app] demarrage du bot')
  botProcess = spawn(process.execPath, ['bot.js'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe']
  })

  botProcess.stdout.on('data', chunk => {
    for (const line of String(chunk).split(/\r?\n/)) pushLog(line)
  })

  botProcess.stderr.on('data', chunk => {
    for (const line of String(chunk).split(/\r?\n/)) pushLog(`[err] ${line}`)
  })

  botProcess.on('close', code => {
    pushLog(`[app] bot arrete avec code ${code}`)
    botProcess = null
    botStartedAt = null
  })

  return botStatus()
}

function stopBot() {
  if (!botProcess) return botStatus()

  pushLog('[app] arret demande')
  botProcess.kill('SIGTERM')
  botProcess = null
  botStartedAt = null
  return botStatus()
}

function blueprintSummary() {
  return listBlueprints().map(name => {
    try {
      const blueprint = loadBlueprint(name)
      return {
        key: name,
        name: blueprint.name,
        description: blueprint.description || '',
        size: blueprint.size,
        materials: blueprint.materials || {},
        valid: validateBlueprint(blueprint).length === 0
      }
    } catch (err) {
      return {
        key: name,
        name,
        description: err.message,
        size: [0, 0, 0],
        materials: {},
        valid: false
      }
    }
  })
}

function api(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`)
  const pathname = requestUrl.pathname

  if (pathname === '/api/health') {
    sendJson(res, {
      ok: true,
      app: 'Minecraft Survival Assistant',
      time: new Date().toISOString()
    })
    return true
  }

  if (pathname === '/api/overview') {
    sendJson(res, {
      config: readJson(CONFIG_FILE, {}),
      memory: readJson(MEMORY_FILE, {}),
      bot: botStatus(),
      commands: commandCategories,
      blueprints: blueprintSummary()
    })
    return true
  }

  if (pathname === '/api/config') {
    sendJson(res, readJson(CONFIG_FILE, {}))
    return true
  }

  if (pathname === '/api/memory') {
    sendJson(res, readJson(MEMORY_FILE, {}))
    return true
  }

  if (pathname === '/api/commands') {
    sendJson(res, {
      categories: commandCategories,
      all: flattenCommands()
    })
    return true
  }

  if (pathname === '/api/blueprints') {
    sendJson(res, blueprintSummary())
    return true
  }

  if (pathname === '/api/bot/status') {
    sendJson(res, botStatus())
    return true
  }

  if (pathname === '/api/bot/start' && req.method === 'POST') {
    sendJson(res, startBot())
    return true
  }

  if (pathname === '/api/bot/stop' && req.method === 'POST') {
    sendJson(res, stopBot())
    return true
  }

  return false
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) {
    if (!api(req, res)) sendJson(res, { error: 'API route not found' }, 404)
    return
  }

  serveStatic(req, res)
})

server.listen(PORT, () => {
  console.log(`Application locale prete: http://localhost:${PORT}`)
})
