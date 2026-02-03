import { Injectable, NotFoundException, BadRequestException, Logger, Inject, LoggerService } from '@nestjs/common';
import { User } from '@prisma/client';
import { PassThrough } from 'stream';
import * as FormData from 'form-data';
import { DatabaseService } from 'src/database/database.service';
import { ResponseMessages, UserTypes } from 'src/core/utils';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { AWSService } from 'src/core/services/aws.service';
import { SendgridService } from 'src/core/services';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

enum SignerStatus {
    PENDING = 'PENDING',
    SIGNED = 'SIGNED',
    DECLINED = 'DECLINED',
}

@Injectable()
export class SignHereService {
    private SignNowUserName: string;
    private uploadPath = './uploads/documents';

    constructor(
        private databaseService: DatabaseService,
        private awsService: AWSService,
        private sendgridService: SendgridService,
        private readonly config: ConfigService,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: LoggerService,
    ) {
        if (!fs.existsSync(this.uploadPath)) {
            fs.mkdirSync(this.uploadPath, { recursive: true });
        }
    }

    async signDocument(companyId: number, jobId: number, Type: string, file: Express.Multer.File, body: any, user: User) {

        try {

            this.logger.log('signlog', '========== START signDocument ==========');
            this.logger.log('signlog', 'Input Parameters - CompanyId: ' + companyId + ', JobId: ' + jobId + ', Type: ' + Type);
            this.logger.log('signlog', 'File Details - Original Name: ' + file.originalname + ', Size: ' + file.size + ' bytes, Mimetype: ' + file.mimetype);
            this.logger.log('signlog', 'Body: ' + JSON.stringify(body));
            this.logger.log('signlog', 'User: ' + JSON.stringify(user));

            const timestamp = Date.now();
            const fileName = `${companyId}_${jobId}_${timestamp}_${file.originalname}`;
            const filePath = path.join(this.uploadPath, fileName);
            const key = `sign-documents/${fileName}`; 

            const uploadedUrl = await this.awsService.uploadFileToS3(
                                    key,
                                    file.buffer,
                                    file.mimetype || 'application/pdf'
                                    );

            this.logger.log('signlog', 'File uploaded to S3 successfully. URL: ' + uploadedUrl);
        
            const recipients = JSON.parse(body.recipients);
            let recipientsPayload = [];

            let senderEmail = body.senderEmail;
            let sendCC = body.sendCC == 'true';
            let builder = await this.databaseService.user.findFirst({
                where: {
                    companyId: user.companyId,
                    OR: [
                        { userType: UserTypes.BUILDER },
                        { userType: UserTypes.ADMIN }
                    ]
                },
                select: { email: true,company: true },
                
            });

            const signHere = await this.databaseService.signHere.create({
                data: {
                    type: Type,
                    originalPdf: uploadedUrl,
                    ccAdmin: sendCC,
                    jobId: jobId ?? jobId,
                    userId: user.id,
                    companyId: companyId,
                },
            });

            this.logger.log('signlog', 'SignHere document created with ID: ' + signHere.id);

            recipients.forEach(async (recipient: string, index: number) => {

                const token = this.generateSignerToken(recipient, String(signHere.id));

                const Signer = await this.databaseService.signer.create({
                    data: {
                        documentId: signHere.id,
                        email: recipient,
                        name: recipient.split('@')[0],
                        token: token,
                        type: 'OWNER',
                        approvedDate: new Date(),
                        signedDate: new Date(),
                        ipAddress: '',
                        userAgent: '',
                    } as Prisma.SignerUncheckedCreateInput,
                });

                this.logger.log('signlog', 'Signer created for ' + recipient + ': ' + JSON.stringify(Signer));

                let payload = {
                    email: recipient,
                    role_id: "",
                    role: `Owner_${index}`,
                    order: 1,
                    subject: "You Are Invited to Sign a Document from Smart Builder",
                    message: "Hi, this is an invite to sign a document from Smart Builder"
                }
                recipientsPayload.push(payload);
                this.logger.log('signlog', 'Added payload for recipient ' + recipient);
            });


            if (this.SignNowUserName !== senderEmail) {
                recipients.push(senderEmail);
                recipientsPayload.push({
                    email: senderEmail,
                    role_id: "",
                    role: "Builder",
                    order: 1,
                    subject: "You Are Invited to Sign a Document from Smart Builder",
                    message: "Hi, this is an invite to sign a document from Smart Builder"
                });

                const token = this.generateSignerToken(senderEmail, String(signHere.id));
                this.logger.log('signlog', 'Created token ' + token);

                const builderSigner = await this.databaseService.signer.create({
                    data: {
                        documentId: signHere.id,
                        email: senderEmail,
                        name: senderEmail.split('@')[0],
                        token: token,
                        type: 'BUILDER',
                        approvedDate: new Date(),
                        signedDate: new Date(),
                        ipAddress: '',
                        userAgent: '',
                    } as Prisma.SignerUncheckedCreateInput,
                });
                this.logger.log('signlog', 'Builder signer created: ' + JSON.stringify(builderSigner));

                let documentType = "";

                if (Type.includes("specification")) {
                    documentType = "Specifications";
                } else if (Type.includes("selection")) {
                    documentType = "Selections";
                } else if (Type.includes("proposal")) {
                    documentType = "Proposal";
                }

                const templateData = {
                    buildername: builder?.company?.name ?? "Builder",
                    documentType: documentType,
                    signUrl: `${this.config.get("FRONTEND_BASEURL")}/sign-here-document/${token}`
                }

                this.sendgridService.sendEmailWithTemplate(senderEmail, this.config.get('SIGNHERE_TEMPLATE_ID'), templateData , undefined, undefined, sendCC, builder.email)
                this.logger.log('signlog', 'Email sending to: ' + senderEmail);

            }

            return {
                status: true,
                message: "Sign invitation sent successfully.",
                downloadUrl: `/companies/${companyId}/jobs/${jobId}/documents/${fileName}/download`,
            };

        } catch (error) {
            this.logger.log('signlog', '========== ERROR signDocument ==========');
            this.logger.log('signlog', 'ERROR in signDocument: ' + error.message);
            this.logger.log('signlog', 'Error Stack: ' + error.stack);
            this.logger.log('signlog', 'Full Error: ' + JSON.stringify(error));

            return {
                status: false,
                message: error.message || "An unexpected error occurred while processing the document.",
                error: error
            };
        }

    }

