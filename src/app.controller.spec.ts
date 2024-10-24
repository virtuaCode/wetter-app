import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SettingsService } from './settings/settings.service';
import { ConfigService } from '@nestjs/config';

describe('AppController', () => {
  let appController: AppController;

  process.env.GEMINI_API_KEY = ""
  process.env.WEATHER_BASE_URL = ""

  beforeEach(async () => {
    appController = new AppController(
      new AppService(new SettingsService(), new ConfigService()),
      new SettingsService()
    )
  });

  it('should be defined', () => {
    expect(appController).toBeDefined();
  });
});
