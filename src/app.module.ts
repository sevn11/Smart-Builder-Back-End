import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CompanyModule } from './company/company.module';
import { DatabaseModule } from './database/database.module';
import { DevopsModule } from './devops/devops.module';
import { CoreModule } from './core/core.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { CustomerModule } from './customer/customer.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    CompanyModule,
    DatabaseModule,
    DevopsModule,
    CoreModule,
    WebhooksModule,
    CustomerModule,
  ],
})
export class AppModule { }
