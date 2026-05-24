import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  Bot,
  Boxes,
  Braces,
  ChevronRight,
  Clipboard,
  Cpu,
  Database,
  Download,
  FolderOpen,
  Gauge,
  Hammer,
  Hexagon,
  Home,
  Layers3,
  Map,
  MoreHorizontal,
  Palette,
  Plus,
  Play,
  Power,
  Radar,
  RefreshCcw,
  RotateCcw,
  Save,
  ScrollText,
  Search,
  Server,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Trash2,
  Upload,
  Wand2,
  Wifi,
  WifiOff,
  X,
  Zap
} from 'lucide-react'
import * as THREE from 'three'
import './styles.css'

const views = [
  { id: 'dashboard', label: 'Dashboard', icon: Gauge },
  { id: 'bot', label: 'Bot', icon: Bot },
  { id: 'config', label: 'Configuration', icon: Settings },
  { id: 'commands', label: 'Commandes', icon: Terminal },
  { id: 'blueprints', label: 'Blueprints', icon: Boxes },
  { id: 'logs', label: 'Logs', icon: ScrollText }
]

const themes = [
  {
    id: 'galaxy',
    name: 'Galaxie',
    summary: 'Nebuleuse violet bleu',
    colors: ['#c77dff', '#4cc9f0', '#ff6fb1']
  },
  {
    id: 'neon-violet',
    name: 'Neon Violet',
    summary: 'Cyberpunk premium',
    colors: ['#c77dff', '#ff6fb1', '#7df9ff']
  },
  {
    id: 'deep-blue',
    name: 'Bleu Profond',
    summary: 'Holographique sombre',
    colors: ['#69e7ff', '#118aff', '#8dffbc']
  },
  {
    id: 'red-cyber',
    name: 'Rouge Cyberpunk',
    summary: 'Alerte Night City',
    colors: ['#ff5570', '#ff2c83', '#ffd166']
  },
  {
    id: 'matrix',
    name: 'Vert Matrix',
    summary: 'Terminal vivant',
    colors: ['#8dffbc', '#00d084', '#69e7ff']
  },
  {
    id: 'black-premium',
    name: 'Noir Premium',
    summary: 'Chrome minimal',
    colors: ['#f0f7ff', '#78716c', '#c77dff']
  }
]

const viewTitles = {
  dashboard: 'Cockpit Survival',
  bot: 'Controle Bot',
  config: 'Configuration Locale',
  commands: 'Bibliotheque Commandes',
  blueprints: 'Atelier Blueprints',
  logs: 'Flux Systeme'
}

const appBuildLabel = 'V1-DEV-2026.05'

const categoryIcons = {
  setup: Home,
  mission: Activity,
  survival: Shield,
  movement: Map,
  resources: Hammer,
  farms: Sparkles,
  build: Layers3,
  search: Radar
}

function posText(pos) {
  if (!pos || typeof pos.x !== 'number') return 'non defini'
  return `${pos.x} ${pos.y} ${pos.z}`
}

function missionText(memory) {
  const mission = memory?.mission
  if (!mission) return 'Aucune'
  return `${mission.type} ${Number(mission.progress || 0)}/${Number(mission.amount || 0)}`
}

function serverText(config) {
  const server = config?.server || {}
  return `${server.host || '-'}:${server.port || '-'}`
}

function timeText(value) {
  if (!value) return '--:--:--'
  return new Date(value).toLocaleTimeString('fr-FR')
}

function localStorageValue(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

function setLocalStorageValue(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

function normalizeTheme(theme) {
  if (theme === 'violet') return 'neon-violet'
  if (theme === 'blue') return 'deep-blue'
  if (theme === 'emerald') return 'matrix'
  if (theme === 'rose') return 'red-cyber'
  if (theme === 'amber') return 'black-premium'
  return themes.some(item => item.id === theme) ? theme : 'galaxy'
}

function botStateLabel(bot) {
  if (!bot?.running) return 'deconnecte'
  if (bot.state === 'connected') return 'connecte'
  if (bot.state === 'error') return 'erreur'
  if (bot.state === 'starting') return 'connexion'
  if (bot.state === 'disconnected') return 'deconnecte'
  return 'process actif'
}

function botIsConnected(bot) {
  return Boolean(bot?.running && bot.state === 'connected')
}

function HoloScene({ disabled = false }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (disabled) return undefined
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100)
    camera.position.z = 8

    const group = new THREE.Group()
    scene.add(group)

    const geometry = new THREE.IcosahedronGeometry(2.15, 2)
    const material = new THREE.MeshBasicMaterial({
      color: 0xc77dff,
      wireframe: true,
      transparent: true,
      opacity: 0.38
    })
    const core = new THREE.Mesh(geometry, material)
    group.add(core)

    const ringMaterial = new THREE.LineBasicMaterial({
      color: 0xff6fb1,
      transparent: true,
      opacity: 0.42
    })
    for (let i = 0; i < 3; i++) {
      const curve = new THREE.EllipseCurve(0, 0, 2.7 + i * 0.35, 2.7 + i * 0.35)
      const points = curve.getPoints(160).map(point => new THREE.Vector3(point.x, point.y, 0))
      const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(points), ringMaterial)
      ring.rotation.x = Math.PI / (2.5 + i)
      ring.rotation.y = i * 0.7
      group.add(ring)
    }

    const particleGeometry = new THREE.BufferGeometry()
    const particleCount = 140
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 9
      positions[i * 3 + 1] = (Math.random() - 0.5) * 6
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xa889ff,
      size: 0.026,
      transparent: true,
      opacity: 0.62
    })
    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)

    let animationId = 0
    const resize = () => {
      const box = canvas.getBoundingClientRect()
      renderer.setSize(box.width, box.height, false)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      camera.aspect = box.width / Math.max(1, box.height)
      camera.updateProjectionMatrix()
    }

    const tick = () => {
      animationId = requestAnimationFrame(tick)
      const t = performance.now() * 0.001
      group.rotation.x = t * 0.18
      group.rotation.y = t * 0.24
      particles.rotation.y = t * 0.04
      particles.rotation.x = Math.sin(t * 0.18) * 0.08
      renderer.render(scene, camera)
    }

    resize()
    window.addEventListener('resize', resize)
    tick()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
      geometry.dispose()
      material.dispose()
      ringMaterial.dispose()
      particleGeometry.dispose()
      particleMaterial.dispose()
      renderer.dispose()
    }
  }, [disabled])

  if (disabled) {
    return <div className="holo-static"><Sparkles size={62} /><span>Performance mode</span></div>
  }

  return <canvas ref={canvasRef} className="holo-canvas" aria-hidden="true" />
}

