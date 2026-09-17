import { screen, waitFor } from '@testing-library/react'
import { renderWithQueryClient } from './test/renderWithQueryClient.js'
import { getUsers } from './api/users.js'
import { validUser } from './test/fixtures.js'
import App from './App'

vi.mock('./api/users.js', () => ({
  getUsers: vi.fn(),
}))

describe('App', () => {
  it('renders the users list', async () => {
    vi.mocked(getUsers).mockResolvedValue({ data: [validUser], total: 1 })

    renderWithQueryClient(<App />)

    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument())
  })
})
