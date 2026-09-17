import type { ListUsersResponseDto, MobileUserDto } from "@amp-csr/shared";

export const validUser: MobileUserDto = {
  id: 1,
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  phone: '555-0100',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastUpdated: '2026-01-01T00:00:00.000Z',
};

// total exceeds the default pageSize (20), so this response spans multiple pages
export const pagedUsersResponse: ListUsersResponseDto = {
  data: [validUser],
  total: 45,
};
