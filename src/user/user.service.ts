import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { isValidObjectId, Model } from 'mongoose';
import { Company } from 'src/company/schema/company.schema';
import { User } from './schema/user.schema';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { File } from 'src/files/schema/file.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel('company') private companyModel: Model<Company>,
    @InjectModel('user') private userModel: Model<User>,
    @InjectModel('file') private fileModel: Model<File>,
    private awsService: AwsS3Service,
  ) {}

  async addFile(file, id) {
    const fileName = file.originalname.slice(
      0,
      file.originalname.lastIndexOf('.'),
    );
    const exsistUser = await this.userModel.findById(id);
    if (!exsistUser) throw new BadRequestException('user not found');

    const exsistCompany = await this.companyModel.findById(
      exsistUser.companyId,
    );
    if (!exsistCompany) throw new BadRequestException('company not found');

    const fileTypes = ['csv', 'xls', 'xlsx'];

    const Path = Math.random().toString().slice(2);
    const fileType = file.mimetype.split('/')[1];

    if (!fileTypes.includes(fileType)) {
      throw new BadRequestException('invalid file type');
    }

    let word = 'file added';

    if (
      exsistCompany.subscriptionPlan === 'free' &&
      exsistCompany.files.length == 10
    ) {
      throw new BadRequestException({
        message: 'upgrade your subscription plan if you want to add more users',
        currentSubscriptionPlan: exsistCompany.subscriptionPlan,
      });
    }

    if (
      exsistCompany.subscriptionPlan === 'basic' &&
      exsistCompany.files.length == 100
    ) {
      throw new BadRequestException({
        message: 'upgrade your subscription plan if you want to add more users',
        currentSubscriptionPlan: exsistCompany.subscriptionPlan,
      });
    }

    if (
      exsistCompany.subscriptionPlan === 'premium' &&
      exsistCompany.files.length == 100
    ) {
      word = 'every file after 1000 is 0.5 worth dolars';

      await this.companyModel.findByIdAndUpdate(exsistCompany._id, {
        $set: { price: exsistCompany.price + 0.5 },
      });
    }

    const filePath = `${fileType}/${Path}.${fileType}`;
    await this.awsService.uploadFile(filePath, file.buffer);

    const newFile = await this.fileModel.create({
      fileName,
      fileUrl: filePath,
      fileType: fileType,
      uploadedBy: exsistUser._id,
      companyId: exsistCompany._id,
      visibleTo: exsistCompany.users,
    });

    await this.companyModel.findByIdAndUpdate(exsistCompany._id, {
      $push: { files: { fileId: newFile._id, uploadedBy: exsistUser._id } },
    });

    return { word, currentSubscriptionPlan: exsistCompany.subscriptionPlan };
  }

  async deleteFile(fileId, userId, role) {
    if (!isValidObjectId(fileId) || !isValidObjectId(userId))
      throw new BadRequestException('invalid object id');

    const exsistFile = await this.fileModel.findById(fileId);

    if (!exsistFile) throw new NotFoundException('file not found');

    if (role !== 'admin') {
      const exsistUser = await this.userModel.findById(userId);

      if (!exsistUser) throw new NotFoundException('user not found');

      if (exsistFile.uploadedBy.toString() !== userId)
        throw new BadRequestException('this file dosent belong to you');
    }

    if (role === 'admin' && exsistFile.companyId !== userId)
      throw new BadRequestException('this file dosent belong to your company');

    const exsistCompany = await this.companyModel.findById(
      exsistFile.companyId,
    );

    console.log(exsistCompany.files, 'company');

    console.log(fileId, 'fileId');

    await this.fileModel.deleteOne({ _id: fileId });

    await this.awsService.deleteFileById(exsistFile.fileUrl);

    await this.companyModel.findByIdAndUpdate(
      exsistFile.companyId,
      { $pull: { files: { fileId: fileId } } },
      { new: true },
    );

    return 'file deleted';
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }
}
