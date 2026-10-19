export type ExecutionStatus = 'idle' | 'playing' | 'paused' | 'completed' | 'error'

export interface AlgorithmStep<TState> {
  id: number
  state: TState
  description: string
  pseudocodeLine: number
  operation: string
  highlightedIndices?: number[]
  variables?: Record<string, unknown>
}

export interface AlgorithmSession<TState> {
  initialState: TState
  steps: AlgorithmStep<TState>[]
  currentStepIndex: number
  status: ExecutionStatus
  error?: string
}

export interface LinkedNode {
  id: number
  value: number
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

export type DsaState =
  | { kind: 'array'; values: number[]; active: number[]; target?: number; low?: number; high?: number; result?: string }
  | StackState
  | { kind: 'queue'; values: number[]; capacity: number; operation: 'idle' | 'enqueue' | 'dequeue' | 'peek' | 'overflow' | 'underflow' | 'complete'; result?: number; message?: string }
  | { kind: 'list'; nodes: LinkedNode[]; activeId?: number; operation: string; message?: string }
  | { kind: 'tree'; nodes: Array<{ value: number; parent?: number; side?: 'left' | 'right' }>; activeValue?: number; visited: number[]; traversal: number[]; message?: string }
  | { kind: 'graph'; nodes: string[]; edges: Array<[string, string]>; visited: string[]; frontier: string[]; path: string[]; activeEdge?: [string, string]; message?: string }
  | { kind: 'hash'; buckets: Array<number[]>; activeBucket?: number; probeSequence: number[]; result?: string; message?: string }

export type Step<TState> = AlgorithmStep<TState>

export const MAX_ARRAY_LENGTH = 16

export interface AlgorithmDefinition<TState extends DsaState = DsaState> {
  id: string
  stationId: string
  title: string
  complexity: string
  pseudocode: string[]
  initialState: TState
  buildSteps: (state: TState, input?: number, index?: number) => AlgorithmStep<TState>[]
  complete: (state: TState) => boolean
}

const failureOperations = new Set(['error', 'underflow', 'overflow', 'not-found'])

export function createSession<TState>(initialState: TState, steps: AlgorithmStep<TState>[]): AlgorithmSession<TState> {
  if (steps.length === 0) {
    throw new Error('An algorithm session must contain at least one meaningful step.')
  }
  const status = steps.length === 1
    ? failureOperations.has(steps[0].operation) ? 'error' : 'completed'
    : 'idle'
  return { initialState: structuredClone(initialState), steps: structuredClone(steps), currentStepIndex: 0, status }
}

export function currentSnapshot<TState>(session: AlgorithmSession<TState>): TState {
  return session.steps[session.currentStepIndex].state
}

export function nextStep<TState>(session: AlgorithmSession<TState>): AlgorithmSession<TState> {
  const index = Math.min(session.currentStepIndex + 1, session.steps.length - 1)
  const finalOperation = session.steps[index].operation
  const status = index === session.steps.length - 1
    ? failureOperations.has(finalOperation) ? 'error' : 'completed'
    : session.status === 'playing' ? 'playing' : 'paused'
  return { ...session, currentStepIndex: index, status }
}

export function previousStep<TState>(session: AlgorithmSession<TState>): AlgorithmSession<TState> {
  return { ...session, currentStepIndex: Math.max(0, session.currentStepIndex - 1), status: 'paused' }
}

export function resetSession<TState>(session: AlgorithmSession<TState>): AlgorithmSession<TState> {
  return { ...session, currentStepIndex: 0, status: 'idle', error: undefined }
}

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

function immutableStep<TState>(steps: AlgorithmStep<TState>[], state: TState, description: string, pseudocodeLine: number, operation: string, highlightedIndices?: number[]): void {
  steps.push({
    id: steps.length,
    state: structuredClone(state),
    description,
    pseudocodeLine,
    operation,
    ...(highlightedIndices ? { highlightedIndices: [...highlightedIndices] } : {}),
  })
}

const arrayInitial: DsaState = { kind: 'array', values: [9, 4, 7, 3, 8, 1], active: [] }
const searchInitial: DsaState = { kind: 'array', values: [4, 8, 12, 16, 22, 28, 35, 40], active: [] }
const stackInitial: DsaState = { kind: 'stack', values: [], capacity: 5, topIndex: -1, bottomIndex: -1, operation: 'idle', message: 'Stack is empty.' }
const queueInitial: DsaState = { kind: 'queue', values: [], capacity: 5, operation: 'idle', message: 'Queue is empty.' }
const listInitial: DsaState = { kind: 'list', nodes: [{ id: 1, value: 12 }, { id: 2, value: 7 }, { id: 3, value: 19 }], operation: 'idle' }
const treeInitial: DsaState = { kind: 'tree', nodes: [{ value: 12 }, { value: 7, parent: 12, side: 'left' }, { value: 19, parent: 12, side: 'right' }], visited: [], traversal: [] }
const graphInitial: DsaState = { kind: 'graph', nodes: ['A', 'B', 'C', 'D', 'E'], edges: [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'E']], visited: [], frontier: [], path: [] }
const hashInitial: DsaState = { kind: 'hash', buckets: [[], [], [], [], [], [5, 17]], probeSequence: [] }

