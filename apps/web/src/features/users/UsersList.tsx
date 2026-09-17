import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Loader, Pagination, Table, Text, TextInput } from '@mantine/core';
import { useUsers } from './useUsers.js';

const PAGE_SIZE = 20;

export function UsersList() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isPending, isError } = useUsers({ page, pageSize: PAGE_SIZE, search: search || undefined });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
      <TextInput
        label="Search"
        placeholder="Search by name, email, phone, or license plate"
        value={search}
        onChange={(event) => {
          setSearch(event.currentTarget.value);
          setPage(1);
        }}
      />
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {isPending ? (
          <Loader aria-label="Loading" />
        ) : isError ? (
          <Alert color="red">Failed to load users</Alert>
        ) : data.data.length === 0 ? (
          <Text>No users</Text>
        ) : (
          <div className="flex flex-col gap-4">
            <Table verticalSpacing="sm" highlightOnHover>
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
                      <Link to={`/users/${user.id}`} className="font-medium text-blue-600 no-underline hover:underline">
                        {user.firstName} {user.lastName}
                      </Link>
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
              total={Math.ceil(data.total / PAGE_SIZE)}
              value={page}
              onChange={setPage}
              hideWithOnePage
            />
          </div>
        )}
      </div>
    </div>
  );
}
