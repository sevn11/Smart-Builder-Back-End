import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class TypeValidationPipe implements PipeTransform {

  readonly validTypes = ['questionnaire', 'initial-selection', 'paint-selection']
  transform(value: any, metadata: ArgumentMetadata) {

    if (!this.validTypes.includes(value)) {
      throw new BadRequestException(`Invalid type: ${value}. Allowed values are ${this.validTypes.join(', ')}`);
    }

    return value;
  }
}