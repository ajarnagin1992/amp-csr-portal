import { useEffect, type ReactNode } from 'react';
import { Alert, Button } from '@mantine/core';
import { useQueryClient } from '@tanstack/react-query';
import { setUnauthorizedHandler } from '../../api/apiFetch.js';
import { PageLoader } from '../../components/PageLoader.js';
import { LoginPage } from './LoginPage.js';
import { endSession, useCurrentCsr } from './useCurrentCsr.js';

/** Renders its children only for a signed-in CSR; everyone else gets the login page. */
export function AuthGate({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { data: csr, isPending, isError, refetch } = useCurrentCsr();

  // A 401 from any API call means the session ended, so fall back to login.
  useEffect(() => {
    setUnauthorizedHandler(() => endSession(queryClient));
    return () => setUnauthorizedHandler();
  }, [queryClient]);

  if (isPending) return <PageLoader />;

  if (isError) {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <Alert color="red" title="Couldn't check your session">
          <Button variant="light" color="red" mt="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        </Alert>
      </div>
    );
  }

  return csr ? children : <LoginPage />;
}
