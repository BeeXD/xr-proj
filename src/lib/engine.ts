export type ExecutionStatus = 'idle' | 'playing' | 'paused' | 'completed' | 'error'

export interface ArrayState {
  kind: 'array'
  values: number[]
  active: number[]
  target?: number
  low?: number
  high?: number
  result?: string
}

export interface StackState {
  kind: 'stack'
  values: number[]
  capacity: number
  topIndex: number
  bottomIndex: number
  operation: 'idle' | 'push' | 'pop' | 'peek' | 'overflow' | 'underflow' | 'complete'
  result?: number
  message?: string
}

export interface QueueState {
  kind: 'queue'
  values: number[]
  capacity: number
  operation: 'idle' | 'enqueue' | 'dequeue' | 'peek' | 'overflow' | 'underflow' | 'complete'
  result?: number
  message?: string
}

export interface LinkedNode {
  id: number
  value: number
}

export interface ListState {
  kind: 'list'
  nodes: LinkedNode[]
  activeId?: number
  operation: string
  message?: string
}

export interface TreeNode {
  value: number
  parent?: number
  side?: 'left' | 'right'
}

export interface TreeState {
  kind: 'tree'
  nodes: TreeNode[]
  activeValue?: number
  visited: number[]
  traversal: number[]
  message?: string
}

export interface GraphState {
  kind: 'graph'
  nodes: string[]
  edges: Array<[string, string]>
  visited: string[]
  frontier: string[]
  path: string[]
  activeEdge?: [string, string]
  message?: string
}

export interface HashState {
  kind: 'hash'
  buckets: number[][]
  activeBucket?: number
  probeSequence: number[]
  result?: string
  message?: string
}

export type DsaState = ArrayState | StackState | QueueState | ListState | TreeState | GraphState | HashState

export interface AlgorithmStep {
  id: number
  state: DsaState
  description: string
  pseudocodeLine: number
  operation: string
}

export interface AlgorithmSession {
  steps: AlgorithmStep[]
  currentStepIndex: number
  status: ExecutionStatus
}

export interface AlgorithmDefinition {
  id: string
  stationId: string
  title: string
  complexity: string
  pseudocode: string[]
  initialState: DsaState
  buildSteps: (state: DsaState, input?: number, index?: number) => AlgorithmStep[]
}

export const MAX_ARRAY_LENGTH = 16
export const MAX_GRAPH_NODES = 12

// A run that ends on one of these operations ends in the 'error' status instead of 'completed'.
const failureOperations = new Set(['error', 'underflow', 'overflow', 'not-found'])
export const isFailure = (operation: string | undefined) => operation !== undefined && failureOperations.has(operation)

const finalStatus = (session: AlgorithmSession, index: number): ExecutionStatus | undefined =>
  index < session.steps.length - 1 ? undefined : isFailure(session.steps[index].operation) ? 'error' : 'completed'

export function currentSnapshot(session: AlgorithmSession): DsaState {
  return session.steps[session.currentStepIndex].state
}

export function nextStep(session: AlgorithmSession): AlgorithmSession {
  const index = Math.min(session.currentStepIndex + 1, session.steps.length - 1)
  return { ...session, currentStepIndex: index, status: finalStatus(session, index) ?? (session.status === 'playing' ? 'playing' : 'paused') }
}

export function previousStep(session: AlgorithmSession): AlgorithmSession {
  return { ...session, currentStepIndex: Math.max(0, session.currentStepIndex - 1), status: 'paused' }
}

export function resetSession(session: AlgorithmSession): AlgorithmSession {
  return { ...session, currentStepIndex: 0, status: finalStatus(session, 0) ?? 'idle' }
}

/** Appends a step holding its own copy of the state, so later mutation by a builder cannot rewrite history. */
export function pushStep(steps: AlgorithmStep[], state: DsaState, description: string, pseudocodeLine: number, operation: string): void {
  steps.push({ id: steps.length, state: structuredClone(state), description, pseudocodeLine, operation })
}

export function requireKind<K extends DsaState['kind']>(state: DsaState, kind: K): Extract<DsaState, { kind: K }> {
  if (state.kind !== kind) throw new TypeError(`This operation requires ${kind} state, not ${state.kind}.`)
  return state as Extract<DsaState, { kind: K }>
}

/** The structure with the previous run's highlights, results and messages cleared: what a new run starts from. */
export function restState(state: DsaState): DsaState {
  switch (state.kind) {
    case 'array': return { kind: 'array', values: state.values, active: [] }
    case 'stack': return { ...state, operation: 'idle', result: undefined, topIndex: state.values.length - 1, bottomIndex: state.values.length ? 0 : -1 }
    case 'queue': return { ...state, operation: 'idle', result: undefined }
    case 'list': return { ...state, activeId: undefined, operation: 'idle', message: undefined }
    case 'tree': return { ...state, activeValue: undefined, visited: [], traversal: [], message: undefined }
    case 'graph': return { ...state, visited: [], frontier: [], path: [], activeEdge: undefined, message: undefined }
    case 'hash': return { ...state, activeBucket: undefined, probeSequence: [], result: undefined, message: undefined }
  }
}

/** A shuffled [10, 20, 30, 40, 50, 60]. */
export function randomizeArray(random: () => number = Math.random): number[] {
  const values = Array.from({ length: 6 }, (_, index) => (index + 1) * 10)
  for (let index = values.length - 1; index > 0; index -= 1) {
    const sample = random()
    if (!Number.isFinite(sample) || sample < 0 || sample >= 1) throw new RangeError('Random source must return a number in [0, 1).')
    const target = Math.floor(sample * (index + 1))
    ;[values[index], values[target]] = [values[target], values[index]]
  }
  return values
}
