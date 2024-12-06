import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from 'src/database/database.service';
import { PassThrough } from 'stream';
import * as FormData from 'form-data';
import axios from 'axios';
import { UploadDocumentDTO } from './validators/upload-document';

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
            
				// Get document details
				let documentDetails = await this.getDocument(documentId);
				let role_id = documentDetails.roles[0].unique_id;
				let email = user.email;

				let embeddedResponse = await this.CreateEmbeddedInvite(documentId, role_id, email);
				if(embeddedResponse) {
					let embeddedLinkResponse = await this.GenerateEmbeddedInviteLink(embeddedResponse.id, documentId);
					return {
						embeddedLinkResponse
					}
				} else {
					throw new InternalServerErrorException({
						message: 'An unexpected error occurred.'
					});
				}

			} catch (error) {
				console.error("Upload error:", error);
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

	// Function to get document details
	private async getDocument(documentId: string) {
		try {
			const options = {
				method: 'GET',
				url: `${this.baseURL}/document/${documentId}`,
				headers: {Authorization: `Bearer ${this.AccessToken}`, Accept: 'application/json'}
			};
			const { data } = await axios.request(options);
			return data;	  
		} catch (error) {
			throw new InternalServerErrorException({
                message: 'An unexpected error occurred.'
            });
		}
	}

	// Function to create embedded signing invite
	private async CreateEmbeddedInvite(
		documentId: string,
		role_id: string,
		email: string,
	) {		
		try {
			let formData = {
				invites: [
					{
						email: email,
						role_id: role_id,
						order: 1,
						auth_method: "none",
					},
				],
			};
			const options = {
				method: 'POST',
				maxBodyLength: Infinity,
				url: `${this.baseURL}/v2/documents/${documentId}/embedded-invites`,
				headers: {Authorization: `Bearer ${this.AccessToken}`, Accept: 'application/json'},
				data: formData
			};
			const response = await axios.request(options);
			let embeddedResponse = response.data?.data?.[0];
			return embeddedResponse;	  
		} catch (error) {
			console.error('Error:', error.response?.data || error.message);
			throw new InternalServerErrorException({
                message: 'An unexpected error occurred.'
            });
		}
	}

	// Function to generate embedded sign link
	private async GenerateEmbeddedInviteLink(inviteLinkId: string, documentId: string) {
		try {
			let formDatata = JSON.stringify({
				"auth_method": "none",
				"link_expiration": 45
			  });
			const options = {
				method: 'POST',
				maxBodyLength: Infinity,
				url: `${this.baseURL}/v2/documents/${documentId}/embedded-invites/${inviteLinkId}/link`,
				headers: {Authorization: `Bearer ${this.AccessToken}`, Accept: 'application/json'},
				data: formDatata
			};
			const { data } = await axios.request(options);
			return data;	  
		} catch (error) {
			console.error('Error:', error.response?.data || error.message);
			throw new InternalServerErrorException({
                message: 'An unexpected error occurred.'
            });
		}
	}
}
