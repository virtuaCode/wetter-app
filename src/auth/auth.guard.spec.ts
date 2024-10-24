import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard';
import { ConfigService } from '@nestjs/config';

describe('AuthGuard', () => {
  it('should be defined', () => {
    expect(new AuthGuard(new JwtService(), new ConfigService())).toBeDefined();
  });
});
