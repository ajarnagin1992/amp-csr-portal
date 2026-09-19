import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { login, LoginError } from '../../api/auth.js';
import { renderWithQueryClient } from '../../test/renderWithQueryClient.js';
import { validCsr } from '../../test/fixtures.js';
import { LoginPage } from './LoginPage.js';

vi.mock('../../api/auth.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/auth.js')>()),
  login: vi.fn(),
}));

async function fillAndSubmit(email: string, password: string) {
  await userEvent.type(screen.getByLabelText(/email/i), email);
  await userEvent.type(screen.getByLabelText(/password/i), password);
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('LoginPage', () => {
  it('submits the entered credentials', async () => {
    vi.mocked(login).mockResolvedValue(validCsr);
    renderWithQueryClient(<LoginPage />);

    await fillAndSubmit('csr@example.com', 'hunter2');

    await waitFor(() => expect(login).toHaveBeenCalledWith({ email: 'csr@example.com', password: 'hunter2' }));
  });

  it('masks the password field', () => {
    renderWithQueryClient(<LoginPage />);

    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });

  it('does not submit without an email and password', async () => {
    renderWithQueryClient(<LoginPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(login).not.toHaveBeenCalled();
  });

  it('says the credentials were wrong on a 401', async () => {
    vi.mocked(login).mockRejectedValue(new LoginError(401));
    renderWithQueryClient(<LoginPage />);

    await fillAndSubmit('csr@example.com', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
  });

  it('says to wait when the account is locked out on a 429', async () => {
    vi.mocked(login).mockRejectedValue(new LoginError(429));
    renderWithQueryClient(<LoginPage />);

    await fillAndSubmit('csr@example.com', 'wrong');

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many failed attempts');
  });

  it('gives a generic message for any other failure', async () => {
    vi.mocked(login).mockRejectedValue(new Error('network down'));
    renderWithQueryClient(<LoginPage />);

    await fillAndSubmit('csr@example.com', 'hunter2');

    expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in failed. Please try again.');
  });

  it('shows no error before the first attempt', () => {
    renderWithQueryClient(<LoginPage />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