function buildArraySteps(state: DsaState, input: number | undefined, algorithm: string): AlgorithmStep<DsaState>[] {
  if (state.kind !== 'array') throw new TypeError('Array algorithm requires array state.')
  const working = [...state.values]
  const output: AlgorithmStep<DsaState>[] = []
  const snapshot = (
    description: string,
    line: number,
    operation: string,
    active: number[] = [],
    extra: Partial<Extract<DsaState, { kind: 'array' }>> = {},
  ) => immutableStep(output, { ...state, ...extra, values: [...working], active: [...active] }, description, line, operation, active)

  if (algorithm === 'array.reverse') {
    for (let left = 0, right = working.length - 1; left < right; left += 1, right -= 1) {
      snapshot(`Compare endpoints ${working[left]} and ${working[right]}.`, 0, 'compare', [left, right])
      ;[working[left], working[right]] = [working[right], working[left]]
      snapshot('Swap the endpoint values to reverse the array.', 1, 'swap', [left, right])
    }
  } else if (algorithm === 'array.access') {
    const index = input ?? 0
    if (!Number.isInteger(index) || index < 0 || index >= working.length) {
      const result = `Invalid index: ${index}.`
      snapshot(`Index ${index} is outside the array bounds.`, 0, 'error', [], { result })
    }
    else snapshot(`Value at index ${index} is ${working[index]}.`, 0, 'access', [index], { result: `Value: ${working[index]}.` })
  } else if (algorithm === 'array.insert' || algorithm === 'array.delete') {
    if (algorithm === 'array.insert') {
      if (working.length >= MAX_ARRAY_LENGTH) {
        snapshot(`Cannot insert into an array with ${MAX_ARRAY_LENGTH} values.`, 0, 'error', [], { result: `Array limit is ${MAX_ARRAY_LENGTH} values.` })
      } else {
        const index = working.length
        snapshot(`Prepare to insert ${input ?? 0} at index ${index}.`, 0, 'prepare')
        working.push(input ?? 0)
        snapshot(`Inserted ${input ?? 0} at index ${index}.`, 1, 'insert', [index])
      }
    } else {
      if (!working.length) snapshot('Cannot delete from an empty array.', 0, 'underflow', [], { result: 'Array is empty.' })
      else {
        const index = working.indexOf(input ?? working.at(-1)!)
        if (index < 0) {
          snapshot(`Value ${input} is not present; array is unchanged.`, 0, 'not-found', [], { result: `Value ${input} was not found.` })
        } else {
        const removed = working[index]
        snapshot(`Select value ${removed} at index ${index}.`, 0, 'select', [index])
        working.splice(index, 1)
        snapshot(`Deleted ${removed} and shifted the remaining values.`, 1, 'delete', [Math.min(index, working.length - 1)])
        }
      }
    }
  } else if (algorithm.startsWith('sort.')) {
    const kind = algorithm.slice(5)
    if (kind === 'bubble') {
      for (let end = working.length - 1; end > 0; end--) {
        let swapped = false
        for (let index = 0; index < end; index++) {
          snapshot(`Compare ${working[index]} and ${working[index + 1]}.`, 1, 'compare', [index, index + 1])
          if (working[index] > working[index + 1]) {
            ;[working[index], working[index + 1]] = [working[index + 1], working[index]]
            swapped = true
            snapshot(`Swap the adjacent values.`, 2, 'swap', [index, index + 1])
          }
        }
        if (!swapped) break
      }
    } else if (kind === 'selection') {
      for (let start = 0; start < working.length; start++) {
        let minimum = start
        for (let cursor = start + 1; cursor < working.length; cursor++) {
          snapshot(`Compare ${working[cursor]} with the current minimum ${working[minimum]}.`, 1, 'compare', [minimum, cursor])
          if (working[cursor] < working[minimum]) minimum = cursor
        }
        if (minimum !== start) {
          ;[working[start], working[minimum]] = [working[minimum], working[start]]
          snapshot(`Move the minimum value into position ${start}.`, 2, 'swap', [start, minimum])
        }
      }
    } else if (kind === 'insertion') {
      for (let index = 1; index < working.length; index++) {
        const value = working[index]
        let cursor = index - 1
        while (cursor >= 0 && working[cursor] > value) {
          snapshot(`Compare ${working[cursor]} with key ${value}.`, 1, 'compare', [cursor, cursor + 1])
          working[cursor + 1] = working[cursor]
          snapshot(`Shift ${working[cursor]} one position to the right.`, 2, 'shift', [cursor, cursor + 1])
          cursor--
        }
        working[cursor + 1] = value
        snapshot(`Insert key ${value} into its sorted position.`, 3, 'insert', [cursor + 1])
      }
    } else if (kind === 'merge') {
      const mergeSort = (start: number, end: number): void => {
        if (end - start <= 1) return
        const middle = Math.floor((start + end) / 2)
        mergeSort(start, middle)
        mergeSort(middle, end)
        const left = working.slice(start, middle)
        const right = working.slice(middle, end)
        let leftIndex = 0
        let rightIndex = 0
        let writeIndex = start
        while (leftIndex < left.length && rightIndex < right.length) {
          snapshot(`Compare ${left[leftIndex]} and ${right[rightIndex]} while merging.`, 1, 'compare', [writeIndex])
          working[writeIndex] = left[leftIndex] <= right[rightIndex] ? left[leftIndex++] : right[rightIndex++]
          snapshot(`Write ${working[writeIndex]} at position ${writeIndex}.`, 2, 'merge', [writeIndex])
          writeIndex += 1
        }
        while (leftIndex < left.length) {
          working[writeIndex] = left[leftIndex++]
          snapshot(`Write ${working[writeIndex]} at position ${writeIndex}.`, 2, 'merge', [writeIndex++])
        }
        while (rightIndex < right.length) {
          working[writeIndex] = right[rightIndex++]
          snapshot(`Write ${working[writeIndex]} at position ${writeIndex}.`, 2, 'merge', [writeIndex++])
        }
      }
      mergeSort(0, working.length)
    } else {
      const quickSort = (low: number, high: number): void => {
        if (low >= high) return
        const pivot = working[high]
        let boundary = low
        for (let index = low; index < high; index++) {
          snapshot(`Compare ${working[index]} with pivot ${pivot}.`, 1, 'compare', [index, high])
          if (working[index] <= pivot) {
            ;[working[boundary], working[index]] = [working[index], working[boundary]]
            boundary++
          }
        }
        ;[working[boundary], working[high]] = [working[high], working[boundary]]
        snapshot(`Place pivot ${pivot} in its final position.`, 2, 'partition', [boundary])
        quickSort(low, boundary - 1)
        quickSort(boundary + 1, high)
      }
      quickSort(0, working.length - 1)
    }
  } else if (algorithm === 'search.linear' || algorithm === 'search.binary') {
    const target = input ?? working[working.length - 1]
    if (algorithm === 'search.binary' && working.some((value, index) => index > 0 && working[index - 1] > value)) {
      const result = 'Binary search requires a sorted array.'
      snapshot(result, 0, 'error', [], { result })
      return output
    }

    if (!working.length && target === undefined) {
      snapshot('Cannot search an empty array without a target value.', 0, 'error', [], { result: 'Array is empty.' })
    } else {
    if (algorithm === 'search.binary') snapshot(`Initialize range low=0 and high=${working.length - 1}.`, 0, 'range', [], { low: 0, high: working.length - 1, target })
    let low = 0
    let high = working.length - 1
    let found = -1
    while (low <= high) {
      const index = algorithm === 'search.binary' ? Math.floor((low + high) / 2) : low
      snapshot(`Compare ${working[index]} with target ${target}.`, 1, 'compare', [index], { low, high, target })
      if (working[index] === target) {
        found = index
        break
      }
      if (algorithm === 'search.binary') {
        if (working[index] < target) low = index + 1
        else high = index - 1
        snapshot(`Narrow search range to ${low}–${high}.`, 3, 'narrow', [], { low, high, target })
      } else {
        low++
        snapshot(`Advance to index ${low}.`, 2, 'advance', low < working.length ? [low] : [], { low, high, target })
      }
    }
    const result = found >= 0 ? `Found ${target} at index ${found}.` : `${target} was not found.`
    const resultLine = algorithm === 'search.linear' ? 3 : found >= 0 ? 2 : 4
    immutableStep(output, { ...state, values: [...working], active: found >= 0 ? [found] : [], low, high, target, result }, result, resultLine, 'result', found >= 0 ? [found] : [])
    }
  }

  const lastOperation = output.at(-1)?.operation
  if (output.length === 0 || (lastOperation !== 'complete' && lastOperation !== 'error' && lastOperation !== 'underflow' && lastOperation !== 'not-found')) {
    const isSearch = algorithm === 'search.linear' || algorithm === 'search.binary'
    const lastStep = output.at(-1)
    const lastArrayState = lastStep?.state.kind === 'array' ? lastStep.state : undefined
    const result = lastArrayState?.result ?? (isSearch ? undefined : `Final: ${working.join(', ')}`)
    const active = lastArrayState?.active ?? []
    immutableStep(output, { ...(isSearch && lastArrayState ? lastArrayState : state), values: [...working], active: [...active], result }, isSearch ? lastStep?.description ?? 'Search complete.' : `Operation complete. Result: ${working.join(', ')}.`, Math.max(0, output.length ? output[output.length - 1].pseudocodeLine : 0), 'complete')
  }
  return output
}

