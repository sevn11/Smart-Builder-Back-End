import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as SendGrid from '@sendgrid/mail';


@Injectable()
export class SendgridClient {
    private readonly logger = new Logger(SendgridClient.name);
    constructor(private readonly config: ConfigService, private logg) {
        SendGrid.setApiKey(config.get('SENDGRID_API_KEY'));
    }

    sendMail(mail: SendGrid.MailDataRequired): Promise<[SendGrid.ClientResponse, {}]> {
        return SendGrid.send(mail);
    }

}
