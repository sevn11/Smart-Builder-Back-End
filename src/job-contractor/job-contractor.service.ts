import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { User } from '@prisma/client';
import { DatabaseService } from 'src/database/database.service';
import { JobContractorDTO } from './validators/job-contractor';
import { PrismaErrorCodes, ResponseMessages, UserTypes } from 'src/core/utils';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { SendInfoToContractorDTO } from './validators/send-info-mail';
import { readFile } from 'fs/promises';
import { SendgridService } from 'src/core/services';
import { ConfigService } from '@nestjs/config';
const convertHTMLToPDF = require('pdf-puppeteer');

@Injectable()
export class JobContractorService {

    constructor(
        private databaseService: DatabaseService,
        private sendgridService: SendgridService,
        private readonly config: ConfigService,
    ) { }

    // fn get all job contractors
    async getAllJobContractors(user: User, companyId: number, jobId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                let jobContractors = await this.databaseService.jobContractor.findMany({
                    where: {
                        companyId,
                        jobId,
                    },
                    include: {
                        contractor: {
                            include: {
                                phase: true
                            }
                        }
                    }
                });
                return { jobContractors }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }

    // fn to assign a main contractor to a job (create job contractor)
    async createJobcontractor(user: User, companyId: number, jobId: number, body: JobContractorDTO) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }
                // Check if contractor already assigned
                const existingJobContractors = await this.databaseService.jobContractor.findMany({
                    where: {
                        companyId,
                        jobId,
                        contractorId: { in: body.contractorIds }
                    }
                });

                if (existingJobContractors.length > 0) {
                    throw new ConflictException('One or more contractors are already assigned to this job');
                }

                // Create the job contractor 
                const jobContractors = await Promise.all(body.contractorIds.map(async contractorId => {
                    return await this.databaseService.jobContractor.create({
                        data: {
                            companyId,
                            jobId,
                            contractorId
                        }
                    });
                }));

                return { jobContractors };

            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                } else {
                    console.error(error.code);
                }
            } else if (error instanceof ForbiddenException || error instanceof ConflictException) {
                throw error;
            }

            throw new InternalServerErrorException();
        }
    }

    // fn to delete the contractor from the job
    async deletejobContractor(user: User, companyId: number, jobId: number, jobContractorId: number) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // check jobcontractor exist or not
                await this.databaseService.jobContractor.findFirstOrThrow({
                    where: {
                        id: jobContractorId,
                        companyId,
                        jobId
                    }
                });

                // delete the contractor from the job
                await this.databaseService.jobContractor.delete({
                    where: {
                        id: jobContractorId,
                        companyId,
                        jobId
                    }
                })

                return { message: ResponseMessages.SUCCESSFUL }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException();
        }
    }


    // fn to send information mails to contarctors with files
    async sendInfoMail(user: User, companyId: number, jobId: number, body: SendInfoToContractorDTO) {
        try {
            // Check if User is Admin / Builder of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                const jobContractors = body.jobContractors;
                const sendCC = body.sendCC;
                const subject = body.subject
                let ccMail = null;

                // get user company information
                let company = await this.databaseService.company.findUniqueOrThrow({
                    where: {
                        id: companyId,
                        isActive: true,
                        isDeleted: false
                    }
                });
                let replyTo = null;
                if (!company.email) {
                    throw new ForbiddenException("Company email not found");
                }
                replyTo = ccMail = company.email;

                await Promise.all(jobContractors.map(async (jobContractor) => {
                    // Prepare attachments array
                    let attachments = [];
                    if (body.files) {
                        const fileIds = body.files;
                        attachments = await Promise.all(fileIds.map(async (fileId) => {
                            // Retrieve file data from database
                            const file = await this.databaseService.contractorFiles.findFirstOrThrow({
                                where: { id: fileId }
                            });
    
                            // Read file content asynchronously
                            const fileContent = await readFile(file.filePath);
    
                            // Return attachment object
                            return {
                                content: fileContent.toString('base64'),
                                filename: file.fileName,
                            };
                        }));
                    }
                    // Retrieve job contractor data from database
                    const jobContractorData = await this.databaseService.jobContractor.findFirstOrThrow({
                        where: { id: Number(jobContractor.id) }
                    });

                    // Retrieve contractor data using contractorId from job contractor data
                    const contractor = await this.databaseService.contractor.findFirstOrThrow({
                        where: { id: jobContractorData.contractorId },
                        include: { phase: true }
                    });

                    // Prepare template data for email
                    const templateData = {
                        user_name: contractor.name,
                        subject: subject,
                    };

                    // Fetch linked informations if send details is checked
                    if (jobContractor.sendDetails) {
                        let jobDetails = await this.databaseService.job.findFirst({
                            where: { id: jobId, companyId, isDeleted: false },
                            include: {
                                customer: true,
                                description: true,
                                company: true
                            }
                        });
                        // Get template attached to project
                        const clientTemplateInfo = await this.databaseService.clientTemplate.findFirstOrThrow({
                            where: {
                                companyId,
                                jobId: jobId,
                                isDeleted: false,
                                questionnaireTemplateId: jobDetails.templateId,
                            }
                        })
                        // Fetching all linked info of phase
                        const [clientCategoryDetails] = await Promise.all([
                            await this.databaseService.clientCategory.findMany({
                                where: {
                                    companyId,
                                    isDeleted: false,
                                    jobId,
                                    phaseIds: {
                                        has: contractor.phaseId
                                    },
                                    clientTemplateId: clientTemplateInfo.id,
                                },
                                orderBy: { questionnaireOrder: 'asc' },
                                include: {
                                    ClientTemplateQuestion: {
                                        where: {
                                            isDeleted: false,
                                            phaseIds: {
                                                has: contractor.phaseId
                                            },
                                        },
                                        orderBy: { questionOrder: 'asc' },
                                        include: {
                                            answer: {
                                                where: { jobId, companyId },
                                                omit: { createdAt: true, updatedAt: true }
                                            }
                                        }
                                    }
                                }
                            }),
                        ]);
                        // Sorting the data based on template type
                        let linkToQuestionnaireItems = [];
                        let linkToInitialSelectionItems = [];
                        let linkToPaintSelectionItems = [];

                        // Loop through each category to filter questions based on the priority
                        clientCategoryDetails.forEach(category => {
                            category.ClientTemplateQuestion.forEach(question => {
                                if (question.linkToQuestionnaire) {
                                    linkToQuestionnaireItems.push({ ...question, category });
                                } else if (question.linkToInitalSelection) {
                                    linkToInitialSelectionItems.push({ ...question, category });
                                } else if (question.linkToPaintSelection) {
                                    linkToPaintSelectionItems.push({ ...question, category });
                                }
                            });
                        });

                        const allItems = [
                            ...linkToQuestionnaireItems,
                            ...linkToInitialSelectionItems,
                            ...linkToPaintSelectionItems
                        ];
                        let formattedDetails = clientCategoryDetails.map(clientCategory => {
                            const categoryQuestions = allItems.filter(item => item.category.id === clientCategory.id);
                            return {
                                category: clientCategory.id,
                                categoryName: clientCategory.name,
                                questions: categoryQuestions.map(question => {
                                    let answer: any;
                                    if (question.questionType === "Allowance") {
                                        const answerText = question?.answer?.answerText ?? "0";
                                        answer = `$${this.formatNumberWithCommas(parseFloat(answerText as string))}`;
                                    } else if (question.questionType === "Multiple Choice Question" && question?.multipleOptions) {
                                        if (question?.answer?.answerIds?.length > 0) {
                                            let options = question?.multipleOptions as any;
                                            answer = options.filter((option, index) => question.answer.answerIds.includes(String(index)))
                                                .map(option => option.text)
                                                .join(", ");
                                        } else {
                                            answer = "-";
                                        }
                                    } else {
                                        answer = question?.answer?.answerText ?? "-";
                                    }
                                    return {
                                        questionId: question.id,
                                        questionText: question.question,
                                        questionType: question.questionType,
                                        answer
                                    };
                                })
                            }
                        });

                        let htmlContent = await this.generateDetailsHtml(jobDetails, formattedDetails, contractor.phase);
                        // Generate pdf from HTML and add as attachment
                        await convertHTMLToPDF(
                            htmlContent,
                            function (pdf: any) {
                                attachments.push({
                                    content: pdf.toString('base64'),
                                    filename: 'Contractor_Details.pdf',
                                    type: 'application/pdf',
                                    disposition: 'attachment',
                                })
                            },
                            {
                                format: 'A4', printBackground: true, margin: {
                                    top: '1cm',
                                    bottom: '2cm',
                                    left: '1cm',
                                    right: '1cm',
                                }
                            },
                            {
                                args: [
                                    '--no-sandbox',
                                    '--disable-setuid-sandbox'
                                ]
                            }
                        );
                    }
                    // Send emails with template and attachments
                    await this.sendgridService.sendEmailWithTemplate(
                        contractor.email,
                        this.config.get('CONTRACTOR_FILE_MAIL_ID'),
                        templateData,
                        attachments,
                        replyTo,
                        sendCC,
                        ccMail
                    );
                }));

                return { message: ResponseMessages.SUCCESSFUL }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }

        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException({
                message: 'An unexpected error occurred.',
                details: error.message,
            });
        }
    }

    // Function to get details of individual contractor
    async getJobContractorDetails(user: User, companyId: number, jobId: number, rowId: number) {
        try {
            const jobContractor = await this.databaseService.jobContractor.findUniqueOrThrow({
                where: { id: rowId },
                include: {
                    contractor: {
                        include: {
                            phase: true
                        }
                    },
                }
            })
    
            let jobDetails = await this.databaseService.job.findFirst({
                where: { id: jobId, companyId, isDeleted: false },
                include: {
                    customer: true,
                    description: true,
                    company: true
                }
            });
            // Get template attached to project
            const clientTemplateInfo = await this.databaseService.clientTemplate.findFirstOrThrow({
                where: {
                    companyId,
                    jobId: jobId,
                    isDeleted: false,
                    questionnaireTemplateId: jobDetails.templateId,
                }
            })
            // Fetching all linked info of phase
            const clientCategoryDetails = await this.databaseService.clientCategory.findMany({
                where: {
                    companyId,
                    isDeleted: false,
                    jobId,
                    phaseIds: {
                        has: jobContractor.contractor.phase.id
                    },
                    clientTemplateId: clientTemplateInfo.id
                },
                orderBy: { questionnaireOrder: 'asc' },
                include: {
                    ClientTemplateQuestion: {
                        where: {
                            isDeleted: false,
                            phaseIds: {
                                has: jobContractor.contractor.phase.id
                            }
                        },
                        orderBy: { questionOrder: 'asc' },
                        include: {
                            answer: {
                                where: { jobId, companyId },
                                omit: { createdAt: true, updatedAt: true }
                            }
                        }
                    }
                }
            })
            // Sorting the data based on template type
            let linkToQuestionnaireItems = [];
            let linkToInitialSelectionItems = [];
            let linkToPaintSelectionItems = [];

            // Loop through each category to filter questions based on the priority
            clientCategoryDetails.forEach(category => {
                category.ClientTemplateQuestion.forEach(question => {
                    if (question.linkToQuestionnaire) {
                        linkToQuestionnaireItems.push({ ...question, category });
                    } else if (question.linkToInitalSelection) {
                        linkToInitialSelectionItems.push({ ...question, category });
                    } else if (question.linkToPaintSelection) {
                        linkToPaintSelectionItems.push({ ...question, category });
                    }
                });
            });

            const allItems = [
                ...linkToQuestionnaireItems,
                ...linkToInitialSelectionItems,
                ...linkToPaintSelectionItems
            ];
            let formattedDetails = clientCategoryDetails.map(clientCategory => {
                const categoryQuestions = allItems.filter(item => item.category.id === clientCategory.id);
                return {
                    category: clientCategory.id,
                    categoryName: clientCategory.name,
                    questions: categoryQuestions.map(question => {
                        let answer: any;
                        if (question.questionType === "Allowance") {
                            const answerText = question?.answer?.answerText ?? "0";
                            answer = `$${this.formatNumberWithCommas(parseFloat(answerText as string))}`;
                        } else if (question.questionType === "Multiple Choice Question" && question?.multipleOptions) {
                            if (question?.answer?.answerIds?.length > 0) {
                                let options = question?.multipleOptions as any;
                                answer = options.filter((option, index) => question.answer.answerIds.includes(String(index)))
                                    .map(option => option.text)
                                    .join(", ");
                            } else {
                                answer = "-";
                            }
                        } else {
                            answer = question?.answer?.answerText ?? "-";
                        }
                        return {
                            questionId: question.id,
                            questionText: question.question,
                            questionType: question.questionType,
                            answer
                        };
                    })
                }
            });
            const response = {
                jobDetails: jobDetails,
                phase: jobContractor.contractor.phase,
                details: formattedDetails,
            };
    
            return { contractorDetails: response };
        }
        catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code == PrismaErrorCodes.NOT_FOUND)
                    throw new BadRequestException(ResponseMessages.USER_NOT_FOUND);
                else {
                    console.log(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }
            throw new InternalServerErrorException({
                message: 'An unexpected error occurred.',
                details: error.message,
            });
        }
    }

    private getCurrentDate() {
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        const day = date.getDate().toString().padStart(2, "0");
      
        return `${month}/${day}/${year}`;
    }

    private async generateDetailsHtml(jobDetails: any, formattedDetails: any[], phase: any) {
        const phaseName = phase?.name || "N/A";
        let logo = jobDetails.company.logo ? jobDetails.company.logo : "https://smart-builder-asset.s3.us-east-1.amazonaws.com/companies/53/logos/smartbuilder-logo.png"
        const response = await fetch(logo);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');
        const mimeType = response.headers.get('content-type');
        let logoBase64 = `data:${mimeType};base64,${base64Image}`;

        let htmlContent = `
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap" rel="stylesheet">
                <style>
                    body {
                        font-family: 'Roboto', sans-serif;
                    }
                    h2, h4 {
                        font-family: 'Roboto', sans-serif;
                    }
                </style>
            </head>
            <div style="display: flex; justify-content: center; align-items: center;">
                <div style="width: 900px; padding: 20px;">
                    <div style="margin-bottom: 10px;">
                        <img src="${logoBase64}" style="width: 100px" />
                    </div>
                      <!-- Phase Name (Title) -->
                    <div>
                       <h2 style="text-align: center; margin: 20px 0; font-weight: bold; font-size: 16px; font-size: 25px;">${phaseName}</h2>
                    </div>
                    <div style="display: flex; flex-direction: row; justify-content: space-between;align-items: flex-end; width: 100%;margin-top: 30px;">
                        <div>
                                <h4 style="margin: 0">${jobDetails.customer.name}</h4>
                                <h4 style="margin: 0">${jobDetails.projectAddress}</h4>
                                <h4 style="margin: 0">
                                    ${jobDetails.projectCity ? `${jobDetails.projectCity}, ` : ''}
                                    ${jobDetails.projectState} ${jobDetails.projectZip}
                                </h4>
                        </div>
                        <div>
                            <h4 style="margin: 0">Date: ${this.getCurrentDate()}</h4>
                        </div>
                    </div>
        `;

        if (formattedDetails.length === 0) {
            htmlContent += `
                <div style="text-align: center; margin-top: 20px; font-weight: bold;">
                    No data found
                </div>
            `;
        }
        else {
            formattedDetails.forEach((category: any) => {
                htmlContent += `
                <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                   <thead>
                        <tr style="color: #000000; font-size: bold;">
                            <th colspan="2" style="font-size: 14px; font-size: 16px; font-weight: bold; padding: 8px; text-align: left; text-transform: uppercase; border: 1px solid #ddd; background-color: rgb(38, 67, 115); color: white;">
                        ${category.categoryName}
                      </th>
                        </tr>
                    </thead>
                    <tbody>
                `
                category.questions.forEach((question: any) => {
                    let answer = question.answer ?? "-"

                    htmlContent += `
                    <tr>
                        <td style="width: 50%; text-align: left; font-weight: bold; padding: 8px;border: 1px solid #ddd;">${question.questionText}</td>
                        <td style="width: 50%; text-align: left; padding: 8px;border: 1px solid #ddd;">${answer}</td>
                    </tr>
              `;
                });
            });
        }

        htmlContent += `
                    </tbody>
                </table>
            </div>
        </div>
        `;

        return htmlContent;
    }

    private formatNumberWithCommas = (number: number | string) => {
        if (isNaN(Number(number))) {
            return 0;
        }

        let numberString = number.toString();

        numberString = numberString.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        return numberString;
    };
}