function buildStackSteps(state: DsaState, input: number | undefined, operation: string): AlgorithmStep<DsaState>[] {
  if (state.kind !== 'stack') throw new TypeError('Stack operation requires stack state.')
  state = withStackValues({ ...state, result: undefined }, state.values)
  const values = [...state.values]
  const output: AlgorithmStep<DsaState>[] = []
  const push = (next: StackState, description: string, line: number, op: StackState['operation']) =>
    immutableStep(output, withStackValues(next, next.values), description, line, op)

  if (operation === 'stack.push') {
    push({ ...state, operation: 'push', message: `Read input value ${input ?? 0}.` }, 'Read the input value.', 0, 'push')
    if (values.length >= state.capacity) {
      push({ ...state, operation: 'overflow', message: `Overflow: stack capacity is ${state.capacity}.` }, `Stack is full (${state.capacity}/${state.capacity}); push rejected.`, 1, 'overflow')
    } else {
      push({ ...state, operation: 'push', message: 'Capacity available.' }, 'Check whether the stack is full.', 1, 'push')
      values.push(input ?? 0)
      push({ ...state, values: [...values], operation: 'push', message: `Placed ${input ?? 0} on top.` }, 'Place the value on top.', 2, 'push')
      push({ ...state, values: [...values], operation: 'push', message: 'Update the top pointer.', result: input ?? 0 }, 'Update the top pointer.', 3, 'push')
      push({ ...state, values: [...values], operation: 'complete', message: `Push complete: ${input ?? 0}.`, result: input ?? 0 }, 'Confirm the push operation.', 4, 'complete')
    }
  } else if (operation === 'stack.pop') {
    push({ ...state, operation: 'pop', message: 'Check for an empty stack.' }, 'Check whether the stack is empty.', 0, 'pop')
    if (!values.length) {
      push({ ...state, operation: 'underflow', message: 'Underflow: cannot pop an empty stack.' }, 'Report stack underflow.', 0, 'underflow')
    } else {
      const result = values.at(-1)!
      push({ ...state, operation: 'pop', result, message: `Current top value is ${result}.` }, 'Read the current top value.', 1, 'pop')
      values.pop()
      push({ ...state, values: [...values], operation: 'pop', result, message: `Removed ${result} from the stack.` }, 'Remove the top value.', 2, 'pop')
      push({ ...state, values: [...values], operation: 'pop', result, message: values.length ? `Top moves to ${values.at(-1)}.` : 'Stack is now empty; top is undefined.' }, 'Move the top pointer.', 3, 'pop')
      push({ ...state, values: [...values], operation: 'complete', result, message: `Pop complete. Removed ${result}.` }, 'Display removed value.', 4, 'complete')
    }
  } else if (operation === 'stack.peek') {
    push({ ...state, operation: 'peek', message: 'Check for an empty stack.' }, 'Check whether the stack is empty.', 0, 'peek')
    if (!values.length) push({ ...state, operation: 'underflow', message: 'Underflow: cannot peek an empty stack.' }, 'Report stack underflow.', 0, 'underflow')
    else {
      const result = values.at(-1)!
      push({ ...state, operation: 'peek', result, message: `Read top value ${result}; values are unchanged.` }, 'Read current top value.', 1, 'peek')
      push({ ...state, operation: 'peek', result, message: 'Stack remains unchanged.' }, 'Preserve the stack contents.', 2, 'peek')
      push({ ...state, operation: 'complete', result, message: `Peek result: ${result}.` }, 'Display peek result.', 3, 'complete')
    }
  } else if (operation === 'stack.clear') {
    push({ ...state, values: [], operation: 'complete', result: undefined, message: 'Stack cleared.' }, 'Clear all stack values.', 0, 'complete')
  } else {
    const next = (values.length ? values : [12, 28, 41]).slice(0, state.capacity)
    push({ ...state, values: next, operation: 'complete', result: next.at(-1), message: 'Loaded sample values.' }, 'Load sample stack values.', 0, 'complete')
  }
  return output
}

