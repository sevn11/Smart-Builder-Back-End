import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { SendgridService } from 'src/core/services';
import { UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class CronJobsService {
  constructor(
    private databaseService: DatabaseService,
    private sendgridService: SendgridService,
    private readonly config: ConfigService,
  ) {}

  // Runs every day at 8:00 AM
  @Cron('0 8 * * *')
  async sendInfoToBuilder() {
    await this.sendContractorMailDetailstoBuilder();
  }

  // Fetch contractor mail details and send email to the builder
  async sendContractorMailDetailstoBuilder() {
    try {
      
      const companiesWithMailInfo = await this.databaseService.contractorMailInfo.findMany({
        distinct: ['companyId'], 
        select: {
          companyId: true,
        },
      });

      for (const companyRecord of companiesWithMailInfo) {
        const companyId = companyRecord.companyId;
        const builder = await this.databaseService.user.findFirst({
          where: { companyId }
        });

        const contractorMailInfos = await this.databaseService.contractorMailInfo.findMany({
          where: {
            companyId: companyId,
            isSentToBuilder: false,
          },
          include: {
            job: {
              include: {
                customer: true
              }
            },
            contractor: true,
          },
          orderBy: {
            createdAt: 'asc'
          }
        });

        // Group by jobId to ensure we send only one email per job
        const jobsGroupedById = contractorMailInfos.reduce((acc, mailInfo) => {
          if (!acc[mailInfo.job.id]) {
            acc[mailInfo.job.id] = [];
          }
        
          acc[mailInfo.job.id].push({
            id: mailInfo.id,
            email: mailInfo.contractor.email,
            jobId: mailInfo.job.id,
            jobName: mailInfo.job.customer.name,
            contractorName: mailInfo.contractor.name,
            isDetailsAttached: mailInfo.isDetailsAttached,
            isScheduleSent: mailInfo.isScheduleSent,
            contractorFiles: mailInfo.contractorFiles,
          });
        
          return acc;
        }, {});        
        for (const jobId of Object.keys(jobsGroupedById)) {
          const job = jobsGroupedById[jobId];

          // Generate HTML content for this job group
          let HTMLContent = await this.generateHtmlTable({ [jobId]: job });
          let templateData = {
            date: this.getCurrentDate(),
            subject: job[0].jobName,
            html: HTMLContent,
          }
          // Send the email for this job to the builder
          await this.sendgridService.sendEmailWithTemplate(
            builder.email,
            this.config.get('CONTRACTOR_MAIL_INFO_ID'),
            templateData,
          );

          // Mark row as mail sent
          for (const jobId of Object.keys(jobsGroupedById)) {
            for (const job of jobsGroupedById[jobId]) {
              await this.databaseService.contractorMailInfo.update({
                where: { id: job.id, companyId, jobId: job.jobId },
                data: { isSentToBuilder: true }
              });
            }
          }
        }

      }
      
    } catch (error) {
        console.error('Error in sending contractor mail details:', error);
    }
  }

  private async generateHtmlTable(jobsGroupedById) {
    let htmlContent = `
      <html>
        <head>
          <style>
            .table {
              width: 100%;
              border-collapse: collapse;
            }
            .table, .th, .td {
              border: 1px solid black;
            }
            .th, .td {
              padding: 8px;
              text-align: left;
            }
            .th {
              background-color: #f2f2f2;
            }
          </style>
        </head>
        <body>
          <table class="table">
            <thead>
              <tr>
                <th class="th">Email Recipients</th>
                <th class="th">Contractor Details Attached</th>
                <th class="th">Schedule Sent</th>
                <th class="th">Contractor Files</th>
              </tr>
            </thead>
            <tbody>`;
  
    for (const jobId of Object.keys(jobsGroupedById)) {
      for (const job of jobsGroupedById[jobId]) {
        const fileNames = await Promise.all(job.contractorFiles.map(fileId => this.getFileNames(fileId)));
        const fileNamesString = fileNames.map(file => file.fileName).join(', ');
        htmlContent += `
          <tr>
            <td class="td">${job.email}</td>
            <td class="td">${job.isDetailsAttached ? 'Yes' : 'No'}</td>
            <td class="td">${job.isScheduleSent ? 'Yes' : 'No'}</td>
            <td class="td">${fileNamesString}</td>
          </tr>
        `;
      }
    }
  
    htmlContent += `
            </tbody>
          </table>
        </body>
      </html>
    `;
  
    return htmlContent;
  }

  private async getFileNames(fileId: number) {
    try{
      let fileName = await this.databaseService.contractorFiles.findFirst({
        where: { id: fileId },
        select: { fileName: true }
      });
      return fileName;
    }
    catch (error) {
      console.error('Error getting file info:', error);
      return null;
    }
  }

  private getCurrentDate() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
  
    return `${month}/${day}/${year}`;
  }
}
