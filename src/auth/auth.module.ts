import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './strategies';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secretOrPrivateKey: await configService.get('JWT_SECRET'),
        global: true,
        signOptions: {
          expiresIn: '5h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, ConfigService, JwtStrategy],
  controllers: [AuthController],
})

export class AuthModule { }
