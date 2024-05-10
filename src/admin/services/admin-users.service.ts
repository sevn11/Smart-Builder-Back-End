import { Injectable } from '@nestjs/common';
import { UserTypes } from 'src/core/utils';
import { DatabaseService } from 'src/database/database.service';
import { GetBuilderListDTO } from '../validators';

@Injectable()
export class AdminUsersService {
    constructor(private databaseService: DatabaseService) {

    }
    async getBuilders(query: GetBuilderListDTO) {
        try {
            query.page = query.page === 0 ? 0 : query.page - 1

            let [builders, totalCount] = await this.databaseService.$transaction([
                this.databaseService.user.findMany({
                    where: {
                        userType: UserTypes.BUILDER,
                        isActive: query.isActive,
                        name: {
                            contains: query.search,
                            mode: 'insensitive'
                        },
                    },
                    skip: query.page * query.limit,
                    take: query.limit,
                    omit: {
                        hash: true,
                        invitationToken: true,
                        passwordResetCode: true
                    },
                    include: {
                        company: {
                            select: {
                                name: true,
                                id: true
                            }
                        }
                    }
                }),
                this.databaseService.user.count({
                    where: {
                        userType: UserTypes.BUILDER,
                        isActive: query.isActive,
                        name: {
                            contains: query.search,
                            mode: 'insensitive'
                        },
                    },
                })

            ]);
            return { builders, totalCount }
        } catch (error) {
            console.log(error);
        }
    }
}