function withStackValues(state: StackState, values: number[]): StackState {
  return {
    ...state,
    values: [...values],
    topIndex: values.length - 1,
    bottomIndex: values.length ? 0 : -1,
  }
}

function simpleSteps<TState extends DsaState>(_state: TState, changes: Array<{ state: TState; description: string; line: number; operation: string; indices?: number[] }>): AlgorithmStep<TState>[] {
  return changes.map((change, id) => ({
    id,
    state: structuredClone(change.state),
    description: change.description,
    pseudocodeLine: change.line,
    operation: change.operation,
    ...(change.indices ? { highlightedIndices: [...change.indices] } : {}),
  }))
}

export const stationInitialStates: Record<string, DsaState> = {
  arrays: arrayInitial,
  'linked-lists': listInitial,
  stacks: stackInitial,
  queues: queueInitial,
  trees: treeInitial,
  graphs: graphInitial,
  hashes: hashInitial,
  searching: searchInitial,
}

const registryEntries: AlgorithmDefinition[] = []
function register(id: string, stationId: string, title: string, complexity: string, pseudocode: string[], initialState: DsaState, builder: (state: DsaState, input?: number, index?: number) => AlgorithmStep<DsaState>[]): void {
  const sessionPseudocode = id === 'stack.push'
    ? pseudocode
    : [`Initialize ${title} with the current input.`, ...pseudocode]
  registryEntries.push({ id, stationId, title, complexity, pseudocode: sessionPseudocode, initialState, buildSteps: builder, complete: (state) => {
    if (state.kind === 'array') return state.result !== undefined
    if (state.kind === 'stack' || state.kind === 'queue') return state.operation === 'complete' || state.operation === 'overflow' || state.operation === 'underflow'
    if (state.kind === 'list' || state.kind === 'tree' || state.kind === 'graph' || state.kind === 'hash') return Boolean(state.message)
    return false
  } })
}

