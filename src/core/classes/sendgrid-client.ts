import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as SendGrid from '@sendgrid/mail';

@Injectable()
export class SendgridClient {
    constructor(private readonly config: ConfigService) {
        SendGrid.setApiKey(config.get('SENDGRID_API_KEY'));
    }

    sendMail(mail: SendGrid.MailDataRequired): Promise<[SendGrid.ClientResponse, {}]> {
        return SendGrid.send(mail);
    }

}
