import { CallHandler, ExecutionContext, Inject, Injectable, LoggerService, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
	constructor(
		@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: LoggerService,
	) { }
	intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
		const req = context.switchToHttp().getRequest();
		const { method, originalUrl, body, params, query } = req;

		const startTime = Date.now();

		return next.handle().pipe(
			tap((responseData) => {
				const duration = Date.now() - startTime;

				const logMessage = `${method} ${originalUrl} ` +
					`params=${JSON.stringify(params)} ` +
					`query=${JSON.stringify(query)} ` +
					`body=${JSON.stringify(body)} ` +
					`response=${JSON.stringify(responseData)} ` +
					`duration=${duration}ms`;

				// FIX: Use the standard log method for the 'info' level.
				(this.logger as any).info(logMessage);
			}),
		);
	}
}