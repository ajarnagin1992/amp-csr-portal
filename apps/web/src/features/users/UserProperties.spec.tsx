import { screen, waitFor, within } from '@testing-library/react';
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
    const accountTable = screen.getByText('Email').closest('table');
    expect(within(accountTable!).getByText('ACTIVE')).toBeInTheDocument();
  });

  it('shows the user vehicles once loaded', async () => {
    vi.mocked(getUser).mockResolvedValue(validUserDetail);

    renderUserProperties();

    await waitFor(() => expect(screen.getAllByText('ABC123').length).toBeGreaterThan(0));
    expect(screen.getByText('Toyota')).toBeInTheDocument();
  });

  it('shows a message when the user has no vehicles', async () => {
    vi.mocked(getUser).mockResolvedValue({ ...validUserDetail, vehicles: [] });

    renderUserProperties();

    await waitFor(() => expect(screen.getByText(/no vehicles/i)).toBeInTheDocument());
  });

  it("shows a vehicle's active subscription", async () => {
    vi.mocked(getUser).mockResolvedValue(validUserDetail);

    renderUserProperties();

    await waitFor(() => expect(screen.getByText('Unlimited Monthly')).toBeInTheDocument());
    expect(screen.getAllByText('ACTIVE').length).toBeGreaterThan(1);
    expect(screen.getByText('2026-02-01T00:00:00.000Z')).toBeInTheDocument();
  });

  it('shows a placeholder when a vehicle has no subscription', async () => {
    vi.mocked(getUser).mockResolvedValue({
      ...validUserDetail,
      vehicles: [{ ...validUserDetail.vehicles[0], subscription: undefined }],
    });

    renderUserProperties();

    await waitFor(() => expect(screen.getAllByText('ABC123').length).toBeGreaterThan(0));
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('shows the purchase history once loaded', async () => {
    vi.mocked(getUser).mockResolvedValue(validUserDetail);

    renderUserProperties();

    await waitFor(() => expect(screen.getByText('Single wash')).toBeInTheDocument());
    expect(screen.getByText('SINGLE_WASH')).toBeInTheDocument();
    expect(screen.getByText('SUCCESS')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
  });

  it('shows the vehicle for each purchase', async () => {
    vi.mocked(getUser).mockResolvedValue(validUserDetail);

    renderUserProperties();

    await waitFor(() => expect(screen.getByText('Single wash')).toBeInTheDocument());
    const purchaseRow = screen.getByText('Single wash').closest('tr');
    expect(within(purchaseRow!).getByText('ABC123')).toBeInTheDocument();
  });

  it('shows a message when the user has no purchases', async () => {
    vi.mocked(getUser).mockResolvedValue({ ...validUserDetail, purchases: [] });

    renderUserProperties();

    await waitFor(() => expect(screen.getByText(/no purchases/i)).toBeInTheDocument());
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
