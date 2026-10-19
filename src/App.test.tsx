import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import App from './App'

describe('AlgoSpace XR', () => {
  beforeEach(() => window.localStorage.clear())

  it('renders the welcome screen with the main call to action', () => {
    render(<App />)

    expect(screen.getByText(/algospace xr/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enter the laboratory/i })).toBeInTheDocument()
  })

  it('opens the dashboard with working station cards', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /enter the laboratory/i }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /virtual dsa environment/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /learning stations/i })).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /explore station/i })).toHaveLength(7)
      expect(screen.getAllByText('READY')).toHaveLength(7)
    })
  })
})