for (const [id, title] of [['sort.bubble', 'Bubble Sort'], ['sort.selection', 'Selection Sort'], ['sort.insertion', 'Insertion Sort'], ['sort.merge', 'Merge Sort'], ['sort.quick', 'Quick Sort']] as const) {
  register(id, 'arrays', title, id === 'sort.merge' ? 'Time O(n log n) · Space O(n)' : id === 'sort.quick' ? 'Time O(n log n) avg · Space O(log n)' : 'Time O(n²) · Space O(1)', ['Choose adjacent or candidate values.', 'Compare values.', 'Update the array.', 'Continue until ordered.'], arrayInitial, (state) => buildArraySteps(state, undefined, id))
}
for (const [id, title] of [['array.access', 'Array Access'], ['array.insert', 'Array Insert'], ['array.delete', 'Array Delete'], ['array.reverse', 'Array Reverse'], ['search.linear', 'Linear Search'], ['search.binary', 'Binary Search']] as const) {
  register(id, id.startsWith('search') ? 'searching' : 'arrays', title, id === 'search.binary' ? 'Time O(log n) · Space O(1)' : 'Time O(n) · Space O(1)', id === 'search.binary' ? ['Initialize low and high.', 'Compare the midpoint to target.', 'Return when equal.', 'Narrow to the next half.', 'Report not found.'] : id === 'search.linear' ? ['Initialize the current index.', 'Compare value with target.', 'Advance when not equal.', 'Report found or not found.'] : ['Read the value or index.', 'Inspect or modify the array.', 'Shift values when needed.', 'Report the result.'], id.startsWith('search') ? searchInitial : arrayInitial, (state, input) => buildArraySteps(state, input, id))
}
for (const [id, title] of [['stack.push', 'Stack Push'], ['stack.pop', 'Stack Pop'], ['stack.peek', 'Stack Peek'], ['stack.clear', 'Stack Clear'], ['stack.randomize', 'Stack Randomize']] as const) {
  const pseudocode = id === 'stack.push'
    ? ['Read the input value.', 'Check whether the stack is full.', 'Place the value on top.', 'Update the top pointer.', 'Confirm the push operation.']
    : id === 'stack.pop'
      ? ['Check whether the stack is empty.', 'Read the current top value.', 'Remove the top value.', 'Move the top pointer.', 'Display removed value.']
      : id === 'stack.peek'
        ? ['Check whether the stack is empty.', 'Read current top value.', 'Preserve the stack contents.', 'Display peek result.']
        : id === 'stack.clear'
          ? ['Clear all stack values.']
          : ['Load sample stack values.']
  register(id, 'stacks', title, 'Time O(1) · Space O(n)', pseudocode, stackInitial, (state, input) => buildStackSteps(state, input, id))
}
for (const [id, title] of [['queue.enqueue', 'Queue Enqueue'], ['queue.dequeue', 'Queue Dequeue'], ['queue.peek', 'Queue Peek'], ['queue.clear', 'Queue Clear']] as const) {
  register(id, 'stacks', title, 'Time O(1) · Space O(n)', ['Check capacity or emptiness.', 'Update front or rear.', 'Report operation result.'], queueInitial, (state, input) => {
    if (state.kind !== 'queue') throw new TypeError('Queue operation requires queue state.')
    const values = [...state.values]
    let next: DsaState = { ...state, operation: 'complete', result: undefined, message: '' }
    if (id === 'queue.enqueue') {
      if (values.length >= state.capacity) next = { ...state, operation: 'overflow', message: 'Queue capacity reached; enqueue rejected.' }
      else { values.push(input ?? 0); next = { ...state, values, operation: 'complete', result: input ?? 0, message: `Enqueued ${input ?? 0}.` } }
    } else if (id === 'queue.dequeue' || id === 'queue.peek') {
      if (!values.length) next = { ...state, operation: 'underflow', message: `Underflow: cannot ${id.endsWith('peek') ? 'peek' : 'dequeue'} an empty queue.` }
      else {
        const result = values[0]
        if (id === 'queue.dequeue') values.shift()
        next = { ...state, values, operation: 'complete', result, message: `${id.endsWith('peek') ? 'Front value' : 'Dequeued'}: ${result}.` }
      }
    } else next = { ...state, values: [], operation: 'complete', message: 'Queue cleared.' }
    return simpleSteps(state, [
      { state: { ...state, operation: id.split('.')[1] as 'enqueue' | 'dequeue' | 'peek', message: 'Check current queue state.' }, description: 'Inspect queue capacity and endpoints.', line: 0, operation: 'inspect' },
      { state: next, description: next.message ?? 'Queue operation complete.', line: 1, operation: id.split('.')[1] },
    ])
  })
}

