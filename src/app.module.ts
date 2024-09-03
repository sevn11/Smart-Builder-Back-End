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
import { JobsModule } from './jobs/jobs.module';
import { AdminModule } from './admin/admin.module';
import { QuestionnaireTemplateModule } from './questionnaire-template/questionnaire-template.module';
import { ContractorModule } from './contractor/contractor.module';
import { JobContractorModule } from './job-contractor/job-contractor.module';
import { ContractorPhaseModule } from './contractor-phase/contractor-phase.module';
import { JobProjectEstimatorModule } from './job-project-estimator/job-project-estimator.module';
import { ContractorFileModule } from './contractor-file/contractor-file.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { TermsAndConditionModule } from './terms-and-condition/terms-and-condition.module';
import { PaymentScheduleModule } from './payment-schedule/payment-schedule.module';
import { CashFlowModule } from './cash-flow/cash-flow.module';
@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '/uploads'),
      serveRoot: '/uploads/'
    }),
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UserModule,
    CompanyModule,
    DatabaseModule,
    DevopsModule,
    CoreModule,
    WebhooksModule,
    CustomerModule,
    JobsModule,
    AdminModule,
    QuestionnaireTemplateModule,
    ContractorModule,
    JobContractorModule,
    ContractorPhaseModule,
    JobProjectEstimatorModule,
    ContractorFileModule,
    TermsAndConditionModule,
    PaymentScheduleModule,
    CashFlowModule
  ],
})
export class AppModule { }
