import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Gauge, Pause, Play, RotateCcw, Shuffle, SkipBack, SkipForward, Sparkles, Zap } from 'lucide-react'
import { algorithmCatalog } from '../data/algorithms'
import { saveExperiment } from '../lib/idb'
import { useAppStore } from '../store/useAppStore'

export function AlgorithmWorkspace() {
  const {
    currentAlgorithmId,
    setScreen,
    completeAlgorithm,
    progress,
    settings,
    updateSettings,
    bubbleSortSteps,
    currentStepIndex,
    isBubbleSortPlaying,
    nextBubbleSortStep,
    previousBubbleSortStep,
    resetBubbleSort,
    randomizeBubbleSort,
    setBubbleSortPlaying,
    startBubbleSort,
    advanceBubbleSort,
  } = useAppStore()
  const algorithm = useMemo(
    () => algorithmCatalog.find((candidate) => candidate.id === currentAlgorithmId) ?? algorithmCatalog[0],
    [currentAlgorithmId],
  )

  const [stepIndex, setStepIndex] = useState(0)
  const [isGenericPlaying, setIsGenericPlaying] = useState(false)
  const [randomizedInputVersion, setRandomizedInputVersion] = useState(0)
  const isBubbleSort = algorithm.id === 'bubble-sort'
  const steps = isBubbleSort ? bubbleSortSteps : algorithm.steps
  const activeStepIndex = isBubbleSort ? currentStepIndex : stepIndex
  const isPlaying = isBubbleSort ? isBubbleSortPlaying : isGenericPlaying
  const completed = activeStepIndex >= steps.length - 1

  const step = steps[Math.min(activeStepIndex, steps.length - 1)]
  const activeLine = algorithm.pseudocode[Math.min(step.line, algorithm.pseudocode.length - 1)]

  useEffect(() => {
    if (!isPlaying) return
    const delay = Math.max(250, 1200 / settings.animationSpeed)
    const timeout = window.setTimeout(() => {
      if (isBubbleSort) {
        advanceBubbleSort()
      } else {
        const nextIndex = Math.min(activeStepIndex + 1, steps.length - 1)
        setStepIndex(nextIndex)
        if (nextIndex >= steps.length - 1) setIsGenericPlaying(false)
      }
    }, delay)

    return () => window.clearTimeout(timeout)
  }, [activeStepIndex, advanceBubbleSort, isBubbleSort, isPlaying, settings.animationSpeed, steps.length])

  useEffect(() => {
    if (completed) {
      completeAlgorithm(algorithm.id)
    }
  }, [algorithm.id, completeAlgorithm, completed])

  const nextStep = () => {
    if (isBubbleSort) {
      nextBubbleSortStep()
      return
    }
    const nextIndex = Math.min(activeStepIndex + 1, steps.length - 1)
    setStepIndex(nextIndex)
    if (nextIndex >= steps.length - 1) setIsGenericPlaying(false)
  }
  const previousStep = () => {
    if (isBubbleSort) {
      previousBubbleSortStep()
      return
    }
    setIsGenericPlaying(false)
    setStepIndex((current) => Math.max(current - 1, 0))
  }
  const resetRun = () => {
    if (isBubbleSort) {
      resetBubbleSort()
    } else {
      setStepIndex(0)
      setIsGenericPlaying(false)
    }
  }

  const randomizeInput = () => {
    if (isBubbleSort) {
      randomizeBubbleSort()
    } else {
      setRandomizedInputVersion((current) => current + 1)
      setStepIndex(0)
      setIsGenericPlaying(false)
    }
  }

  const saveCurrentRun = async () => {
    await saveExperiment({
      id: `${algorithm.id}-${Date.now()}`,
      title: algorithm.title,
      module: algorithm.module,
      timestamp: new Date().toISOString(),
    })
  }

  const visualValues = useMemo(() => {
    const base = step.values ?? [3, 6, 9, 12, 15]
    if (isBubbleSort) return [...base]
    return base.map((value, index) => {
      if (value === null) return null
      const jitter = index === 0 ? (randomizedInputVersion % 3) * 2 : index % 2 === 0 ? (randomizedInputVersion + 1) * 3 : 0
      return value + jitter
    })
  }, [isBubbleSort, randomizedInputVersion, step.values])

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setScreen('dashboard')} className="lab-button ghost small flex items-center gap-2">
              <ArrowLeft size={16} />
              Lab
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-300">Algorithm workspace</p>
              <h1 className="mt-1 text-xl font-semibold text-white">{algorithm.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="lab-button ghost small" aria-label="Save current experiment" onClick={saveCurrentRun}>
              <Sparkles size={16} />
              Save run
            </button>
            <button type="button" className="lab-button small primary" onClick={() => setScreen('dashboard')}>
              Return to lab
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[1.5fr_0.95fr] md:px-8">
        <section className="panel glow min-h-[560px] rounded-3xl border border-cyan-400/20 p-4 md:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.25em] text-cyan-300">{algorithm.module}</p>
              <p className="mt-1 text-sm text-slate-300">{algorithm.dataStructure}</p>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100">
              <Gauge size={14} />
              Step {activeStepIndex + 1} / {steps.length}
              {completed ? <span className="ml-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-emerald-200">Completed</span> : null}
            </div>
          </div>

          <div className="visualization-shell mb-4">
            <RenderVisualizer algorithm={algorithm} step={step} values={visualValues} />
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
            <button
              type="button"
              className="lab-button primary"
              onClick={() => {
                if (isPlaying) {
                  if (isBubbleSort) setBubbleSortPlaying(false)
                  else setIsGenericPlaying(false)
                } else if (completed) {
                  if (isBubbleSort) startBubbleSort()
                  else {
                    setStepIndex(0)
                    setIsGenericPlaying(true)
                  }
                } else if (isBubbleSort) {
                  setBubbleSortPlaying(true)
                } else {
                  setIsGenericPlaying(true)
                }
              }}
              aria-label={isPlaying ? 'Pause algorithm' : 'Play algorithm'}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button type="button" className="lab-button ghost" onClick={previousStep} disabled={activeStepIndex === 0}>
              <SkipBack size={16} />
              Prev
            </button>
            <button type="button" className="lab-button ghost" onClick={nextStep} disabled={completed}>
              <SkipForward size={16} />
              Next
            </button>
            <button type="button" className="lab-button ghost" onClick={resetRun}>
              <RotateCcw size={16} />
              Reset
            </button>
            <button type="button" className="lab-button ghost" onClick={randomizeInput}>
              <Shuffle size={16} />
              Randomize
            </button>
            <label className="ml-auto flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3 py-2 text-xs uppercase tracking-[0.2em] text-slate-300">
              <Zap size={14} />
              <select
                aria-label="Playback speed"
                value={settings.animationSpeed}
                className="bg-transparent text-slate-100 outline-none"
                onChange={(event) => {
                  const value = Number(event.target.value)
                  updateSettings({ animationSpeed: value })
                }}
              >
                <option value={0.75}>0.75x</option>
                <option value={1}>1x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
              </select>
            </label>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="panel rounded-3xl border border-white/10 p-5">
            <p className="text-[10px] uppercase tracking-[0.32em] text-violet-300">Description</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{algorithm.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{algorithm.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-200">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1">{algorithm.dataStructure}</span>
              <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-1">{algorithm.complexity}</span>
            </div>
          </div>

          <div className="panel rounded-3xl border border-white/10 p-5">
            <p className="text-[10px] uppercase tracking-[0.32em] text-emerald-300">Pseudocode</p>
            <div className="mt-4 space-y-2">
              {algorithm.pseudocode.map((line, index) => (
                <div
                  key={`${line}-${index}`}
                  className={`rounded-2xl border px-3 py-2 text-sm transition ${index === step.line ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100' : 'border-white/5 bg-slate-900/70 text-slate-300'}`}
                  data-active-line={index === step.line}
                  aria-current={index === step.line ? 'step' : undefined}
                >
                  <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] text-slate-400">
                    {index + 1}
                  </span>
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div className="panel rounded-3xl border border-white/10 p-5">
            <p className="text-[10px] uppercase tracking-[0.32em] text-amber-300">Live explanation</p>
            <p className="mt-3 text-sm leading-7 text-slate-200">{step.summary}</p>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-3 text-sm text-slate-300">
              Active step: <span className="font-medium text-cyan-300">{activeLine}</span>
            </div>
          </div>

          <div className="panel rounded-3xl border border-white/10 p-5">
            <p className="text-[10px] uppercase tracking-[0.32em] text-pink-300">Progress</p>
            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                  <span>Completion</span>
                  <span>{Math.round(((activeStepIndex + 1) / steps.length) * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500"
                  style={{ width: `${((activeStepIndex + 1) / steps.length) * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">
                <span>Learning time</span>
                <span>{progress.learningMinutes} min</span>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  )
}

function RenderVisualizer({
  algorithm,
  step,
  values,
}: {
  algorithm: (typeof algorithmCatalog)[number]
  step: (typeof algorithmCatalog)[number]['steps'][number]
  values: Array<number | null>
}) {
  if (algorithm.kind === 'array') {
    const max = Math.max(...values.map((value) => value ?? 0), 1)
    return (
      <div className="array-visualizer" role="img" aria-label={`Array: ${values.map((value) => value ?? 'empty').join(', ')}`}>
        {values.map((value, index) => (
          <div key={`${algorithm.id}-value-${index}`} className="array-bar-wrap">
            <span className="array-label">{value ?? '—'}</span>
            <div
              className={`array-bar ${step.active?.includes(index) ? 'active' : ''}`}
              data-array-value={value ?? ''}
              style={{ height: `${((value ?? 0) / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
    )
  }

  if (algorithm.kind === 'stack') {
    return (
      <div className="stack-visualizer">
        {(step.stack ?? []).map((value, index) => (
          <div key={`${algorithm.id}-stack-${index}`} className={`stack-item ${step.active?.includes(index) ? 'active' : ''}`}>
            {value}
          </div>
        ))}
      </div>
    )
  }

  if (algorithm.kind === 'queue') {
    return (
      <div className="queue-visualizer">
        {(step.queue ?? []).map((value, index) => (
          <div key={`${algorithm.id}-queue-${index}`} className={`queue-item ${step.active?.includes(index) ? 'active' : ''}`}>
            {value}
          </div>
        ))}
      </div>
    )
  }

  if (algorithm.kind === 'tree') {
    const treeNodes = step.tree ?? [
      { id: 'root', value: 12, x: 50, y: 15 },
      { id: 'left', value: 7, x: 30, y: 45 },
      { id: 'right', value: 19, x: 70, y: 45 },
    ]

    return (
      <div className="tree-visualizer">
        {treeNodes.map((node, index) => (
          <div
            key={`${algorithm.id}-tree-${node.id}`}
            className={`tree-node ${step.active?.includes(index) ? 'active' : ''}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            {node.value}
          </div>
        ))}
      </div>
    )
  }

  if (algorithm.kind === 'graph') {
    const nodes = step.graph ?? []
    return (
      <div className="graph-visualizer">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="graph-svg">
          {(step.edges ?? []).map(([from, to], index) => {
            const fromNode = nodes.find((item) => item.id === from)
            const toNode = nodes.find((item) => item.id === to)
            if (!fromNode || !toNode) return null
            return (
              <line
                key={`${algorithm.id}-edge-${index}`}
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke="rgba(103, 232, 249, 0.7)"
                strokeWidth="1.2"
              />
            )
          })}
        </svg>
        {nodes.map((node, index) => (
          <div
            key={`${algorithm.id}-graph-${node.id}`}
            className={`graph-node ${step.active?.includes(index) ? 'active' : ''}`}
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            {node.id}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="hash-visualizer">
      {values.map((value, index) => (
        <div key={`${algorithm.id}-hash-${index}`} className={`hash-bucket ${step.active?.includes(index) ? 'active' : ''}`}>
          {value ?? '—'}
        </div>
      ))}
    </div>
  )
}
