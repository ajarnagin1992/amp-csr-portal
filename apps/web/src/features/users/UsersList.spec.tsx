import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderWithQueryClient } from '../../test/renderWithQueryClient.js';
import { getUsers } from '../../api/users.js';
import { UsersList } from './UsersList.js';
import { pagedUsersResponse, validUser } from '../../test/fixtures.js';

vi.mock('../../api/users.js', () => ({
  getUsers: vi.fn(),
}));

describe('UsersList', () => {
  it('shows a loading state while the request is pending', () => {
    vi.mocked(getUsers).mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<UsersList />);

    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
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

  it('does not show pagination controls when everything fits on one page', async () => {
    vi.mocked(getUsers).mockResolvedValue({ data: [validUser], total: 1 });

    renderWithQueryClient(<UsersList />);

    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
  });

  it('shows pagination controls when there is more than one page', async () => {
    vi.mocked(getUsers).mockResolvedValue(pagedUsersResponse);

    renderWithQueryClient(<UsersList />);

    await waitFor(() => expect(screen.getByTestId('pagination')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument();
  });

  it('requests the next page when a page control is clicked', async () => {
    vi.mocked(getUsers).mockResolvedValue(pagedUsersResponse);

    renderWithQueryClient(<UsersList />);

    await waitFor(() => expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: '2' }));

    await waitFor(() => expect(getUsers).toHaveBeenCalledWith({ page: 2, pageSize: 20, search: undefined }));
  });

  it('links each user to their properties page', async () => {
    vi.mocked(getUsers).mockResolvedValue({ data: [validUser], total: 1 });

    renderWithQueryClient(<UsersList />);

    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: 'Jane Doe' })).toHaveAttribute('href', '/users/1');
  });

  it('searches by the entered term and resets to the first page', async () => {
    vi.mocked(getUsers).mockResolvedValue({ data: [validUser], total: 1 });

    renderWithQueryClient(<UsersList />);

    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText(/search/i), 'jane');

    await waitFor(() =>
      expect(getUsers).toHaveBeenCalledWith({ page: 1, pageSize: 20, search: 'jane' }),
    );
  });
});
