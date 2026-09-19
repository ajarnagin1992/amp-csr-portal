import { screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { renderWithQueryClient } from './test/renderWithQueryClient.js'
import { getUsers } from './api/users.js'
import { getPlans } from './api/plans.js'
import { disabledPlan, validPlan, validUser } from './test/fixtures.js'
import App from './App'

vi.mock('./api/users.js', () => ({
  getUsers: vi.fn(),
}))

vi.mock('./api/plans.js', () => ({
  getPlans: vi.fn(),
}))

describe('App', () => {
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
})
