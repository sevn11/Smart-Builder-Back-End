import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './strategies';
import { SendgridService } from 'src/core/services';
import { CoreModule } from 'src/core/core.module';
import { StripeService } from 'src/core/services/stripe.service';

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
    CoreModule,
  ],
  providers: [AuthService, ConfigService, JwtStrategy, SendgridService, StripeService],
  controllers: [AuthController],
})

export class AuthModule { }
