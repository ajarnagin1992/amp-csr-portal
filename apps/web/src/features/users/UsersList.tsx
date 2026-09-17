import { useState } from 'react';
import { Alert, Loader, Pagination, Table, Text } from '@mantine/core';
import { useUsers } from './useUsers.js';

const PAGE_SIZE = 20;

export function UsersList() {
  const [page, setPage] = useState(1);
  const { data, isPending, isError } = useUsers({ page, pageSize: PAGE_SIZE });

  if (isPending) return <Loader aria-label="Loading" />;
  if (isError) return <Alert color="red">Failed to load users</Alert>;
  if (data.data.length === 0) return <Text>No users</Text>;

  const totalPages = Math.ceil(data.total / PAGE_SIZE);

  return (
    <>
      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Phone</Table.Th>
            <Table.Th>Status</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {data.data.map((user) => (
            <Table.Tr key={user.id}>
              <Table.Td>
                {user.firstName} {user.lastName}
              </Table.Td>
              <Table.Td>{user.email}</Table.Td>
              <Table.Td>{user.phone}</Table.Td>
              <Table.Td>{user.status}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
      <Pagination
        data-testid="pagination"
        total={totalPages}
        value={page}
        onChange={setPage}
        hideWithOnePage
      />
    </>
  );
}
