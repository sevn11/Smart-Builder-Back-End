import { Injectable, Logger } from '@nestjs/common';
import { MailDataRequired } from '@sendgrid/mail';
import * as SendGrid from '@sendgrid/mail';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SendgridService {
    private readonly logger = new Logger(SendgridService.name);
    constructor(private readonly config: ConfigService) {
        SendGrid.setApiKey(config.get('SENDGRID_API_KEY'));

    }
    async sendEmailWithTemplate(recipient: string, templateId: string, body: object): Promise<void> {
        try {
            const mail: MailDataRequired = {
                to: recipient,
                from: this.config.get('FROM_EMAIL'), //Approved sender ID in Sendgrid
                templateId: templateId,
                dynamicTemplateData: { ...body }, //The data to be used in the template
            };
            await SendGrid.send(mail);;
            this.logger.log(`Email successfully dispatched to ${mail.to as string}`);
        } catch (error) {
            this.logger.error('Error while sending email', error);
            throw error;
        }

    }
}