function ShellBackdrop({ performanceMode }) {
  const particles = useMemo(() => Array.from({ length: 34 }).map((_, index) => ({
    id: index,
    x: `${Math.random() * 100}%`,
    y: `${Math.random() * 100}%`,
    d: `${3 + Math.random() * 7}s`,
    s: `${0.6 + Math.random() * 1.4}`
  })), [])

  return (
    <div className={`backdrop ${performanceMode ? 'performance' : ''}`} aria-hidden="true">
      {!performanceMode ? <div className="scanlines" /> : null}
      {!performanceMode ? <div className="aurora aurora-a" /> : null}
      {!performanceMode ? <div className="aurora aurora-b" /> : null}
      <div className="grid-floor" />
      {!performanceMode ? (
        <div className="particle-field">
          {particles.map(particle => (
            <span
              key={particle.id}
              style={{
                '--x': particle.x,
                '--y': particle.y,
                '--d': particle.d,
                '--s': particle.s
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function Sidebar({ activeView, setActiveView, botRunning, botConnected, target, theme, onThemeChange }) {
  return (
    <aside className="sidebar">
      <motion.div className="brand" initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="brand-orb">
          <Hexagon size={30} />
          <span>AI</span>
        </div>
        <div>
          <h1>Aiko Core</h1>
          <p>Survival Assistant 2077</p>
        </div>
      </motion.div>

      <nav className="nav">
        {views.map((view, index) => {
          const Icon = view.icon
          return (
            <motion.button
              key={view.id}
              className={`nav-item ${activeView === view.id ? 'active' : ''}`}
              onClick={() => setActiveView(view.id)}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.035 }}
              whileHover={{ x: 6 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon size={18} />
              <span>{view.label}</span>
              <ChevronRight size={15} />
            </motion.button>
          )
        })}
      </nav>

      <div className="sidebar-theme">
        <span><Palette size={15} /> Theme</span>
        <ThemeDots theme={theme} onThemeChange={onThemeChange} compact />
      </div>

      <motion.div className="dev-build-card" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <span>{appBuildLabel}</span>
        <strong>Projet en developpement</strong>
        <small>Version de test pour amis.</small>
      </motion.div>

      <motion.div className="connection-card" layout>
        <div className={`status-orb ${botRunning ? 'online' : ''}`}>
          <span />
        </div>
        <div>
          <strong>{botConnected ? 'Bot connecte' : (botRunning ? 'Connexion...' : 'Bot en veille')}</strong>
          <small>{botConnected ? target : 'Configure puis lance le bot'}</small>
        </div>
      </motion.div>
    </aside>
  )
}

function Topbar({ activeView, onRefresh, onStart, onStop, botRunning, onOpenSetup }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Interface locale native</p>
        <h2>{viewTitles[activeView]}</h2>
      </div>
      <div className="top-actions">
        <motion.button className="glass-button" onClick={onOpenSetup} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
          <Wand2 size={17} />
          Configurer
        </motion.button>
        <motion.button className="glass-button" onClick={onRefresh} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
          <RefreshCcw size={17} />
          Sync
        </motion.button>
        <motion.button className="primary-button" onClick={onStart} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
          <Play size={17} />
          Lancer
        </motion.button>
        <motion.button className="danger-button" onClick={onStop} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
          <Power size={17} />
          Stop
        </motion.button>
        <div className={`micro-status ${botRunning ? 'online' : ''}`}>{botRunning ? 'online' : 'idle'}</div>
      </div>
    </header>
  )
}

function ThemeDots({ theme, onThemeChange, compact = false }) {
  return (
    <div className={compact ? 'theme-dots compact' : 'theme-dots'}>
      {themes.map(option => (
        <motion.button
          key={option.id}
          className={`theme-dot ${theme === option.id ? 'active' : ''}`}
          style={{
            '--a': option.colors[0],
            '--b': option.colors[1],
            '--c': option.colors[2]
          }}
          title={`${option.name} - ${option.summary}`}
          onClick={() => onThemeChange(option.id)}
          whileHover={{ y: -2, scale: 1.05 }}
          whileTap={{ scale: 0.94 }}
        >
          <span />
        </motion.button>
      ))}
    </div>
  )
}

function ThemeGallery({ theme, onThemeChange }) {
  return (
    <div className="theme-gallery">
      {themes.map(option => (
        <motion.button
          key={option.id}
          className={`theme-card ${theme === option.id ? 'active' : ''}`}
          onClick={() => onThemeChange(option.id)}
          whileHover={{ y: -5 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="theme-swatch">
            {option.colors.map(color => <span key={color} style={{ background: color }} />)}
          </div>
          <strong>{option.name}</strong>
          <small>{option.summary}</small>
        </motion.button>
      ))}
    </div>
  )
}

function ToastStack({ notifications, dismiss }) {
  return (
    <div className="toast-stack">
      <AnimatePresence>
        {notifications.map(note => (
          <motion.div
            key={note.id}
            className={`toast ${note.tone || 'info'}`}
            initial={{ opacity: 0, x: 60, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96 }}
          >
            <BellIcon tone={note.tone} />
            <div>
              <strong>{note.title}</strong>
              <p>{note.body}</p>
            </div>
            <button onClick={() => dismiss(note.id)}><X size={15} /></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

function BellIcon({ tone }) {
  if (tone === 'error') return <WifiOff size={18} />
  if (tone === 'success') return <Sparkles size={18} />
  return <Wifi size={18} />
}

function QuickCommands({ settings, onCopy }) {
  const commands = settings?.customCommands || []
  return (
    <div className="quick-grid">
      {commands.slice(0, 6).map(command => (
        <motion.button
          key={command.id}
          className="quick-command"
          onClick={() => onCopy(command.command, command.label)}
          whileHover={{ y: -4 }}
          whileTap={{ scale: 0.97 }}
        >
          <Terminal size={16} />
          <strong>{command.label}</strong>
          <span>{command.command}</span>
        </motion.button>
      ))}
    </div>
  )
}

function Launchpad({ onOpenSetup, onStart, onTestConnection }) {
  const steps = [
    ['1', 'Configurer', 'Entre IP, port, version, pseudo du bot et owner.'],
    ['2', 'Tester', 'Verifie que le serveur Minecraft est joignable avant de lancer.'],
    ['3', 'Lancer', 'Demarre le bot depuis l app, puis attends le statut connecte.'],
    ['4', 'Commander', 'Dans Minecraft, parle au bot: status, mine 64 fer, retour base.']
  ]

  return (
    <Panel title="Centre de lancement" meta="aucune donnee monde affichee hors connexion">
      <div className="launchpad">
        {steps.map(([number, title, text]) => (
          <div className="launch-step" key={number}>
            <span>{number}</span>
            <strong>{title}</strong>
            <p>{text}</p>
          </div>
        ))}
      </div>
      <div className="panel-actions">
        <button className="primary-button" onClick={onOpenSetup}><Wand2 size={16} /> Ouvrir Setup</button>
        <button className="glass-button" onClick={() => onTestConnection()}><Wifi size={16} /> Tester connexion</button>
        <button className="glass-button" onClick={onStart}><Play size={16} /> Lancer bot</button>
      </div>
    </Panel>
  )
}

function MetricCard({ icon: Icon, label, value, tone = 'cyan', delay = 0 }) {
  return (
    <motion.article
      className={`metric-card ${tone}`}
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 120, damping: 18 }}
      whileHover={{ y: -6, rotateX: 2, rotateY: -2 }}
    >
      <div className="metric-icon"><Icon size={20} /></div>
      <span>{label}</span>
      <strong>{value}</strong>
      <div className="metric-line" />
    </motion.article>
  )
}

function Dashboard({ data, onCopyCommand, performanceMode, onOpenSetup, onStart, onTestConnection }) {
  const config = data?.config || {}
  const memory = data?.memory || {}
  const bot = data?.bot || {}
  const connected = botIsConnected(bot)
  const blueprints = data?.blueprints || []
  const commandCount = data?.allCommands?.length || 0
  const logs = bot.logs || []

  const memoryCards = [
    ['Base', posText(memory.base), Home],
    ['Coffre base', posText(memory.container), Database],
    ['Ferme animaux', posText(memory.farms?.animals), Sparkles],
    ['Coffre animaux', posText(memory.farmContainers?.animals), Boxes],
    ['Portail overworld', posText(memory.netherPortals?.overworld), Map],
    ['Portail nether', posText(memory.netherPortals?.nether), Zap],
    ['Chantier', posText(memory.buildSite), Layers3],
    ['Mission', missionText(memory), Activity]
  ]

  return (
    <div className="dashboard-view">
      <motion.section className="hero-panel" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
        <div className="hero-copy">
          <span className="system-chip">{connected ? 'Aiko Survival OS' : 'Premier demarrage'}</span>
          <h3>{connected ? 'Mission control Minecraft est en ligne.' : 'Configure ton assistant avant de reveler le monde.'}</h3>
          <p>
            {connected
              ? 'Controle local, logs en direct, memoire de base, Nether, farms et blueprints dans une interface qui respire enfin.'
              : 'Aucune coordonnee ni information serveur n est affichee ici tant que le bot n est pas connecte avec les infos choisies.'}
          </p>
        </div>
        <div className="hero-visual">
          <HoloScene disabled={performanceMode} />
          <div className="orbit-label top">{connected ? 'Mineflayer Core' : 'Setup requis'}</div>
          <div className="orbit-label bottom">{connected ? serverText(config) : 'Infos masquees'}</div>
        </div>
      </motion.section>

      <section className="metrics">
        <MetricCard icon={Terminal} label="Commandes" value={commandCount} delay={0.05} />
        <MetricCard icon={Boxes} label="Blueprints" value={blueprints.length} tone="green" delay={0.1} />
        <MetricCard icon={Activity} label="Mission" value={connected ? missionText(memory) : 'verrouillee'} tone="violet" delay={0.15} />
        <MetricCard icon={Server} label="Bot" value={botStateLabel(bot)} tone={bot.state === 'error' ? 'red' : (bot.running ? 'green' : 'amber')} delay={0.2} />
      </section>

      <section className="content-grid">
        {connected ? (
          <Panel title="Memoire tactique" meta="coordonnees sauvegardees">
            <div className="memory-grid">
              {memoryCards.map(([label, value, Icon], index) => (
                <motion.div className="memory-cell" key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.025 }}>
                  <Icon size={16} />
                  <span>{label}</span>
                  <strong>{value}</strong>
                </motion.div>
              ))}
            </div>
          </Panel>
        ) : (
          <Launchpad onOpenSetup={onOpenSetup} onStart={onStart} onTestConnection={onTestConnection} />
        )}

        <div className="side-stack">
          <Panel title="Commandes rapides" meta="copie chat">
            <QuickCommands settings={data?.settings} onCopy={onCopyCommand} />
          </Panel>
          <Panel title="Flux recent" meta={`${logs.length} lignes`}>
            <LogStream logs={logs.slice(-8)} compact />
          </Panel>
        </div>
      </section>
    </div>
  )
}

function Panel({ title, meta, children, className = '' }) {
  return (
    <motion.article
      className={`panel ${className}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 130, damping: 18 }}
    >
      <div className="panel-head">
        <h4>{title}</h4>
        {meta ? <span>{meta}</span> : null}
      </div>
      {children}
    </motion.article>
  )
}

function BotView({ data, onStart, onStop, onRestart, onRefresh, onTestConnection }) {
  const bot = data?.bot || {}
  const config = data?.config || {}
  const server = config.server || {}
  const connected = botIsConnected(bot)

  return (
    <div className="bot-view">
      <Panel title="Noyau bot" meta={bot.running ? `PID ${bot.pid}` : 'process arrete'} className="core-panel">
        <div className={`reactor ${bot.running ? 'online' : ''} ${bot.state === 'error' ? 'error' : ''}`}>
          <div className="reactor-ring" />
          <div className="reactor-ring second" />
          <Cpu size={52} />
          <strong>{botStateLabel(bot).toUpperCase()}</strong>
          <span>{bot.startedAt ? `demarre a ${timeText(bot.startedAt)}` : 'pret a lancer'}</span>
        </div>
        <div className="button-row">
          <motion.button className="primary-button" onClick={onStart} whileTap={{ scale: 0.97 }}>
            <Play size={17} /> Lancer bot
          </motion.button>
          <motion.button className="danger-button" onClick={onStop} whileTap={{ scale: 0.97 }}>
            <Power size={17} /> Arreter bot
          </motion.button>
          <motion.button className="glass-button" onClick={onRestart} whileTap={{ scale: 0.97 }}>
            <RotateCcw size={17} /> Redemarrer
          </motion.button>
          <motion.button className="glass-button" onClick={onRefresh} whileTap={{ scale: 0.97 }}>
            <RefreshCcw size={17} /> Sync
          </motion.button>
        </div>
        {bot.lastError ? <div className="error-box">{bot.lastError}</div> : null}
      </Panel>

      <Panel title="Serveur cible" meta={connected ? 'connexion active' : 'masque hors connexion'}>
        {connected ? (
          <div className="server-grid">
            <InfoCell label="Host" value={server.host || '-'} />
            <InfoCell label="Port" value={server.port || '-'} />
            <InfoCell label="Pseudo" value={server.username || '-'} />
            <InfoCell label="Version" value={server.version || '-'} />
            <InfoCell label="Owners" value={(config.owners || []).join(', ') || '-'} wide />
            <InfoCell label="Auto sleep" value={config.behavior?.autoSleepAtBase ? 'active' : 'desactive'} />
          </div>
        ) : (
          <div className="locked-panel">
            <Shield size={34} />
            <strong>Informations masquees</strong>
            <p>Le serveur, le port, le pseudo et les owners restent caches ici tant que le bot n est pas connecte. Utilise Setup ou Configuration pour les modifier.</p>
          </div>
        )}
        <div className="panel-actions">
          <motion.button className="primary-button" onClick={() => onTestConnection({ server })} whileTap={{ scale: 0.97 }}>
            <Wifi size={17} /> Tester la connexion
          </motion.button>
        </div>
      </Panel>
    </div>
  )
}

function InfoCell({ label, value, wide = false }) {
  return (
    <div className={`info-cell ${wide ? 'wide' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function ConfigView({
  data,
  onSave,
  onSaveSettings,
  onSaveProfile,
  onDeleteProfile,
  onApplyProfile,
  onExportConfig,
  onImportConfig,
  onTestConnection,
  theme,
  onThemeChange,
  performanceMode,
  onPerformanceModeChange,
  onOpenSetup,
  botConnected,
  onDetectLocalIpv4
}) {
  const config = data?.config || {}
  const settings = data?.settings || {}
  const [form, setForm] = useState(() => formFromConfig(config))
  const [saved, setSaved] = useState(false)
  const [profileDraft, setProfileDraft] = useState(() => profileFromConfig(config))

  useEffect(() => {
    setForm(formFromConfig(config))
    setProfileDraft(profileFromConfig(config))
  }, [config])

  useEffect(() => {
    if (!config.server) return undefined
    if (JSON.stringify(form) === JSON.stringify(formFromConfig(config))) return undefined
    const timer = setTimeout(() => {
      onSave({
        server: {
          host: form.host.trim(),
          port: Number(form.port),
          username: form.username.trim(),
          version: form.version.trim()
        },
        owners: form.owners.split(',').map(owner => owner.trim()).filter(Boolean),
        behavior: {
          autoSleepAtBase: form.autoSleepAtBase === 'true',
          autoFarmAnimalsDays: Number(form.autoFarmAnimalsDays) || 0
        }
      }, { quiet: true })
      setSaved(true)
      setTimeout(() => setSaved(false), 1600)
    }, 900)
    return () => clearTimeout(timer)
  }, [form, config])

  function update(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function detectHost() {
    const address = await onDetectLocalIpv4()
    if (address) update('host', address)
  }

  async function detectProfileHost() {
    const address = await onDetectLocalIpv4()
    if (address) setProfileDraft(current => ({ ...current, host: address }))
  }

  async function submit(event) {
    event.preventDefault()
    await onSave({
      server: {
        host: form.host.trim(),
        port: Number(form.port),
        username: form.username.trim(),
        version: form.version.trim()
      },
      owners: form.owners.split(',').map(owner => owner.trim()).filter(Boolean),
      behavior: {
        autoSleepAtBase: form.autoSleepAtBase === 'true',
        autoFarmAnimalsDays: Number(form.autoFarmAnimalsDays) || 0
      }
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2600)
  }

  return (
    <div className="config-stack">
      <Panel title="Theme visuel" meta="persistant sur cette machine">
        <ThemeGallery theme={theme} onThemeChange={onThemeChange} />
        <div className="performance-row">
          <div>
            <strong>Mode performance</strong>
            <span>Reduit les particules et effets lourds pour PC faible.</span>
          </div>
          <button className={`toggle ${performanceMode ? 'active' : ''}`} onClick={() => onPerformanceModeChange(!performanceMode)}>
            {performanceMode ? 'active' : 'desactive'}
          </button>
        </div>
      </Panel>

      {!botConnected ? (
        <Panel title="Configuration masquee" meta="hors connexion">
          <div className="locked-panel config-lock">
            <Shield size={36} />
            <strong>Aucune information affichee avant connexion</strong>
            <p>
              Les anciennes valeurs serveur, pseudo et owners restent cachees. Utilise l'assistant de lancement pour entrer une nouvelle configuration, puis connecte le bot pour afficher la configuration active.
            </p>
            <div className="locked-actions">
              <motion.button className="primary-button" type="button" onClick={onOpenSetup} whileTap={{ scale: 0.97 }}>
                <Wand2 size={17} /> Configurer le bot
              </motion.button>
              <motion.button className="glass-button" type="button" onClick={onImportConfig} whileTap={{ scale: 0.97 }}>
                <Upload size={17} /> Importer config
              </motion.button>
            </div>
          </div>
        </Panel>
      ) : (
        <>
      <Panel title="Configuration active" meta="modification locale">
        <form className="config-form" onSubmit={submit}>
          <Field
            label="Adresse serveur"
            value={form.host}
            onChange={value => update('host', value)}
            action={<DetectIpv4Action onDetect={detectHost} />}
          />
          <Field label="Port" value={form.port} onChange={value => update('port', value)} type="number" />
          <Field label="Pseudo bot" value={form.username} onChange={value => update('username', value)} />
          <Field label="Version Minecraft" value={form.version} onChange={value => update('version', value)} />
          <Field label="Owners" value={form.owners} onChange={value => update('owners', value)} wide />
          <div className="field-help wide">
            Owner = ton pseudo Minecraft autorise a donner des ordres au bot. Les autres joueurs seront ignores.
          </div>
          <label className="field">
            <span>Auto sleep</span>
            <select value={form.autoSleepAtBase} onChange={event => update('autoSleepAtBase', event.target.value)}>
              <option value="true">active</option>
              <option value="false">desactive</option>
            </select>
          </label>
          <Field label="Ferme animaux auto (jours)" value={form.autoFarmAnimalsDays} onChange={value => update('autoFarmAnimalsDays', value)} type="number" />
          <div className="form-actions">
            <motion.button className="primary-button" type="submit" whileTap={{ scale: 0.97 }}>
              <Braces size={17} /> Sauvegarder
            </motion.button>
            <motion.button className="glass-button" type="button" onClick={onExportConfig} whileTap={{ scale: 0.97 }}>
              <Download size={17} /> Exporter
            </motion.button>
            <motion.button className="glass-button" type="button" onClick={onImportConfig} whileTap={{ scale: 0.97 }}>
              <Upload size={17} /> Importer
            </motion.button>
                <motion.button className="glass-button" type="button" onClick={onOpenSetup} whileTap={{ scale: 0.97 }}>
                  <Wand2 size={17} /> Modifier config
                </motion.button>
            <AnimatePresence>{saved ? <motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>Configuration sauvegardee.</motion.span> : null}</AnimatePresence>
          </div>
        </form>
      </Panel>

      <Panel title="Profils serveurs" meta={`${settings.serverProfiles?.length || 0} profils`}>
        <div className="profile-editor">
          <div className="profile-list">
            {(settings.serverProfiles || []).map(profile => (
              <div className={`profile-row ${settings.selectedProfileId === profile.id ? 'active' : ''}`} key={profile.id}>
                <div>
                  <strong>{profile.name}</strong>
                  <span>{profile.host}:{profile.port} · {profile.username}</span>
                </div>
                <div className="row-actions">
                  <button onClick={() => onApplyProfile(profile.id)}>Appliquer</button>
                  <button onClick={() => onDeleteProfile(profile.id)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="profile-form">
            <Field label="Nom profil" value={profileDraft.name} onChange={value => setProfileDraft(current => ({ ...current, name: value }))} />
            <Field
              label="Host"
              value={profileDraft.host}
              onChange={value => setProfileDraft(current => ({ ...current, host: value }))}
              action={<DetectIpv4Action onDetect={detectProfileHost} />}
            />
            <Field label="Port" value={profileDraft.port} onChange={value => setProfileDraft(current => ({ ...current, port: value }))} type="number" />
            <Field label="Pseudo bot" value={profileDraft.username} onChange={value => setProfileDraft(current => ({ ...current, username: value }))} />
            <Field label="Version" value={profileDraft.version} onChange={value => setProfileDraft(current => ({ ...current, version: value }))} />
            <Field label="Owners" value={profileDraft.owners} onChange={value => setProfileDraft(current => ({ ...current, owners: value }))} />
            <div className="form-actions">
              <button className="primary-button" onClick={() => onSaveProfile(cleanProfile(profileDraft))}><Save size={16} /> Sauver profil</button>
              <button className="glass-button" onClick={() => onTestConnection({ server: cleanProfile(profileDraft) })}><Wifi size={16} /> Tester</button>
            </div>
          </div>
        </div>
      </Panel>
        </>
      )}
    </div>
  )
}

function blankConfigForm() {
  return {
    host: '',
    port: '',
    username: '',
    version: '1.20.1',
    owners: '',
    autoSleepAtBase: 'false',
    autoFarmAnimalsDays: 3
  }
}

function configPatchFromForm(form) {
  return {
    server: {
      host: form.host.trim(),
      port: Number(form.port),
      username: form.username.trim(),
      version: form.version.trim()
    },
    owners: form.owners.split(',').map(owner => owner.trim()).filter(Boolean),
    behavior: {
      autoSleepAtBase: form.autoSleepAtBase === 'true',
      autoFarmAnimalsDays: Number(form.autoFarmAnimalsDays) || 0
    }
  }
}

function isConnectionFormReady(form) {
  return Boolean(
    form.host.trim() &&
    Number(form.port) > 0 &&
    form.username.trim() &&
    form.version.trim() &&
    form.owners.trim()
  )
}

function formFromConfig(config) {
  const server = config.server || {}
  const behavior = config.behavior || {}
  return {
    host: server.host || '',
    port: server.port || '',
    username: server.username || '',
    version: server.version || '',
    owners: Array.isArray(config.owners) ? config.owners.join(', ') : '',
    autoSleepAtBase: behavior.autoSleepAtBase ? 'true' : 'false',
    autoFarmAnimalsDays: behavior.autoFarmAnimalsDays || 0
  }
}

function profileFromConfig(config) {
  const server = config.server || {}
  return {
    id: `profile-${Date.now()}`,
    name: 'Nouveau profil',
    host: server.host || '',
    port: server.port || '',
    username: server.username || '',
    version: server.version || '',
    owners: Array.isArray(config.owners) ? config.owners.join(', ') : ''
  }
}

function cleanProfile(profile) {
  return {
    ...profile,
    port: Number(profile.port) || 25565,
    owners: String(profile.owners || '').split(',').map(owner => owner.trim()).filter(Boolean)
  }
}

function DetectIpv4Action({ onDetect }) {
  return (
    <button
      className="field-action"
      type="button"
      title="Detecter automatiquement l'IPv4 locale"
      aria-label="Detecter automatiquement l'IPv4 locale"
      onClick={event => {
        event.preventDefault()
        event.stopPropagation()
        onDetect()
      }}
    >
      <MoreHorizontal size={17} />
    </button>
  )
}

function Field({ label, value, onChange, type = 'text', wide = false, action = null }) {
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span className="field-heading">
        <span>{label}</span>
        {action}
      </span>
      <input type={type} value={value} onChange={event => onChange(event.target.value)} />
    </label>
  )
}

function CommandsView({ data, onCopyCommand, onSaveCustomCommands }) {
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState({ label: '', command: '' })
  const categories = data?.commands || []
  const settings = data?.settings || {}
  const customCommands = settings.customCommands || []
  const all = useMemo(() => categories.flatMap(category =>
    category.commands.map(command => ({ ...command, categoryId: category.id, categoryTitle: category.title }))
  ), [categories])
  const filtered = query.trim()
    ? all.filter(command => {
        const needle = query.toLowerCase()
        return command.name.toLowerCase().includes(needle) ||
          command.summary.toLowerCase().includes(needle) ||
          command.categoryTitle.toLowerCase().includes(needle) ||
          String(command.status || '').toLowerCase().includes(needle)
      })
    : all

  function addCustomCommand() {
    if (!draft.label.trim() || !draft.command.trim()) return
    onSaveCustomCommands([
      ...customCommands,
      { id: `custom-${Date.now()}`, label: draft.label.trim(), command: draft.command.trim() }
    ])
    setDraft({ label: '', command: '' })
  }

  function deleteCustomCommand(id) {
    onSaveCustomCommands(customCommands.filter(command => command.id !== id))
  }

  return (
    <div>
      <Panel title="Commandes rapides custom" meta="copie dans le presse-papiers">
        <div className="custom-command-layout">
          <div className="custom-list">
            {customCommands.map(command => (
              <div className="custom-row" key={command.id}>
                <button onClick={() => onCopyCommand(command.command, command.label)}>
                  <Clipboard size={15} />
                  <span>{command.label}</span>
                  <strong>{command.command}</strong>
                </button>
                <button onClick={() => deleteCustomCommand(command.id)}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
          <div className="custom-form">
            <Field label="Nom" value={draft.label} onChange={value => setDraft(current => ({ ...current, label: value }))} />
            <Field label="Commande Minecraft" value={draft.command} onChange={value => setDraft(current => ({ ...current, command: value }))} />
            <button className="primary-button" onClick={addCustomCommand}><Plus size={16} /> Ajouter</button>
          </div>
        </div>
      </Panel>

      <div className="toolbar">
        <div className="search-box">
          <Search size={18} />
          <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Chercher une commande..." />
        </div>
      </div>
      <div className="command-grid">
        {filtered.map((command, index) => {
          const Icon = categoryIcons[command.categoryId] || Terminal
          return (
            <motion.article
              className={`command-card ${command.risk}`}
              key={`${command.categoryId}-${command.name}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.012, 0.35) }}
              whileHover={{ y: -5 }}
            >
              <div className="card-icon"><Icon size={18} /></div>
              {command.status === 'incoming' ? <em className="command-status incoming">Feature incoming</em> : null}
              {command.status === 'beta' ? <em className="command-status beta">Beta</em> : null}
              <strong>{command.name}</strong>
              <p>{command.summary}</p>
              <span>{command.categoryTitle} · {command.status === 'incoming' ? 'a stabiliser' : command.risk}</span>
            </motion.article>
          )
        })}
      </div>
    </div>
  )
}

function BlueprintsView({ data, onOpenFolder }) {
  const blueprints = data?.blueprints || []
  return (
    <div>
      <div className="toolbar">
        <motion.button className="glass-button" onClick={onOpenFolder} whileTap={{ scale: 0.97 }}>
          <FolderOpen size={17} /> Ouvrir le dossier
        </motion.button>
      </div>
      <div className="blueprint-grid">
        {blueprints.map((blueprint, index) => (
          <motion.article
            className="blueprint-card"
            key={blueprint.key}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            whileHover={{ y: -7, rotateX: 1.5 }}
          >
            <div className="blueprint-preview">
              <Layers3 size={38} />
              <span>{blueprint.size.join('x')}</span>
            </div>
            <strong>{blueprint.name}</strong>
            <p>{blueprint.description || 'Modele survival pret a preparer.'}</p>
            <div className="material-row">
              {Object.entries(blueprint.materials || {}).slice(0, 7).map(([name, count]) => (
                <span key={name}>{name}: {count}</span>
              ))}
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  )
}

function LogsView({ data, onRunConsole }) {
  const [command, setCommand] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (!command.trim()) return
    await onRunConsole(command)
    setCommand('')
  }

  return (
    <div className="logs-layout">
      <Panel title="Flux bot" meta={`${data?.bot?.logs?.length || 0} lignes`}>
        <LogStream logs={data?.bot?.logs || []} />
      </Panel>
      <Panel title="Console integree" meta="start, stop, restart, status, test">
        <LogStream logs={data?.console || []} consoleMode compact />
        <form className="console-input" onSubmit={submit}>
          <Terminal size={17} />
          <input value={command} onChange={event => setCommand(event.target.value)} placeholder="Commande console locale..." />
          <button className="primary-button" type="submit">Run</button>
        </form>
      </Panel>
    </div>
  )
}

function LogStream({ logs, compact = false, consoleMode = false }) {
  if (!logs.length) return <pre className={compact ? 'log-stream compact' : 'log-stream'}>Aucun log pour le moment.</pre>
  return (
    <pre className={compact ? 'log-stream compact' : 'log-stream'}>
      {logs.map(log => `[${timeText(log.at)}]${consoleMode && log.level ? ` ${log.level}` : ''} ${log.text}`).join('\n')}
    </pre>
  )
}

function SetupOverlay({ data, theme, performanceMode, onThemeChange, onSave, onClose, onDetectLocalIpv4 }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(() => blankConfigForm())
  const [saving, setSaving] = useState(false)

  function update(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function detectHost() {
    const address = await onDetectLocalIpv4()
    if (address) update('host', address)
  }

  async function finish() {
    setSaving(true)
    await onSave(configPatchFromForm(form))
    setLocalStorageValue('aiko.setup.done', 'true')
    setLocalStorageValue('aiko.onboarding.v2.done', 'true')
    setLocalStorageValue('aiko.onboarding.v3.done', 'true')
    setLocalStorageValue('aiko.onboarding.v4.done', 'true')
    setLocalStorageValue('aiko.config.v1.done', 'true')
    setSaving(false)
    onClose()
  }

  const stepTitle = [
    'Bienvenue dans Aiko Core.',
    'Configure ton bot avant de partir en mission.',
    'Choisis tes preferences de survie.',
    'Choisis une identite visuelle.'
  ][step]
  const connectionReady = isConnectionFormReady(form)

  return (
    <motion.div className="setup-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="setup-modal" initial={{ y: 42, scale: 0.96, filter: 'blur(14px)' }} animate={{ y: 0, scale: 1, filter: 'blur(0px)' }} exit={{ y: 24, scale: 0.98, opacity: 0 }}>
        <button className="setup-close" onClick={onClose} aria-label="Fermer">
          <X size={18} />
        </button>
        <div className="setup-visual">
          <HoloScene disabled={performanceMode} />
          <div className="setup-orbit">FIRST BOOT</div>
        </div>
        <div className="setup-content">
          <span className="system-chip">Assistant de lancement</span>
          <h3>{stepTitle}</h3>
          <p>
            On commence par comprendre ce que fait le bot, puis seulement apres on configure le serveur, les preferences et le theme.
          </p>

          <div className="setup-steps">
            <button className={step === 0 ? 'active' : ''} onClick={() => setStep(0)}>01 Intro</button>
            <button className={step === 1 ? 'active' : ''} onClick={() => setStep(1)}>02 Connexion</button>
            <button className={step === 2 ? 'active' : ''} onClick={() => setStep(2)}>03 Preferences</button>
            <button className={step === 3 ? 'active' : ''} onClick={() => setStep(3)}>04 Theme</button>
          </div>

          <AnimatePresence mode="wait">
            {step === 0 ? (
              <motion.div key="intro" className="intro-grid" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
                <div className="intro-card">
                  <Bot size={22} />
                  <strong>Ce que fait le bot</strong>
                  <p>Il rejoint ton serveur Minecraft, comprend tes commandes chat et peut miner, explorer, deposer, revenir base, suivre le joueur et gerer des missions survival.</p>
                </div>
                <div className="intro-card">
                  <Terminal size={22} />
                  <strong>Comment l'utiliser</strong>
                  <p>Lance le bot depuis l'app, puis parle-lui dans le chat Minecraft. Exemple: status, mine 64 fer, retour base, prepare toi.</p>
                </div>
                <div className="intro-card">
                  <Shield size={22} />
                  <strong>Securite</strong>
                  <p>Le bot n'ecoute que les owners configures. Les tokens et infos sensibles ne sont pas affiches en clair dans l'interface.</p>
                </div>
                <div className="intro-card">
                  <SlidersHorizontal size={22} />
                  <strong>Modifiable apres</strong>
                  <p>Serveurs, owners, themes, performance, profils et commandes rapides peuvent etre changes plus tard dans Configuration.</p>
                </div>
              </motion.div>
            ) : step === 1 ? (
              <motion.div key="connection" className="setup-form" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
                <Field
                  label="Adresse serveur"
                  value={form.host}
                  onChange={value => update('host', value)}
                  action={<DetectIpv4Action onDetect={detectHost} />}
                />
                <Field label="Port" value={form.port} onChange={value => update('port', value)} type="number" />
                <Field label="Pseudo bot" value={form.username} onChange={value => update('username', value)} />
                <Field label="Version" value={form.version} onChange={value => update('version', value)} />
                <Field label="Owners" value={form.owners} onChange={value => update('owners', value)} wide />
                <div className="field-help wide">
                  Owner = le pseudo Minecraft qui peut commander le bot dans le chat. Mets ton pseudo exact.
                </div>
              </motion.div>
            ) : step === 2 ? (
              <motion.div key="preferences" className="setup-form" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
                <label className="field">
                  <span>Auto sleep</span>
                  <select value={form.autoSleepAtBase} onChange={event => update('autoSleepAtBase', event.target.value)}>
                    <option value="true">active</option>
                    <option value="false">desactive</option>
                  </select>
                </label>
                <Field label="Ferme animaux auto (jours)" value={form.autoFarmAnimalsDays} onChange={value => update('autoFarmAnimalsDays', value)} type="number" />
                <div className="setup-note">Sauvegarde automatique active. Tu pourras tout changer plus tard dans Parametres.</div>
              </motion.div>
            ) : (
              <motion.div key="themes" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
                <ThemeGallery theme={theme} onThemeChange={onThemeChange} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="setup-actions">
            {step === 0 ? (
              <motion.button className="primary-button" onClick={() => setStep(1)} whileTap={{ scale: 0.97 }}>
                Commencer
              </motion.button>
            ) : step === 1 ? (
              <motion.button className="primary-button" onClick={() => setStep(2)} disabled={!connectionReady} whileTap={{ scale: 0.97 }}>
                Continuer
              </motion.button>
            ) : step === 2 ? (
              <motion.button className="primary-button" onClick={() => setStep(3)} whileTap={{ scale: 0.97 }}>
                Continuer
              </motion.button>
            ) : (
              <motion.button className="primary-button" onClick={finish} disabled={saving || !connectionReady} whileTap={{ scale: 0.97 }}>
                {saving ? 'Sauvegarde...' : 'Entrer dans Aiko Core'}
              </motion.button>
            )}
            {step > 0 ? (
              <motion.button className="glass-button" onClick={() => setStep(step - 1)} whileTap={{ scale: 0.97 }}>
                Retour
              </motion.button>
            ) : null}
            <motion.button className="glass-button" onClick={onClose} whileTap={{ scale: 0.97 }}>
              Plus tard
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function QuickConfigOverlay({ data, theme, onThemeChange, onSave, onTestConnection, onClose, onDetectLocalIpv4 }) {
  const [form, setForm] = useState(() => blankConfigForm())
  const [saving, setSaving] = useState(false)
  const connectionReady = isConnectionFormReady(form)

  function update(key, value) {
    setForm(current => ({ ...current, [key]: value }))
  }

  async function detectHost() {
    const address = await onDetectLocalIpv4()
    if (address) update('host', address)
  }

  function loadCurrentConfig() {
    setForm(formFromConfig(data?.config || {}))
  }

  async function save() {
    if (!connectionReady) return
    setSaving(true)
    await onSave(configPatchFromForm(form))
    setLocalStorageValue('aiko.setup.done', 'true')
    setLocalStorageValue('aiko.onboarding.v2.done', 'true')
    setLocalStorageValue('aiko.onboarding.v3.done', 'true')
    setLocalStorageValue('aiko.onboarding.v4.done', 'true')
    setLocalStorageValue('aiko.config.v1.done', 'true')
    setSaving(false)
    onClose()
  }

  async function test() {
    if (!connectionReady) return
    await onTestConnection(configPatchFromForm(form))
  }

  return (
    <motion.div className="setup-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="quick-config-modal" initial={{ y: 34, scale: 0.97, filter: 'blur(12px)' }} animate={{ y: 0, scale: 1, filter: 'blur(0px)' }} exit={{ y: 20, scale: 0.98, opacity: 0 }}>
        <button className="setup-close" onClick={onClose} aria-label="Fermer">
          <X size={18} />
        </button>
        <div className="quick-config-hero">
          <span className="system-chip">Configuration rapide</span>
          <h3>Modifier le bot.</h3>
          <p>
            Cette vue sert a reprogrammer le serveur, le pseudo du bot et les owners sans refaire l'introduction complete du premier lancement.
          </p>
        </div>

        <div className="quick-config-content">
          <div className="quick-config-form">
            <Field
              label="Adresse serveur"
              value={form.host}
              onChange={value => update('host', value)}
              action={<DetectIpv4Action onDetect={detectHost} />}
            />
            <Field label="Port" value={form.port} onChange={value => update('port', value)} type="number" />
            <Field label="Pseudo bot" value={form.username} onChange={value => update('username', value)} />
            <Field label="Version Minecraft" value={form.version} onChange={value => update('version', value)} />
            <Field label="Owners" value={form.owners} onChange={value => update('owners', value)} wide />
            <div className="field-help wide">
              Owner = le pseudo Minecraft qui peut donner des ordres au bot dans le chat. Mets plusieurs owners avec des virgules.
            </div>
            <label className="field">
              <span>Auto sleep</span>
              <select value={form.autoSleepAtBase} onChange={event => update('autoSleepAtBase', event.target.value)}>
                <option value="false">desactive</option>
                <option value="true">active</option>
              </select>
            </label>
            <Field label="Ferme animaux auto (jours)" value={form.autoFarmAnimalsDays} onChange={value => update('autoFarmAnimalsDays', value)} type="number" />
          </div>

          <div className="quick-config-side">
            <strong>Theme sombre</strong>
            <ThemeDots theme={theme} onThemeChange={onThemeChange} />
            <div className="setup-note">
              Les champs sont vides pour creer une nouvelle configuration. Tu peux charger la configuration actuelle si tu veux la modifier au lieu de repartir de zero.
            </div>
            <button className="glass-button" type="button" onClick={loadCurrentConfig}>
              Charger config actuelle
            </button>
          </div>
        </div>

        <div className="setup-actions">
          <motion.button className="primary-button" onClick={save} disabled={saving || !connectionReady} whileTap={{ scale: 0.97 }}>
            <Save size={17} /> {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </motion.button>
          <motion.button className="glass-button" onClick={test} disabled={!connectionReady} whileTap={{ scale: 0.97 }}>
            <Wifi size={17} /> Tester
          </motion.button>
          <motion.button className="glass-button" onClick={onClose} whileTap={{ scale: 0.97 }}>
            Fermer
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function App() {
  const [activeView, setActiveView] = useState('dashboard')
  const [data, setData] = useState(null)
  const [booting, setBooting] = useState(true)
  const [theme, setTheme] = useState(() => normalizeTheme(localStorageValue('aiko.theme', 'galaxy')))
  const [performanceMode, setPerformanceMode] = useState(() => localStorageValue('aiko.performance', 'false') === 'true')
  const [setupVisible, setSetupVisible] = useState(false)
  const [setupMode, setSetupMode] = useState('first')
  const firstSetupDismissedRef = useRef(false)
  const [notifications, setNotifications] = useState([])

  function openFirstSetup() {
    setSetupMode('first')
    setSetupVisible(true)
  }

  function openQuickSetup() {
    setSetupMode('quick')
    setSetupVisible(true)
  }

  function closeFirstSetupWithoutSaving() {
    firstSetupDismissedRef.current = true
    setSetupVisible(false)
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    setLocalStorageValue('aiko.theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.dataset.performance = performanceMode ? 'true' : 'false'
    setLocalStorageValue('aiko.performance', performanceMode ? 'true' : 'false')
  }, [performanceMode])

  function notify(title, body, tone = 'info') {
    const id = `${Date.now()}-${Math.random()}`
    setNotifications(current => [...current, { id, title, body, tone }].slice(-4))
    setTimeout(() => {
      setNotifications(current => current.filter(note => note.id !== id))
    }, 4800)
  }

  function dismissNotification(id) {
    setNotifications(current => current.filter(note => note.id !== id))
  }

  const refresh = async () => {
    const next = await window.aikoApp.overview()
    const settingsTheme = normalizeTheme(next.settings?.theme || theme)
    if (settingsTheme !== theme) setTheme(settingsTheme)
    if (typeof next.settings?.performanceMode === 'boolean') setPerformanceMode(next.settings.performanceMode)
    setData(next)
    setBooting(false)
    if (
      localStorageValue('aiko.config.v1.done', 'false') !== 'true' &&
      firstSetupDismissedRef.current !== true
    ) {
      openFirstSetup()
    }
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 5000)
    const offLog = window.aikoApp.onBotLog(log => {
      setData(current => {
        if (!current) return current
        const logs = [...(current.bot?.logs || []), log].slice(-200)
        return { ...current, bot: { ...current.bot, logs } }
      })
    })
    const offStatus = window.aikoApp.onBotStatus(status => {
      setData(current => current ? { ...current, bot: { ...current.bot, ...status } } : current)
    })
    const offConsole = window.aikoApp.onDesktopConsole(entry => {
      setData(current => current ? { ...current, console: [...(current.console || []), entry].slice(-100) } : current)
    })

    return () => {
      clearInterval(interval)
      offLog()
      offStatus()
      offConsole()
    }
  }, [])

  const startBot = async () => {
    const status = await window.aikoApp.startBot()
    setData(current => current ? { ...current, bot: status } : current)
    notify('Bot', 'Demarrage demande.', 'info')
  }

  const stopBot = async () => {
    const status = await window.aikoApp.stopBot()
    setData(current => current ? { ...current, bot: status } : current)
    notify('Bot', 'Arret demande.', 'info')
  }

  const restartBot = async () => {
    const status = await window.aikoApp.restartBot()
    setData(current => current ? { ...current, bot: status } : current)
    notify('Bot', 'Redemarrage demande.', 'info')
  }

  const saveConfig = async (patch, options = {}) => {
    const config = await window.aikoApp.saveConfig(patch)
    setData(current => current ? { ...current, config } : current)
    if (!options.quiet) notify('Configuration', 'Configuration sauvegardee.', 'success')
    return config
  }

  const saveSettings = async patch => {
    const settings = await window.aikoApp.saveSettings(patch)
    setData(current => current ? { ...current, settings } : current)
    return settings
  }

  const changeTheme = async nextTheme => {
    const normalized = normalizeTheme(nextTheme)
    setTheme(normalized)
    await saveSettings({ theme: normalized })
  }

  const changePerformanceMode = async value => {
    setPerformanceMode(value)
    await saveSettings({ performanceMode: value })
    notify('Performance', value ? 'Effets lourds reduits.' : 'Effets visuels complets actives.', 'info')
  }

  const saveProfile = async profile => {
    const settings = await window.aikoApp.saveProfile(profile)
    setData(current => current ? { ...current, settings } : current)
    notify('Profil serveur', 'Profil sauvegarde.', 'success')
  }

  const deleteProfile = async profileId => {
    const settings = await window.aikoApp.deleteProfile(profileId)
    setData(current => current ? { ...current, settings } : current)
    notify('Profil serveur', 'Profil supprime.', 'info')
  }

  const applyProfile = async profileId => {
    const result = await window.aikoApp.applyProfile(profileId)
    setData(current => current ? { ...current, config: result.config, settings: result.settings } : current)
    notify('Profil serveur', 'Profil applique a config.json.', 'success')
  }

  const testConnection = async target => {
    const result = await window.aikoApp.testConnection(target || {})
    notify('Test connexion', result.message, result.ok ? 'success' : 'error')
    return result
  }

  const detectLocalIpv4 = async () => {
    try {
      const result = await window.aikoApp.detectLocalIpv4()
      if (result?.ok && result.address) {
        notify('IPv4 locale', `Adresse detectee: ${result.address}`, 'success')
        return result.address
      }
      notify('IPv4 locale', result?.message || 'Aucune adresse IPv4 locale trouvee.', 'error')
      return ''
    } catch (err) {
      notify('IPv4 locale', err.message || 'Detection impossible.', 'error')
      return ''
    }
  }

  const exportConfig = async () => {
    const result = await window.aikoApp.exportConfig()
    notify('Export config', result.ok ? 'Configuration exportee.' : result.message, result.ok ? 'success' : 'info')
  }

  const importConfig = async () => {
    const result = await window.aikoApp.importConfig()
    if (result.ok) {
      setData(current => current ? { ...current, config: result.config } : current)
      notify('Import config', 'Configuration importee.', 'success')
    } else {
      notify('Import config', result.message, 'error')
    }
  }

  const runConsole = async command => {
    const result = await window.aikoApp.runConsoleCommand(command)
    if (!result.ok) notify('Console', result.message, 'error')
    await refresh()
  }

  const copyCommand = async (command, label = 'Commande') => {
    await navigator.clipboard.writeText(command)
    notify(label, `Copie: ${command}`, 'success')
  }

  const saveCustomCommands = async customCommands => {
    await saveSettings({ customCommands })
    notify('Commandes custom', 'Liste mise a jour.', 'success')
  }

  const target = serverText(data?.config || {})
  const botRunning = Boolean(data?.bot?.running)
  const connected = botIsConnected(data?.bot)

  return (
    <div className="app-root">
      <ShellBackdrop performanceMode={performanceMode} />
      <Sidebar activeView={activeView} setActiveView={setActiveView} botRunning={botRunning} botConnected={connected} target={target} theme={theme} onThemeChange={changeTheme} />
      <main className="workspace">
        <Topbar activeView={activeView} onRefresh={refresh} onStart={startBot} onStop={stopBot} botRunning={botRunning} onOpenSetup={openQuickSetup} />
        <AnimatePresence mode="wait">
          {booting ? (
            <motion.div className="loading" key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="loading-core" />
              <strong>Initialisation Aiko Core</strong>
              <span>Synchronisation locale...</span>
            </motion.div>
          ) : (
            <motion.section
              key={activeView}
              initial={{ opacity: 0, y: 22, filter: 'blur(10px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -14, filter: 'blur(8px)' }}
              transition={{ duration: 0.32, ease: 'easeOut' }}
            >
              {activeView === 'dashboard' && <Dashboard data={data} onCopyCommand={copyCommand} performanceMode={performanceMode} onOpenSetup={openQuickSetup} onStart={startBot} onTestConnection={testConnection} />}
              {activeView === 'bot' && <BotView data={data} onStart={startBot} onStop={stopBot} onRestart={restartBot} onRefresh={refresh} onTestConnection={testConnection} />}
              {activeView === 'config' && <ConfigView data={data} onSave={saveConfig} onSaveSettings={saveSettings} onSaveProfile={saveProfile} onDeleteProfile={deleteProfile} onApplyProfile={applyProfile} onExportConfig={exportConfig} onImportConfig={importConfig} onTestConnection={testConnection} theme={theme} onThemeChange={changeTheme} performanceMode={performanceMode} onPerformanceModeChange={changePerformanceMode} onOpenSetup={openQuickSetup} botConnected={connected} onDetectLocalIpv4={detectLocalIpv4} />}
              {activeView === 'commands' && <CommandsView data={data} onCopyCommand={copyCommand} onSaveCustomCommands={saveCustomCommands} />}
              {activeView === 'blueprints' && <BlueprintsView data={data} onOpenFolder={() => window.aikoApp.openBlueprintFolder()} />}
              {activeView === 'logs' && <LogsView data={data} onRunConsole={runConsole} />}
            </motion.section>
          )}
        </AnimatePresence>
      </main>
      <AnimatePresence>
        {!booting && setupVisible && setupMode === 'first' ? (
          <SetupOverlay
            data={data}
            theme={theme}
            performanceMode={performanceMode}
            onThemeChange={changeTheme}
            onSave={saveConfig}
            onClose={closeFirstSetupWithoutSaving}
            onDetectLocalIpv4={detectLocalIpv4}
          />
        ) : null}
        {!booting && setupVisible && setupMode === 'quick' ? (
          <QuickConfigOverlay
            data={data}
            theme={theme}
            onThemeChange={changeTheme}
            onSave={saveConfig}
            onTestConnection={testConnection}
            onClose={() => setSetupVisible(false)}
            onDetectLocalIpv4={detectLocalIpv4}
          />
        ) : null}
      </AnimatePresence>
      <ToastStack notifications={notifications} dismiss={dismissNotification} />
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
