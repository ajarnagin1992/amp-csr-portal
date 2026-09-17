import { useParams } from 'react-router-dom';
import { Alert, Loader, Table, Text, Title } from '@mantine/core';
import { useUser } from './useUser.js';

export function UserProperties() {
  const { id } = useParams();
  const { data, isPending, isError } = useUser(Number(id));

  if (isPending) return <Loader aria-label="Loading" />;
  if (isError) return <Alert color="red">Failed to load user</Alert>;

  return (
    <>
      <Title order={2}>
        {data.firstName} {data.lastName}
      </Title>
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

      <Title order={3}>Vehicles</Title>
      {data.vehicles.length === 0 ? (
        <Text>No vehicles</Text>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>License Plate</Table.Th>
              <Table.Th>State</Table.Th>
              <Table.Th>Make</Table.Th>
              <Table.Th>Model</Table.Th>
              <Table.Th>Year</Table.Th>
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
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </>
  );
}