    private generateSignerToken(email: string, documentId: string): string {
        const hash = crypto
            .createHash('sha256')
            .update(`${email}${documentId}${Date.now()}${Math.random()}`)
            .digest('hex')
            .toUpperCase();

        const part1 = hash.substring(0, 8);
        const part2 = hash.substring(8, 16);
        const part3 = hash.substring(16, 24);
        const part4 = hash.substring(24, 32);

        return `SH-${part1}-${part2}-${part3}-${part4}`;
    }

    async getDocumentByToken(token: string) {
        try {
            this.logger.log('signlog', '========== START getDocumentByToken ==========');
            this.logger.log('signlog', 'Document Token: ' + token);

            const signer = await this.databaseService.signer.findUnique({
                where: { token },
                include: {
                    document: true,
                },
            });
            this.logger.log('signlog', 'Signer Query Result: ' + JSON.stringify(signer));

            if (!signer) {
                this.logger.log('signlog', 'Invalid token - Signer not found for token: ' + token);
                throw new NotFoundException('Invalid token');
            }

            if (!signer.document) {
                this.logger.log('signlog', 'Document not found for signer: ' + JSON.stringify(signer));
                throw new NotFoundException('Document not found');
            }

            const { originalPdf } = signer.document;

            const uploadedUrl = await this.awsService.getS3BaseUrl();
            const filePath = `${originalPdf}`;

            const response = await this.awsService.getUploadedFile(originalPdf);

            const buffer = Buffer.from(await response.Body.transformToByteArray());

            this.logger.log('signlog', 'Returning document - Filename: ' + originalPdf + ', Buffer size: ' + buffer.length);

            return {
                buffer,
                filename: originalPdf,
            };
        } catch (error) {
            this.logger.log('signlog', '========== ERROR in getDocumentByToken ==========');
            this.logger.log('signlog', 'Error for token: ' + token);
            this.logger.log('signlog', 'Error message: ' + error.message);
            this.logger.log('signlog', 'Error stack: ' + error.stack);
            this.logger.log('signlog', 'Full error: ' + JSON.stringify(error));
            this.logger.log('signlog', '========== END ERROR getDocumentByToken ==========');
            throw error;
        }

    }


