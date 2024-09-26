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
import { PaymentScheduleModule } from './payment-schedule/payment-schedule.module';
import { TermsAndConditionModule } from './terms-and-condition/terms-and-condition.module';
import { CashFlowModule } from './cash-flow/cash-flow.module';
import { ProjectEstimatorTemplateModule } from './project-estimator-template/project-estimator-template.module';

import { QuestionnaireCategoryModule } from './questionnaire-category/questionnaire-category.module';
import { TemplateQuestionModule } from './template-question/template-question.module';
import { TemplateQuestionAnswerModule } from './template-question-answer/template-question-answer.module';
import { ProjectDescriptionModule } from './project-description/project-description.module';
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
    PaymentScheduleModule,
    TermsAndConditionModule,
    CashFlowModule,
    ProjectEstimatorTemplateModule,
    QuestionnaireCategoryModule,
    TemplateQuestionModule,
    TemplateQuestionAnswerModule,
    ProjectDescriptionModule
  ],
})
export class AppModule { }
