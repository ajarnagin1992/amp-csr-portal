import { toPlanDto } from './plan.mapper.js';
import { planDto, planRow } from '../../test/fixtures.js';

describe('toPlanDto', () => {
  it('maps a plan row onto the plan contract', () => {
    expect(toPlanDto(planRow)).toEqual(planDto);
  });

  it('drops the columns that are not part of the contract', () => {
    expect(toPlanDto(planRow)).not.toHaveProperty('createdAt');
    expect(toPlanDto(planRow)).not.toHaveProperty('lastUpdated');
  });

  it('throws when the row does not satisfy the contract', () => {
    expect(() => toPlanDto({ ...planRow, price: 'free' as unknown as number })).toThrow();
  });
});
