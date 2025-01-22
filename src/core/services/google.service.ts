import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { User } from "@prisma/client";
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
        dateTime: string;
        timeZone: string;
    };
    end: {
        dateTime: string;
        timeZone: string;
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
            if (user.userType == UserTypes.ADMIN || user.userType == UserTypes.BUILDER) {
                if (user.userType == UserTypes.BUILDER && user.companyId !== companyId || !user) {
                    throw new ForbiddenException("Action Not Allowed");
                }

                // Check required permssions are given by user (calender)
                const hasCalendarPermission = body.codeResponse.scope.split(' ').includes('https://www.googleapis.com/auth/calendar');
                if(!hasCalendarPermission) {
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
            await this.databaseService.user.update({
                where: { id: user.id },
                data: {
                    googleAccessToken: null,
                    googleRefreshToken: null
                }
            });
            return ResponseMessages.SUCCESSFUL;
        } catch (error) {
            console.log(error)
            throw new InternalServerErrorException();
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
    async checkAuthStatus(user:User) {
        // check token validity
        this.setCredentials(user.googleAccessToken);

        // Verify the token by making a simple request to the Google API
        try {
            await this.oauth2Client.getTokenInfo(user.googleAccessToken);
            return { isAuthentcaited: true }
        } catch (error) {
            // Get new token using refresh token if it's exist
            if(error.response.data.error == 'invalid_token') {
                if(user.googleRefreshToken) {
                    let res = await this.refreshAccessToken(user);
                    if(res) {
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

            let requestBody: RequestBody = {
                summary: job.customer.name ?? "",
                description: job.description ?? "",
                start: {
                    'dateTime': job.startDate,
                    'timeZone': 'Etc/UTC'
                },
                end: {
                    'dateTime': job.endDate,
                    'timeZone': 'Etc/UTC'
                }
            }

            // Only add colorId if it is valid
            const colorId = colorMaps[job.calendarColor];
            if (colorId) {
                requestBody.colorId = colorId;
            }

            // update or insert event based on event id params
            let res = null;

            if(eventId) {
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
            await this.databaseService.job.update({
                where: { id: job.id },
                data: { eventId: res.data.id }
            });

            response.status = true;
            response.message = "Project synced with google calendar";
            return response;

        } catch (error) {
            console.error("event error",error);
            response.message = "Error while syncing to google calendar";
            return response;
        }
    }

    async syncJobSchedule (userId: number, schedule: any, eventId?: string) {
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
            // Check already sycned or not
            if(eventId || schedule.eventId) {
                // Check authentication status
                await this.checkAuthStatus(user);
                let updatedUser = await this.databaseService.user.findFirst({
                    where:{ id: user.id }
                });
                this.setCredentials(updatedUser.googleAccessToken);
                let event = await this.getEventFromGoogleCalendar(updatedUser, schedule);
                if(!event) {
                    return { status: false };
                }
            }

            this.setCredentials(user.googleAccessToken);

            let requestBody: RequestBody = {
                summary: `${schedule.contractor.phase.name} - ${schedule.contractor.name} (${schedule.job.customer.name})`,
                description: schedule.job.description.name ?? "",
                start: {
                    'dateTime': schedule.startDate,
                    'timeZone': 'Etc/UTC'
                },
                end: {
                    'dateTime': schedule.endDate,
                    'timeZone': 'Etc/UTC'
                }
            }

            // Insert or Update schedule to google calendar
            let res = null;
            if(eventId) {
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
                    summary: "Aurora Custom Homes"
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
        try{
            if(user.calendarId) {
                this.setCredentials(user.googleAccessToken);
                await this.calendar.calendars.get({
                    calendarId: user.calendarId
                });
                return true;
            }
            else {
                return false;
            }
        } catch(error) {
            return false;
        }
    }

    // Fn to check event alredy synced 
    async checkAlreadySynced(user: User, job: any) {
        // Check authentication status
        await this.checkAuthStatus(user);
        let updatedUser = await this.databaseService.user.findFirst({
            where:{ id: user.id }
        })
        try {
            if(job.eventId) {
                this.setCredentials(updatedUser.googleAccessToken);
                let event = await this.getEventFromGoogleCalendar(updatedUser, job);
                if(event) {
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
            where:{ id: user.id }
        })
        try {
            this.setCredentials(updatedUser.googleAccessToken);
            let event = await this.calendar.events.get({
                calendarId: updatedUser.calendarId,
                eventId: evt.eventId
            });
            if(event.data.status == 'confirmed') {
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
            where:{ id: user.id }
        })
        if(eventId) {
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
}