    async submitSignedDocument(
        token: string,
        file: Express.Multer.File,
        markers: string,
        ipAddress: string,
        userAgent: string,
    ) {
        try {
            this.logger.log('signlog', '========== START submitSignedDocument ==========');
            this.logger.log('signlog', 'Input Token: ' + token);
            this.logger.log('signlog', 'IP Address: ' + ipAddress);
            this.logger.log('signlog', 'User Agent: ' + userAgent);

            // Find the signer
            const signer = await this.databaseService.signer.findUnique({
                where: { token },
                include: {
                    document: {
                        include: {
                            signers: {
                                orderBy: { id: 'asc' },
                            },
                        },
                        
                    },
                },
            });

            if (!signer) {
                this.logger.log('signlog', 'Invalid token - Signer not found for token: ' + token);
                throw new NotFoundException('Invalid token');
            }

            if (!signer.document) {
                this.logger.log('signlog', 'Document not found for signer ID: ' + signer.id);
                throw new NotFoundException('Document not found');
            }

            // Check if already signed
            if (signer.status === SignerStatus.SIGNED) {
                this.logger.log('signlog', 'Document already signed by this signer - Signer ID: ' + signer.id + ', Email: ' + signer.email);
                throw new BadRequestException('Document already signed by this signer');
            }

            const document = signer.document;
            const originalFileName = document.originalPdf;

            // Generate new filename based on signer type and index
            let newFileName: string;
            const fileExtension = path.extname(originalFileName);
            const fileBaseName = path.basename(originalFileName, fileExtension);
            const timestamp = Date.now();

        
            newFileName = `${signer.id}_${fileBaseName}${fileExtension}`;
    
            const key = `sign-documents/${newFileName}`; 

            const uploadedUrl = await this.awsService.uploadFileToS3(
                                    key,
                                    file.buffer,
                                    file.mimetype || 'application/pdf'
                                    );
        
            this.logger.log('signlog', 'File uploaded to S3 successfully. URL: ' + uploadedUrl);

            // Update signer status to SIGNED
            await this.databaseService.signer.update({
                where: { id: signer.id },
                data: {
                    status: SignerStatus.SIGNED,
                    signedDate: new Date(),
                    ipAddress: ipAddress || '',
                    userAgent: userAgent || '',
                },
            });
            this.logger.log('signlog', 'Signer updated successfully - Status: SIGNED, IP: ' + (ipAddress || 'none') + ', UserAgent: ' + (userAgent || 'none'));

            // Update the document with the new signed PDF
            await this.databaseService.signHere.update({
                where: { id: document.id },
                data: {
                    originalPdf: uploadedUrl,
                    updatedAt: new Date(),
                },
            });
            this.logger.log('signlog', 'Document updated successfully with new PDF URL: ' + uploadedUrl);

            // Check if all signers have signed
            const updatedSigners = await this.databaseService.signer.findMany({
                where: { documentId: document.id },
                orderBy: { id: 'asc' },
            });

            const allSigned = updatedSigners.every((s) => s.status === SignerStatus.SIGNED);

            // Determine document type for email template
            let documentType = "";
            if (document.type.includes("specification")) {
                documentType = "Specifications";
            } else if (document.type.includes("selection")) {
                documentType = "Selections";
            } else if (document.type.includes("proposal")) {
                documentType = "Proposal";
            }

            const companyId = (document as any).companyId;

            let companyName = 'Builder'; 

            if (companyId) {
                const company = await this.databaseService.company.findFirst({
                    where: {
                    id: companyId,
                    isDeleted: false,
                    },
                    select: { name: true },
                });

                if (company?.name) companyName = company.name;
            }     
            // If all signed, update document status (if you have such a field)
            if (allSigned) {
                await this.databaseService.signHere.update({
                    where: { id: document.id },
                    data: {
                        status: 'COMPLETED',
                        completedAt: new Date(),
                    },
                });
                this.logger.log('signlog', 'Document marked as COMPLETED for document ID: ' + document.id);

                console.log('All signers have signed. Document completed!');

                const s3BaseUrl = await this.awsService.getS3BaseUrl();
                const pdfUrl = `${s3BaseUrl}/${uploadedUrl}`;
                const templateData = {
                    documentType: documentType,
                    pdfUrl: pdfUrl,
                };

                await Promise.all(
                    updatedSigners.map(async (signer) => {
                        try {
                            await this.sendgridService.sendEmailWithTemplate(
                                signer.email,
                                this.config.get('SIGNHERE_COMPLETED_TEMPLATE_ID'),
                                templateData
                            );
                            this.logger.log('signlog', `Completion email sent to ${signer.type}: ${signer.email}`);
                        } catch (error) {
                            this.logger.log('signlog', `Failed to send completion email to ${signer.type}: ${signer.email}, Error: ${error.message}`);
                        }
                    })
                );

            }else {
                // Find next unsigned signer for THIS document only
                const nextSigner = updatedSigners.find(
                    (s) => s.status !== SignerStatus.SIGNED
                );

                if (nextSigner) {
                    this.logger.log('signlog', 'Next signer found - ID: ' + nextSigner.id + ', Email: ' + nextSigner.email + ', Type: ' + nextSigner.type);
                    // Calculate owner index if next signer is an OWNER
                    let ownerIndex: number | null = null;
                    if (nextSigner.type === 'OWNER') {
                        const owners = updatedSigners.filter((s) => s.type === 'OWNER');
                        ownerIndex = owners.findIndex((s) => s.id === nextSigner.id);
                        if (ownerIndex === -1) ownerIndex = 0;
                    }               

                    // Prepare email template data
                    const templateData = {
                        buildername: companyName,
                        documentType: documentType,
                        signUrl: `${this.config.get("FRONTEND_BASEURL")}/sign-here-document/${nextSigner.token}`,
                    };

                    // Send email to next signer
                    try {
                        await this.sendgridService.sendEmailWithTemplate(
                            nextSigner.email,
                            this.config.get('SIGNHERE_TEMPLATE_ID'),
                            templateData
                        );
                        this.logger.log('signlog', 'Email sending to: ' + nextSigner.email);
                    } catch (error) {
                        this.logger.log('signlog', 'Failed to send email to next signer: ' + nextSigner.email + ', Error: ' + error.message);
                        console.error(`Failed to send email to next signer: ${nextSigner.email}`, error);
                    }
                }
            }

            return {
                status: true,
                message: 'Document signed successfully',
                signedFileName: newFileName,
                allSigned,
                remainingSigners: updatedSigners.filter((s) => s.status !== SignerStatus.SIGNED).length,
            };
        }catch (error) {
            this.logger.log('signlog', '========== ERROR in submitSignedDocument ==========');
            this.logger.log('signlog', 'Error for token: ' + token);
            this.logger.log('signlog', 'Error message: ' + error.message);
            this.logger.log('signlog', 'Error stack: ' + error.stack);
            this.logger.log('signlog', 'Error name: ' + error.name);
            this.logger.log('signlog', 'Full error: ' + JSON.stringify(error));
            this.logger.log('signlog', '========== END ERROR submitSignedDocument ==========');
            throw error;
        }
    }

