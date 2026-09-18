import { screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderWithQueryClient } from '../../test/renderWithQueryClient.js';
import { deactivateUser, getUser, reactivateUser, updateUser } from '../../api/users.js';
import { UserProperties } from './UserProperties.js';
import { validUser, validUserDetail } from '../../test/fixtures.js';

vi.mock('../../api/users.js', () => ({
  getUser: vi.fn(),
  updateUser: vi.fn(),
  deactivateUser: vi.fn(),
  reactivateUser: vi.fn(),
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
    expect(screen.getByText('Feb 1, 2026')).toBeInTheDocument();
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

  describe('editing account information', () => {
    it('shows an Edit button', async () => {
      vi.mocked(getUser).mockResolvedValue(validUserDetail);

      renderUserProperties();

      await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('shows editable inputs pre-filled with the current name, email, and phone when Edit is clicked', async () => {
      vi.mocked(getUser).mockResolvedValue(validUserDetail);
      renderUserProperties();
      await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());

      await userEvent.click(screen.getByRole('button', { name: /edit/i }));

      expect(screen.getByLabelText(/first name/i)).toHaveValue('Jane');
      expect(screen.getByLabelText(/last name/i)).toHaveValue('Doe');
      expect(screen.getByLabelText(/email/i)).toHaveValue('jane@example.com');
      expect(screen.getByLabelText(/phone/i)).toHaveValue('555-0100');
    });

    it('saves the edited fields when Save is clicked', async () => {
      vi.mocked(getUser).mockResolvedValue(validUserDetail);
      vi.mocked(updateUser).mockResolvedValue({ ...validUser, firstName: 'Janet' });
      renderUserProperties();
      await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());

      await userEvent.click(screen.getByRole('button', { name: /edit/i }));
      await userEvent.clear(screen.getByLabelText(/first name/i));
      await userEvent.type(screen.getByLabelText(/first name/i), 'Janet');
      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() =>
        expect(updateUser).toHaveBeenCalledWith(1, {
          firstName: 'Janet',
          lastName: 'Doe',
          email: 'jane@example.com',
          phone: '555-0100',
        }),
      );
    });

    it('exits edit mode and shows the updated values after a successful save', async () => {
      vi.mocked(getUser).mockResolvedValue(validUserDetail);
      vi.mocked(updateUser).mockResolvedValue({ ...validUser, firstName: 'Janet' });
      renderUserProperties();
      await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());

      await userEvent.click(screen.getByRole('button', { name: /edit/i }));
      await userEvent.clear(screen.getByLabelText(/first name/i));
      await userEvent.type(screen.getByLabelText(/first name/i), 'Janet');
      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => expect(screen.queryByLabelText(/first name/i)).not.toBeInTheDocument());
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('disables Save until a field has actually changed', async () => {
      vi.mocked(getUser).mockResolvedValue(validUserDetail);
      renderUserProperties();
      await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());

      await userEvent.click(screen.getByRole('button', { name: /edit/i }));

      expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();

      await userEvent.type(screen.getByLabelText(/first name/i), 'x');

      expect(screen.getByRole('button', { name: /save/i })).toBeEnabled();
    });

    it('cancels edit mode without saving when Cancel is clicked', async () => {
      vi.mocked(getUser).mockResolvedValue(validUserDetail);
      renderUserProperties();
      await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());

      await userEvent.click(screen.getByRole('button', { name: /edit/i }));
      await userEvent.clear(screen.getByLabelText(/first name/i));
      await userEvent.type(screen.getByLabelText(/first name/i), 'Janet');
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

      expect(updateUser).not.toHaveBeenCalled();
      expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    });

    it('shows an error message when saving fails', async () => {
      vi.mocked(getUser).mockResolvedValue(validUserDetail);
      vi.mocked(updateUser).mockRejectedValue(new Error('Email is already in use'));
      renderUserProperties();
      await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());

      await userEvent.click(screen.getByRole('button', { name: /edit/i }));
      await userEvent.clear(screen.getByLabelText(/first name/i));
      await userEvent.type(screen.getByLabelText(/first name/i), 'Janet');
      await userEvent.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => expect(screen.getByText(/failed to save/i)).toBeInTheDocument());
    });
  });

  describe('deactivating and reactivating an account', () => {
    it('shows a Deactivate account button when the user is active', async () => {
      vi.mocked(getUser).mockResolvedValue(validUserDetail);

      renderUserProperties();

      await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
      expect(screen.getByRole('button', { name: /deactivate account/i })).toBeInTheDocument();
    });

    it('asks for confirmation before deactivating the account', async () => {
      vi.mocked(getUser).mockResolvedValue(validUserDetail);
      renderUserProperties();
      await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());

      await userEvent.click(screen.getByRole('button', { name: /deactivate account/i }));

      expect(deactivateUser).not.toHaveBeenCalled();
      await waitFor(() => expect(screen.getByText(/are you sure/i)).toBeInTheDocument());
    });

    it('deactivates the account once the confirmation is confirmed', async () => {
      vi.mocked(getUser).mockResolvedValue(validUserDetail);
      vi.mocked(deactivateUser).mockResolvedValue({ ...validUser, status: 'DISABLED' });
      renderUserProperties();
      await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());

      await userEvent.click(screen.getByRole('button', { name: /deactivate account/i }));
      await waitFor(() => expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument());
      await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => expect(deactivateUser).toHaveBeenCalledWith(1));
      expect(reactivateUser).not.toHaveBeenCalled();
    });

    it('does not deactivate the account when the confirmation is dismissed', async () => {
      vi.mocked(getUser).mockResolvedValue(validUserDetail);
      renderUserProperties();
      await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());

      await userEvent.click(screen.getByRole('button', { name: /deactivate account/i }));
      await waitFor(() => expect(screen.getByRole('button', { name: /^cancel$/i })).toBeInTheDocument());
      await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

      expect(deactivateUser).not.toHaveBeenCalled();
    });

    it('shows a Reactivate account button when the user is disabled', async () => {
      vi.mocked(getUser).mockResolvedValue({ ...validUserDetail, status: 'DISABLED' });

      renderUserProperties();

      await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
      expect(screen.getByRole('button', { name: /reactivate account/i })).toBeInTheDocument();
    });

    it('reactivates the account once the confirmation is confirmed', async () => {
      vi.mocked(getUser).mockResolvedValue({ ...validUserDetail, status: 'DISABLED' });
      vi.mocked(reactivateUser).mockResolvedValue({ ...validUser, status: 'ACTIVE' });
      renderUserProperties();
      await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());

      await userEvent.click(screen.getByRole('button', { name: /reactivate account/i }));
      await waitFor(() => expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument());
      await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => expect(reactivateUser).toHaveBeenCalledWith(1));
      expect(deactivateUser).not.toHaveBeenCalled();
    });
  });
});
