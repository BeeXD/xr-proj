import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  algorithmsForStation,
  createAlgorithmSession,
  currentSnapshot,
  getAlgorithmDefinition,
  MAX_ARRAY_LENGTH,
  nextStep,
  previousStep,
  randomizeArray,
  resetSession,
  type AlgorithmSession,
  type DsaState,
} from '../lib/execution'

export type Screen = 'welcome' | 'dashboard' | 'workspace'
export type ThemeMode = 'dark' | 'light' | 'system'

export interface AppSettings {
  reducedMotion: boolean
  animationSpeed: number
  theme: ThemeMode
}

export interface ProgressState {
  completedAlgorithms: string[]
}

interface AppState {
  screen: Screen
  currentAlgorithmId: string
  settings: AppSettings
  progress: ProgressState
  settingsOpen: boolean
  activeStationId: string
  executionSession: AlgorithmSession<DsaState>
  executionInput: number
  executionIndex: number
  setExecutionInput: (value: number) => void
  pressValueKey: (key: string) => void
  setExecutionIndex: (value: number) => void
  setArrayValues: (values: number[]) => void
  setExecutionCapacity: (capacity: number) => void
  selectStation: (stationId: string) => void
  runStationAlgorithm: (algorithmId: string, input?: number, index?: number) => void
  advanceExecution: () => void
  previousExecution: () => void
  resetExecution: () => void
  randomizeExecution: () => void
  setExecutionPlaying: (playing: boolean) => void
  setScreen: (screen: Screen) => void
  updateSettings: (updates: Partial<AppSettings>) => void
  completeAlgorithm: (id: string) => void
  resetProgress: () => void
  openSettings: (open: boolean) => void
}

type PersistedState = Pick<AppState, 'settings' | 'progress'>

const defaultSettings: AppSettings = {
  reducedMotion: false,
  animationSpeed: 1,
  theme: 'dark',
}

