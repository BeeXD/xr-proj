import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Compass,
  Database,
  DatabaseZap,
  Gauge,
  Layers3,
  Link2,
  Menu,
  Network,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trophy,
  TreeDeciduous,
  Wand2,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { lazy, Suspense, useEffect, useState } from 'react'
import { stationCards } from './data/algorithms'
import { algorithmsForStation, getAlgorithmDefinition } from './lib/execution'
import { loadExperiments } from './lib/idb'
import { getCurrentTheme, useAppStore } from './store/useAppStore'

const StationWorkspace = lazy(() => import('./components/StationWorkspace').then(({ StationWorkspace }) => ({ default: StationWorkspace })))
const LabScene = lazy(() => import('./components/LabScene').then(({ LabScene }) => ({ default: LabScene })))

const featureCards = [
  { title: 'Interactive 3D visualizations', description: 'Explore floating data structures in a futuristic lab', icon: Compass },
  { title: 'Step-by-step algorithms', description: 'Trace complex logic with synchronized narration and highlights', icon: Wand2 },
  { title: 'Progress tracking', description: 'Persist milestones, streaks, and recent learning activity locally', icon: BarChart3 },
  { title: 'Local-first learning', description: 'Everything remains browser-based and resilient across reloads', icon: DatabaseZap },
]

const legacyAlgorithmIds: Record<string, string> = {
  'binary-search': 'search.binary',
  'bubble-sort': 'sort.bubble',
  'tree-traversal': 'tree.inorder',
}

