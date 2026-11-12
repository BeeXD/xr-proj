import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from '../App'
import { currentSnapshot } from '../lib/execution'
import { StationWorkspace } from './StationWorkspace'
import { useAppStore } from '../store/useAppStore'

describe('station navigation and shared workspace', () => {
  // The lazily loaded 3D scene (three + XR) is slow to compile cold; pay that once here, not inside one test's timeout.
  beforeAll(() => import('./AlgorithmLabScene'), 30000)

  beforeEach(() => {
    window.localStorage.clear()
    useAppStore.getState().selectStation('stacks')
    useAppStore.getState().setScreen('welcome')
  })

  it('makes Stack push and pop change the visible state, and Reset restore the starting stack', () => {
    render(<StationWorkspace />)
    expect(screen.getByRole('img', { name: 'Stack: empty' })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Numeric value' }), { target: { value: '42' } })
    fireEvent.click(screen.getByRole('button', { name: 'Push' }))
    for (let index = 0; index < 4; index += 1) fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByRole('img', { name: 'Stack: 42' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Update the top pointer.')
    expect(screen.getByText('Step 5 / 6')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText('Completed')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Pop' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByRole('img', { name: 'Stack: empty' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Removed 42/)

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByRole('img', { name: 'Stack: 42' })).toBeInTheDocument()
  })

  it('shows underflow and overflow results and keeps Peek immutable', () => {
    render(<StationWorkspace />)
    fireEvent.click(screen.getByRole('button', { name: 'Pop' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByRole('status')).toHaveTextContent(/Underflow/)

    fireEvent.click(screen.getByRole('button', { name: 'Push' }))
    for (let index = 0; index < 4; index += 1) fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Peek' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByRole('img', { name: 'Stack: 25' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Peek result: 25.')

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Capacity' }), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Push' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByRole('status')).toHaveTextContent(/Overflow/)
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByRole('img', { name: 'Stack: empty' })).toBeInTheDocument()
    expect(currentSnapshot(useAppStore.getState().executionSession).kind).toBe('stack')
  })

  it('keeps Stack Push counter, progress, pseudocode, log, and visualization on the same session step', () => {
    render(<StationWorkspace />)
    expect(screen.queryByRole('button', { name: 'Enqueue' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Dequeue' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Queue peek' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear queue' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('spinbutton', { name: 'Numeric value' }), { target: { value: '42' } })
    fireEvent.click(screen.getByRole('button', { name: 'Push' }))
    const session = useAppStore.getState().executionSession
    expect(session.steps).toHaveLength(6)
    expect(screen.getByText('Step 1 / 6')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Execution progress' })).toHaveAttribute('aria-valuenow', '17')

    for (let index = 0; index < 4; index += 1) fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByText('Step 5 / 6')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Execution progress' })).toHaveAttribute('aria-valuenow', '83')
    expect(screen.getByRole('img', { name: 'Stack: 42' })).toBeInTheDocument()
    expect(screen.getAllByText('Update the top pointer.').length).toBeGreaterThan(1)
    expect(screen.getAllByRole('list')[0].querySelector('[data-active-line="true"]')).toHaveTextContent('05Update the top pointer.')
    const currentEntries = screen.getAllByRole('listitem').filter((item) => item.getAttribute('aria-current') === 'step')
    expect(currentEntries).toHaveLength(2)
    expect(currentEntries.some((item) => item.textContent?.includes('05') && item.textContent.includes('Update the top pointer.'))).toBe(true)
    expect(screen.getAllByText(/Stack size: 1 \/ 5/).length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByText('Step 1 / 6')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Execution progress' })).toHaveAttribute('aria-valuenow', '17')
  })

  it('randomizes, advances, pauses, and resumes using the selected playback speed', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    vi.useFakeTimers()
    render(<StationWorkspace />)
    fireEvent.click(screen.getByRole('button', { name: 'Randomize' }))
    expect(useAppStore.getState().executionSession.steps.length).toBeGreaterThan(0)
    expect(screen.getByRole('img', { name: 'Stack: 20, 30, 40, 50' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByRole('img', { name: 'Stack: 20, 30, 40, 50' })).toBeInTheDocument()
    fireEvent.change(screen.getByRole('combobox', { name: 'Playback speed' }), { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Play algorithm' }))
    act(() => vi.advanceTimersByTime(300))
    expect(useAppStore.getState().executionSession.currentStepIndex).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Pause algorithm' }))
    const pausedAt = useAppStore.getState().executionSession.currentStepIndex
    act(() => vi.advanceTimersByTime(1000))
    expect(useAppStore.getState().executionSession.currentStepIndex).toBe(pausedAt)
    fireEvent.click(screen.getByRole('button', { name: 'Play algorithm' }))
    for (let index = 0; index < 5; index += 1) act(() => vi.advanceTimersByTime(300))
    expect(useAppStore.getState().executionSession.status).toBe('completed')
    expect(screen.getByRole('button', { name: 'Next step' })).toBeDisabled()
    const completedIndex = useAppStore.getState().executionSession.currentStepIndex
    act(() => vi.advanceTimersByTime(1000))
    expect(useAppStore.getState().executionSession.currentStepIndex).toBe(completedIndex)
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(useAppStore.getState().executionSession).toMatchObject({ currentStepIndex: 0, status: 'idle' })
    expect(screen.getByText('Step 1 / 6')).toBeInTheDocument()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('runs visible Queue enqueue, dequeue, and underflow controls', () => {
    render(<StationWorkspace />)
    fireEvent.change(screen.getByRole('combobox', { name: 'Algorithm' }), { target: { value: 'queue.enqueue' } })
    expect(screen.queryByRole('button', { name: 'Push' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enqueue' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Enqueue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByRole('img', { name: 'Queue: 25' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Dequeue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByRole('img', { name: 'Queue: empty' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Dequeue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByRole('status')).toHaveTextContent(/Underflow/)
  })

  it('maps the current algorithm snapshot into the 3D scene and exposes camera controls', async () => {
    render(<StationWorkspace />)
    fireEvent.click(screen.getByRole('button', { name: 'Push' }))
    for (let index = 0; index < 4; index += 1) fireEvent.click(screen.getByRole('button', { name: 'Next step' }))

    expect(await screen.findByRole('region', {
      name: /Stack Push 3D visualization\. Current values: 25\. Update the top pointer\./,
    }, { timeout: 5000 })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Focus visualization' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset camera' }))
  })

  it('selects a structure element as the operation value, then operates on it', async () => {
    useAppStore.getState().selectStation('linked-lists')
    render(<StationWorkspace />)
    fireEvent.click(await screen.findByRole('button', { name: 'Select 7' }, { timeout: 5000 }))
    expect(screen.getByRole('spinbutton', { name: 'Numeric value' })).toHaveValue(7)
    fireEvent.click(screen.getByRole('button', { name: 'Delete value' }))
    for (let index = 0; index < 3; index += 1) fireEvent.click(screen.getByRole('button', { name: 'Next step' }))
    expect(screen.getByRole('img', { name: 'Linked list: 12 to 19' })).toBeInTheDocument()
  })

  it('selects graph nodes by index and edits the value from the VR keypad', async () => {
    useAppStore.getState().selectStation('graphs')
    render(<StationWorkspace />)
    fireEvent.click(await screen.findByRole('button', { name: 'Select C' }, { timeout: 5000 }))
    expect(useAppStore.getState().executionInput).toBe(2)

    const { pressValueKey, setExecutionInput } = useAppStore.getState()
    act(() => setExecutionInput(0))
    for (const key of ['4', '2', '7', '1']) act(() => pressValueKey(key))
    expect(screen.getByRole('spinbutton', { name: 'Numeric value' })).toHaveValue(427)
    for (const key of ['4', '2', '7', '1']) pressValueKey(key)
    act(() => pressValueKey('Del'))
    act(() => pressValueKey('±'))
    expect(useAppStore.getState().executionInput).toBe(-42)
    act(() => pressValueKey('5'))
    expect(useAppStore.getState().executionInput).toBe(-425)
  })

  it('keeps the 3D scene mounted when switching algorithms, so a live VR session survives', async () => {
    useAppStore.getState().selectStation('arrays')
    render(<App />)
    const scene = await screen.findByRole('region', { name: /Bubble Sort 3D visualization/ }, { timeout: 5000 })
    fireEvent.change(screen.getByRole('combobox', { name: 'Algorithm' }), { target: { value: 'sort.quick' } })
    expect(await screen.findByRole('heading', { name: 'Quick Sort' })).toBeInTheDocument()
    expect(scene).toBeInTheDocument()
  })

  it('routes Explore Station to all seven registered station workspaces', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /enter the laboratory/i }))
    await screen.findByRole('heading', { name: 'Learning stations' })
    const expected = [
      ['Arrays & Sorting', 'Bubble Sort'],
      ['Linked Lists', 'Insert at Head'],
      ['Stacks & Queues', 'Stack Push'],
      ['Trees', 'BST Insert'],
      ['Graphs', 'Breadth-first Search'],
      ['Hash Tables', 'Hash Insert'],
      ['Searching', 'Linear Search'],
    ]
    for (const [station, algorithm] of expected) {
      const heading = await screen.findByRole('heading', { name: station })
      const card = heading.closest('button')
      expect(card).not.toBeNull()
      fireEvent.click(card!)
      await screen.findByRole('heading', { name: algorithm })
      fireEvent.click(screen.getByRole('button', { name: 'Back to dashboard' }))
      await waitFor(() => expect(screen.getByRole('heading', { name: 'Learning stations' })).toBeInTheDocument())
    }
  })
})
