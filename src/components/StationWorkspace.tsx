import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Pause, Play, RotateCcw, Shuffle, SkipBack, SkipForward } from 'lucide-react'
import {
  algorithmsForStation,
  currentSnapshot,
  getAlgorithmDefinition,
  type DsaState,
} from '../lib/execution'
import { stationCards, stationOperations } from '../data/stations'
import { useAppStore } from '../store/useAppStore'

const AlgorithmLabScene = lazy(() => import('./AlgorithmLabScene').then(({ AlgorithmLabScene }) => ({ default: AlgorithmLabScene })))

function stationTitle(stationId: string) {
  return stationCards.find((station) => station.id === stationId)?.title ?? 'DSA Station'
}

export function StationWorkspace() {
  const {
    activeStationId,
    currentAlgorithmId,
    executionInput,
    executionIndex,
    executionSession,
    settings,
    setExecutionInput,
    setExecutionIndex,
    setExecutionPlaying,
    setScreen,
    completeAlgorithm,
    advanceExecution,
    previousExecution,
    resetExecution,
    randomizeExecution,
    runStationAlgorithm,
    setArrayValues,
    setExecutionCapacity,
  } = useAppStore()
  const definition = getAlgorithmDefinition(currentAlgorithmId)
  if (!definition) throw new Error(`Workspace algorithm ${currentAlgorithmId} is not registered.`)
  const snapshot = currentSnapshot(executionSession)
  const [inputError, setInputError] = useState('')
  const [inputDraft, setInputDraft] = useState(String(executionInput))
  // The value can also change outside this box (clicking an element in 3D, the VR keypad); keep partial typing like "4." intact.
  const [syncedInput, setSyncedInput] = useState(executionInput)
  if (syncedInput !== executionInput) {
    setSyncedInput(executionInput)
    if (!inputDraft.trim() || Number(inputDraft) !== executionInput) setInputDraft(String(executionInput))
  }
  const operationLog = useMemo(
    () => executionSession.steps
      .slice(0, executionSession.currentStepIndex + 1)
      .map((step, index) => ({ step, index }))
      .slice(-6)
      .reverse(),
    [executionSession.currentStepIndex, executionSession.steps],
  )

  useEffect(() => {
    if (executionSession.status !== 'playing') return
    const delay = Math.max(150, 1200 / settings.animationSpeed)
    const timer = window.setTimeout(advanceExecution, delay)
    return () => window.clearTimeout(timer)
  }, [advanceExecution, currentAlgorithmId, executionSession.currentStepIndex, executionSession.status, executionSession.steps.length, settings.animationSpeed])

  const runOperation = (id: string) => {
    try {
      const requiresNumber = /^(array\.(insert|delete|access)|search\.|stack\.push|queue\.enqueue|list\.(insert-head|insert-tail|insert-index|delete|search)|tree\.(insert|search)|hash\.|graph\.add-edge)/.test(id)
      if (requiresNumber && (!inputDraft.trim() || !Number.isFinite(Number(inputDraft)))) {
        throw new RangeError('Enter a valid finite number for this operation.')
      }
      runStationAlgorithm(id)
      setInputError('')
    } catch (error) {
      setInputError(error instanceof Error ? error.message : 'Unable to run this operation.')
    }
  }
  const applyArray = (draft: string) => {
    const entries = draft.trim() ? draft.split(',').map((entry) => entry.trim()) : []
    const values = entries.map(Number)
    try {
      if (entries.some((entry) => !entry)) throw new RangeError('Every array value must be a number.')
      setArrayValues(values)
      setInputError('')
    } catch (error) {
      setInputError(error instanceof Error ? error.message : 'Enter a valid comma-separated array.')
    }
  }
  const updateInputDraft = (value: string) => {
    setInputDraft(value)
    if (value.trim() && Number.isFinite(Number(value))) setExecutionInput(Number(value))
  }
  const stationAlgorithms = algorithmsForStation(activeStationId)
  const operations = stationOperations[snapshot.kind === 'queue' ? 'queues' : activeStationId] ?? []
  const currentStep = executionSession.steps[executionSession.currentStepIndex]
  const activeLine = Math.min(currentStep.pseudocodeLine, definition.pseudocode.length - 1)
  const isPlaying = executionSession.status === 'playing'
  const isCompleted = executionSession.status === 'completed' || executionSession.status === 'error'
  const displayStep = executionSession.currentStepIndex + 1
  const totalSteps = executionSession.steps.length
  const progress = Math.round((displayStep / totalSteps) * 100)

  useEffect(() => {
    if (executionSession.status === 'completed') completeAlgorithm(currentAlgorithmId)
  }, [completeAlgorithm, currentAlgorithmId, executionSession.status])

  return (
    <main className="min-h-screen bg-space-bg px-4 pb-10 text-space-text sm:px-6">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 border-b border-space-line py-4">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={() => setScreen('dashboard')} className="lab-button ghost small" aria-label="Back to dashboard">
            <ArrowLeft size={16} /> Lab
          </button>
          <div className="min-w-0">
            <p className="eyebrow eyebrow-cyan">Interactive station · {stationTitle(activeStationId)}</p>
            <h1 className="truncate text-lg font-bold text-white sm:text-xl">{definition.title}</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 py-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
        <section className="min-w-0 space-y-5">
          <div className="panel rounded-3xl p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <label className="grid max-w-lg flex-1 gap-2 text-xs font-semibold uppercase tracking-wider text-space-muted">
                Algorithm
                <select
                  aria-label="Algorithm"
                  className="min-h-11 rounded-xl border border-space-line bg-space-panel-raised px-3 text-sm font-medium normal-case tracking-normal text-white outline-none focus:border-space-cyan"
                  value={currentAlgorithmId}
                  onChange={(event) => runOperation(event.target.value)}
                >
                  {stationAlgorithms.map((algorithm) => <option key={algorithm.id} value={algorithm.id}>{algorithm.title}</option>)}
                </select>
              </label>
              <div className="text-right text-xs text-space-muted">
                <span className="block text-[10px] uppercase tracking-[0.2em]">Complexity</span>
                <strong className="mt-1 inline-block text-sm text-space-mint">{definition.complexity}</strong>
              </div>
            </div>

            {snapshot.kind === 'array' && (
              <ArrayEditor key={JSON.stringify(executionSession.initialState)} initialValues={(executionSession.initialState as Extract<DsaState, { kind: 'array' }>).values} onApply={applyArray} />
            )}

            <Suspense fallback={<DataStructureView state={snapshot} reducedMotion={settings.reducedMotion} />}>
              <AlgorithmLabScene
                key={activeStationId}
                state={snapshot}
                previousState={executionSession.steps[executionSession.currentStepIndex - 1]?.state}
                title={definition.title}
                description={currentStep.description}
                operation={snapshot.kind === 'stack' || snapshot.kind === 'queue' ? snapshot.operation : currentStep.operation}
                stepId={currentStep.id}
                reducedMotion={settings.reducedMotion}
                fallback={<DataStructureView state={snapshot} reducedMotion={settings.reducedMotion} />}
              />
            </Suspense>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button type="button" className="lab-button primary min-h-11" aria-label={isPlaying ? 'Pause algorithm' : 'Play algorithm'} onClick={() => setExecutionPlaying(!isPlaying)}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} />} {isPlaying ? 'Pause' : 'Play'}
              </button>
              <button type="button" className="lab-button ghost min-h-11" aria-label="Previous step" onClick={previousExecution} disabled={executionSession.currentStepIndex === 0}><SkipBack size={16} /> Prev</button>
              <button type="button" className="lab-button ghost min-h-11" aria-label="Next step" onClick={advanceExecution} disabled={isCompleted || executionSession.currentStepIndex >= totalSteps - 1}><SkipForward size={16} /> Next</button>
              <button type="button" className="lab-button ghost min-h-11" onClick={resetExecution}><RotateCcw size={16} /> Reset</button>
              <button type="button" className="lab-button ghost min-h-11" onClick={randomizeExecution}><Shuffle size={16} /> Randomize</button>
              <label className="ml-auto grid min-w-36 gap-1 text-xs text-space-muted">
                Playback speed
                <select aria-label="Playback speed" className="min-h-10 rounded-xl border border-space-line bg-space-panel-raised px-3 text-sm text-white" value={settings.animationSpeed} onChange={(event) => useAppStore.getState().updateSettings({ animationSpeed: Number(event.target.value) })}>
                  <option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option>
                </select>
              </label>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800" role="progressbar" aria-label="Execution progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
              <div className="h-full rounded-full bg-space-cyan transition-[width]" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-space-muted" aria-live="polite">
              <span>Step {displayStep} / {totalSteps}</span>
              <span className={executionSession.status === 'error' ? 'text-rose-300' : isCompleted ? 'text-space-mint' : 'text-space-cyan'}>
                {executionSession.status === 'error' ? 'Error' : isCompleted ? 'Completed' : executionSession.status === 'playing' ? 'Playing' : executionSession.status === 'idle' ? 'Ready' : 'Paused'}
              </span>
            </div>
          </div>

          <section className="panel rounded-3xl p-4 sm:p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-space-violet">{snapshot.kind === 'stack' ? 'Stack operations' : snapshot.kind === 'queue' ? 'Queue operations' : 'Operation input'}</h2>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <label className="grid min-w-36 gap-1 text-xs text-space-muted">Value / target / index
                <input aria-label="Numeric value" type="number" value={inputDraft} onChange={(event) => updateInputDraft(event.target.value)} className="min-h-11 rounded-xl border border-space-line bg-space-panel-raised px-3 text-white" />
              </label>
              {snapshot.kind === 'list' && (
                <label className="grid min-w-28 gap-1 text-xs text-space-muted">Insert index
                  <input aria-label="Insert index" type="number" min={0} value={executionIndex} onChange={(event) => setExecutionIndex(Number(event.target.value))} className="min-h-11 rounded-xl border border-space-line bg-space-panel-raised px-3 text-white" />
                </label>
              )}
              {(snapshot.kind === 'stack' || snapshot.kind === 'queue') && (
                <label className="grid min-w-28 gap-1 text-xs text-space-muted">Capacity
                  <input aria-label="Capacity" type="number" min={1} max={20} value={snapshot.capacity} onChange={(event) => {
                    try { setExecutionCapacity(Number(event.target.value)); setInputError('') }
                    catch (error) { setInputError(error instanceof Error ? error.message : 'Invalid capacity.') }
                  }} className="min-h-11 rounded-xl border border-space-line bg-space-panel-raised px-3 text-white" />
                </label>
              )}
              <div className="flex flex-1 flex-wrap gap-2">
                {operations.map(({ id, label }) => (
                  <button key={id} type="button" className="lab-button ghost min-h-11" onClick={() => runOperation(id)}>{label}</button>
                ))}
              </div>
            </div>
          </section>
        </section>

        <aside className="min-w-0 space-y-5">
          <section className="panel rounded-3xl p-5">
            <p className="eyebrow eyebrow-violet">Live explanation</p>
            <p className="mt-3 text-sm leading-6 text-space-text" aria-live="polite">{currentStep.description}</p>
            {snapshot.kind === 'stack' || snapshot.kind === 'queue' ? (
              <div className={`mt-4 rounded-xl border px-3 py-2 text-sm ${snapshot.operation === 'overflow' || snapshot.operation === 'underflow' ? 'border-rose-400/40 bg-rose-400/10 text-rose-200' : 'border-space-line bg-slate-950/50 text-space-cyan'}`} role="status">
                {snapshot.message ?? 'Ready for an operation.'}
              </div>
            ) : null}
          </section>

          <section className="panel rounded-3xl p-5">
            <p className="eyebrow eyebrow-cyan">Pseudocode</p>
            <ol className="mt-4 space-y-2 font-mono text-xs leading-5">
              {definition.pseudocode.map((line, index) => (
                <li key={`${index}-${line}`} data-active-line={index === activeLine ? 'true' : 'false'} aria-current={index === activeLine ? 'step' : undefined} className={`rounded-lg px-3 py-2 ${index === activeLine ? 'border border-space-cyan/30 bg-cyan-400/10 text-cyan-100' : 'text-space-muted'}`}>
                  <span className="mr-3 text-slate-600">{String(index + 1).padStart(2, '0')}</span>{line}
                </li>
              ))}
            </ol>
          </section>

          <section className="panel rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <p className="eyebrow eyebrow-mint">Operation log</p>
              {(snapshot.kind === 'stack' || snapshot.kind === 'queue') && <span className="text-xs text-space-muted">{snapshot.kind === 'stack' ? 'Stack size' : 'Queue size'}: {snapshot.values.length} / {snapshot.capacity}</span>}
            </div>
            {snapshot.kind === 'stack' && <p className="mt-3 text-sm text-space-muted">Top value: <strong className="text-space-cyan">{snapshot.values[snapshot.topIndex] ?? '—'}</strong> · Bottom: <strong className="text-white">{snapshot.values[snapshot.bottomIndex] ?? '—'}</strong> · Result: <strong className="text-space-mint">{snapshot.result ?? '—'}</strong></p>}
            {snapshot.kind === 'queue' && <p className="mt-3 text-sm text-space-muted">Front: <strong className="text-space-cyan">{snapshot.values[0] ?? '—'}</strong> · Rear: <strong className="text-white">{snapshot.values.at(-1) ?? '—'}</strong> · Result: <strong className="text-space-mint">{snapshot.result ?? '—'}</strong></p>}
            <ol className="mt-3 space-y-2">
              {operationLog.map(({ step, index }) => (
                <li key={`${step.id}-${step.operation}`} aria-current={index === executionSession.currentStepIndex ? 'step' : undefined} className={`flex flex-wrap gap-x-3 gap-y-1 rounded-lg px-2 py-1 text-xs leading-5 ${index === executionSession.currentStepIndex ? 'bg-cyan-400/10 text-cyan-100' : 'text-space-muted'}`}>
                  <span className="shrink-0 font-mono text-space-cyan">{String(index + 1).padStart(2, '0')}</span>
                  <span>{step.description}</span>
                  {index === executionSession.currentStepIndex && <span className="font-semibold uppercase tracking-wider text-space-mint">Current</span>}
                  {step.state.kind === 'stack' && <span className="basis-full pl-7 text-[11px] text-space-muted">Stack [{step.state.values.join(', ') || 'empty'}] · size {step.state.values.length} / {step.state.capacity} · top {step.state.values[step.state.topIndex] ?? '—'}</span>}
                </li>
              ))}
            </ol>
            {inputError && <p className="mt-3 rounded-xl border border-rose-400/40 bg-rose-400/10 px-3 py-2 text-sm text-rose-200" role="alert">{inputError}</p>}
          </section>
        </aside>
      </div>
    </main>
  )
}

