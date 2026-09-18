import { toVehicleDto } from './vehicle.mapper.js';
import { vehicleDto, vehicleWithSubscriptionRow } from '../../test/fixtures.js';

describe('toVehicleDto', () => {
  it('maps a vehicle row onto the vehicle contract', () => {
    expect(toVehicleDto(vehicleWithSubscriptionRow)).toEqual(vehicleDto);
  });

  it('leaves the subscription off a vehicle that has none', () => {
    expect(toVehicleDto({ ...vehicleWithSubscriptionRow, subscription: undefined }).subscription).toBeUndefined();
  });

  it('drops the owner id and timestamps that are not part of the contract', () => {
    const vehicle = toVehicleDto(vehicleWithSubscriptionRow);

    expect(vehicle).not.toHaveProperty('mobileUserId');
    expect(vehicle).not.toHaveProperty('createdAt');
  });
});
