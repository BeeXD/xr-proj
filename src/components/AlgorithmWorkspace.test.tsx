import { act, fireEvent, render, screen } from '@testing-library/react'
import { AlgorithmWorkspace } from './AlgorithmWorkspace'
import { useAppStore } from '../store/useAppStore'

describe('Bubble Sort workspace controls', () => {
  beforeEach(() => {
    window.localStorage.clear()
    useAppStore.getState().selectAlgorithm('bubble-sort')
  })

  it('updates the visible array, pseudocode, explanation, and index through navigation controls', () => {
    render(<AlgorithmWorkspace />)

    expect(screen.getByRole('img', { name: 'Array: 9, 4, 7, 3, 8, 1' })).toBeInTheDocument()
    expect(screen.getByText('Begin with the unsorted array: 9, 4, 7, 3, 8, 1.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByText(`Step 2 / ${useAppStore.getState().bubbleSortSteps.length}`)).toBeInTheDocument()
    expect(document.querySelector('[data-active-line="true"]')).toHaveAttribute('aria-current', 'step')

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('img', { name: 'Array: 4, 9, 7, 3, 8, 1' })).toBeInTheDocument()
    expect(screen.getByText('Swap 9 and 4; the larger value moves one position right.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Prev' }))
    expect(screen.getByRole('img', { name: 'Array: 9, 4, 7, 3, 8, 1' })).toBeInTheDocument()
    expect(screen.getByText('Compare 9 and 4 at positions 1 and 2.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByText(`Step 1 / ${useAppStore.getState().bubbleSortSteps.length}`)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Array: 9, 4, 7, 3, 8, 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled()
  })

  it('randomizes input and regenerates the visible snapshots', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(<AlgorithmWorkspace />)

    fireEvent.click(screen.getByRole('button', { name: 'Randomize' }))

    expect(screen.getByText(`Step 1 / ${useAppStore.getState().bubbleSortSteps.length}`)).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Array: 20, 30, 40, 50, 60, 10' })).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('plays at the selected speed, pauses, and disables Next when complete', () => {
    vi.useFakeTimers()
    render(<AlgorithmWorkspace />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Playback speed' }), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Play algorithm' }))
    for (const expectedIndex of [1, 2, 3]) {
      act(() => {
        vi.advanceTimersByTime(600)
      })
      expect(useAppStore.getState().currentStepIndex).toBe(expectedIndex)
    }

    fireEvent.click(screen.getByRole('button', { name: 'Pause algorithm' }))
    act(() => {
      vi.advanceTimersByTime(1200)
    })
    expect(useAppStore.getState().currentStepIndex).toBe(3)

    act(() => {
      const state = useAppStore.getState()
      useAppStore.setState({ currentStepIndex: state.bubbleSortSteps.length - 2 })
    })
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByText('Completed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('img', { name: 'Array: 1, 3, 4, 7, 8, 9' })).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('restarts playback from the beginning when Play is pressed after completion', () => {
    const state = useAppStore.getState()
    useAppStore.setState({
      currentStepIndex: state.bubbleSortSteps.length - 1,
      isBubbleSortPlaying: false,
    })
    vi.useFakeTimers()
    render(<AlgorithmWorkspace />)

    fireEvent.click(screen.getByRole('button', { name: 'Play algorithm' }))

    expect(useAppStore.getState().currentStepIndex).toBe(0)
    expect(useAppStore.getState().isBubbleSortPlaying).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1200)
    })
    expect(useAppStore.getState().currentStepIndex).toBe(1)
    vi.useRealTimers()
  })
})
