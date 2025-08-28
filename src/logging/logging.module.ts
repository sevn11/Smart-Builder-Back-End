import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { LoggingInterceptor } from './logging.interceptor';
import { LoggingFilter } from './logging.filter';

// THIS IS THE FIX: A custom format that only passes 'info' level logs.
const infoFilter = winston.format((info) => {
    return info.level === 'info' ? info : false;
});
@Module({
    imports: [
        WinstonModule.forRoot({
            transports: [
                // Info & general logs
                new winston.transports.DailyRotateFile({
                    dirname: 'logs',
                    filename: 'app-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: false,
                    maxSize: '20m',
                    maxFiles: '14d',
                    level: 'info',
                    auditFile: 'logs/.audit/info-audit.json',
                    format: winston.format.combine(
                        infoFilter(), // Apply the custom filter here
                        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                        winston.format.printf(
                            (info) =>
                                `[${info.timestamp}] ${process.env.NODE_ENV || 'production'
                                }.${info.level.toUpperCase()}: ${info.message}`,
                        ),
                    ),
                }),
                // Error logs
                new winston.transports.DailyRotateFile({
                    dirname: 'logs',
                    filename: 'error-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: false,
                    maxSize: '20m',
                    maxFiles: '14d',
                    level: 'error',
                    auditFile: 'logs/.audit/error-audit.json',
                    format: winston.format.combine(
                        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                        winston.format.printf(
                            (info) =>
                                `[${info.timestamp}] ${process.env.NODE_ENV || 'production'
                                }.${info.level.toUpperCase()}: ${info.message}`,
                        ),
                    ),
                }),
            ],
        }),
    ],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: LoggingInterceptor,
        },
        {
            provide: APP_FILTER,
            useClass: LoggingFilter,
        },
    ],
})
export class LoggingModule { }