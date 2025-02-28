import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { Industry } from 'src/enums/industry.enum';

export class CreateCompanyDto {
  @IsNotEmpty()
  @IsString()
  companyName: string;

  @IsNotEmpty()
  @IsString()
  country: string;

  @IsEnum(Industry)
  @IsNotEmpty()
  industry: Industry;
}
