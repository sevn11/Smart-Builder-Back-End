import { Injectable, Logger } from '@nestjs/common';
import { MailDataRequired } from '@sendgrid/mail';
import { SendgridClient } from '../classes';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SendgridService {
    private readonly logger = new Logger(SendgridService.name);

    constructor(private readonly config: ConfigService, private sendGridClient: SendgridClient) {

    }
    async sendEmailWithTemplate(recipient: string, templateId: string, body: string): Promise<void> {
        try {
            const mail: MailDataRequired = {
                to: recipient,
                from: this.config.get('FROM_EMAIL'), //Approved sender ID in Sendgrid
                templateId: templateId,
                dynamicTemplateData: { body }, //The data to be used in the template
            };
            await this.sendGridClient.sendMail(mail);
            this.logger.log(`Email successfully dispatched to ${mail.to as string}`);
        } catch (error) {
            this.logger.error('Error while sending email', error);
            throw error;
        }

    }
}
