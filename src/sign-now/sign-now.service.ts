import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from 'src/database/database.service';
import { PassThrough } from 'stream';
import * as FormData from 'form-data';
import axios from 'axios';
import { UploadDocumentDTO } from './validators/upload-document';
import { ResponseMessages } from 'src/core/utils';
import { DocumentTypes } from 'src/core/utils/sign-now-document-types';

@Injectable()
export class SignNowService {
	private baseURL: string
    private AuthToken: string;
    private SignNowUserName: string;
    private SignNowPassword: string;
	private AccessToken: string;
	private BackendUrl: string;

    constructor(
        private readonly config: ConfigService,
        private databaseService: DatabaseService,
    ) {
		this.baseURL = "https://api.signnow.com";
        this.AuthToken = config.get('SIGN_NOW_AUTH_TOKEN');
        this.SignNowUserName = config.get('SIGN_NOW_USER_NAME');
        this.SignNowPassword = config.get('SIGN_NOW_PASSWORD');
		this.BackendUrl = config.get('BACKEND_BASEURL');
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
			const documentType = body.documentType;
			let changeOrderId: number;
			if (documentType == DocumentTypes.CHANGE_ORDER && body.changeOrderId) {
				changeOrderId = parseInt(body.changeOrderId);
			}
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
					await this.createSignNowEvent(documentId, documentType, companyId, jobId, changeOrderId);
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

	private async createSignNowEvent(documentId: string, documentType: DocumentTypes, companyId: number, jobId: number, changeOrderId?: number) {
		try {
			const options = {
				method: 'POST',
				url: `${this.baseURL}/api/v2/events`,
				headers: { Authorization: `Bearer ${this.AccessToken}`, Accept: 'application/json' },
				data: {
					event: 'document.complete',
					entity_id: documentId,
					action: 'callback',
					attributes: {
						callback: `${this.BackendUrl}/webhooks/sign-now-document`,
					}
				},
			}
			// Create event for document in sign now
			await axios.request(options);

			// Get created event details and create entry in database
			let eventData = await this.getSignNowEvent(documentId);
			if(eventData && eventData.id) {
				await this.databaseService.signNowDocuments.create({
					data: {
						companyId,
						jobId,
						documentId,
						documentType,
						signNowEventId: eventData.id,
						changeOrderId: changeOrderId ?? null
					}
				});
			}
	
		} catch (error) {
			console.log(error?.response?.data || error);
			throw new InternalServerErrorException({
                message: 'An unexpected error occurred.'
            });
		}
	}

	private async getSignNowEvent(documentId: string) {
		const eventParams = {
			filters: JSON.stringify([{
				"_OR": [
					{ "entity_id": { "type": "like", "value": documentId } }
				]
			}]),
		};
		const eventPptions = {
			method: 'GET',
			url: `${this.baseURL}/v2/event-subscriptions`,
			headers: {
				Authorization: `Bearer ${this.AccessToken}`,
				'Content-Type': 'application/json'
			},
			params: eventParams
		};
	
		try {
			const response = await axios.request(eventPptions);
			if (response.data.data[0]) {
				return response.data.data[0];
			} else {
				return null;
			}
		} catch (error) {
			console.error('Error fetching event subscriptions:', error.response ? error.response.data : error.message);
		}
	}

	async getDocumentStatus(companyId: number, jobId: number, user: User, documentType: string) {
		try {
			const documentTypeMap: Record<string, DocumentTypes> = {
				proposal: DocumentTypes.PROPOSAL,
				specification: DocumentTypes.SPECIFICATION,
				change_order: DocumentTypes.CHANGE_ORDER,
				initial_selection: DocumentTypes.INITIAL_SELECTION,
				paint_selection: DocumentTypes.PAINT_SELECTION,
			};
		
			const type = documentTypeMap[documentType];
			const document = await this.databaseService.signNowDocuments.findFirst({
				where: {
					companyId,
					jobId,
				  	documentType: type,
				},
				orderBy: {
				  updatedAt: 'desc'
				},
				select: {
				  id: true,
				  status: true,
				}
			});
			return { document }
		} catch (error) {
			console.error('Error getting document status:', error);
		}
	}
}
