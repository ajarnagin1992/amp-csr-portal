import { screen, waitFor } from '@testing-library/react';
import { renderWithQueryClient } from '../../test/renderWithQueryClient.js';
import { getUser } from '../../api/users.js';
import { UserProperties } from './UserProperties.js';
import { validUserDetail } from '../../test/fixtures.js';

vi.mock('../../api/users.js', () => ({
  getUser: vi.fn(),
}));

function renderUserProperties() {
  return renderWithQueryClient(<UserProperties />, { route: '/users/1', path: '/users/:id' });
}

describe('UserProperties', () => {
  it('shows a loading state while the request is pending', () => {
    vi.mocked(getUser).mockReturnValue(new Promise(() => {}));

    renderUserProperties();

    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });

  it('shows the user properties once loaded', async () => {
    vi.mocked(getUser).mockResolvedValue(validUserDetail);

    renderUserProperties();

    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('555-0100')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('shows the user vehicles once loaded', async () => {
    vi.mocked(getUser).mockResolvedValue(validUserDetail);

    renderUserProperties();

    await waitFor(() => expect(screen.getByText('ABC123')).toBeInTheDocument());
    expect(screen.getByText('Toyota')).toBeInTheDocument();
  });

  it('shows a message when the user has no vehicles', async () => {
    vi.mocked(getUser).mockResolvedValue({ ...validUserDetail, vehicles: [] });

    renderUserProperties();

    await waitFor(() => expect(screen.getByText(/no vehicles/i)).toBeInTheDocument());
  });

  it('shows an error message when the request fails', async () => {
    vi.mocked(getUser).mockRejectedValue(new Error('network down'));

    renderUserProperties();

    await waitFor(() => expect(screen.getByText(/failed to load user/i)).toBeInTheDocument());
  });

  it('requests the user by the id in the route', async () => {
    vi.mocked(getUser).mockResolvedValue(validUserDetail);

    renderUserProperties();

    await waitFor(() => expect(getUser).toHaveBeenCalledWith(1));
  });
});