function ArrayEditor({ initialValues, onApply }: { initialValues: number[]; onApply: (draft: string) => void }) {
  const [draft, setDraft] = useState(initialValues.join(', '))
  return (
    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
      <label className="sr-only" htmlFor="array-editor">Array values</label>
      <input id="array-editor" aria-label="Array values" className="min-h-11 min-w-0 flex-1 rounded-xl border border-space-line bg-space-panel-raised px-3 text-sm text-white outline-none focus:border-space-cyan" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button type="button" className="lab-button ghost min-h-11" onClick={() => onApply(draft)}>Apply array</button>
    </div>
  )
}

function DataStructureView({ state, reducedMotion }: { state: DsaState; reducedMotion: boolean }) {
  if (state.kind === 'array') {
    const active = state.active ?? []
    return (
      <div className="space-y-4">
        <div role="img" aria-label={`Array: ${state.values.join(', ')}`} className="flex min-h-32 flex-wrap items-end justify-center gap-2">
          {state.values.length ? state.values.map((value, index) => {
            const outsideRange = state.low !== undefined && state.high !== undefined && (index < state.low || index > state.high)
            return <div key={`${index}-${value}`} className={`grid min-w-12 justify-items-center gap-2 ${active.includes(index) ? 'text-space-cyan' : 'text-space-muted'}`}>
              <span className={`flex h-12 min-w-12 items-center justify-center rounded-xl border px-3 font-mono text-lg font-bold ${active.includes(index) ? 'border-space-cyan bg-cyan-400/15' : outsideRange ? 'border-space-line/50 bg-space-panel opacity-40' : 'border-space-line bg-space-panel'}`}>{value}</span>
              <span className="text-[10px]">[{index}]</span>
            </div>
          }) : <p className="text-sm text-space-muted">Array is empty.</p>}
        </div>
        {state.target !== undefined && <p className="text-center text-xs text-space-muted">Target <strong className="text-space-cyan">{state.target}</strong>{state.low !== undefined && state.high !== undefined ? ` · Search range ${state.low}–${state.high}` : ''}{state.result ? ` · ${state.result}` : ''}</p>}
      </div>
    )
  }
  if (state.kind === 'stack') {
    return (
      <div role="img" aria-label={`Stack: ${state.values.join(', ') || 'empty'}`} className="mx-auto flex min-h-56 max-w-lg flex-col items-center justify-start gap-2">
        {Array.from({ length: state.capacity }, (_, offset) => {
          const index = state.capacity - offset - 1
          const filled = index < state.values.length
          const top = filled && index === state.topIndex
          const popped = state.operation === 'pop' && !filled && state.result !== undefined && index === state.values.length
          const animated = !reducedMotion
          const slotState = state.operation === 'overflow' && top
            ? 'border-space-amber bg-amber-300/10 text-space-amber'
            : state.operation === 'underflow' && index === state.capacity - 1
              ? 'border-rose-400/60 bg-rose-400/10 text-rose-200'
              : filled
                ? top ? 'border-space-cyan bg-cyan-400/15 text-cyan-100' : 'border-space-line bg-space-panel text-white'
                : 'border-dashed border-slate-600/70 text-slate-600'
          const animation = animated
            ? popped ? 'stack-slot-pop' : top && state.operation === 'push' ? 'stack-slot-push' : top && state.operation === 'peek' ? 'stack-slot-peek' : ''
            : ''
          return <div key={index} className="flex h-10 w-full max-w-xs items-center justify-center gap-3">
            <span className={`w-14 text-right text-[10px] font-bold tracking-widest ${top || index === state.bottomIndex ? 'text-space-cyan' : 'text-space-muted'}`}>{top && index === state.bottomIndex ? 'TOP · BOTTOM' : top ? 'TOP →' : index === state.bottomIndex ? 'BOTTOM' : ''}</span>
            <span className={`flex h-10 w-36 items-center justify-center rounded-lg border font-mono font-bold ${slotState} ${animation}`}>{filled ? state.values[index] : popped ? state.result : 'empty'}</span>
          </div>
        })}
        {!state.values.length && <p className="mt-3 text-xs text-space-muted">Stack is empty · top is undefined</p>}
        <p className="text-xs text-space-muted">Stack size: {state.values.length} / {state.capacity} · Top: {state.values[state.topIndex] ?? '—'} · Bottom: {state.values[state.bottomIndex] ?? '—'} · Result: {state.result ?? '—'}</p>
        {state.message && <p className={`text-center text-xs ${state.operation === 'overflow' || state.operation === 'underflow' ? 'text-rose-200' : 'text-space-muted'}`}>{state.message}</p>}
      </div>
    )
  }
  if (state.kind === 'queue') return (
    <div role="img" aria-label={`Queue: ${state.values.join(', ') || 'empty'}`} className="flex min-h-40 flex-wrap items-center justify-center gap-2">
      {Array.from({ length: state.capacity }, (_, index) => <div key={index} className="text-center">
        <span className={`flex h-12 min-w-12 items-center justify-center rounded-xl border px-3 font-mono font-bold ${index < state.values.length ? 'border-space-cyan/50 bg-cyan-400/10 text-white' : 'border-dashed border-slate-600 text-slate-600'}`}>{state.values[index] ?? '—'}</span>
        <span className="mt-1 block text-[10px] text-space-muted">{state.values.length === 1 && index === 0 ? 'FRONT · REAR' : index === 0 ? 'FRONT' : index === state.values.length - 1 && state.values.length ? 'REAR' : ''}</span>
      </div>)}
    </div>
  )
  if (state.kind === 'list') return (
    <div role="img" aria-label={`Linked list: ${state.nodes.map((node) => node.value).join(' to ') || 'empty'}`} className="flex min-h-40 flex-wrap items-center justify-center gap-3">
      {state.nodes.length ? state.nodes.map((node, index) => <div key={node.id} className="flex items-center gap-3">
        <div className={`rounded-xl border px-4 py-3 text-center ${state.activeId === node.id ? 'border-space-cyan bg-cyan-400/15' : 'border-space-line bg-space-panel'}`}>
          <span className="block text-[9px] uppercase tracking-widest text-space-muted">{index === 0 ? 'HEAD' : index === state.nodes.length - 1 ? 'TAIL' : `NODE ${index + 1}`}</span>
          <strong className="font-mono text-lg">{node.value}</strong>
          <span className="block text-[9px] text-space-muted">id {node.id} · next → {state.nodes[index + 1]?.value ?? 'null'}</span>
        </div>
        {index < state.nodes.length - 1 && <span aria-hidden="true" className="text-space-cyan">⟶</span>}
      </div>) : <p className="text-sm text-space-muted">Linked list is empty.</p>}
    </div>
  )
  if (state.kind === 'tree') return (
    <div role="img" aria-label={`Binary search tree: ${state.nodes.map((node) => node.value).join(', ')}`} className="flex min-h-48 flex-wrap items-center justify-center gap-4">
      {state.nodes.map((node) => <div key={node.value} className="flex flex-col items-center gap-2">
        <span className={`flex h-12 w-12 items-center justify-center rounded-full border font-bold ${state.activeValue === node.value || state.visited.includes(node.value) ? 'border-space-cyan bg-cyan-400/15 text-cyan-100' : 'border-space-violet/50 bg-violet-400/10 text-white'}`}>{node.value}</span>
        <span className="text-[10px] text-space-muted">{node.parent === undefined ? 'ROOT' : `${node.side} of ${node.parent}`}</span>
      </div>)}
      {state.nodes.length === 0 && <p className="text-sm text-space-muted">Tree is empty.</p>}
      {state.nodes.some((node) => node.parent !== undefined) && <p className="basis-full text-center text-xs text-space-muted">Edges: {state.nodes.filter((node) => node.parent !== undefined).map((node) => `${node.parent} → ${node.value}`).join(' · ')}</p>}
      {state.traversal.length > 0 && <p className="basis-full text-center text-xs text-space-mint">Path: {state.traversal.join(' → ')}</p>}
    </div>
  )
  if (state.kind === 'graph') return (
    <div role="img" aria-label={`Graph nodes: ${state.nodes.join(', ')}`} className="space-y-4">
      <div className="flex min-h-28 flex-wrap items-center justify-center gap-3">
        {state.nodes.map((node) => <span key={node} className={`flex h-12 w-12 items-center justify-center rounded-full border font-bold ${state.visited.includes(node) ? 'border-space-mint bg-emerald-300/15 text-space-mint' : state.frontier.includes(node) ? 'border-space-amber bg-amber-300/15 text-space-amber' : 'border-space-line bg-space-panel text-white'}`}>{node}</span>)}
      </div>
      <p className="text-center text-xs text-space-muted">Edges: {state.edges.length ? state.edges.map((edge) => <span key={edge.join(':')} className={`mx-1 inline-block rounded px-1 ${state.activeEdge?.join(':') === edge.join(':') || state.activeEdge?.join(':') === [...edge].reverse().join(':') ? 'bg-amber-300/15 text-space-amber' : ''}`}>{edge.join('—')}</span>) : 'none'}</p>
      {state.path.length > 0 && <p className="text-center text-xs text-space-cyan">Path: {state.path.join(' → ')}</p>}
    </div>
  )
  return (
    <div role="img" aria-label="Hash table buckets" className="grid min-h-40 grid-cols-2 gap-2 sm:grid-cols-3">
      {state.buckets.map((bucket, index) => <div key={index} className={`rounded-xl border p-3 ${state.activeBucket === index ? 'border-space-cyan bg-cyan-400/10' : 'border-space-line bg-space-panel'}`}>
        <span className="text-[10px] uppercase tracking-widest text-space-muted">Bucket {index}</span>
        <p className="mt-1 font-mono text-sm text-white">{bucket.length ? bucket.join(' → ') : 'empty'}</p>
        {state.probeSequence.includes(index) && <span className="text-[10px] text-space-cyan">collision/probe</span>}
      </div>)}
      {state.probeSequence.length > 0 && <p className="col-span-full text-center text-xs text-space-muted">Probe sequence: {state.probeSequence.join(' → ')}</p>}
    </div>
  )
}
