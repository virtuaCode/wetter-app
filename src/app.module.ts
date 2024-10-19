import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { SettingsService } from './settings/settings.service';
@Module({
  imports: [  AuthModule,  ConfigModule.forRoot({
    isGlobal: true,
}), ],
  controllers: [AppController],
  providers: [AppService, SettingsService],
})
export class AppModule {}
