import { Injectable } from '@nestjs/common';

@Injectable()
export class CoreService {

    root() {
        return { name: 'Smart Builder API Server', version: '1.0.0' }
    }
}
