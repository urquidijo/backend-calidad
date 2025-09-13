import { PartialType } from '@nestjs/mapped-types';
import { CreateColegioDto } from './create-colegio.dto';
export class UpdateColegioDto extends PartialType(CreateColegioDto) {}
