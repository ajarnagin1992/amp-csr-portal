import type { CreateSubscriptionDto, TransferSubscriptionDto } from '@amp-csr/shared';

import { apiFetch } from './apiFetch.js';
import { apiUrl } from './apiUrl.js';

export async function createSubscription(data: CreateSubscriptionDto): Promise<void> {
  const url = apiUrl('/subscriptions');

  const response = await apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to create subscription: ${response.status}`);
  }
}

export async function cancelSubscription(id: number): Promise<void> {
  const url = apiUrl(`/subscriptions/${id}`);

  const response = await apiFetch(url, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error(`Failed to cancel subscription: ${response.status}`);
  }
}

export async function transferSubscription(id: number, data: TransferSubscriptionDto): Promise<void> {
  const url = apiUrl(`/subscriptions/${id}/transfer`);

  const response = await apiFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to transfer subscription: ${response.status}`);
  }
}
