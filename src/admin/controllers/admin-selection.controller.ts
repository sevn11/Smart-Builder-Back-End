import { Controller, Get } from '@nestjs/common';
import { AdminSelectionService } from '../services';

@Controller('admin/selection')
export class AdminSelectionController {
    constructor(private readonly adminSelectionService: AdminSelectionService) {

    }

    @Get('initial')
    getInitialSelection() {
        return this.adminSelectionService.getInitialSelection()
    }

    @Get('paint')
    getPaintSelection() {
        return this.adminSelectionService.getPaintSelection()
    }
}