const listDefinitions = [
  ['list.insert-head', 'Insert at Head'], ['list.insert-tail', 'Insert at Tail'], ['list.insert-index', 'Insert at Index'],
  ['list.delete', 'Delete by Value'], ['list.search', 'Search List'], ['list.reverse', 'Reverse List'],
] as const
for (const [id, title] of listDefinitions) {
  register(id, 'linked-lists', title, 'Time O(n) · Space O(1)', ['Locate the target position.', 'Update node links.', 'Confirm the list state.'], listInitial, (state, input, requestedIndex) => {
    if (state.kind !== 'list') throw new TypeError('Linked list operation requires list state.')
    const nodes = state.nodes.map((node) => ({ ...node }))
    const value = input ?? 25
    const steps: AlgorithmStep<DsaState>[] = []
    const emit = (nextNodes: LinkedNode[], activeId: number | undefined, message: string, line: number) =>
      immutableStep(steps, { ...state, nodes: nextNodes.map((node) => ({ ...node })), activeId, operation: id, message }, message, line, id)
    const newId = Math.max(0, ...nodes.map((node) => node.id)) + 1

    if (id === 'list.insert-head') {
      emit(nodes, nodes[0]?.id, 'Inspect the current head pointer.', 0)
      emit([{ id: newId, value }, ...nodes], newId, `Inserted ${value} at the head.`, 1)
    } else if (id === 'list.insert-tail' || id === 'list.insert-index') {
      const index = id === 'list.insert-tail' ? nodes.length : requestedIndex ?? Math.floor(nodes.length / 2)
      if (index < 0 || index > nodes.length) throw new RangeError(`Insert index must be between 0 and ${nodes.length}.`)
      for (const node of nodes.slice(0, index)) emit(nodes, node.id, `Follow next pointer from ${node.value}.`, 0)
      const nextNodes = [...nodes.slice(0, index), { id: newId, value }, ...nodes.slice(index)]
      emit(nextNodes, newId, `Inserted ${value} at index ${index}.`, 1)
    } else if (id === 'list.delete' || id === 'list.search') {
      const target = nodes.find((node) => node.value === value)
      for (const node of nodes) {
        emit(nodes, node.id, `Compare node ${node.value} with ${value}.`, 0)
        if (node.value === value) break
      }
      if (id === 'list.search') emit(nodes, target?.id, target ? `Found ${value}.` : `Not found: ${value}.`, 2)
      else if (target) emit(nodes.filter((node) => node.id !== target.id), undefined, `Deleted ${value}.`, 1)
      else emit(nodes, undefined, `Not found: ${value}.`, 1)
    } else {
      let reversed: LinkedNode[] = []
      for (let index = 0; index < nodes.length; index += 1) {
        const node = nodes[index]
        emit([...reversed, ...nodes.slice(index)], node.id, `Reverse the next pointer for node ${node.value}.`, 0)
        reversed = [node, ...reversed]
        emit([...reversed, ...nodes.slice(index + 1)], node.id, `Node ${node.value} now points to its previous neighbor.`, 1)
      }
      emit(reversed, reversed[0]?.id, `${title} complete.`, 2)
    }
    return steps
  })
}

