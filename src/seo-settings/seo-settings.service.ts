import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class SeoSettingsService {

    constructor(private databaseService: DatabaseService) {}

    async getBuilerPlanInfo(user: User) {
        try {
            let data = await this.databaseService.seoSettings.findMany();
            let seoSettings = data[0];
            let builderPlanInfo = {
                id: seoSettings.id,
                yearlyPlanAmount: seoSettings.yearlyPlanAmount,
                monthlyPlanAmount: seoSettings.monthlyPlanAmount,
                employeeFee: seoSettings.additionalEmployeeFee,
                signNowMonthlyPlanAmount: seoSettings.signNowMonthlyAmount,
                signNowYearlyPlanAmount: seoSettings.signNowYearlyAmount,
            }
            return { builderPlanInfo };
        } catch (error) {
            throw new InternalServerErrorException();
        }
    }
}
