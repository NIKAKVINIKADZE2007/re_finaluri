import { IsNotEmpty, IsString } from 'class-validator';

export class BillDto {
  @IsNotEmpty()
  @IsString()
  amount: string;
}
