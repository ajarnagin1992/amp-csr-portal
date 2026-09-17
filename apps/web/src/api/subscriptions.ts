const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function createSubscription(vehicleId: number, planId: number): Promise<void> {
  const url = new URL('/subscriptions', API_BASE_URL);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vehicleId, planId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to create subscription: ${response.status}`);
  }
}

export async function cancelSubscription(id: number): Promise<void> {
  const url = new URL(`/subscriptions/${id}`, API_BASE_URL);

  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'CANCELLED' }),
  });
  if (!response.ok) {
    throw new Error(`Failed to cancel subscription: ${response.status}`);
  }
}

export async function transferSubscription(id: number, transferVehicleId: number): Promise<void> {
  const url = new URL(`/subscriptions/${id}`, API_BASE_URL);

  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transferVehicleId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to transfer subscription: ${response.status}`);
  }
}
