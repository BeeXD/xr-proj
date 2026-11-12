import {
  algorithmRegistry,
  algorithmsForStation,
  createAlgorithmSession,
  currentSnapshot,
  nextStep,
  previousStep,
  randomizeArray,
  resetSession,
  treeLayout,
  type DsaState,
} from './execution'

const finalState = (session: ReturnType<typeof createAlgorithmSession>) => session.steps.at(-1)!.state
const stack = (capacity: number, values: number[] = []): DsaState => ({ kind: 'stack', values, capacity, topIndex: values.length - 1, bottomIndex: values.length ? 0 : -1, operation: 'idle' })

describe('typed algorithm registry', () => {
  it('registers working algorithms for every dashboard station with synchronized pseudocode lines', () => {
    const stations = ['arrays', 'linked-lists', 'stacks', 'trees', 'graphs', 'hashes', 'searching']
    for (const station of stations) expect(algorithmsForStation(station).length).toBeGreaterThan(0)
    for (const algorithm of algorithmRegistry) {
      const steps = algorithm.buildSteps(algorithm.initialState, 25)
      expect(steps.length).toBeGreaterThan(0)
      for (const step of steps) {
        expect(step.pseudocodeLine).toBeGreaterThanOrEqual(0)
        expect(step.pseudocodeLine).toBeLessThan(algorithm.pseudocode.length)
      }
      const linear = createAlgorithmSession('search.linear', 9)
      expect(linear.steps.find((step) => step.operation === 'compare')?.pseudocodeLine).toBe(2)
      const binary = createAlgorithmSession('search.binary', 16)
      expect(binary.steps.find((step) => step.operation === 'compare')?.pseudocodeLine).toBe(2)
      const stackPush = createAlgorithmSession('stack.push', 25)
      expect(stackPush.steps.find((step) => step.description === 'Place the value on top.')?.pseudocodeLine).toBe(3)
    }
  })

  it.each(['sort.bubble', 'sort.selection', 'sort.insertion', 'sort.merge', 'sort.quick'])('%s sorts through real intermediate snapshots without mutating input', (id) => {
    const input = [7, 2, 6, 1, 4]
    const state: DsaState = { kind: 'array', values: input, active: [] }
    const session = createAlgorithmSession(id, undefined, state)
    expect((finalState(session) as Extract<DsaState, { kind: 'array' }>).values).toEqual([1, 2, 4, 6, 7])
    expect(input).toEqual([7, 2, 6, 1, 4])
    expect(new Set(session.steps.map((step) => (step.state as Extract<DsaState, { kind: 'array' }>).values.join(','))).size).toBeGreaterThan(1)
  })

  it('supports array access, insert, delete, reverse and search results', () => {
    const state: DsaState = { kind: 'array', values: [4, 9, 2], active: [] }
    expect((finalState(createAlgorithmSession('array.access', 1, state)) as Extract<DsaState, { kind: 'array' }>).active).toEqual([1])
    expect((finalState(createAlgorithmSession('array.insert', 7, state)) as Extract<DsaState, { kind: 'array' }>).values).toEqual([4, 9, 2, 7])
    expect((finalState(createAlgorithmSession('array.delete', 9, state)) as Extract<DsaState, { kind: 'array' }>).values).toEqual([4, 2])
    expect((finalState(createAlgorithmSession('array.reverse', undefined, state)) as Extract<DsaState, { kind: 'array' }>).values).toEqual([2, 9, 4])
    expect((finalState(createAlgorithmSession('search.linear', 9, state)) as Extract<DsaState, { kind: 'array' }>).result).toContain('Found 9')
    const sorted: DsaState = { kind: 'array', values: [2, 4, 9], active: [] }
    expect((finalState(createAlgorithmSession('search.binary', 12, sorted)) as Extract<DsaState, { kind: 'array' }>).result).toContain('not found')
  })

  it('handles empty arrays and invalid array operations without throwing or hiding the result', () => {
    const empty: DsaState = { kind: 'array', values: [], active: [] }
    const deleted = finalState(createAlgorithmSession('array.delete', 5, empty)) as Extract<DsaState, { kind: 'array' }>
    expect(deleted.result).toBe('Array is empty.')
    const missingTarget = finalState(createAlgorithmSession('search.linear', undefined, empty)) as Extract<DsaState, { kind: 'array' }>
    expect(missingTarget.result).toBe('Array is empty.')
    expect(() => createAlgorithmSession('array.access', 0.5, empty)).not.toThrow()
    expect((finalState(createAlgorithmSession('array.access', 0.5, empty)) as Extract<DsaState, { kind: 'array' }>).result).toContain('Invalid index')
    expect((finalState(createAlgorithmSession('array.insert', 8, empty)) as Extract<DsaState, { kind: 'array' }>).values).toEqual([8])
    const unsorted: DsaState = { kind: 'array', values: [3, 1, 2], active: [] }
    expect((finalState(createAlgorithmSession('search.binary', 1, unsorted)) as Extract<DsaState, { kind: 'array' }>).result).toContain('requires a sorted array')
  })

  it('keeps array insertion within the editor size limit', () => {
    const values = Array.from({ length: 16 }, (_, index) => index)
    const fullArray: DsaState = { kind: 'array', values, active: [] }
    const session = createAlgorithmSession('array.insert', 16, fullArray)
    const result = finalState(session) as Extract<DsaState, { kind: 'array' }>

    expect(result.values).toEqual(values)
    expect(result.result).toBe('Array limit is 16 values.')
    expect(session.steps.at(-1)?.operation).toBe('error')
  })

  it('steps through stack push, pop, peek, clear, overflow, underflow, and reset', () => {
    const empty = stack(2)
    const push = createAlgorithmSession('stack.push', 17, empty)
    expect(push.steps).toHaveLength(6)
    expect(push.steps.map((step) => step.description)).toEqual([
      'Initialize Stack Push with the current input.',
      'Read the input value.',
      'Check whether the stack is full.',
      'Place the value on top.',
      'Update the top pointer.',
      'Confirm the push operation.',
    ])
    expect(push.steps.every((step) => step.pseudocodeLine >= 0 && step.pseudocodeLine < algorithmRegistry.find((item) => item.id === 'stack.push')!.pseudocode.length)).toBe(true)
    expect(push.steps[4].pseudocodeLine).toBe(4)
    expect(push.steps[4].description).toBe('Update the top pointer.')
    expect((push.steps[4].state as Extract<DsaState, { kind: 'stack' }>)).toMatchObject({ values: [17], topIndex: 0, bottomIndex: 0, result: 17 })
    expect((finalState(push) as Extract<DsaState, { kind: 'stack' }>).result).toBe(17)
    const overflow = createAlgorithmSession('stack.push', 3, stack(1, [8]))
    expect((finalState(overflow) as Extract<DsaState, { kind: 'stack' }>).operation).toBe('overflow')
    let overflowAtEnd = overflow
    while (overflowAtEnd.currentStepIndex < overflowAtEnd.steps.length - 1) overflowAtEnd = nextStep(overflowAtEnd)
    expect(overflowAtEnd.status).toBe('error')
    expect((finalState(createAlgorithmSession('stack.pop', undefined, empty)) as Extract<DsaState, { kind: 'stack' }>).operation).toBe('underflow')
    expect((finalState(createAlgorithmSession('stack.peek', undefined, empty)) as Extract<DsaState, { kind: 'stack' }>).operation).toBe('underflow')
    const filled = stack(3, [5, 11])
    expect((finalState(createAlgorithmSession('stack.peek', undefined, filled)) as Extract<DsaState, { kind: 'stack' }>).values).toEqual([5, 11])
    expect((finalState(createAlgorithmSession('stack.pop', undefined, filled)) as Extract<DsaState, { kind: 'stack' }>).values).toEqual([5])
    expect((finalState(createAlgorithmSession('stack.clear', undefined, filled)) as Extract<DsaState, { kind: 'stack' }>).values).toEqual([])
    expect(currentSnapshot(resetSession(push))).toEqual(push.steps[0].state)
    expect(resetSession(push)).toMatchObject({ currentStepIndex: 0, status: 'idle' })
  })

  it('executes queue operations and reports empty and capacity states', () => {
    const state: DsaState = { kind: 'queue', values: [4], capacity: 2, operation: 'idle' }
    expect((finalState(createAlgorithmSession('queue.enqueue', 9, state)) as Extract<DsaState, { kind: 'queue' }>).values).toEqual([4, 9])
    expect((finalState(createAlgorithmSession('queue.enqueue', 9, { ...state, values: [4, 6] })) as Extract<DsaState, { kind: 'queue' }>).operation).toBe('overflow')
    expect((finalState(createAlgorithmSession('queue.dequeue', undefined, state)) as Extract<DsaState, { kind: 'queue' }>).values).toEqual([])
    expect((finalState(createAlgorithmSession('queue.peek', undefined, state)) as Extract<DsaState, { kind: 'queue' }>).values).toEqual([4])
    expect((finalState(createAlgorithmSession('queue.dequeue', undefined, { ...state, values: [] })) as Extract<DsaState, { kind: 'queue' }>).operation).toBe('underflow')
  })

  it('performs linked-list operations with stable node identifiers and index insertion', () => {
    const initial = algorithmRegistry.find((item) => item.id === 'list.insert-tail')!.initialState as Extract<DsaState, { kind: 'list' }>
    const first = finalState(createAlgorithmSession('list.insert-tail', 30, initial)) as Extract<DsaState, { kind: 'list' }>
    const second = finalState(createAlgorithmSession('list.insert-tail', 30, initial)) as Extract<DsaState, { kind: 'list' }>
    expect(first.nodes).toEqual(second.nodes)
    expect(first.nodes.at(-1)?.value).toBe(30)
    expect((finalState(createAlgorithmSession('list.insert-index', 30, initial, 1)) as Extract<DsaState, { kind: 'list' }>).nodes.map((node) => node.value)).toEqual([12, 30, 7, 19])
    expect((finalState(createAlgorithmSession('list.delete', 7, initial)) as Extract<DsaState, { kind: 'list' }>).nodes.map((node) => node.value)).toEqual([12, 19])
    expect((finalState(createAlgorithmSession('list.reverse', undefined, initial)) as Extract<DsaState, { kind: 'list' }>).nodes.map((node) => node.value)).toEqual([19, 7, 12])
    expect((finalState(createAlgorithmSession('list.search', 200, initial)) as Extract<DsaState, { kind: 'list' }>).message).toContain('Not found')
  })

  it('inserts, searches, and traverses a binary search tree', () => {
    const state = algorithmRegistry.find((item) => item.id === 'tree.insert')!.initialState
    const inserted = finalState(createAlgorithmSession('tree.insert', 5, state)) as Extract<DsaState, { kind: 'tree' }>
    expect(inserted.nodes.some((node) => node.value === 5)).toBe(true)
    expect(inserted.message).toBe('Inserted 5.')
    const duplicate = finalState(createAlgorithmSession('tree.insert', 12, state)) as Extract<DsaState, { kind: 'tree' }>
    expect(duplicate.message).toBe('Value 12 already exists; tree unchanged.')
    expect((finalState(createAlgorithmSession('tree.search', 7, state)) as Extract<DsaState, { kind: 'tree' }>).message).toContain('Found 7')
    expect((finalState(createAlgorithmSession('tree.inorder', undefined, state)) as Extract<DsaState, { kind: 'tree' }>).traversal).toEqual([7, 12, 19])
    expect((finalState(createAlgorithmSession('tree.preorder', undefined, state)) as Extract<DsaState, { kind: 'tree' }>).traversal).toEqual([12, 7, 19])
    expect((finalState(createAlgorithmSession('tree.postorder', undefined, state)) as Extract<DsaState, { kind: 'tree' }>).traversal).toEqual([7, 19, 12])
    expect((finalState(createAlgorithmSession('tree.levelorder', undefined, state)) as Extract<DsaState, { kind: 'tree' }>).traversal).toEqual([12, 7, 19])
  })

  it('lays out trees deeper than three levels without overlapping nodes', () => {
    const nodes = [
      { value: 50 },
      { value: 40, parent: 50, side: 'left' as const },
      { value: 60, parent: 50, side: 'right' as const },
      { value: 30, parent: 40, side: 'left' as const },
      { value: 45, parent: 40, side: 'right' as const },
      { value: 20, parent: 30, side: 'left' as const },
    ]
    const layout = treeLayout(nodes)
    expect(new Set([...layout.values()].map(([x, y]) => `${x},${y}`)).size).toBe(nodes.length)
    expect(layout.get(20)![1]).toBeLessThan(layout.get(30)![1])
    expect(layout.get(20)![0]).toBeLessThan(layout.get(30)![0])
  })

  it('runs graph traversal, reports a path, and mutates nodes and edges through snapshots', () => {
    const state = algorithmRegistry.find((item) => item.id === 'graph.bfs')!.initialState
    const bfs = finalState(createAlgorithmSession('graph.bfs', undefined, state)) as Extract<DsaState, { kind: 'graph' }>
    expect(bfs.visited).toEqual(['A', 'B', 'C', 'D', 'E'])
    expect(bfs.path[0]).toBe('A')
    expect(bfs.path.at(-1)).toBe('E')
    expect((finalState(createAlgorithmSession('graph.add-node', undefined, state)) as Extract<DsaState, { kind: 'graph' }>).nodes).toContain('F')
    expect((finalState(createAlgorithmSession('graph.add-edge', 1, state)) as Extract<DsaState, { kind: 'graph' }>).edges).toContainEqual(['A', 'B'])
  })

  it('handles hash collisions, lookup, and deletion using chaining', () => {
    const state = algorithmRegistry.find((item) => item.id === 'hash.insert')!.initialState
    expect((state as Extract<DsaState, { kind: 'hash' }>).buckets[5]).toEqual([5, 17])
    expect((finalState(createAlgorithmSession('hash.insert', 11, state)) as Extract<DsaState, { kind: 'hash' }>).buckets[5]).toEqual([5, 17, 11])
    expect((finalState(createAlgorithmSession('hash.search', 17, state)) as Extract<DsaState, { kind: 'hash' }>).result).toBe('found')
    expect((finalState(createAlgorithmSession('hash.delete', 5, state)) as Extract<DsaState, { kind: 'hash' }>).buckets[5]).toEqual([17])
  })

  it('navigates, completes, resets, and randomizes immutable sessions', () => {
    const original = [9, 4, 7]
    const session = createAlgorithmSession('sort.bubble', undefined, { kind: 'array', values: original, active: [] })
    const next = nextStep(session)
    expect(next.currentStepIndex).toBe(1)
    expect(previousStep(next).currentStepIndex).toBe(0)
    let completed = session
    while (completed.currentStepIndex < completed.steps.length - 1) completed = nextStep(completed)
    expect(completed.status).toBe('completed')
    expect(resetSession(completed).currentStepIndex).toBe(0)
    expect(currentSnapshot(resetSession(completed))).toEqual(completed.initialState)
    expect(original).toEqual([9, 4, 7])
    expect(randomizeArray(() => 0)).toEqual([20, 30, 40, 50, 60, 10])
  })
})
