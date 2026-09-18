import { toMobileUserDto, toUserDetailDto } from './mobile-user.mapper.js';
import { userDetailDto, userDetailRow, userDto, userRow } from '../../test/fixtures.js';

describe('toMobileUserDto', () => {
  it('maps a mobile user row onto the mobile user contract', () => {
    expect(toMobileUserDto(userRow)).toEqual(userDto);
  });

  it('serialises the timestamps as ISO strings', () => {
    const user = toMobileUserDto(userRow);

    expect(user.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(user.lastUpdated).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('toUserDetailDto', () => {
  it('maps a user row with its vehicles and purchases onto the detail contract', () => {
    expect(toUserDetailDto(userDetailRow)).toEqual(userDetailDto);
  });

  it('maps every vehicle and purchase on the user', () => {
    const detail = toUserDetailDto({
      ...userDetailRow,
      vehicles: [userDetailRow.vehicles[0], { ...userDetailRow.vehicles[0], id: 2 }],
      purchases: [],
    });

    expect(detail.vehicles).toHaveLength(2);
    expect(detail.purchases).toEqual([]);
  });
});
