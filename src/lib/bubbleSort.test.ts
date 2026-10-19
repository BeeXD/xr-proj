import { createBubbleSortSteps, createRandomBubbleSortInput, DEFAULT_BUBBLE_SORT_INPUT } from './bubbleSort'
import { useAppStore } from '../store/useAppStore'

describe('Bubble Sort steps', () => {
  it('produces deterministic compare, swap, and sorted snapshots without mutating input', () => {
    const input = [4, 2, 3]
    const original = [...input]
    const steps = createBubbleSortSteps(input)

    expect(input).toEqual(original)
    expect(steps).toEqual(createBubbleSortSteps(input))
    expect(steps[0].values).toEqual([4, 2, 3])
    expect(steps[1]).toMatchObject({ line: 1, label: 'Compare neighbors', values: [4, 2, 3], active: [0, 1] })
    expect(steps[2]).toMatchObject({ line: 2, label: 'Swap', values: [2, 4, 3], active: [0, 1] })
    expect(steps.at(-1)).toMatchObject({ line: 4, label: 'Sorted', values: [2, 3, 4] })
    expect(steps.every((step, index) => step.id === index)).toBe(true)
  })

  it('stops early when an input is already sorted', () => {
    const steps = createBubbleSortSteps([1, 2, 3])

    expect(steps.some((step) => step.label === 'No swaps')).toBe(true)
    expect(steps.at(-1)?.values).toEqual([1, 2, 3])
  })

  it('creates a new valid permutation using the supplied random source', () => {
    const input = createRandomBubbleSortInput(() => 0)

    expect(input).toEqual([20, 30, 40, 50, 60, 10])
    expect([...input].sort((a, b) => a - b)).toEqual([10, 20, 30, 40, 50, 60])
    expect(() => createRandomBubbleSortInput(() => 1)).toThrow(RangeError)
  })
})

describe('Bubble Sort Zustand controls', () => {
  beforeEach(() => {
    useAppStore.getState().resetBubbleSort()
  })

  it('advances, clamps previous at zero, and resets to the initial input', () => {
    const store = useAppStore.getState()
    store.nextBubbleSortStep()
    expect(useAppStore.getState().currentStepIndex).toBe(1)

    store.previousBubbleSortStep()
    store.previousBubbleSortStep()
    expect(useAppStore.getState().currentStepIndex).toBe(0)

    store.nextBubbleSortStep()
    store.resetBubbleSort()
    expect(useAppStore.getState().currentStepIndex).toBe(0)
    expect(useAppStore.getState().bubbleSortSteps[0].values).toEqual(DEFAULT_BUBBLE_SORT_INPUT)
  })

  it('completes at the sorted final snapshot and stops playback', () => {
    const store = useAppStore.getState()
    store.setBubbleSortPlaying(true)

    for (let index = 0; index < useAppStore.getState().bubbleSortSteps.length + 1; index += 1) {
      useAppStore.getState().advanceBubbleSort()
    }

    const state = useAppStore.getState()
    expect(state.currentStepIndex).toBe(state.bubbleSortSteps.length - 1)
    expect(state.bubbleSortSteps[state.currentStepIndex].values).toEqual([...DEFAULT_BUBBLE_SORT_INPUT].sort((a, b) => a - b))
    expect(state.isBubbleSortPlaying).toBe(false)
  })

  it('randomizes input and regenerates snapshots from that input', () => {
    useAppStore.getState().nextBubbleSortStep()
    useAppStore.getState().randomizeBubbleSort(() => 0)

    const state = useAppStore.getState()
    expect(state.bubbleSortInput).toEqual([20, 30, 40, 50, 60, 10])
    expect(state.currentStepIndex).toBe(0)
    expect(state.bubbleSortSteps[0].values).toEqual(state.bubbleSortInput)
    expect(state.bubbleSortSteps.at(-1)?.values).toEqual([10, 20, 30, 40, 50, 60])
  })
})
