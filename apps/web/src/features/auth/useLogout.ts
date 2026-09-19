import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from '../../api/auth.js';
import { endSession } from './useCurrentCsr.js';

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    // Only on success: if the server never confirmed, the session is still
    // live, and showing the CSR as signed out would be false assurance.
    onSuccess: () => endSession(queryClient),
  });
}