const treeOperations = [
  ['tree.insert', 'BST Insert'], ['tree.search', 'BST Search'], ['tree.inorder', 'In-order Traversal'],
  ['tree.preorder', 'Pre-order Traversal'], ['tree.postorder', 'Post-order Traversal'], ['tree.levelorder', 'Level-order Traversal'],
] as const
for (const [id, title] of treeOperations) {
  register(id, 'trees', title, 'Time O(n) · Space O(h)', ['Inspect current node.', 'Choose child or visit node.', 'Continue until complete.'], treeInitial, (state, input) => {
    if (state.kind !== 'tree') throw new TypeError('Tree operation requires tree state.')
    let nodes = state.nodes.map((node) => ({ ...node }))
    const value = input ?? 25
    const visited: number[] = []
    const steps: AlgorithmStep<DsaState>[] = []
    const snap = (description: string, line: number, activeValue?: number) => immutableStep(steps, { ...state, nodes: nodes.map((node) => ({ ...node })), activeValue, visited: [...visited], traversal: [...visited], message: description }, description, line, id)
    if (id === 'tree.insert') {
      const alreadyExists = nodes.some((node) => node.value === value)
      if (!alreadyExists) {
        let current = nodes.find((node) => node.parent === undefined)
        while (current) {
          snap(`Compare ${value} with ${current.value}.`, 0, current.value)
          const side = value < current.value ? 'left' : 'right'
          const child = nodes.find((node) => node.parent === current?.value && node.side === side)
          if (!child) {
            nodes.push({ value, parent: current.value, side })
            break
          }
          current = child
        }
      }
      snap(alreadyExists ? `Value ${value} already exists; tree unchanged.` : `Inserted ${value}.`, 2, value)
    } else if (id === 'tree.search') {
      let current = nodes.find((node) => node.parent === undefined)
      while (current) {
        snap(`Compare target ${value} with ${current.value}.`, 0, current.value)
        if (current.value === value) { visited.push(value); break }
        const side = value < current.value ? 'left' : 'right'
        current = nodes.find((node) => node.parent === current?.value && node.side === side)
      }
      snap(visited.length ? `Found ${value}.` : `Not found: ${value}.`, 2, visited.at(-1))
    } else {
      const visit = (node: (typeof nodes)[number] | undefined): void => {
        if (!node) return
        if (id === 'tree.preorder') { visited.push(node.value); snap(`Visit ${node.value}.`, 0, node.value) }
        visit(nodes.find((child) => child.parent === node.value && child.side === 'left'))
        if (id === 'tree.inorder') { visited.push(node.value); snap(`Visit ${node.value}.`, 1, node.value) }
        visit(nodes.find((child) => child.parent === node.value && child.side === 'right'))
        if (id === 'tree.postorder') { visited.push(node.value); snap(`Visit ${node.value}.`, 2, node.value) }
      }
      if (id === 'tree.levelorder') {
        const pending = nodes.filter((node) => node.parent === undefined)
        while (pending.length) {
          const node = pending.shift()!
          visited.push(node.value)
          snap(`Visit ${node.value} in level order.`, 0, node.value)
          pending.push(...nodes.filter((child) => child.parent === node.value))
        }
      } else visit(nodes.find((node) => node.parent === undefined))
      snap(`Traversal complete: ${visited.join(', ')}.`, 2)
    }
    return steps
  })
}

for (const [id, title] of [['graph.bfs', 'Breadth-first Search'], ['graph.dfs', 'Depth-first Search'], ['graph.add-node', 'Add Graph Node'], ['graph.add-edge', 'Add Graph Edge']] as const) {
  register(id, 'graphs', title, 'Time O(V + E) · Space O(V)', ['Select a start vertex.', 'Visit neighbors.', 'Track frontier and visited vertices.'], graphInitial, (state, input) => {
    if (state.kind !== 'graph') throw new TypeError('Graph operation requires graph state.')
    const steps: AlgorithmStep<DsaState>[] = []
    const visited: string[] = []
    const frontier = state.nodes[0] ? [state.nodes[0]] : []
    const parent = new Map<string, string>()
    const snap = (description: string, activeEdge?: [string, string]) => immutableStep(steps, { ...state, visited: [...visited], frontier: [...frontier], path: [], activeEdge, message: description }, description, 1, id)
    if (id === 'graph.add-node') {
      const node = String.fromCharCode(65 + state.nodes.length)
      return simpleSteps(state, [{ state: { ...state, nodes: [...state.nodes, node], message: `Added node ${node}.` }, description: `Added node ${node}.`, line: 1, operation: id }])
    }
    if (id === 'graph.add-edge') {
      if (state.nodes.length < 2) throw new RangeError('Add at least two graph nodes before adding an edge.')
      if (input !== undefined && !Number.isInteger(input)) throw new RangeError('Graph edge target must be a node index.')
      const targetIndex = Math.abs(input ?? state.nodes.length - 1) % state.nodes.length || 1
      const edge: [string, string] = [state.nodes[0], state.nodes[targetIndex]]
      return simpleSteps(state, [{ state: { ...state, edges: [...state.edges, edge], message: `Added edge ${edge.join('–')}.` }, description: `Added edge ${edge.join('–')}.`, line: 1, operation: id }])
    }
    while (frontier.length) {
      const node = id === 'graph.bfs' ? frontier.shift()! : frontier.pop()!
      if (visited.includes(node)) continue
      visited.push(node)
      snap(`Visit vertex ${node}.`)
      const neighbors = state.edges.flatMap(([from, to]) => from === node ? [to] : to === node ? [from] : [])
        .filter((neighbor) => !visited.includes(neighbor) && !frontier.includes(neighbor))
      for (const neighbor of neighbors) {
        parent.set(neighbor, node)
        frontier.push(neighbor)
        snap(`Add ${neighbor} to the frontier.`, [node, neighbor])
      }
    }
    const path: string[] = []
    for (let node = visited.at(-1); node; node = parent.get(node) ?? '') path.unshift(node)
    immutableStep(steps, { ...state, visited: [...visited], frontier: [], path, message: `Traversal complete: ${visited.join(' → ')}.` }, `Traversal complete: ${visited.join(' → ')}.`, 2, id)
    return steps
  })
}

