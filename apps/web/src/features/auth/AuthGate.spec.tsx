import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { getCurrentCsr, login } from '../../api/auth.js';
import { apiFetch } from '../../api/apiFetch.js';
import { renderWithQueryClient } from '../../test/renderWithQueryClient.js';
import { validCsr } from '../../test/fixtures.js';
import { AuthGate } from './AuthGate.js';

vi.mock('../../api/auth.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/auth.js')>()),
  getCurrentCsr: vi.fn(),
  login: vi.fn(),
}));

function renderGate() {
  return renderWithQueryClient(
    <AuthGate>
      <p>Protected content</p>
    </AuthGate>,
  );
}

describe('AuthGate', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows a loader while it checks for a session', () => {
    vi.mocked(getCurrentCsr).mockReturnValue(new Promise(() => {}));

    renderGate();

    expect(screen.getByLabelText('Loading')).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('renders its children for a signed-in CSR', async () => {
    vi.mocked(getCurrentCsr).mockResolvedValue(validCsr);

    renderGate();

    expect(await screen.findByText('Protected content')).toBeInTheDocument();
  });

  it('shows the login page, and never the children, when there is no session', async () => {
    vi.mocked(getCurrentCsr).mockResolvedValue(undefined);

    renderGate();

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('reveals the children after a successful login', async () => {
    vi.mocked(getCurrentCsr).mockResolvedValue(undefined);
    vi.mocked(login).mockResolvedValue(validCsr);
    renderGate();

    await userEvent.type(await screen.findByLabelText(/email/i), 'csr@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'hunter2');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Protected content')).toBeInTheDocument();
  });

  it('falls back to the login page when an API call reports the session ended', async () => {
    vi.mocked(getCurrentCsr).mockResolvedValue(validCsr);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    renderGate();
    await screen.findByText('Protected content');

    await apiFetch(new URL('http://localhost/api/users'));

    expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByText('Protected content')).not.toBeInTheDocument();
  });

  it('offers a retry, not the login page, when the session check itself fails', async () => {
    vi.mocked(getCurrentCsr).mockRejectedValueOnce(new Error('offline')).mockResolvedValue(validCsr);
    renderGate();

    await userEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByText('Protected content')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument();
  });
});
