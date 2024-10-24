import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    controller = new AuthController(new AuthService(new JwtService()))
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
