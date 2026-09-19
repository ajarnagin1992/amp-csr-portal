import { useQuery, type QueryClient } from '@tanstack/react-query';
import type { CsrUserDto } from '@amp-csr/shared';
import { getCurrentCsr } from '../../api/auth.js';

export const CURRENT_CSR_KEY = ['auth', 'me'] as const;

// react-query can't cache `undefined`, so "signed out" needs a value of its
// own: a session with no CSR.
export interface Session {
  csr?: CsrUserDto;
}

export function useCurrentCsr() {
  return useQuery({
    queryKey: CURRENT_CSR_KEY,
    queryFn: async (): Promise<Session> => ({ csr: await getCurrentCsr() }),
    select: (session) => session.csr,
    // The session only changes through login, logout, or a 401, all of which
    // write this query directly, so there's no reason to refetch it.
    staleTime: Infinity,
  });
}

export function setSession(queryClient: QueryClient, csr?: CsrUserDto) {
  queryClient.setQueryData<Session>(CURRENT_CSR_KEY, { csr });
}

/** Marks the CSR signed out and drops everything fetched on their behalf. */
export function endSession(queryClient: QueryClient) {
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== CURRENT_CSR_KEY[0] });
  setSession(queryClient);
}
