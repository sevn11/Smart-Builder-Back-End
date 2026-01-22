import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import { LoggingInterceptor } from './logging.interceptor';
import { LoggingFilter } from './logging.filter';

const customLevels = {
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        signlog: 3,
        http: 4,
        verbose: 5,
        debug: 6,
    }
};

// THIS IS THE FIX: A custom format that only passes 'info' level logs.
const infoFilter = winston.format((info) => {
    return info.level === 'info' ? info : false;
});

const signlogFilter = winston.format((info) => {
    return info.level === 'signlog' ? info : false;
});

@Module({
    imports: [
        WinstonModule.forRoot({
            levels: customLevels.levels, 
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
                // Sign Here Log
                new winston.transports.DailyRotateFile({
                    dirname: 'logs',
                    filename: 'sign-here-%DATE%.log',
                    datePattern: 'YYYY-MM-DD',
                    zippedArchive: false,
                    maxSize: '20m',
                    maxFiles: '30d',
                    level: 'signlog',
                    auditFile: 'logs/.audit/sign-here-audit.json',
                    format: winston.format.combine(
                        signlogFilter(),
                        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                        winston.format.printf(info =>
                            `[${info.timestamp}] production.${info.level.toUpperCase()}: ${info.message}`
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