import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { CompanyModule } from './company/company.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [AuthModule, UserModule, CompanyModule, DatabaseModule],
})
export class AppModule {}
