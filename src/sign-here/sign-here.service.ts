import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
        private readonly config: ConfigService
    ) {
        if (!fs.existsSync(this.uploadPath)) {
            fs.mkdirSync(this.uploadPath, { recursive: true });
        }
    }

    async signDocument(companyId: number, jobId: number, Type: string, file: Express.Multer.File, body: any, user: User) {

        try {


            const timestamp = Date.now();
            const fileName = `${companyId}_${jobId}_${timestamp}_${file.originalname}`;
            const filePath = path.join(this.uploadPath, fileName);
            const key = `sign-documents/${fileName}`; 

            const uploadedUrl = await this.awsService.uploadFileToS3(
                                    key,
                                    file.buffer,
                                    file.mimetype || 'application/pdf'
                                    );

        
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
                select: { email: true }
            });

            const signHere = await this.databaseService.signHere.create({
                data: {
                    type: Type,
                    originalPdf: uploadedUrl,
                    ccAdmin: sendCC,
                },
            });

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

                const builerSigner = await this.databaseService.signer.create({
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

                let documentType = "";

                if (Type.includes("Specification")) {
                    documentType = "Specification";
                } else if (Type.includes("Selection")) {
                    documentType = "Selection";
                } else if (Type.includes("Proposal")) {
                    documentType = "Proposal";
                }

                const templateData = {
                    buildername: body.senderName,
                    documentType: documentType,
                    signUrl: `${this.config.get("FRONTEND_BASEURL")}/sign-here-document/${token}`
                }
                this.sendgridService.sendEmailWithTemplate(senderEmail, this.config.get('SIGNHERE_TEMPLATE_ID'), templateData)

            }

            return {
                status: true,
                message: "Sign invitation sent successfully.",
                downloadUrl: `/companies/${companyId}/jobs/${jobId}/documents/${fileName}/download`,
            };

        } catch (error) {
            console.error("Error in signDocument:", error);

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
        const signer = await this.databaseService.signer.findUnique({
            where: { token },
            include: {
                document: true,
            },
        });

        if (!signer) {
            throw new NotFoundException('Invalid token');
        }

        if (!signer.document) {
            throw new NotFoundException('Document not found');
        }

        const { originalPdf } = signer.document;

        const uploadedUrl = await this.awsService.getS3BaseUrl();
        const filePath = `${originalPdf}`;

        const response = await this.awsService.getUploadedFile(originalPdf);

        const buffer = Buffer.from(await response.Body.transformToByteArray());

        return {
            buffer,
            filename: originalPdf,
        };
    }


    async submitSignedDocument(
        token: string,
        file: Express.Multer.File,
        markers: string,
        ipAddress: string,
        userAgent: string,
    ) {
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
            throw new NotFoundException('Invalid token');
        }

        if (!signer.document) {
            throw new NotFoundException('Document not found');
        }

        // Check if already signed
        if (signer.status === SignerStatus.SIGNED) {
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
 
        const key = `sign-documents/${fileBaseName}`; 

        const uploadedUrl = await this.awsService.uploadFileToS3(
                                key,
                                file.buffer,
                                file.mimetype || 'application/pdf'
                                );
 
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

        // Update the document with the new signed PDF
        await this.databaseService.signHere.update({
            where: { id: document.id },
            data: {
                originalPdf: uploadedUrl,
                updatedAt: new Date(),
            },
        });

        // Check if all signers have signed
        const updatedSigners = await this.databaseService.signer.findMany({
            where: { documentId: document.id },
        });

        const allSigned = updatedSigners.every((s) => s.status === SignerStatus.SIGNED);

        // If all signed, update document status (if you have such a field)
        if (allSigned) {
            await this.databaseService.signHere.update({
                where: { id: document.id },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                },
            });

            console.log('All signers have signed. Document completed!');
        }else {
            // Find next unsigned signer for THIS document only
            const nextSigner = updatedSigners.find(
                (s) => s.status !== SignerStatus.SIGNED
            );

            if (nextSigner) {
                // Calculate owner index if next signer is an OWNER
                let ownerIndex: number | null = null;
                if (nextSigner.type === 'OWNER') {
                    const owners = updatedSigners.filter((s) => s.type === 'OWNER');
                    ownerIndex = owners.findIndex((s) => s.id === nextSigner.id);
                    if (ownerIndex === -1) ownerIndex = 0;
                }

                // Determine document type for email template
                let documentType = "";
                if (document.type.includes("Specification")) {
                    documentType = "Specification";
                } else if (document.type.includes("Selection")) {
                    documentType = "Selection";
                } else if (document.type.includes("Proposal")) {
                    documentType = "Proposal";
                } else if (document.type.includes("Paint")) {
                    documentType = "Paint Selection";
                } else {
                    documentType = document.type || "Document";
                }

                // Prepare email template data
                const templateData = {
                    buildername: nextSigner.name || nextSigner.email.split('@')[0],
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
                    
                } catch (error) {
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
    }

    // Get document status
    async getDocumentStatus(token: string) {
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
            throw new NotFoundException('Invalid token');
        }

        const document = signer.document;

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
    }

    async getSignerInfo(token: string) {
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
            documentType:document?.type
        };
    }

    async getSignedPdfByToken(token: string) {
        const signer = await this.databaseService.signer.findUnique({
            where: { token },
            include: {
                document: true,
            },
        });

        if (!signer) {
            throw new NotFoundException('Invalid token');
        }

        if (!signer.document) {
            throw new NotFoundException('Document not found');
        }

        const { originalPdf } = signer.document;

        // Prefer signed PDF, fallback to original
        const pdfToServe = originalPdf;

        if (!pdfToServe) {
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
    }

}
