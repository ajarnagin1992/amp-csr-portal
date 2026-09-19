import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { LoginDto } from '@amp-csr/shared';
import { login } from '../../api/auth.js';
import { setSession } from './useCurrentCsr.js';

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginDto) => login(data),
    onSuccess: (csr) => setSession(queryClient, csr),
  });
}
