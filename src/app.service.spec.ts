import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { SettingsService } from './settings/settings.service';
import { ConfigService } from '@nestjs/config';

describe('AppService', () => {
  let service: AppService;

  process.env.GEMINI_API_KEY = ""
  process.env.WEATHER_BASE_URL = ""

  beforeEach(async () => {
    service = new AppService(
        new SettingsService(),
        new ConfigService()
      );
   
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  test('90 degree wind should return East', () => {
    expect(service.getCompassDirection(90)).toBe("E")
  });

  test('270 degree wind should return West', () => {
    expect(service.getCompassDirection(270)).toBe("W")
  });
});