const firstStationAlgorithm = (stationId: string) => {
  const algorithm = algorithmsForStation(stationId)[0]
  if (!algorithm) throw new Error(`No algorithms registered for station ${stationId}.`)
  return algorithm
}
const initialStation = firstStationAlgorithm('arrays')

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      screen: 'welcome',
      currentAlgorithmId: initialStation.id,
      settings: defaultSettings,
      progress: { completedAlgorithms: [] },
      settingsOpen: false,
      activeStationId: initialStation.stationId,
      executionSession: createAlgorithmSession(initialStation.id, 25),
      executionInput: 16,
      executionIndex: 1,
      setScreen: (screen) => set({ screen }),
      setExecutionInput: (value) => set({ executionInput: value }),
      // Keypad entry for VR, where there is no text field: digits append (up to 3), 'Del' drops the last digit, '±' flips the sign.
      pressValueKey: (key) =>
        set(({ executionInput }) => {
          const value = Math.trunc(executionInput)
          if (key === 'Del') return { executionInput: Math.trunc(value / 10) }
          if (key === '±') return { executionInput: -value }
          if (!/^\d$/.test(key) || Math.abs(value) >= 100) return {}
          return { executionInput: (value < 0 ? -1 : 1) * (Math.abs(value) * 10 + Number(key)) }
        }),
      setExecutionIndex: (value) => set({ executionIndex: value }),
      setArrayValues: (values) =>
        set((state) => {
          if (values.length > MAX_ARRAY_LENGTH || values.some((value) => !Number.isFinite(value))) {
            throw new RangeError(`Array input must contain at most ${MAX_ARRAY_LENGTH} finite numbers.`)
          }
          const current = currentSnapshot(state.executionSession)
          if (current.kind !== 'array') throw new TypeError('Array values can only be edited in an array workspace.')
          const nextState: DsaState = { ...current, values: [...values], active: [], result: undefined }
          return { executionSession: createAlgorithmSession(state.currentAlgorithmId, state.executionInput, nextState) }
        }),
      setExecutionCapacity: (capacity) =>
        set((state) => {
          if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) throw new RangeError('Capacity must be an integer from 1 to 20.')
          const current = currentSnapshot(state.executionSession)
          if (current.kind !== 'stack' && current.kind !== 'queue') throw new TypeError('Capacity is only available in stack and queue workspaces.')
          const values = current.values.slice(0, capacity)
          const nextState: DsaState = current.kind === 'stack'
            ? { ...current, values, capacity, topIndex: values.length - 1, bottomIndex: values.length ? 0 : -1 }
            : { ...current, values, capacity }
          return { executionSession: createAlgorithmSession(state.currentAlgorithmId, state.executionInput, nextState) }
        }),
      selectStation: (stationId) => {
        const algorithm = firstStationAlgorithm(stationId)
        set({
          currentAlgorithmId: algorithm.id,
          activeStationId: stationId,
          executionSession: createAlgorithmSession(algorithm.id, 25),
          executionInput: 25,
          screen: 'workspace',
        })
      },
      runStationAlgorithm: (algorithmId, input, index) =>
        set((state) => {
          const definition = algorithmsForStation(state.activeStationId).find((algorithm) => algorithm.id === algorithmId)
          if (!definition) throw new Error(`Algorithm ${algorithmId} is not registered for ${state.activeStationId}.`)
          const current = currentSnapshot(state.executionSession)
          const startState = current.kind === definition.initialState.kind ? current : definition.initialState
          return {
            currentAlgorithmId: algorithmId,
            executionInput: input ?? state.executionInput,
            executionIndex: index ?? state.executionIndex,
            executionSession: createAlgorithmSession(algorithmId, input ?? state.executionInput, startState, index ?? state.executionIndex),
          }
        }),
      advanceExecution: () => set((state) => ({ executionSession: nextStep(state.executionSession) })),
      previousExecution: () => set((state) => ({ executionSession: previousStep(state.executionSession) })),
      resetExecution: () => set((state) => ({ executionSession: resetSession(state.executionSession) })),
      randomizeExecution: () =>
        set((state) => {
          const current = currentSnapshot(state.executionSession)
          let randomized: DsaState
          if (current.kind === 'array') {
            const values = randomizeArray()
            if (state.currentAlgorithmId === 'search.binary') values.sort((left, right) => left - right)
            randomized = { ...current, values, active: [], low: undefined, high: undefined, target: undefined, result: undefined }
          }
          else if (current.kind === 'stack') {
            const values = randomizeArray().slice(0, Math.min(current.capacity, 4))
            randomized = { ...current, values, topIndex: values.length - 1, bottomIndex: values.length ? 0 : -1, operation: 'idle', result: undefined, message: values.length ? 'Loaded randomized values.' : 'Empty.' }
          } else if (current.kind === 'queue') {
            const values = randomizeArray().slice(0, Math.min(current.capacity, 4))
            randomized = { ...current, values, operation: 'idle', result: undefined, message: values.length ? 'Loaded randomized values.' : 'Empty.' }
          } else if (current.kind === 'list') {
            const values = randomizeArray().slice(0, 4)
            randomized = { ...current, nodes: values.map((value, index) => ({ id: index + 1, value })), operation: 'idle' }
          } else if (current.kind === 'tree') {
            const nodes: Extract<DsaState, { kind: 'tree' }>['nodes'] = []
            for (const value of randomizeArray().slice(0, 5)) {
              let parent: (typeof nodes)[number] | undefined
              let side: 'left' | 'right' = 'left'
              let currentNode = nodes.find((node) => node.parent === undefined)
              while (currentNode) {
                parent = currentNode
                side = value < currentNode.value ? 'left' : 'right'
                currentNode = nodes.find((node) => node.parent === parent?.value && node.side === side)
              }
              nodes.push(parent ? { value, parent: parent.value, side } : { value })
            }
            randomized = { ...current, nodes, visited: [], traversal: [] }
          } else if (current.kind === 'graph') {
            const possibleEdges: Array<[string, string]> = []
            for (let source = 0; source < current.nodes.length; source += 1) {
              for (let target = source + 1; target < current.nodes.length; target += 1) {
                if (Math.random() >= 0.55) possibleEdges.push([current.nodes[source], current.nodes[target]])
              }
            }
            if (!possibleEdges.length && current.nodes.length > 1) possibleEdges.push([current.nodes[0], current.nodes[1]])
            randomized = { ...current, edges: possibleEdges, visited: [], frontier: [], path: [] }
          }
          else randomized = { ...current, buckets: [[], [], [], [], [], []], probeSequence: [], result: undefined }
          return { executionSession: createAlgorithmSession(state.currentAlgorithmId, state.executionInput, randomized) }
        }),
      setExecutionPlaying: (playing) =>
        set(({ executionSession: session }) => {
          if (!playing) return { executionSession: { ...session, status: 'paused' } }
          // Pressing play on a finished run replays it from the first step.
          const start = session.currentStepIndex >= session.steps.length - 1 ? resetSession(session) : session
          return { executionSession: { ...start, status: 'playing' } }
        }),
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
      completeAlgorithm: (id) =>
        set(({ progress }) => progress.completedAlgorithms.includes(id)
          ? {}
          : { progress: { completedAlgorithms: [...progress.completedAlgorithms, id] } }),
      resetProgress: () => set({ progress: { completedAlgorithms: [] } }),
      openSettings: (open) => set({ settingsOpen: open }),
    }),
    {
      name: 'algospace-xr-store',
      version: 1,
      partialize: ({ settings, progress }): PersistedState => ({ settings, progress }),
      // Version 0 persisted the whole store, including every step snapshot and legacy fields.
      migrate: (persisted): PersistedState => {
        const old = (persisted ?? {}) as { settings?: Partial<AppSettings>; progress?: { completedAlgorithms?: unknown } }
        const completed = Array.isArray(old.progress?.completedAlgorithms) ? old.progress.completedAlgorithms : []
        return {
          settings: {
            reducedMotion: old.settings?.reducedMotion === true,
            animationSpeed: typeof old.settings?.animationSpeed === 'number' ? old.settings.animationSpeed : defaultSettings.animationSpeed,
            theme: old.settings?.theme === 'light' || old.settings?.theme === 'system' ? old.settings.theme : defaultSettings.theme,
          },
          progress: { completedAlgorithms: completed.filter((id): id is string => typeof id === 'string' && Boolean(getAlgorithmDefinition(id))) },
        }
      },
    },
  ),
)

export const getCurrentTheme = () => {
  const { theme } = useAppStore.getState().settings
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}
