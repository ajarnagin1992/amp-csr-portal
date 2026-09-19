import { useState } from 'react';
import { Alert, Badge, Button, Group, Modal, NumberInput, Table, Text, Textarea, TextInput } from '@mantine/core';
import type { PlanDto } from '@amp-csr/shared';
import { PageLoader } from '../../components/PageLoader.js';
import { usePlans } from './usePlans.js';
import { useCreatePlan } from './useCreatePlan.js';
import { useUpdatePlan } from './useUpdatePlan.js';
import { formatPrice } from '../../utils/formatPrice.js';

// Mounted only while open, so its fields start from the plan's current values every time.
function PlanFormModal({ plan, onClose }: { plan?: PlanDto; onClose: () => void }) {
  const [name, setName] = useState(plan?.name ?? '');
  const [description, setDescription] = useState(plan?.description ?? '');
  // The input works in dollars; the API and database work in whole cents.
  const [dollars, setDollars] = useState<number | string>(plan ? plan.price / 100 : '');
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const { isPending, isError, error } = plan ? updatePlan : createPlan;

  const priceIsValid = typeof dollars === 'number' && dollars >= 0;
  const cents = priceIsValid ? Math.round(dollars * 100) : undefined;
  const hasChanges =
    !plan || name !== plan.name || description !== plan.description || cents !== plan.price;
  const canSave = name.trim() !== '' && cents !== undefined && hasChanges && !isPending;

  function save() {
    if (cents === undefined) return;
    const data = { name, description, price: cents };
    if (plan) {
      updatePlan.mutate({ id: plan.id, data }, { onSuccess: onClose });
    } else {
      createPlan.mutate(data, { onSuccess: onClose });
    }
  }

  return (
    <Modal centered opened onClose={onClose} title={plan ? `Edit plan — ${plan.name}` : 'New plan'}>
      <div className="flex flex-col gap-3">
        <TextInput label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} />
        <Textarea
          label="Description"
          autosize
          minRows={2}
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
        />
        <NumberInput
          label="Monthly price"
          prefix="$"
          min={0}
          decimalScale={2}
          fixedDecimalScale
          allowNegative={false}
          hideControls
          value={dollars}
          onChange={setDollars}
        />
        {isError && <Alert color="red">Failed to save: {error.message}</Alert>}
        <Group>
          <Button onClick={save} disabled={!canSave} loading={isPending}>
            Save
          </Button>
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
        </Group>
      </div>
    </Modal>
  );
}

function PlanStatusModal({ plan, onClose }: { plan: PlanDto; onClose: () => void }) {
  const updatePlan = useUpdatePlan();
  const disabling = plan.status === 'ACTIVE';

  return (
    <Modal centered opened onClose={onClose} title={disabling ? 'Disable plan' : 'Enable plan'}>
      <Text>
        {disabling
          ? `Disable ${plan.name}? Members already on it keep it, but it can no longer be added to new subscriptions.`
          : `Enable ${plan.name}? It will be available for new subscriptions again.`}
      </Text>
      {updatePlan.isError && (
        <Alert color="red" mt="sm">
          Failed to update plan: {updatePlan.error.message}
        </Alert>
      )}
      <Group mt="md">
        <Button
          color={disabling ? 'red' : undefined}
          loading={updatePlan.isPending}
          onClick={() =>
            updatePlan.mutate({ id: plan.id, data: { status: disabling ? 'DISABLED' : 'ACTIVE' } }, { onSuccess: onClose })
          }
        >
          Confirm
        </Button>
        <Button variant="default" onClick={onClose}>
          Cancel
        </Button>
      </Group>
    </Modal>
  );
}

export function PlansEditor() {
  // `undefined` = nothing open, `'new'` = the create form, a plan = that plan's edit form.
  const [editing, setEditing] = useState<PlanDto | 'new' | undefined>(undefined);
  const [togglingStatus, setTogglingStatus] = useState<PlanDto | undefined>(undefined);
  const { data: plans, isPending, isError } = usePlans({ includeDisabled: true });

  return (
    <div className="flex flex-col gap-6">
      <Group justify="space-between">
        <h1 className="text-2xl font-semibold text-slate-900">Plans</h1>
        <Button onClick={() => setEditing('new')}>New plan</Button>
      </Group>
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {isPending ? (
          <PageLoader />
        ) : isError ? (
          <Alert color="red">Failed to load plans</Alert>
        ) : plans.length === 0 ? (
          <Text>No plans</Text>
        ) : (
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Description</Table.Th>
                <Table.Th>Monthly Price</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {plans.map((plan) => (
                <Table.Tr key={plan.id}>
                  <Table.Td className="font-medium">{plan.name}</Table.Td>
                  <Table.Td>{plan.description || '—'}</Table.Td>
                  <Table.Td>{formatPrice(plan.price)}</Table.Td>
                  <Table.Td>
                    <Badge color={plan.status === 'ACTIVE' ? 'green' : 'gray'} variant="light">
                      {plan.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Button size="xs" aria-label={`Edit ${plan.name}`} onClick={() => setEditing(plan)}>
                        Edit
                      </Button>
                      <Button
                        size="xs"
                        variant="default"
                        aria-label={`${plan.status === 'ACTIVE' ? 'Disable' : 'Enable'} ${plan.name}`}
                        onClick={() => setTogglingStatus(plan)}
                      >
                        {plan.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </div>

      {editing && (
        <PlanFormModal plan={editing === 'new' ? undefined : editing} onClose={() => setEditing(undefined)} />
      )}
      {togglingStatus && <PlanStatusModal plan={togglingStatus} onClose={() => setTogglingStatus(undefined)} />}
    </div>
  );
}
