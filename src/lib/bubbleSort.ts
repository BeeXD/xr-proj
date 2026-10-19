import type { AlgorithmStep } from '../data/algorithms'

export const BUBBLE_SORT_ENGINE_VERSION = 1
export const DEFAULT_BUBBLE_SORT_INPUT = [9, 4, 7, 3, 8, 1]

export function createBubbleSortSteps(input: readonly number[]): AlgorithmStep[] {
  if (input.some((value) => !Number.isFinite(value))) {
    throw new RangeError('Bubble Sort input must contain only finite numbers.')
  }

  const values = [...input]
  const steps: AlgorithmStep[] = [
    {
      id: 0,
      line: 0,
      label: 'Start pass',
      summary: `Begin with the unsorted array: ${values.join(', ') || 'empty'}.`,
      values: [...values],
      active: values.length > 1 ? [0, 1] : [],
    },
  ]

  for (let end = values.length - 1; end > 0; end -= 1) {
    if (end < values.length - 1) {
      steps.push({
        id: steps.length,
        line: 0,
        label: 'Start next pass',
        summary: 'Start another pass through the remaining unsorted values.',
        values: [...values],
        active: [0, 1],
      })
    }

    let swapped = false

    for (let index = 0; index < end; index += 1) {
      const left = values[index]
      const right = values[index + 1]

      steps.push({
        id: steps.length,
        line: 1,
        label: 'Compare neighbors',
        summary: `Compare ${left} and ${right} at positions ${index + 1} and ${index + 2}.`,
        values: [...values],
        active: [index, index + 1],
      })

      if (left > right) {
        values[index] = right
        values[index + 1] = left
        swapped = true

        steps.push({
          id: steps.length,
          line: 2,
          label: 'Swap',
          summary: `Swap ${left} and ${right}; the larger value moves one position right.`,
          values: [...values],
          active: [index, index + 1],
        })
      }
    }

    if (!swapped) {
      steps.push({
        id: steps.length,
        line: 3,
        label: 'No swaps',
        summary: 'This pass made no swaps, so the array is already sorted.',
        values: [...values],
        active: values.length > 1 ? [0, values.length - 1] : [],
      })
      break
    }

    steps.push({
      id: steps.length,
      line: 3,
      label: 'Pass complete',
      summary: 'The pass made swaps, so another pass is needed to confirm the array is sorted.',
      values: [...values],
      active: [0, end],
    })
  }

  steps.push({
    id: steps.length,
    line: 4,
    label: 'Sorted',
    summary: `Bubble Sort is complete. Final order: ${values.join(', ') || 'empty'}.`,
    values: [...values],
    active: values.map((_, index) => index),
  })

  return steps
}

export function createRandomBubbleSortInput(random: () => number = Math.random): number[] {
  const values = Array.from({ length: 6 }, (_, index) => (index + 1) * 10)

  for (let index = values.length - 1; index > 0; index -= 1) {
    const candidate = random()
    if (!Number.isFinite(candidate) || candidate < 0 || candidate >= 1) {
      throw new RangeError('Random source must return a number in the range [0, 1).')
    }
    const swapIndex = Math.floor(candidate * (index + 1))
    ;[values[index], values[swapIndex]] = [values[swapIndex], values[index]]
  }

  return values
}
