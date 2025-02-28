import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { companySchema } from 'src/company/schema/company.schema';
import { userSchema } from './schema/user.schema';
import { fileSchema } from 'src/files/schema/file.schema';
import { AwsS3Module } from 'src/aws-s3/aws-s3.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'company', schema: companySchema },
      { name: 'user', schema: userSchema },
      { name: 'file', schema: fileSchema },
    ]),
    AwsS3Module,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
