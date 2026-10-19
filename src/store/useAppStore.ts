import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  BUBBLE_SORT_ENGINE_VERSION,
  createBubbleSortSteps,
  createRandomBubbleSortInput,
  DEFAULT_BUBBLE_SORT_INPUT,
} from '../lib/bubbleSort'
import type { AlgorithmStep } from '../data/algorithms'
import {
  algorithmsForStation,
  createAlgorithmSession,
  createSession,
  currentSnapshot,
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
  showHints: boolean
  animationSpeed: number
  cameraSensitivity: number
  theme: ThemeMode
}

export interface ProgressState {
  completedAlgorithms: string[]
  learningMinutes: number
  streak: number
  recentAlgorithms: string[]
  lastSavedAt: string | null
}

interface AppState {
  screen: Screen
  currentAlgorithmId: string
  settings: AppSettings
  progress: ProgressState
  settingsOpen: boolean
  bubbleSortInput: number[]
  bubbleSortSteps: AlgorithmStep[]
  currentStepIndex: number
  isBubbleSortPlaying: boolean
  bubbleSortEngineVersion: number
  activeStationId: string
  executionSession: AlgorithmSession<DsaState>
  executionInput: number
  executionIndex: number
  setExecutionInput: (value: number) => void
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
  selectAlgorithm: (id: string) => void
  nextBubbleSortStep: () => void
  previousBubbleSortStep: () => void
  resetBubbleSort: () => void
  randomizeBubbleSort: (random?: () => number) => void
  setBubbleSortPlaying: (playing: boolean) => void
  startBubbleSort: () => void
  advanceBubbleSort: () => void
  updateSettings: (updates: Partial<AppSettings>) => void
  completeAlgorithm: (id: string) => void
  resetProgress: () => void
  openSettings: (open: boolean) => void
}

const defaultSettings: AppSettings = {
  reducedMotion: false,
  showHints: true,
  animationSpeed: 1,
  cameraSensitivity: 1,
  theme: 'dark',
}

const defaultProgress: ProgressState = {
  completedAlgorithms: ['search.binary'],
  learningMinutes: 28,
  streak: 4,
  recentAlgorithms: ['search.binary', 'sort.bubble', 'tree.inorder'],
  lastSavedAt: null,
}

const createBubbleSortRun = (input: number[]) => ({
  bubbleSortInput: [...input],
  bubbleSortSteps: createBubbleSortSteps(input),
  currentStepIndex: 0,
  isBubbleSortPlaying: false,
  bubbleSortEngineVersion: BUBBLE_SORT_ENGINE_VERSION,
})

function isPartialAppState(value: unknown): value is Partial<AppState> {
  return typeof value === 'object' && value !== null
}

function isValidBubbleSortInput(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'number' && Number.isFinite(item))
}

const firstStationAlgorithm = (stationId: string) => {
  const algorithm = algorithmsForStation(stationId)[0]
  if (!algorithm) throw new Error(`No algorithms registered for station ${stationId}.`)
  return algorithm
}
const initialStation = firstStationAlgorithm('arrays')
const initialExecution = createAlgorithmSession(initialStation.id, 25)

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      screen: 'welcome',
      currentAlgorithmId: initialStation.id,
      settings: defaultSettings,
      progress: defaultProgress,
      settingsOpen: false,
      ...createBubbleSortRun(DEFAULT_BUBBLE_SORT_INPUT),
      activeStationId: initialStation.stationId,
      executionSession: initialExecution,
      executionInput: 16,
      executionIndex: 1,
      setScreen: (screen) => set({ screen }),
      selectAlgorithm: (id) =>
        set({
          currentAlgorithmId: id,
          screen: 'workspace',
          ...(id === 'bubble-sort' ? createBubbleSortRun(DEFAULT_BUBBLE_SORT_INPUT) : {}),
        }),
      setExecutionInput: (value) => set({ executionInput: value }),
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
        if (!algorithm) throw new Error(`No algorithms registered for station ${stationId}.`)
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
          const steps = createAlgorithmSession(state.currentAlgorithmId, state.executionInput, randomized).steps
          return { executionSession: createSession(randomized, steps) }
        }),
      setExecutionPlaying: (playing) =>
        set((state) => ({
          executionSession: {
            ...state.executionSession,
            status: playing
              ? state.executionSession.currentStepIndex >= state.executionSession.steps.length - 1
                ? ['error', 'underflow', 'overflow', 'not-found'].includes(state.executionSession.steps[state.executionSession.currentStepIndex].operation) ? 'error' : 'completed'
                : 'playing'
              : 'paused',
          },
        })),
      nextBubbleSortStep: () =>
        set((state) => {
          const nextIndex = Math.min(state.currentStepIndex + 1, state.bubbleSortSteps.length - 1)
          return {
            currentStepIndex: nextIndex,
            isBubbleSortPlaying: nextIndex < state.bubbleSortSteps.length - 1 && state.isBubbleSortPlaying,
          }
        }),
      previousBubbleSortStep: () =>
        set((state) => ({
          currentStepIndex: Math.max(0, state.currentStepIndex - 1),
          isBubbleSortPlaying: false,
        })),
      resetBubbleSort: () => set(createBubbleSortRun(DEFAULT_BUBBLE_SORT_INPUT)),
      randomizeBubbleSort: (random) =>
        set(() => createBubbleSortRun(createRandomBubbleSortInput(random))),
      setBubbleSortPlaying: (playing) =>
        set((state) => ({
          isBubbleSortPlaying: playing && state.currentStepIndex < state.bubbleSortSteps.length - 1,
        })),
      startBubbleSort: () => set({ currentStepIndex: 0, isBubbleSortPlaying: true }),
      advanceBubbleSort: () =>
        set((state) => {
          const nextIndex = Math.min(state.currentStepIndex + 1, state.bubbleSortSteps.length - 1)
          return {
            currentStepIndex: nextIndex,
            isBubbleSortPlaying: nextIndex < state.bubbleSortSteps.length - 1,
          }
        }),
      updateSettings: (updates) =>
        set((state) => ({
          settings: { ...state.settings, ...updates },
        })),
      completeAlgorithm: (id) =>
        set((state) => {
          const existing = state.progress.completedAlgorithms.includes(id)
          return {
            progress: {
              ...state.progress,
              completedAlgorithms: existing ? state.progress.completedAlgorithms : [...state.progress.completedAlgorithms, id],
              recentAlgorithms: [id, ...state.progress.recentAlgorithms.filter((value) => value !== id)].slice(0, 5),
              lastSavedAt: new Date().toISOString(),
            },
          }
        }),
      resetProgress: () =>
        set({
          progress: {
            completedAlgorithms: [],
            learningMinutes: 0,
            streak: 0,
            recentAlgorithms: [],
            lastSavedAt: new Date().toISOString(),
          },
        }),
      openSettings: (open) => set({ settingsOpen: open }),
    }),
    {
      name: 'algospace-xr-store',
      merge: (persistedState, currentState) => {
        const persisted = isPartialAppState(persistedState) ? persistedState : {}
        const mergedState = { ...currentState, ...persisted }
        if (persisted.bubbleSortEngineVersion === BUBBLE_SORT_ENGINE_VERSION) {
          return mergedState
        }

        const input = isValidBubbleSortInput(persisted.bubbleSortInput)
          ? persisted.bubbleSortInput
          : DEFAULT_BUBBLE_SORT_INPUT
        return { ...mergedState, ...createBubbleSortRun(input) }
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
