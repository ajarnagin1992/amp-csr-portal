import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { renderWithQueryClient } from '../../test/renderWithQueryClient.js';
import { createPlan, getPlans, updatePlan } from '../../api/plans.js';
import { PlansEditor } from './PlansEditor.js';
import { disabledPlan, validPlan } from '../../test/fixtures.js';

vi.mock('../../api/plans.js', () => ({
  getPlans: vi.fn(),
  createPlan: vi.fn(),
  updatePlan: vi.fn(),
}));

async function renderLoaded() {
  vi.mocked(getPlans).mockResolvedValue([validPlan, disabledPlan]);
  renderWithQueryClient(<PlansEditor />);
  await waitFor(() => expect(screen.getByText('Unlimited Monthly')).toBeInTheDocument());
}

describe('PlansEditor', () => {
  it('shows a loading state while the request is pending', () => {
    vi.mocked(getPlans).mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<PlansEditor />);

    expect(screen.getByLabelText(/loading/i)).toBeInTheDocument();
  });

  it('shows an error message when the request fails', async () => {
    vi.mocked(getPlans).mockRejectedValue(new Error('network down'));

    renderWithQueryClient(<PlansEditor />);

    await waitFor(() => expect(screen.getByText(/failed to load plans/i)).toBeInTheDocument());
  });

  it('shows an empty state when there are no plans', async () => {
    vi.mocked(getPlans).mockResolvedValue([]);

    renderWithQueryClient(<PlansEditor />);

    await waitFor(() => expect(screen.getByText(/no plans/i)).toBeInTheDocument());
  });

  it('asks for disabled plans too, since the editor has to be able to re-enable them', async () => {
    await renderLoaded();

    expect(getPlans).toHaveBeenCalledWith({ includeDisabled: true });
  });

  it('renders a row per plan with its description, price and status', async () => {
    await renderLoaded();

    expect(screen.getByText('Unlimited exterior washes')).toBeInTheDocument();
    expect(screen.getByText('$29.99')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('Legacy Wash Plan')).toBeInTheDocument();
    expect(screen.getByText('$15.00')).toBeInTheDocument();
    expect(screen.getByText('DISABLED')).toBeInTheDocument();
  });

  describe('creating a plan', () => {
    it('opens an empty form with Save disabled', async () => {
      await renderLoaded();

      await userEvent.click(screen.getByRole('button', { name: /new plan/i }));

      expect(screen.getByLabelText(/^name/i)).toHaveValue('');
      expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
    });

    it('sends the price in cents once the form is filled in', async () => {
      vi.mocked(createPlan).mockResolvedValue(validPlan);
      await renderLoaded();

      await userEvent.click(screen.getByRole('button', { name: /new plan/i }));
      await userEvent.type(screen.getByLabelText(/^name/i), 'Gold Wash');
      await userEvent.type(screen.getByLabelText(/description/i), 'The good stuff');
      await userEvent.type(screen.getByLabelText(/monthly price/i), '12.50');
      await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

      await waitFor(() =>
        expect(createPlan).toHaveBeenCalledWith({ name: 'Gold Wash', description: 'The good stuff', price: 1250 }),
      );
    });

    it('keeps Save disabled while the name is blank', async () => {
      await renderLoaded();

      await userEvent.click(screen.getByRole('button', { name: /new plan/i }));
      await userEvent.type(screen.getByLabelText(/^name/i), '   ');
      await userEvent.type(screen.getByLabelText(/monthly price/i), '12.50');

      expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
    });

    it('closes the form after a successful save', async () => {
      vi.mocked(createPlan).mockResolvedValue(validPlan);
      await renderLoaded();

      await userEvent.click(screen.getByRole('button', { name: /new plan/i }));
      await userEvent.type(screen.getByLabelText(/^name/i), 'Gold Wash');
      await userEvent.type(screen.getByLabelText(/monthly price/i), '12.50');
      await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

      await waitFor(() => expect(screen.queryByLabelText(/^name/i)).not.toBeInTheDocument());
    });

    it('shows the error and keeps the form open when the save fails', async () => {
      vi.mocked(createPlan).mockRejectedValue(new Error('Failed to create plan: 400'));
      await renderLoaded();

      await userEvent.click(screen.getByRole('button', { name: /new plan/i }));
      await userEvent.type(screen.getByLabelText(/^name/i), 'Gold Wash');
      await userEvent.type(screen.getByLabelText(/monthly price/i), '12.50');
      await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

      await waitFor(() => expect(screen.getByText(/failed to create plan: 400/i)).toBeInTheDocument());
      expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    });
  });

  describe('editing a plan', () => {
    it('opens the form pre-filled with the plan, showing the price in dollars', async () => {
      await renderLoaded();

      await userEvent.click(screen.getByRole('button', { name: 'Edit Unlimited Monthly' }));

      expect(screen.getByLabelText(/^name/i)).toHaveValue('Unlimited Monthly');
      expect(screen.getByLabelText(/description/i)).toHaveValue('Unlimited exterior washes');
      expect(screen.getByLabelText(/monthly price/i)).toHaveValue('$29.99');
    });

    it('keeps Save disabled until something changes', async () => {
      await renderLoaded();

      await userEvent.click(screen.getByRole('button', { name: 'Edit Unlimited Monthly' }));
      expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();

      await userEvent.type(screen.getByLabelText(/^name/i), '!');
      expect(screen.getByRole('button', { name: /^save$/i })).toBeEnabled();
    });

    it('saves the edited plan by id, with the price in cents', async () => {
      vi.mocked(updatePlan).mockResolvedValue(validPlan);
      await renderLoaded();

      await userEvent.click(screen.getByRole('button', { name: 'Edit Unlimited Monthly' }));
      await userEvent.clear(screen.getByLabelText(/monthly price/i));
      await userEvent.type(screen.getByLabelText(/monthly price/i), '39.99');
      await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

      await waitFor(() =>
        expect(updatePlan).toHaveBeenCalledWith(1, {
          name: 'Unlimited Monthly',
          description: 'Unlimited exterior washes',
          price: 3999,
        }),
      );
    });

    it('can edit a disabled plan', async () => {
      await renderLoaded();

      await userEvent.click(screen.getByRole('button', { name: 'Edit Legacy Wash Plan' }));

      expect(screen.getByLabelText(/^name/i)).toHaveValue('Legacy Wash Plan');
    });

    it('discards edits when cancelled, so reopening starts from the saved values', async () => {
      await renderLoaded();

      await userEvent.click(screen.getByRole('button', { name: 'Edit Unlimited Monthly' }));
      await userEvent.type(screen.getByLabelText(/^name/i), ' Plus');
      await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
      await userEvent.click(screen.getByRole('button', { name: 'Edit Unlimited Monthly' }));

      expect(screen.getByLabelText(/^name/i)).toHaveValue('Unlimited Monthly');
      expect(updatePlan).not.toHaveBeenCalled();
    });

    it('shows the error when the save fails', async () => {
      vi.mocked(updatePlan).mockRejectedValue(new Error('Failed to update plan: 404'));
      await renderLoaded();

      await userEvent.click(screen.getByRole('button', { name: 'Edit Unlimited Monthly' }));
      await userEvent.type(screen.getByLabelText(/^name/i), '!');
      await userEvent.click(screen.getByRole('button', { name: /^save$/i }));

      await waitFor(() => expect(screen.getByText(/failed to update plan: 404/i)).toBeInTheDocument());
    });
  });

  describe('enabling and disabling', () => {
    it('offers Disable on an active plan and Enable on a disabled one', async () => {
      await renderLoaded();

      expect(screen.getByRole('button', { name: 'Disable Unlimited Monthly' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Enable Legacy Wash Plan' })).toBeInTheDocument();
    });

    it('asks for confirmation before disabling, and does nothing if declined', async () => {
      await renderLoaded();

      await userEvent.click(screen.getByRole('button', { name: 'Disable Unlimited Monthly' }));
      expect(screen.getByText(/can no longer be added to new subscriptions/i)).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));

      expect(updatePlan).not.toHaveBeenCalled();
    });

    it('disables the plan once confirmed', async () => {
      vi.mocked(updatePlan).mockResolvedValue({ ...validPlan, status: 'DISABLED' });
      await renderLoaded();

      await userEvent.click(screen.getByRole('button', { name: 'Disable Unlimited Monthly' }));
      await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => expect(updatePlan).toHaveBeenCalledWith(1, { status: 'DISABLED' }));
    });

    it('re-enables a disabled plan once confirmed', async () => {
      vi.mocked(updatePlan).mockResolvedValue({ ...disabledPlan, status: 'ACTIVE' });
      await renderLoaded();

      await userEvent.click(screen.getByRole('button', { name: 'Enable Legacy Wash Plan' }));
      await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => expect(updatePlan).toHaveBeenCalledWith(2, { status: 'ACTIVE' }));
    });

    it('shows the error when the status change fails', async () => {
      vi.mocked(updatePlan).mockRejectedValue(new Error('Failed to update plan: 500'));
      await renderLoaded();

      await userEvent.click(screen.getByRole('button', { name: 'Disable Unlimited Monthly' }));
      await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

      await waitFor(() => expect(screen.getByText(/failed to update plan: 500/i)).toBeInTheDocument());
    });
  });
});