function App() {
  const {
    screen,
    currentAlgorithmId,
    settings,
    settingsOpen,
    openSettings,
    updateSettings,
    setScreen,
    resetProgress,
    progress,
    selectStation,
  } = useAppStore()

  const [savedExperiments, setSavedExperiments] = useState<{ title: string; module: string }[]>([])
  const [experimentLoadError, setExperimentLoadError] = useState('')

  useEffect(() => {
    document.documentElement.dataset.theme = getCurrentTheme()
  }, [settings.theme])

  useEffect(() => {
    if (screen !== 'dashboard') return
    let cancelled = false
    loadExperiments()
      .then((items) => {
        if (cancelled) return
        setSavedExperiments([...items].sort((left, right) => right.timestamp.localeCompare(left.timestamp)).slice(0, 4))
        setExperimentLoadError('')
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setSavedExperiments([])
        setExperimentLoadError(error instanceof Error ? error.message : 'Saved experiments could not be loaded.')
      })
    return () => { cancelled = true }
  }, [screen])

  if (screen === 'workspace') {
    return (
      <Suspense fallback={<div className="p-8 text-space-muted" role="status">Loading workspace…</div>}>
        <StationWorkspace key={currentAlgorithmId} />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AnimatePresence mode="wait">
        {screen === 'welcome' ? (
          <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <WelcomeView
              progress={progress}
              reducedMotion={settings.reducedMotion}
              onEnter={() => setScreen('dashboard')}
              onContinue={() => setScreen('dashboard')}
              hasProgress={progress.completedAlgorithms.length > 0}
            />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={settings.reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={settings.reducedMotion ? { duration: 0 } : undefined}
          >
            <DashboardView
              savedExperiments={savedExperiments}
              experimentLoadError={experimentLoadError}
              settings={settings}
              isSettingsOpen={settingsOpen}
              onOpenSettings={() => openSettings(true)}
              onCloseSettings={() => openSettings(false)}
              onUpdateSettings={updateSettings}
              onResetProgress={() => {
                if (window.confirm('Reset all progress and local learning history?')) {
                  resetProgress()
                }
              }}
              onSelectStation={selectStation}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function WelcomeView({
  progress,
  reducedMotion,
  onEnter,
  onContinue,
  hasProgress,
}: {
  progress: { completedAlgorithms: string[]; learningMinutes: number; streak: number }
  reducedMotion: boolean
  onEnter: () => void
  onContinue: () => void
  hasProgress: boolean
}) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.15),_transparent_30%)]" />
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-5 md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/10 text-cyan-200 shadow-[0_0_20px_rgba(34,211,238,0.4)]">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-cyan-300">XR lab</p>
            <h1 className="mt-1 text-lg font-semibold text-white">AlgoSpace XR</h1>
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex max-w-7xl flex-col gap-12 px-4 pb-16 pt-8 md:px-8 lg:flex-row lg:items-center lg:justify-between">
        <section className="max-w-xl space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs uppercase tracking-[0.3em] text-violet-200">
            <ShieldCheck size={12} />
            Local-first DSA lab
          </div>

          <div className="space-y-5">
            <h2 className="text-5xl font-black tracking-tight text-white md:text-6xl">
              Learn <span className="text-cyan-300">data structures</span> in a living lab.
            </h2>
            <p className="max-w-lg text-lg leading-8 text-slate-300">
              Explore arrays, graphs, queues, trees, and hash tables in an immersive browser laboratory designed for confident, visual learning.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={onEnter} className="lab-button primary">
              Enter the Laboratory
              <ArrowRight size={18} />
            </button>
            {hasProgress ? (
              <button type="button" onClick={onContinue} className="lab-button ghost">
                Continue Learning
              </button>
            ) : null}
          </div>

          <div className="grid max-w-lg grid-cols-3 gap-3 text-left">
            <div className="panel rounded-2xl border border-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Modules</p>
              <p className="mt-2 text-2xl font-bold text-white">7</p>
            </div>
            <div className="panel rounded-2xl border border-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Streak</p>
              <p className="mt-2 text-2xl font-bold text-emerald-300">{progress.streak}</p>
            </div>
            <div className="panel rounded-2xl border border-white/10 p-3">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Minutes</p>
              <p className="mt-2 text-2xl font-bold text-cyan-300">{progress.learningMinutes}</p>
            </div>
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative w-full max-w-2xl"
        >
          <div className="panel overflow-hidden rounded-[2rem] border border-cyan-400/20 p-3 shadow-[0_0_40px_rgba(34,211,238,0.15)]">
            <div className="rounded-[1.5rem] bg-slate-900/90 p-2">
              <Suspense fallback={<div className="lab-scene" aria-label="Loading 3D scene" aria-busy="true" />}>
                <LabScene reducedMotion={reducedMotion} />
              </Suspense>
            </div>
          </div>
        </motion.section>
      </main>

      <section className="relative mx-auto max-w-7xl px-4 pb-12 md:px-8">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map(({ title, description, icon: Icon }) => (
            <div key={title} className="panel rounded-3xl border border-white/10 p-5">
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-500/10 text-cyan-300">
                <Icon size={20} />
              </div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function DashboardView({
  settings,
  isSettingsOpen,
  onOpenSettings,
  onCloseSettings,
  onUpdateSettings,
  onResetProgress,
  onSelectStation,
  savedExperiments,
  experimentLoadError,
}: {
  settings: { theme: 'dark' | 'light' | 'system'; reducedMotion: boolean; animationSpeed: number; cameraSensitivity: number; showHints: boolean }
  isSettingsOpen: boolean
  onOpenSettings: () => void
  onCloseSettings: () => void
  onUpdateSettings: (updates: Partial<typeof settings>) => void
  onResetProgress: () => void
  onSelectStation: (id: string) => void
  savedExperiments: { title: string; module: string }[]
  experimentLoadError: string
}) {
  const { progress } = useAppStore()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const completedModules = new Set(
    progress.completedAlgorithms
      .map((id) => {
        const algorithm = getAlgorithmDefinition(id) ?? getAlgorithmDefinition(legacyAlgorithmIds[id])
        return stationCards.find((station) => station.id === algorithm?.stationId)?.title
      })
      .filter((module): module is string => Boolean(module)),
  ).size
  const hasAchievement = progress.completedAlgorithms.includes('binary-search') || progress.completedAlgorithms.includes('search.binary')

  const goTo = (section: string) => {
    document.getElementById(section)?.scrollIntoView({ behavior: settings.reducedMotion ? 'instant' : 'smooth' })
    setMobileMenuOpen(false)
  }

  return (
    <div className={`relative min-h-screen px-4 py-4 text-space-text md:px-8 md:py-6 ${settings.reducedMotion ? 'reduced-motion' : ''}`}>
      <header className="nav-shell mx-auto mb-6 flex max-w-7xl items-center justify-between gap-3 rounded-2xl px-4 py-3 md:rounded-full md:px-5">
        <button type="button" onClick={() => goTo('dashboard-overview')} className="flex min-h-11 items-center gap-3 text-left">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-space-cyan/25 bg-space-cyan/10 text-space-cyan">
            <Sparkles size={18} />
          </span>
          <span>
            <span className="block text-[10px] uppercase tracking-[0.38em] text-space-cyan">XR lab</span>
            <span className="block text-base font-bold leading-5 text-white">AlgoSpace XR</span>
          </span>
        </button>

        <nav aria-label="Main navigation" className="hidden items-center gap-1 md:flex">
          <button type="button" onClick={() => goTo('dashboard-overview')} className="nav-link active">Dashboard</button>
          <button type="button" onClick={() => goTo('stations')} className="nav-link">Stations</button>
          <button type="button" onClick={() => goTo('progress')} className="nav-link">Progress</button>
        </nav>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onOpenSettings} className="lab-button ghost min-h-11 small">
            <Settings2 size={16} />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="lab-button ghost min-h-11 min-w-11 p-0 md:hidden"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <nav aria-label="Mobile navigation" className="mobile-nav md:hidden">
            <button type="button" onClick={() => goTo('dashboard-overview')} className="nav-link active">Dashboard</button>
            <button type="button" onClick={() => goTo('stations')} className="nav-link">Stations</button>
            <button type="button" onClick={() => goTo('progress')} className="nav-link">Progress</button>
          </nav>
        ) : null}
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,1.85fr)_minmax(300px,1fr)] lg:gap-6">
        <section id="dashboard-overview" className="min-w-0 space-y-5">
          <section className="panel hero-panel rounded-3xl p-4 sm:p-6 lg:p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0">
                <Eyebrow color="cyan">Laboratory</Eyebrow>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Virtual DSA environment</h1>
              </div>
              <button type="button" className="lab-button primary min-h-11 shrink-0" onClick={() => onSelectStation('arrays')}>
                Open module
                <ArrowRight size={16} />
              </button>
            </div>
            <div className="scene-frame overflow-hidden rounded-2xl">
              <Suspense fallback={<div className="lab-scene" aria-label="Loading 3D scene" aria-busy="true" />}>
                <LabScene reducedMotion={settings.reducedMotion} cameraSensitivity={settings.cameraSensitivity} />
              </Suspense>
              <div className="scene-caption">
                <span className="inline-flex items-center gap-2"><span className="live-dot" /> Interactive environment</span>
                <span className="hidden sm:inline">Drag to explore</span>
              </div>
            </div>
          </section>

          <section id="stations" aria-labelledby="stations-heading" className="scroll-mt-6">
            <div className="mb-4 flex items-end justify-between gap-3 px-1">
              <div>
                <Eyebrow color="violet">Choose your next experiment</Eyebrow>
                <h2 id="stations-heading" className="mt-1 text-xl font-bold text-white">Learning stations</h2>
              </div>
              <span className="hidden text-xs text-space-muted sm:inline">{stationCards.length} stations</span>
            </div>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {stationCards.map((station) => {
                const readiness = algorithmsForStation(station.id).length > 0 ? 'READY' : 'COMING SOON'
                const StationIcon = stationIcons[station.id] ?? Database

                return (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => onSelectStation(station.id)}
                    className={`station-tile station-${station.accent} group min-w-0 rounded-3xl p-5 text-left`}
                  >
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <span className="station-icon flex h-11 w-11 items-center justify-center rounded-2xl">
                        <StationIcon size={19} strokeWidth={1.8} />
                      </span>
                      <StatusBadge>{readiness}</StatusBadge>
                    </div>
                    <h3 className="text-lg font-semibold text-white">{station.title}</h3>
                    <p className="mt-2 min-h-[4.5rem] text-sm leading-6 text-space-muted">{station.description}</p>
                    <span className="mt-4 flex items-center justify-between text-sm font-semibold text-space-cyan">
                      Explore station
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        </section>

        <aside id="progress" aria-label="Learning progress and actions" className="min-w-0 space-y-4 scroll-mt-6">
          <details className="panel rounded-3xl p-5 sm:p-6" open>
            <summary className="sidebar-summary">
              <span>
                <Eyebrow color="violet">Your progress</Eyebrow>
                <span className="mt-1 block text-lg font-bold text-white">Learning overview</span>
              </span>
              <span className="collapse-indicator" aria-hidden="true">⌄</span>
            </summary>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              <MetricCard icon={CheckCircle2} label="Completed modules" value={completedModules} accent="cyan" />
              <MetricCard icon={Gauge} label="Learning time" value={`${progress.learningMinutes} min`} accent="violet" />
              <MetricCard icon={Sparkles} label="Current streak" value={`${progress.streak} days`} accent="mint" />
            </div>
            <div className={`achievement-card mt-4 rounded-2xl p-4 ${hasAchievement ? 'unlocked' : ''}`}>
              <div className="flex items-center gap-2 text-amber-200">
                <Trophy size={17} />
                <span className="text-sm font-semibold">{hasAchievement ? 'Achievement unlocked' : 'Next achievement'}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-amber-100/85">
                {hasAchievement ? 'Binary Search champion — complete a focused search experiment.' : 'Complete Binary Search to earn your first badge.'}
              </p>
            </div>
          </details>

          <details className="panel rounded-3xl p-5 sm:p-6" open>
            <summary className="sidebar-summary">
              <span>
                <Eyebrow color="mint">Local library</Eyebrow>
                <span className="mt-1 block text-lg font-bold text-white">Saved experiments</span>
              </span>
              <span className="collapse-indicator" aria-hidden="true">⌄</span>
            </summary>
            <div className="mt-4 space-y-2">
              {experimentLoadError ? (
                <p className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200" role="alert">
                  Saved experiments are unavailable: {experimentLoadError}
                </p>
              ) : savedExperiments.length > 0 ? (
                savedExperiments.map((item, index) => (
                  <div key={`${item.title}-${index}`} className="saved-experiment">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-space-cyan/10 text-space-cyan"><DatabaseZap size={16} /></span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-white">{item.title}</span>
                      <span className="mt-0.5 block truncate text-xs text-space-muted">{item.module}</span>
                    </span>
                  </div>
                ))
              ) : (
                <div className="empty-experiments rounded-2xl px-4 py-5 text-sm text-space-muted">
                  No experiments saved yet. Save a run from any algorithm workspace.
                </div>
              )}
            </div>
          </details>

          <details className="panel rounded-3xl p-5 sm:p-6" open>
            <summary className="sidebar-summary">
              <span>
                <Eyebrow color="pink">At a glance</Eyebrow>
                <span className="mt-1 block text-lg font-bold text-white">Quick actions</span>
              </span>
              <span className="collapse-indicator" aria-hidden="true">⌄</span>
            </summary>
            <div className="mt-4 flex flex-col gap-2">
              <button type="button" className="action-row" onClick={onResetProgress}>
                <span className="flex items-center gap-3"><span className="action-icon pink"><Gauge size={16} /></span>Reset learning progress</span>
                <ArrowRight size={15} />
              </button>
              <button type="button" className="action-row" onClick={() => setHelpOpen(true)}>
                <span className="flex items-center gap-3"><span className="action-icon violet"><Compass size={16} /></span>View help guide</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </details>
        </aside>
      </main>

      {isSettingsOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCloseSettings() }}>
          <div role="dialog" aria-modal="true" aria-labelledby="settings-heading" className="modal-panel">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <Eyebrow color="cyan">Settings</Eyebrow>
                <h2 id="settings-heading" className="mt-2 text-2xl font-semibold text-white">Laboratory preferences</h2>
              </div>
              <button type="button" onClick={onCloseSettings} className="lab-button ghost small">Close</button>
            </div>

            <div className="space-y-5 text-sm">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                <span className="text-slate-300">Theme</span>
                <select
                  className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none"
                  value={settings.theme}
                  onChange={(event) => onUpdateSettings({ theme: event.target.value as 'dark' | 'light' | 'system' })}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                <span className="text-slate-300">Reduced motion</span>
                <input
                  type="checkbox"
                  checked={settings.reducedMotion}
                  onChange={(event) => onUpdateSettings({ reducedMotion: event.target.checked })}
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                <div className="mb-2 flex items-center justify-between text-slate-300">
                  <span>Animation speed</span>
                  <span>{settings.animationSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={settings.animationSpeed}
                  onChange={(event) => onUpdateSettings({ animationSpeed: Number(event.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                <div className="mb-2 flex items-center justify-between text-slate-300">
                  <span>Camera sensitivity</span>
                  <span>{settings.cameraSensitivity.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={settings.cameraSensitivity}
                  onChange={(event) => onUpdateSettings({ cameraSensitivity: Number(event.target.value) })}
                  className="w-full accent-violet-400"
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/70 p-3">
                <span className="text-slate-300">Show hints</span>
                <input
                  type="checkbox"
                  checked={settings.showHints}
                  onChange={(event) => onUpdateSettings({ showHints: event.target.checked })}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {helpOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHelpOpen(false) }}>
          <div role="dialog" aria-modal="true" aria-labelledby="help-heading" className="modal-panel">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Eyebrow color="violet">Quick guide</Eyebrow>
                <h2 id="help-heading" className="mt-2 text-2xl font-semibold text-white">Explore the laboratory</h2>
              </div>
              <button type="button" onClick={() => setHelpOpen(false)} className="lab-button ghost small">Close</button>
            </div>
            <ol className="space-y-3 text-sm leading-6 text-space-muted">
              <li><strong className="text-white">1. Choose a station.</strong> Open a data structure from the learning station cards.</li>
              <li><strong className="text-white">2. Run the algorithm.</strong> Play, step through, or adjust speed in its workspace.</li>
              <li><strong className="text-white">3. Save your experiment.</strong> Your local experiment history and settings stay in this browser.</li>
            </ol>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const stationIcons: Record<string, LucideIcon> = {
  arrays: Layers3,
  'linked-lists': Link2,
  stacks: Layers3,
  trees: TreeDeciduous,
  graphs: Network,
  hashes: DatabaseZap,
  searching: Search,
}

function Eyebrow({ children, color }: { children: React.ReactNode; color: 'cyan' | 'violet' | 'mint' | 'pink' }) {
  return <p className={`eyebrow eyebrow-${color}`}>{children}</p>
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return <span className="status-badge"><span className="status-dot" />{children}</span>
}

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof CheckCircle2
  label: string
  value: string | number
  accent: 'cyan' | 'violet' | 'mint'
}) {
  return (
    <div className="metric-card">
      <span className={`metric-icon ${accent}`}><Icon size={16} /></span>
      <span className="min-w-0">
        <span className="block text-xs leading-5 text-space-muted">{label}</span>
        <span className={`mt-1 block truncate text-xl font-bold metric-value-${accent}`}>{value}</span>
      </span>
    </div>
  )
}

export default App
