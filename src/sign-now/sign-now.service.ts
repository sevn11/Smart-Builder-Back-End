import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from 'src/database/database.service';
import { PassThrough } from 'stream';
import * as FormData from 'form-data';
import axios from 'axios';
import { UploadDocumentDTO } from './validators/upload-document';
import { ResponseMessages } from 'src/core/utils';

@Injectable()
export class SignNowService {
	private baseURL: string
    private AuthToken: string;
    private SignNowUserName: string;
    private SignNowPassword: string;
	private AccessToken: string;

    constructor(
        private readonly config: ConfigService,
        private databaseService: DatabaseService,
    ) {
		this.baseURL = "https://api.signnow.com";
        this.AuthToken = config.get('SIGN_NOW_AUTH_TOKEN');
        this.SignNowUserName = config.get('SIGN_NOW_USER_NAME');
        this.SignNowPassword = config.get('SIGN_NOW_PASSWORD');
    }

    private async getAccessToken() {
        try {
            const url = `${this.baseURL}/oauth2/token`;
            const options = {
              method: "POST", 
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: `Basic ${this.AuthToken}`,
              },
              body: new URLSearchParams({
                username: this.SignNowUserName,
                password: this.SignNowPassword,
                grant_type: "password",
                scope: "*",
              }),
            };
      
            const response = await fetch(url, options);
            const data = await response.json();
      
            if (!response.ok) {
				throw new InternalServerErrorException({
					message: 'An unexpected error occurred.'
				});
            }
            this.AccessToken = data.access_token;
			return;
          } catch (error) {
            console.error(error);
            return error
          }
    }

    async signDocument(companyId: number, jobId: number, file: Express.Multer.File, body: any, user: User) {
        await this.getAccessToken();
		if(this.AccessToken) {
			let form = new FormData();
			const readableStream = new PassThrough();
			readableStream.end(file.buffer);
			const recipients = JSON.parse(body.recipients);
			// Attach logged in user itself as a signer
			let recipientsPayload = [];
			recipients.forEach(async (recipient: string, index: number) => {
				let payload = {
					email: recipient,
					role_id: "",
					role: `Owner_${index}`,
					order: 1,
					subject: "You Are Invited to Sign a Document from Smart Builder",
					message: "Hi, this is an invite to sign a document from Smart Builder"
				}
				recipientsPayload.push(payload);
			});
			if(this.SignNowUserName !== user.email) {
				recipients.push(user.email);
				recipientsPayload.push({
					email: user.email,
					role_id: "",
					role: "Builder",
					order: 1,
					subject: "You Are Invited to Sign a Document from Smart Builder",
					message: "Hi, this is an invite to sign a document from Smart Builder"
				});
			}
			form.append('file', readableStream, {
				filename: file.originalname,
				contentType: file.mimetype,
			});
			form.append('Tags', body.tags);
			let config = {
				method: 'POST',
				maxBodyLength: Infinity,
				url: `${this.baseURL}/document/fieldextract`,
				headers: { 
				  'Authorization': `Bearer ${this.AccessToken}`, 
				  'Content-Type': 'multipart/form-data', 
				  ...form.getHeaders()
				},
				data : form
			};   

			try {
				const response = await axios(config);
				const documentId = response.data.id;

				if(documentId) {
					await this.sendSignInvite(documentId, recipientsPayload);
				} else {
					throw new InternalServerErrorException({
						message: 'An unexpected error occurred.'
					});	
				}
				
				return { status: true, response: ResponseMessages.SUCCESSFUL }
			} catch (error) {
				console.log(error?.response?.data);
				throw new InternalServerErrorException({
					message: 'An unexpected error occurred.'
				});
			}
		} else {
			throw new InternalServerErrorException({
                message: 'An unexpected error occurred.'
            });
		}
    }

	private async sendSignInvite(documentId: string, recipientData: any[]) {
		try {
			let formData = {
				documentId,
				to: recipientData,
				from: this.SignNowUserName,
				subject: "You Are Invited to Sign a Document from Smart Builder"
			};
			const options = {
				method: 'POST',
				maxBodyLength: Infinity,
				url: `${this.baseURL}/document/${documentId}/invite`,
				headers: {Authorization: `Bearer ${this.AccessToken}`, Accept: 'application/json'},
				data: formData
			};
			// Send sign invite
			await axios.request(options);	
		} catch (error) {
			console.log(error?.response?.data);
			throw new InternalServerErrorException({
                message: 'An unexpected error occurred.'
            });
		}
	}
}