for (const [id, title] of [['hash.insert', 'Hash Insert'], ['hash.search', 'Hash Search'], ['hash.delete', 'Hash Delete']] as const) {
  register(id, 'hashes', title, 'Time O(1) average · Space O(n)', ['Compute hash index.', 'Check bucket for collisions.', 'Update or report bucket state.'], hashInitial, (state, input) => {
    if (state.kind !== 'hash') throw new TypeError('Hash operation requires table state.')
    const buckets = state.buckets.map((bucket) => [...bucket])
    const value = input ?? 29
    if (!Number.isInteger(value)) throw new RangeError('Hash table keys must be integers.')
    const index = Math.abs(value) % buckets.length
    const sequence = [index]
    const steps: AlgorithmStep<DsaState>[] = []
    immutableStep(steps, { ...state, buckets: buckets.map((bucket) => [...bucket]), activeBucket: index, probeSequence: [...sequence], message: `Hash ${value} to bucket ${index}.` }, `Hash ${value} to bucket ${index}.`, 0, id)
    if (id === 'hash.insert') {
      if (buckets[index].length) immutableStep(steps, { ...state, buckets: buckets.map((bucket) => [...bucket]), activeBucket: index, probeSequence: [...sequence], message: `Collision at bucket ${index}; chain value in bucket.` }, `Collision at bucket ${index}.`, 1, 'collision')
      if (!buckets[index].includes(value)) buckets[index].push(value)
      immutableStep(steps, { ...state, buckets, activeBucket: index, probeSequence: sequence, message: `Inserted ${value} into bucket ${index}.` }, `Inserted ${value}.`, 2, id)
    } else if (id === 'hash.search') {
      const found = buckets[index].includes(value)
      immutableStep(steps, { ...state, buckets: buckets.map((bucket) => [...bucket]), activeBucket: index, probeSequence: sequence, result: found ? 'found' : 'not found', message: found ? `Found ${value} in bucket ${index}.` : `Not found: ${value}.` }, found ? `Found ${value}.` : `Not found: ${value}.`, 2, id)
    } else {
      buckets[index] = buckets[index].filter((candidate) => candidate !== value)
      immutableStep(steps, { ...state, buckets, activeBucket: index, probeSequence: sequence, message: `Deleted ${value} if it was present.` }, `Delete ${value} from bucket ${index}.`, 2, id)
    }
    return steps
  })
}

export const algorithmRegistry: AlgorithmDefinition[] = registryEntries
export const algorithmsForStation = (stationId: string) => algorithmRegistry.filter((algorithm) => algorithm.stationId === stationId)
export const getAlgorithmDefinition = (id: string) => algorithmRegistry.find((algorithm) => algorithm.id === id)

export function createAlgorithmSession(id: string, input?: number, stateOverride?: DsaState, index?: number): AlgorithmSession<DsaState> {
  const definition = getAlgorithmDefinition(id)
  if (!definition) throw new Error(`Unknown algorithm: ${id}`)
  if (input !== undefined && !Number.isFinite(input)) throw new RangeError('Algorithm input must be a finite number.')
  const state = structuredClone(stateOverride ?? definition.initialState)
  if (index !== undefined && (!Number.isInteger(index) || index < 0)) throw new RangeError('Algorithm index must be a non-negative integer.')
  const generatedSteps = definition.buildSteps(state, input, index)
  if (!generatedSteps.length) throw new Error(`${definition.title} did not produce any execution steps.`)
  const steps = id === 'stack.push'
    ? generatedSteps.map((step, stepIndex) => ({ ...step, id: stepIndex }))
    : [
        { id: 0, state: structuredClone(state), description: `Initialize ${definition.title} with the current input.`, pseudocodeLine: 0, operation: 'initialize' },
        ...generatedSteps.map((step, stepIndex) => ({ ...step, id: stepIndex + 1, pseudocodeLine: step.pseudocodeLine + 1 })),
      ]
  return createSession(state, steps)
}

export function createStackInitialState(capacity = 5, values: number[] = []): Extract<DsaState, { kind: 'stack' }> {
  if (!Number.isInteger(capacity) || capacity < 1) throw new RangeError('Stack capacity must be a positive integer.')
  if (values.length > capacity) throw new RangeError('Stack values exceed the configured capacity.')
  if (values.some((value) => !Number.isFinite(value))) throw new RangeError('Stack values must be finite numbers.')
  return withStackValues({ kind: 'stack', values: [], capacity, topIndex: -1, bottomIndex: -1, operation: 'idle', message: values.length ? undefined : 'Stack is empty.' }, values)
}

export function createStackSession(operation: 'push' | 'pop' | 'peek' | 'clear' | 'randomize', state: Extract<DsaState, { kind: 'stack' }>, value?: number): AlgorithmSession<DsaState> {
  if (operation === 'push' && (value === undefined || !Number.isFinite(value))) throw new RangeError('Enter a finite number to push.')
  const id = operation === 'randomize' ? 'stack.randomize' : `stack.${operation}`
  return createAlgorithmSession(id, value, state)
}
