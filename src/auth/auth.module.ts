import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './strategies';
import { SendgridService } from 'src/core/services';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: await configService.get('JWT_SECRET'),
        global: true,
        signOptions: {
          expiresIn: '5h',
        },
      }),
      inject: [ConfigService],
    }),
    SendgridService
  ],
  providers: [AuthService, ConfigService, JwtStrategy],
  controllers: [AuthController],
})

export class AuthModule { }
