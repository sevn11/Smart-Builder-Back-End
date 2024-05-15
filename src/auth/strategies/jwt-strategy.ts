import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { DatabaseService } from "src/database/database.service";


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(config: ConfigService, private databaseService: DatabaseService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: config.get('JWT_SECRET')
        });
    }

    async validate(payload: { sub: number, email: string }) {
        try {
            const user = await this.databaseService.user.findUniqueOrThrow({
                where: {
                    id: payload.sub,
                    isDeleted: false,
                    isActive: true,
                    email: payload.email
                }
            });
            return user;
        } catch (error) {
            return null;
        }
    }

}