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
import { SelectionTemplateModule } from './selection-template/selection-template.module';
import { ProjectEstimatorTemplateModule } from './project-estimator-template/project-estimator-template.module';

import { QuestionnaireCategoryModule } from './questionnaire-category/questionnaire-category.module';
import { TemplateQuestionModule } from './template-question/template-question.module';
import { TemplateQuestionAnswerModule } from './template-question-answer/template-question-answer.module';
import { GoogleCalendarModule } from './google-calendar/google-calendar.module';
import { ProjectDescriptionModule } from './project-description/project-description.module';
import { JobScheduleModule } from './job-schedule/job-schedule.module';
import { SeoSettingsModule } from './seo-settings/seo-settings.module';
import { TemplateModule } from './template/template.module';
import { ClientTemplateModule } from './client-template/client-template.module';
import { CustomizedContentModule } from './customized-content/customized-content.module';
import { SignNowModule } from './sign-now/sign-now.module';
import { GanttModule } from './gantt/gantt.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CronJobsModule } from './cron-jobs/cron-jobs.module';
import { CalendarTemplateModule } from './calendar-template/calendar-template.module';
import { LoggingModule } from './logging/logging.module';
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
    GoogleCalendarModule,
    ProjectDescriptionModule,
    SelectionTemplateModule,
    JobScheduleModule,
    SeoSettingsModule,
    TemplateModule,
    ClientTemplateModule,
    CustomizedContentModule,
    SignNowModule,
    GanttModule,
    ScheduleModule.forRoot(),
    CronJobsModule,
    CalendarTemplateModule,
    LoggingModule,
  ],
})
export class AppModule { }
