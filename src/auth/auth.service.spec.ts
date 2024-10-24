import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    service = new AuthService(new JwtService())
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
