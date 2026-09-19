import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from './auth.module.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

describe('AuthModule', () => {
  it('wires AuthController and AuthService together', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, AuthModule],
    }).compile();

    expect(moduleRef.get(AuthController)).toBeInstanceOf(AuthController);
    expect(moduleRef.get(AuthService)).toBeInstanceOf(AuthService);
  });
});
