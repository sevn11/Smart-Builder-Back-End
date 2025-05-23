import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GoogleEventId, Job, JobSchedule, User } from "@prisma/client";
import { calendar_v3, google } from "googleapis";
import { DatabaseService } from "src/database/database.service";
import { PrismaErrorCodes, ResponseMessages, UserTypes } from "../utils";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { OAuth2Client } from "google-auth-library";
import { colorMaps } from "../utils/calendar-color-codes";

interface RequestBody {
    summary: string,
    description: string,
    start: {
        date: string;
    };
    end: {
        date: string;
    };
    colorId?: string;
}

@Injectable()
export class GoogleService {
    private calendar: calendar_v3.Calendar;
    private oauth2Client: OAuth2Client;

    constructor(
        private readonly config: ConfigService,
        private databaseService: DatabaseService,
    ) {
        this.oauth2Client = new google.auth.OAuth2(
            config.get('GOOGLE_CLIENT_ID'),
            config.get('GOOGLE_CLIENT_SECRET'),
        )
    }

    setCredentials(accessToken: string) {
        this.oauth2Client.setCredentials({ access_token: accessToken });
        this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    }

    // Handle google authentication
    async handleGoogleAuthentication(user: User, companyId: number, body: any) {
        try {
            // Check if User is Admin of the Company.
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) {
                if ((user.userType == UserTypes.BUILDER || user.userType == UserTypes.EMPLOYEE) && user.companyId !== companyId || !user) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Check required permssions are given by user (calender)
                const hasCalendarPermission = body.codeResponse.scope.split(' ').includes('https://www.googleapis.com/auth/calendar');
                if (!hasCalendarPermission) {
                    return { status: false, message: "Permission to access Google Calendar is not provided." }
                }

                let oathClient = new google.auth.OAuth2(
                    this.config.get('GOOGLE_CLIENT_ID'),
                    this.config.get('GOOGLE_CLIENT_SECRET'),
                    'postmessage'
                )
                // get tokens using code response
                const { tokens } = await oathClient.getToken(body.codeResponse.code);

                // insert google token to user table
                await this.databaseService.user.update({
                    where: {
                        id: user.id
                    },
                    data: {
                        googleAccessToken: tokens.access_token,
                        googleRefreshToken: tokens.refresh_token ?? ""
                    }
                })
                return { status: true, message: ResponseMessages.SUCCESSFUL }
            } else {
                throw new ForbiddenException("Action Not Allowed");
            }
        } catch (error) {
            console.log(error);
            // Database Exceptions
            if (error instanceof PrismaClientKnownRequestError) {
                if (error.code === PrismaErrorCodes.NOT_FOUND) {
                    throw new BadRequestException(ResponseMessages.RESOURCE_NOT_FOUND);
                } else {
                    console.error(error.code);
                }
            } else if (error instanceof ForbiddenException) {
                throw error;
            }

            throw new InternalServerErrorException();
        }
    }

    async getAuthenticatedUserEmail(user: User): Promise<string | null> {
        this.setCredentials(user.googleAccessToken);

        try {
            const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
            const userInfoResponse = await oauth2.userinfo.get();

            return userInfoResponse.data.email || null;
        } catch (error) {
            console.error("Error fetching user email:", error);
            return null;
        }
    }

    async disconnectAuthenticatedUser(user: User) {
        try {
            let userCompany = await this.databaseService.company.findFirst({
                where: { id: user.companyId }
            });
            if (userCompany && user.googleAccessToken && user.calendarId) {
                // Remove calendar from google calendar
                this.setCredentials(user.googleAccessToken);
                if (await this.checkCalendarExist(user)) {
                    await this.calendar.calendars.delete({
                        calendarId: user.calendarId
                    });
                }
                // Set synced events to null for each jobs under the company
                let jobsAndEvents = await this.databaseService.job.findMany({
                    where: {
                        isDeleted: false,
                        companyId: user.companyId
                    },
                    include: {
                        JobSchedule: true
                    }
                });
                if (jobsAndEvents.length > 0) {
                    for (let job of jobsAndEvents) {
                        const jobSyncExist = await this.databaseService.googleEventId.findFirst({
                            where: {
                                jobId: job.id,
                                jobScheduleId: null,
                                companyId: user.companyId,
                                userId: user.id,
                                isDeleted: false
                            },
                            orderBy: { id: 'desc' },
                            take: 1
                        });

                        if (jobSyncExist && jobSyncExist.eventId) {
                            await this.databaseService.googleEventId.update({
                                where: { id: jobSyncExist.id },
                                data: { eventId: null }
                            })
                        }

                        if (job.JobSchedule.length > 0) {
                            for (let schedule of job.JobSchedule) {
                                const syncExist = await this.databaseService.googleEventId.findFirst({
                                    where: {
                                        jobId: job.id,
                                        jobScheduleId: schedule.id,
                                        companyId: user.companyId,
                                        userId: user.id,
                                        isDeleted: false,
                                    },
                                    orderBy: { id: 'desc' },
                                    take: 1,
                                });
                                if (syncExist && syncExist?.eventId) {
                                    await this.databaseService.googleEventId.update({
                                        where: { id: syncExist.id, isDeleted: false },
                                        data: { eventId: null }
                                    })
                                }
                            };
                        }
                    };

                }
            }
            // Remove auth token from user table
            await this.databaseService.user.update({
                where: { id: user.id },
                data: {
                    googleAccessToken: null,
                    googleRefreshToken: null,
                    calendarId: null,
                }
            });
            return ResponseMessages.SUCCESSFUL;
        } catch (error) {
            console.log(error)
            throw new InternalServerErrorException({
                error: "An unexpected error occured.",
                errorDetails: error
            })
        }
    }

    // Handle refresh token
    async refreshAccessToken(user: User) {
        this.oauth2Client.setCredentials({
            refresh_token: user.googleRefreshToken,
        });

        try {
            const { credentials } = await this.oauth2Client.refreshAccessToken();
            // Update user's access token in the database
            await this.databaseService.user.update({
                where: { id: user.id },
                data: { googleAccessToken: credentials.access_token },
            });

            return true;
        } catch (error) {
            console.error('Error refreshing access token:', error);
            return false;
        }
    }

    // Fn to check is user authenticated using google account
    async checkAuthStatus(user: User) {
        // check token validity
        this.setCredentials(user.googleAccessToken);

        // Verify the token by making a simple request to the Google API
        try {
            await this.oauth2Client.getTokenInfo(user.googleAccessToken);
            return { isAuthentcaited: true }
        } catch (error) {
            // Get new token using refresh token if it's exist
            if (error.response.data.error == 'invalid_token') {
                if (user.googleRefreshToken) {
                    let res = await this.refreshAccessToken(user);
                    if (res) {
                        return { isAuthentcaited: true }
                    }
                }
            }
            return { isAuthentcaited: false }
        }
    }

    // Fn to sync passed job / project to google calendar
    async syncToCalendar(userId: number, job: any, eventId?: string) {
        let response = { status: false, message: "" };
        let user = await this.databaseService.user.findFirstOrThrow({
            where: { id: userId }
        });

        try {
            if (!await this.checkCalendarExist(user)) {
                await this.createCalendar(user);
                // fetch latest udpated user
                user = await this.databaseService.user.findUnique({
                    where: { id: user.id },
                });
            }

            // check is project already synced
            if (!eventId && await this.checkAlreadySynced(user, job)) {
                response.status = true;
                response.message = "Project already synced with google calendar";
                return response;
            }


            this.setCredentials(user.googleAccessToken);

            // Format the date to yyyy-mm-dd
            let startObj = new Date(job.startDate);
            const isoDate = startObj.toISOString();
            const formattedStartDate = isoDate.split("T")[0];

            // Format the date to yyyy-mm-dd
            let endObj = new Date(job.endDate);
            const isoEnd = endObj.toISOString();
            let formattedEndDate = isoEnd.split("T")[0];
            // in case if the start and end date is not same, add one day to sync end date to google calendar.
            if (formattedStartDate != formattedEndDate) {
                endObj.setDate(endObj.getDate() + 1);
                const newIsoEnd = endObj.toISOString();
                formattedEndDate = newIsoEnd.split("T")[0];
            }
            let requestBody: RequestBody = {
                summary: job.customer.name ?? "",
                description: job.description ?? "",
                start: {
                    'date': formattedStartDate,
                },
                end: {
                    'date': formattedEndDate,
                }
            }

            // Only add colorId if it is valid
            const colorId = colorMaps[job.calendarColor];
            if (colorId) {
                requestBody.colorId = colorId;
            }

            // update or insert event based on event id params
            let res = null;

            if (eventId) {
                res = await this.calendar.events.update({
                    calendarId: user.calendarId,
                    eventId: eventId,
                    requestBody
                });
            }
            else {
                res = await this.calendar.events.insert({
                    calendarId: user.calendarId,
                    requestBody
                });
            }

            // Insert event ID to database

            this.upsertJobEventId(job.id, user.id, user.companyId, res.data.id)
            response.status = true;
            response.message = "Project synced with google calendar";
            return response;

        } catch (error) {
            console.error("event error", error);
            response.message = "Error while syncing to google calendar";
            return response;
        }
    }

    async syncJobSchedule(userId: number, schedule: any, eventId?: string, syncExist?: GoogleEventId) {
        let user = await this.databaseService.user.findFirstOrThrow({
            where: { id: userId }
        });

        try {
            if (!await this.checkCalendarExist(user)) {
                await this.createCalendar(user);
                // fetch latest udpated user
                user = await this.databaseService.user.findUnique({
                    where: { id: user.id },
                });
            }


            this.setCredentials(user.googleAccessToken);

            // Format the date to yyyy-mm-dd
            let startObj = new Date(schedule.startDate);
            const isoDate = startObj.toISOString();
            const formattedStartDate = isoDate.split("T")[0];

            // Format the date to yyyy-mm-dd
            let endObj = new Date(schedule.endDate);
            const isoEnd = endObj.toISOString();
            let formattedEndDate = isoEnd.split("T")[0];
            // in case if the start and end date is not same, add one day to sync end date to google calendar.
            if (formattedStartDate != formattedEndDate) {
                endObj.setDate(endObj.getDate() + 1);
                const newIsoEnd = endObj.toISOString();
                formattedEndDate = newIsoEnd.split("T")[0];
            }

            let requestBody: RequestBody = {
                summary: `${schedule.contractor.phase.name} (${schedule.job.customer.name})`,
                description: schedule.job.description.name ?? "",
                start: {
                    'date': formattedStartDate,
                },
                end: {
                    'date': formattedEndDate
                }
            }
            // Only add colorId if it is valid
            const colorId = colorMaps[schedule.job.calendarColor];
            if (colorId) {
                requestBody.colorId = colorId;
            }

            // Insert or Update schedule to google calendar
            let res = null;
            if (syncExist?.eventId) {
                let updatedUser = await this.databaseService.user.findFirst({
                    where: { id: user.id }
                });
                let event = await this.getEventFromGoogleCalendar(updatedUser, syncExist);
                if (event) {
                    res = await this.calendar.events.update({
                        calendarId: user.calendarId,
                        eventId: syncExist?.eventId,
                        requestBody
                    });
                }
                else {
                    res = await this.calendar.events.insert({
                        calendarId: user.calendarId,
                        requestBody
                    });
                }
            }
            else {
                res = await this.calendar.events.insert({
                    calendarId: user.calendarId,
                    requestBody
                });
            }

            return {
                status: true,
                eventId: res.data.id
            }
        } catch (error) {
            console.log("job schedule sync error", error);
            return { status: false };
        }
    }

    // Fn to create new calendar
    async createCalendar(user: User) {
        try {
            // Set the credentials using the user's Google access token
            this.setCredentials(user.googleAccessToken);

            // create new calendar
            let calendarResponse = await this.calendar.calendars.insert({
                requestBody: {
                    summary: user.name
                }
            });
            const newCalendarId = calendarResponse.data.id;

            // update user table with new calendar ID
            await this.databaseService.user.update({
                where: { id: user.id },
                data: { calendarId: newCalendarId },
            });

            return;
        } catch (error) {
            console.log(error);
        }
    }

    // Fn to check calendar exist or not
    async checkCalendarExist(user: User) {
        try {
            if (user.calendarId) {
                this.setCredentials(user.googleAccessToken);
                await this.calendar.calendars.get({
                    calendarId: user.calendarId
                });
                return true;
            }
            else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    // Fn to check event alredy synced 
    async checkAlreadySynced(user: User, job: any) {
        // Check authentication status
        await this.checkAuthStatus(user);
        let updatedUser = await this.databaseService.user.findFirst({
            where: { id: user.id }
        })
        try {
            if (job.eventId) {
                this.setCredentials(updatedUser.googleAccessToken);
                let event = await this.getEventFromGoogleCalendar(updatedUser, job);
                if (event) {
                    return true;
                }
                else {
                    return false;
                }
            } else {
                return false;
            }
        } catch (error) {
            return false;
        }
    }

    // Fn to retrive event from google calendar
    async getEventFromGoogleCalendar(user: User, evt: any) {
        // Check authentication status
        await this.checkAuthStatus(user);
        let updatedUser = await this.databaseService.user.findFirst({
            where: { id: user.id }
        })
        try {
            this.setCredentials(updatedUser.googleAccessToken);
            let event = await this.calendar.events.get({
                calendarId: updatedUser.calendarId,
                eventId: evt.eventId
            });
            if (event.data.status == 'confirmed') {
                return event;
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    }

    // Fn to delete event from google calendar
    async deleteCalendarEvent(user: User, eventId: string) {
        // Check authentication status
        await this.checkAuthStatus(user);
        let updatedUser = await this.databaseService.user.findFirst({
            where: { id: user.id }
        })
        if (eventId) {
            try {
                this.setCredentials(user.googleAccessToken);
                let res = await this.calendar.events.delete({
                    calendarId: updatedUser.calendarId,
                    eventId: eventId
                });
            } catch (error) {
                console.log("Error deleting event", error)
                return false;
            }
        }
    }

    async upsertJobEventId(jobId: number, userId: number, companyId: number, eventId: string) {
        try {
            // For current user.
            const jobEventIdExist = await this.databaseService.googleEventId.findFirst({
                where: {
                    jobId,
                    companyId,
                    userId,
                    isDeleted: false,
                    jobSchedule: null
                },
                orderBy: { id: 'desc' },
                take: 1
            });
            if (!jobEventIdExist) {
                await this.databaseService.googleEventId.create({
                    data: {
                        userId: userId,
                        companyId: companyId,
                        jobId: jobId,
                        eventId: eventId
                    }
                })
            } else {
                await this.databaseService.googleEventId.update({
                    where: { id: jobEventIdExist.id, isDeleted: false, },
                    data: { eventId: eventId }
                })
            }
        } catch (error) {
            console.log("Error upserting event", error)
            return false;
        }
    }

    // Upsert job event if for other users
    async upsertJobEventIdForOthers(job: Job, companyId: number, user: User) {
        try {
            const otherUsers = await this.databaseService.user.findMany({
                where: {
                    companyId: companyId,
                    isDeleted: false,
                    isActive: true,
                    id: { not: user.id }
                }
            });

            if (otherUsers.length > 0) {
                otherUsers.map(async (otherUser) => {
                    const syncExist = await this.databaseService.googleEventId.findFirst({
                        where: {
                            userId: otherUser.id,
                            companyId: otherUser.companyId,
                            jobId: job.id,
                            isDeleted: false,
                            jobSchedule: null
                        },
                        orderBy: { id: 'desc' },
                        take: 1
                    });

                    await this.syncToCalendar(otherUser.id, job, syncExist?.eventId);
                });
            }
        } catch (error) {
            console.log("Error upserting event for others", error)
            return false;
        }
    }

    // Upsert jobSchedule event id for other users
    async upsertJobScheduleEventIdForOthers(userId: number, companyId: number, schedule: JobSchedule, job: Job) {
        try {
            const otherUsers = await this.databaseService.user.findMany({
                where: {
                    id: { not: userId },
                    companyId: companyId,
                    isDeleted: false,
                    isActive: true,
                }
            });
            if (otherUsers.length > 0) {
                otherUsers.map(async (otherUser) => {
                    if (otherUser.googleAccessToken) {
                    const syncExist = await this.databaseService.googleEventId.findFirst({
                        where: {
                            userId: otherUser.id,
                            companyId: otherUser.companyId,
                            jobId: job.id,
                            isDeleted: false,
                            jobScheduleId: schedule.id
                        },
                        orderBy: { id: 'desc' },
                        take: 1
                    });

                    const response = await this.syncJobSchedule(otherUser.id, schedule, syncExist?.eventId, syncExist);
                    if (response.status && response.eventId) {
                        if (!syncExist) {
                            await this.databaseService.googleEventId.create({
                                data: {
                                    eventId: response.eventId,
                                    userId: otherUser.id,
                                    companyId: otherUser.companyId,
                                    jobId: job.id,
                                    jobScheduleId: schedule.id,
                                }
                            })
                        } else {
                            await this.databaseService.googleEventId.update({
                                where: {
                                    id: syncExist.id,
                                    userId: otherUser.id,
                                    companyId: otherUser.companyId,
                                    jobId: job.id,
                                    jobScheduleId: schedule.id,
                                    isDeleted: false,
                                },
                                data: { eventId: response.eventId, }
                            })
                        }
                    }
                    }
                })
            }
        } catch (error) {
            console.log("Error upserting event for others", error)
            return false;
        }
    }

    async removeScheduleFromOthers(userId: number, companyId: number, schedule: JobSchedule, job: Job) {
        try {
            const otherUsers = await this.databaseService.user.findMany({
                where: {
                    id: { not: userId },
                    companyId: companyId,
                    isDeleted: false,
                    isActive: true
                }
            });

            if (otherUsers.length > 0) {
                otherUsers.map(async (otherUser) => {
                    const syncExist = await this.databaseService.googleEventId.findFirst({
                        where: {
                            userId: otherUser.id,
                            companyId: otherUser.companyId,
                            jobId: job.id,
                            isDeleted: false,
                            jobScheduleId: schedule.id
                        },
                        orderBy: { id: 'desc' },
                        take: 1
                    });

                    if (syncExist && syncExist.eventId) {
                        let event = await this.getEventFromGoogleCalendar(otherUser, syncExist);
                        if (event) {
                            await this.deleteCalendarEvent(otherUser, syncExist.eventId);
                            await this.databaseService.googleEventId.update({
                                where: { id: syncExist.id },
                                data: { isDeleted: true }
                            })
                        }
                    }
                })
            }
        } catch (error) {
            console.log("Error removing event for others", error)
            return false;
        }
    }

    async removeJobFromOthers(userId: number, companyId: number, job: Job) {
        try {
            const otherUsers = await this.databaseService.user.findMany({
                where: {
                    id: { not: userId },
                    companyId: companyId,
                    isDeleted: false,
                    isActive: true
                }
            });

            if (otherUsers.length > 0) {
                otherUsers.map(async (otherUser) => {
                    const jobSyncExist = await this.databaseService.googleEventId.findFirst({
                        where: {
                            userId: otherUser.id,
                            companyId: otherUser.companyId,
                            jobId: job.id,
                            isDeleted: false,
                            jobScheduleId: null
                        },
                        orderBy: { id: 'desc' },
                        take: 1
                    });

                    if (jobSyncExist && jobSyncExist?.eventId) {
                        let event = await this.getEventFromGoogleCalendar(otherUser, jobSyncExist);
                        if (event) {
                            await this.deleteCalendarEvent(otherUser, jobSyncExist.eventId)
                        }
                    }
                })
            }
        } catch (error) {
            console.log("Error removing event for others", error)
            return false;
        }
    }
}