    // Get document status
    async getDocumentStatus(token: string) {
        try {
            this.logger.log('signlog', '========== START getDocumentStatus ==========');
            this.logger.log('signlog', 'Input Token: ' + token);

            const signer = await this.databaseService.signer.findUnique({
                where: { token },
                include: {
                    document: {
                        include: {
                            signers: {
                                orderBy: { id: 'asc' },
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    type: true,
                                    status: true,
                                    signedDate: true,
                                },
                            },
                        },
                    },
                },
            });

            if (!signer) {
                this.logger.log('signlog', 'Invalid token - Signer not found for token: ' + token);
                throw new NotFoundException('Invalid token');
            }

            const document = signer.document;
            const signedCount = document.signers.filter((s) => s.status === SignerStatus.SIGNED).length;

            this.logger.log('signlog', 'Signed count: ' + signedCount + ' out of ' + document.signers.length);

            return {
                documentId: document.id,
                status: document.status,
                signers: document.signers.map((s) => ({
                    id: s.id,
                    name: s.name,
                    email: s.email,
                    type: s.type,
                    status: s.status,
                    signedDate: s.signedDate,
                })),
                totalSigners: document.signers.length,
                signedCount: document.signers.filter((s) => s.status === SignerStatus.SIGNED).length,
            };
        }catch (error) {
            this.logger.log('signlog', '========== ERROR in getDocumentStatus ==========');
            this.logger.log('signlog', 'Error for token: ' + token);
            this.logger.log('signlog', 'Error message: ' + error.message);
            this.logger.log('signlog', 'Error stack: ' + error.stack);
            this.logger.log('signlog', 'Error name: ' + error.name);
            this.logger.log('signlog', 'Full error: ' + JSON.stringify(error));
            this.logger.log('signlog', '========== END ERROR getDocumentStatus ==========');
            throw error;
        }
    }

    async getSignerInfo(token: string) {
        try {
            this.logger.log('signlog', '========== START getSignerInfo ==========');
            this.logger.log('signlog', 'Input Token: ' + token);

            const signer = await this.databaseService.signer.findUnique({
                where: { token },
                include: {
                    document: {
                        include: {
                            signers: {
                                orderBy: { id: 'asc' },
                            },
                        },
                    },
                },
            });

            if (!signer) {
                this.logger.log('signlog', 'Invalid token - Signer not found for token: ' + token);
                throw new NotFoundException('Invalid token');
            }

            // Calculate owner index if signer is an OWNER
            let ownerIndex: number | null = null;
            if (signer.type === 'OWNER' && signer.document) {
                const owners = signer.document.signers.filter((s) => s.type === 'OWNER');
                ownerIndex = owners.findIndex((s) => s.id === signer.id);
                if (ownerIndex === -1) ownerIndex = 0;
            }

            // Check document completion status
            const document = signer.document;
            const allSigners = document?.signers || [];
            const signedCount = allSigners.filter((s) => s.status === 'SIGNED').length;
            const totalSigners = allSigners.length;
            const isDocumentCompleted = document?.status === 'COMPLETED' || signedCount === totalSigners;

            let isLastOwner = false;

            if (signer.type === 'OWNER' && signer.document) {
                const ownerSigners = signer.document.signers
                    .filter(s => s.type === 'OWNER')
                    .sort((a, b) => b.id - a.id); // DESC by id

                if (ownerSigners.length > 0 && ownerSigners[0].id === signer.id) {
                    isLastOwner = true;
                }
            }

            return {
                id: signer.id,
                type: signer.type,
                name: signer.name,
                email: signer.email,
                ownerIndex,
                status: signer.status,
                signedDate: signer.signedDate,
                documentStatus: document?.status,
                isDocumentCompleted,
                totalSigners,
                signedCount,
                documentType:document?.type,
                isLastOwner: isLastOwner
            };
        } catch (error) {
            this.logger.log('signlog', '========== ERROR in getSignerInfo ==========');
            this.logger.log('signlog', 'Error for token: ' + token);
            this.logger.log('signlog', 'Error message: ' + error.message);
            this.logger.log('signlog', 'Error stack: ' + error.stack);
            this.logger.log('signlog', 'Error name: ' + error.name);
            this.logger.log('signlog', 'Full error: ' + JSON.stringify(error));
            this.logger.log('signlog', '========== END ERROR getSignerInfo ==========');
            throw error;
        }

    }

    async getSignedPdfByToken(token: string) {
        try {
            this.logger.log('signlog', '========== START getSignedPdfByToken ==========');
            this.logger.log('signlog', 'Input Token: ' + token);

            const signer = await this.databaseService.signer.findUnique({
                where: { token },
                include: {
                    document: true,
                },
            });
            this.logger.log('signlog', 'Signer Query Result: ' + JSON.stringify(signer));

            if (!signer) {
                this.logger.log('signlog', 'Invalid token - Signer not found for token: ' + token);
                throw new NotFoundException('Invalid token');
            }

            if (!signer.document) {
                this.logger.log('signlog', 'Document not found for signer: ' + JSON.stringify(signer));
                throw new NotFoundException('Document not found');
            }

            const { originalPdf } = signer.document;

            // Prefer signed PDF, fallback to original
            const pdfToServe = originalPdf;

            if (!pdfToServe) {
                this.logger.log('signlog', 'PDF file not found - pdfToServe is null/undefined');
                throw new NotFoundException('PDF file not found');
            }

            const uploadedUrl = await this.awsService.getS3BaseUrl();
            const filePath = `${pdfToServe}`;
            console.log(pdfToServe);

            const response = await this.awsService.getUploadedFile(filePath);

            // Convert to buffer
            const buffer = Buffer.from(await response.Body.transformToByteArray());


            return {
                buffer,
                filename: originalPdf ? `signed-document.pdf` : pdfToServe,
            };
        } catch (error) {
            this.logger.log('signlog', '========== ERROR in getSignedPdfByToken ==========');
            this.logger.log('signlog', 'Error for token: ' + token);
            this.logger.log('signlog', 'Error message: ' + error.message);
            this.logger.log('signlog', 'Error stack: ' + error.stack);
            this.logger.log('signlog', 'Error name: ' + error.name);
            this.logger.log('signlog', 'Full error: ' + JSON.stringify(error));
            this.logger.log('signlog', '========== END ERROR getSignedPdfByToken ==========');
            throw error;
        }

    }
    

}
