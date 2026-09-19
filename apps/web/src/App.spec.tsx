import { screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { renderWithQueryClient } from './test/renderWithQueryClient.js'
import { getUsers } from './api/users.js'
import { getPlans } from './api/plans.js'
import { getCurrentCsr, logout } from './api/auth.js'
import { disabledPlan, validCsr, validPlan, validUser } from './test/fixtures.js'
import App from './App'

vi.mock('./api/users.js', () => ({
  getUsers: vi.fn(),
}))

vi.mock('./api/plans.js', () => ({
  getPlans: vi.fn(),
}))

vi.mock('./api/auth.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./api/auth.js')>()),
  getCurrentCsr: vi.fn(),
  logout: vi.fn(),
}))

describe('App', () => {
  beforeEach(() => {
    vi.mocked(getCurrentCsr).mockResolvedValue(validCsr)
  })

  it('renders the users list', async () => {
    vi.mocked(getUsers).mockResolvedValue({ data: [validUser], total: 1 })

    renderWithQueryClient(<App />)

    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())
  })

  it('renders the plan editor at /plans', async () => {
    vi.mocked(getPlans).mockResolvedValue([validPlan, disabledPlan])

    renderWithQueryClient(<App />, { route: '/plans' })

    await waitFor(() => expect(screen.getByText('Unlimited Monthly')).toBeInTheDocument())
    expect(screen.getByText('Legacy Wash Plan')).toBeInTheDocument()
  })

  it('navigates between customers and plans from the header', async () => {
    vi.mocked(getUsers).mockResolvedValue({ data: [validUser], total: 1 })
    vi.mocked(getPlans).mockResolvedValue([validPlan])

    renderWithQueryClient(<App />)
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('link', { name: 'Plans' }))
    await waitFor(() => expect(screen.getByText('Unlimited Monthly')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('link', { name: 'Customers' }))
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())
  })

  describe('authentication', () => {
    it('shows the login page instead of the portal when signed out', async () => {
      vi.mocked(getCurrentCsr).mockResolvedValue(undefined)

      renderWithQueryClient(<App />)

      expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Customers' })).not.toBeInTheDocument()
      expect(getUsers).not.toHaveBeenCalled()
    })

    it('shows who is signed in', async () => {
      vi.mocked(getUsers).mockResolvedValue({ data: [validUser], total: 1 })

      renderWithQueryClient(<App />)

      expect(await screen.findByText('csr')).toBeInTheDocument()
    })

    it('signs out from the header and returns to the login page', async () => {
      vi.mocked(getUsers).mockResolvedValue({ data: [validUser], total: 1 })
      vi.mocked(logout).mockResolvedValue(undefined)
      renderWithQueryClient(<App />)

      await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }))

      expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument()
      expect(screen.queryByText('Jane Doe')).not.toBeInTheDocument()
    })

    it('stays signed in and says so when sign out fails', async () => {
      vi.mocked(getUsers).mockResolvedValue({ data: [validUser], total: 1 })
      vi.mocked(logout).mockRejectedValue(new Error('offline'))
      renderWithQueryClient(<App />)

      await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Sign out failed')
      expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    })
  })
})
