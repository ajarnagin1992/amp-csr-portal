import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, Group, Loader, Modal, Select, Table, Text, TextInput, Title } from '@mantine/core';
import { useUser } from './useUser.js';
import { useUpdateUser } from './useUpdateUser.js';
import { useDeactivateUser } from './useDeactivateUser.js';
import { useReactivateUser } from './useReactivateUser.js';
import { usePlans } from '../plans/usePlans.js';
import { useCreateSubscription } from '../subscriptions/useCreateSubscription.js';
import { useCancelSubscription } from '../subscriptions/useCancelSubscription.js';
import { useTransferSubscription } from '../subscriptions/useTransferSubscription.js';
import { formatDate } from '../../utils/formatDate.js';
import type { MobileUserDto, VehicleDto } from '@amp-csr/shared';

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['ACTIVE', 'OVERDUE']);

function SubscriptionActions({ vehicle, allVehicles }: { vehicle: VehicleDto; allVehicles: VehicleDto[] }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [planId, setPlanId] = useState<string | undefined>(undefined);
  const [transferVehicleId, setTransferVehicleId] = useState<string | undefined>(undefined);

  const { data: plans } = usePlans();
  const createSubscription = useCreateSubscription();
  const cancelSubscription = useCancelSubscription();
  const transferSubscription = useTransferSubscription();

  const subscription = vehicle.subscription;
  const hasActiveSubscription = !!subscription && ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status);
  const transferTargets = allVehicles.filter(
    (v) => v.id !== vehicle.id && !(v.subscription && ACTIVE_SUBSCRIPTION_STATUSES.has(v.subscription.status)),
  );

  if (!hasActiveSubscription) {
    return (
      <>
        <Button
          size="xs"
          onClick={() => {
            setPlanId(undefined);
            createSubscription.reset();
            setIsAdding(true);
          }}
        >
          Add Subscription
        </Button>
        <Modal opened={isAdding} onClose={() => setIsAdding(false)} title={`Add subscription — ${vehicle.licensePlate}`}>
          <Select
            label="Plan"
            placeholder="Select a plan"
            data={(plans ?? []).map((plan) => ({
              value: String(plan.id),
              label: `${plan.name} — ${(plan.price / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}/mo`,
            }))}
            value={planId}
            onChange={(value) => setPlanId(value ?? undefined)}
          />
          {createSubscription.isError && (
            <Alert color="red" mt="sm">
              Failed to add subscription: {createSubscription.error.message}
            </Alert>
          )}
          <Group mt="md">
            <Button
              disabled={!planId}
              onClick={() =>
                createSubscription.mutate(
                  { vehicleId: vehicle.id, planId: Number(planId) },
                  { onSuccess: () => setIsAdding(false) },
                )
              }
            >
              Add
            </Button>
            <Button variant="default" onClick={() => setIsAdding(false)}>
              Cancel
            </Button>
          </Group>
        </Modal>
      </>
    );
  }

  return (
    <Group gap="xs" wrap="nowrap">
      <Button
        size="xs"
        color="red"
        onClick={() => {
          cancelSubscription.reset();
          setIsCancelling(true);
        }}
      >
        End Subscription
      </Button>
      <Button
        size="xs"
        variant="default"
        disabled={transferTargets.length === 0}
        onClick={() => {
          setTransferVehicleId(undefined);
          transferSubscription.reset();
          setIsTransferring(true);
        }}
      >
        Transfer
      </Button>

      <Modal opened={isCancelling} onClose={() => setIsCancelling(false)} title="End subscription">
        <Text>Are you sure you want to cancel the subscription on {vehicle.licensePlate}?</Text>
        {cancelSubscription.isError && (
          <Alert color="red" mt="sm">
            Failed to cancel subscription: {cancelSubscription.error.message}
          </Alert>
        )}
        <Group mt="md">
          <Button
            color="red"
            onClick={() => cancelSubscription.mutate(subscription.id, { onSuccess: () => setIsCancelling(false) })}
          >
            Confirm
          </Button>
          <Button variant="default" onClick={() => setIsCancelling(false)}>
            Back
          </Button>
        </Group>
      </Modal>

      <Modal
        opened={isTransferring}
        onClose={() => setIsTransferring(false)}
        title={`Transfer subscription — ${vehicle.licensePlate}`}
      >
        <Select
          label="Transfer to vehicle"
          placeholder="Select a vehicle"
          data={transferTargets.map((v) => ({
            value: String(v.id),
            label: `${v.licensePlate} — ${v.make} ${v.model}`,
          }))}
          value={transferVehicleId}
          onChange={(value) => setTransferVehicleId(value ?? undefined)}
        />
        {transferSubscription.isError && (
          <Alert color="red" mt="sm">
            Failed to transfer subscription: {transferSubscription.error.message}
          </Alert>
        )}
        <Group mt="md">
          <Button
            disabled={!transferVehicleId}
            onClick={() =>
              transferSubscription.mutate(
                { id: subscription.id, data: { vehicleId: Number(transferVehicleId) } },
                { onSuccess: () => setIsTransferring(false) },
              )
            }
          >
            Transfer
          </Button>
          <Button variant="default" onClick={() => setIsTransferring(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
    </Group>
  );
}

function AccountInfo({ data }: { data: MobileUserDto }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingStatus, setIsConfirmingStatus] = useState(false);
  const [firstName, setFirstName] = useState(data.firstName);
  const [lastName, setLastName] = useState(data.lastName);
  const [email, setEmail] = useState(data.email);
  const [phone, setPhone] = useState(data.phone);
  const { mutate, isError, error } = useUpdateUser(data.id);
  const deactivateUser = useDeactivateUser();
  const reactivateUser = useReactivateUser();

  function startEditing() {
    setFirstName(data.firstName);
    setLastName(data.lastName);
    setEmail(data.email);
    setPhone(data.phone);
    setIsEditing(true);
  }

  function save() {
    mutate({ firstName, lastName, email, phone }, { onSuccess: () => setIsEditing(false) });
  }

  function confirmStatusChange() {
    if (data.status === 'ACTIVE') {
      deactivateUser.mutate(data.id);
    } else {
      reactivateUser.mutate(data.id);
    }
    setIsConfirmingStatus(false);
  }

  const hasChanges =
    firstName !== data.firstName ||
    lastName !== data.lastName ||
    email !== data.email ||
    phone !== data.phone;

  if (isEditing) {
    return (
      <div className="flex flex-col gap-3">
        <TextInput label="First Name" value={firstName} onChange={(e) => setFirstName(e.currentTarget.value)} />
        <TextInput label="Last Name" value={lastName} onChange={(e) => setLastName(e.currentTarget.value)} />
        <TextInput label="Email" value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
        <TextInput label="Phone" value={phone} onChange={(e) => setPhone(e.currentTarget.value)} />
        {isError && <Alert color="red">Failed to save: {error.message}</Alert>}
        <Group>
          <Button onClick={save} disabled={!hasChanges}>
            Save
          </Button>
          <Button variant="default" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </Group>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <Table.Tbody>
          <Table.Tr>
            <Table.Th>Email</Table.Th>
            <Table.Td>{data.email}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Th>Phone</Table.Th>
            <Table.Td>{data.phone}</Table.Td>
          </Table.Tr>
          <Table.Tr>
            <Table.Th>Status</Table.Th>
            <Table.Td>{data.status}</Table.Td>
          </Table.Tr>
        </Table.Tbody>
      </Table>
      <Group>
        <Button onClick={startEditing}>Edit</Button>
        <Button color="red" onClick={() => setIsConfirmingStatus(true)}>
          {data.status === 'ACTIVE' ? 'Deactivate account' : 'Reactivate account'}
        </Button>
      </Group>
      <Modal
        opened={isConfirmingStatus}
        onClose={() => setIsConfirmingStatus(false)}
        title={data.status === 'ACTIVE' ? 'Deactivate account' : 'Reactivate account'}
      >
        <Text>
          Are you sure you want to {data.status === 'ACTIVE' ? 'deactivate' : 'reactivate'} this account?
        </Text>
        <Group>
          <Button onClick={confirmStatusChange}>Confirm</Button>
          <Button variant="default" onClick={() => setIsConfirmingStatus(false)}>
            Cancel
          </Button>
        </Group>
      </Modal>
    </div>
  );
}

export function UserProperties() {
  const { id } = useParams();
  const { data, isPending, isError } = useUser(Number(id));

  if (isPending) return <Loader aria-label="Loading" />;
  if (isError) return <Alert color="red">Failed to load user</Alert>;

  return (
    <div className="flex flex-col gap-6">
      <Title order={2}>
        {data.firstName} {data.lastName}
      </Title>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <Title order={3} mb="sm">
          Account
        </Title>
        <AccountInfo data={data} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <Title order={3} mb="sm">
          Vehicles
        </Title>
        {data.vehicles.length === 0 ? (
          <Text>No vehicles</Text>
        ) : (
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>License Plate</Table.Th>
                <Table.Th>State</Table.Th>
                <Table.Th>Make</Table.Th>
                <Table.Th>Model</Table.Th>
                <Table.Th>Year</Table.Th>
                <Table.Th>Plan</Table.Th>
                <Table.Th>Subscription Status</Table.Th>
                <Table.Th>Next Billing Date</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.vehicles.map((vehicle) => (
                <Table.Tr key={vehicle.id}>
                  <Table.Td>{vehicle.licensePlate}</Table.Td>
                  <Table.Td>{vehicle.state}</Table.Td>
                  <Table.Td>{vehicle.make}</Table.Td>
                  <Table.Td>{vehicle.model}</Table.Td>
                  <Table.Td>{vehicle.year}</Table.Td>
                  <Table.Td>{vehicle.subscription?.plan.name ?? '—'}</Table.Td>
                  <Table.Td>{vehicle.subscription?.status ?? '—'}</Table.Td>
                  <Table.Td>{formatDate(vehicle.subscription?.nextBillingDate)}</Table.Td>
                  <Table.Td>
                    <SubscriptionActions vehicle={vehicle} allVehicles={data.vehicles} />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <Title order={3} mb="sm">
          Purchase History
        </Title>
        {data.purchases.length === 0 ? (
          <Text>No purchases</Text>
        ) : (
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Date</Table.Th>
                <Table.Th>Vehicle</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Amount</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {data.purchases.map((purchase) => (
                <Table.Tr key={purchase.id}>
                  <Table.Td>{formatDate(purchase.createdAt)}</Table.Td>
                  <Table.Td>{purchase.vehicle.licensePlate}</Table.Td>
                  <Table.Td>{purchase.description}</Table.Td>
                  <Table.Td>{purchase.type}</Table.Td>
                  <Table.Td>{purchase.status}</Table.Td>
                  <Table.Td>{(purchase.amount / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
