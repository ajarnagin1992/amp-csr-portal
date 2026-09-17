import { screen, waitFor } from '@testing-library/react';
import { renderWithQueryClient } from '../../test/renderWithQueryClient.js';
import { getUsers } from '../../api/users.js';
import { UsersList } from './UsersList.js';
import { validUser } from '../../test/fixtures.js';

vi.mock('../../api/users.js', () => ({
  getUsers: vi.fn(),
}));

describe('UsersList', () => {
  it('shows a loading state while the request is pending', () => {
    vi.mocked(getUsers).mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<UsersList />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders a row for each user once loaded', async () => {
    vi.mocked(getUsers).mockResolvedValue({ data: [validUser], total: 1 });

    renderWithQueryClient(<UsersList />);

    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('555-0100')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('shows an empty state when there are no users', async () => {
    vi.mocked(getUsers).mockResolvedValue({ data: [], total: 0 });

    renderWithQueryClient(<UsersList />);

    await waitFor(() => expect(screen.getByText(/no users/i)).toBeInTheDocument());
  });

  it('shows an error message when the request fails', async () => {
    vi.mocked(getUsers).mockRejectedValue(new Error('network down'));

    renderWithQueryClient(<UsersList />);

    await waitFor(() => expect(screen.getByText(/failed to load users/i)).toBeInTheDocument());
  });
});
