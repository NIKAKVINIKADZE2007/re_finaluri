import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';

import { UpdateCompanyDto } from './dto/update-company.dto';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { isValidObjectId, Model } from 'mongoose';
import { Company } from './schema/company.schema';
import { User } from 'src/user/schema/user.schema';
import { EmailSenderService } from 'src/email-sender/email-sender.service';
import { File } from 'src/files/schema/file.schema';
import { AwsS3Service } from 'src/aws-s3/aws-s3.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeSubscriptionPlanDto } from './dto/chnageSubscriptionPlan.dto';
import { BillDto } from './dto/bill.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectModel('company') private companyModel: Model<Company>,
    @InjectModel('user') private userModel: Model<User>,
    @InjectModel('file') private fileModel: Model<File>,
    private emailSender: EmailSenderService,
    private awsService: AwsS3Service,
  ) {}

  async addUser(email, companyId) {
    const exsistCompany = await this.companyModel.findById(companyId);
    if (!exsistCompany) throw new NotFoundException('company not found');

    let message = 'user Added verify Email';

    if (
      exsistCompany.subscriptionPlan === 'free' &&
      exsistCompany.users.length == 1
    ) {
      throw new BadRequestException({
        message: 'upgrade your subscription plan if you want to add more users',
        currentSubscriptionPlan: exsistCompany.subscriptionPlan,
      });
    }

    if (
      exsistCompany.subscriptionPlan === 'basic' &&
      exsistCompany.users.length == 2
    ) {
      throw new BadRequestException({
        message: 'upgrade your subscription plan if you want to add more users',
        currentSubscriptionPlan: exsistCompany.subscriptionPlan,
      });
    }

    const exsistUser = await this.userModel.findOne({ email });
    if (exsistUser) throw new BadRequestException('user already exsists');

    const otpCode = Math.random().toString().slice(2, 8);
    const otpCodeValidateDate = new Date();
    otpCodeValidateDate.setTime(otpCodeValidateDate.getTime() + 3 * 60 * 1000);

    if (exsistCompany.subscriptionPlan === 'basic') {
      await this.companyModel.findByIdAndUpdate(
        companyId,
        {
          $set: { price: exsistCompany.price + 5 },
        },
        { new: true },
      );
    }

    const newUser = await this.userModel.create({
      email,
      otpCode,
      otpCodeValidateDate,
      companyId,
    });
    await this.companyModel.findByIdAndUpdate(
      companyId,
      { $push: { users: newUser._id } },
      { new: true },
    );

    await this.emailSender.sendEmailText(email, 'Verification Code', otpCode);

    return { message, currentSubscriptionPlan: exsistCompany.subscriptionPlan };
  }

  async deleteUser(id: string) {
    if (!isValidObjectId(id))
      throw new BadRequestException('not valid object id');

    console.log(id, 'id');

    const exsistUser = await this.userModel.findById(id);
    if (!exsistUser) throw new NotFoundException('user not found');

    const companyId = exsistUser.companyId;

    const exsistCompany = await this.companyModel.findById(companyId);
    if (!exsistCompany) throw new NotFoundException('company not found');

    const files = await this.fileModel.find({ uploadedBy: id });

    const fileid = files.map((file) => file.fileUrl);

    console.log(fileid, 'fileid');

    await this.userModel.findByIdAndDelete(id);

    await this.fileModel.deleteMany({ uploadedBy: id });

    await this.companyModel.findByIdAndUpdate(companyId, {
      $pull: { users: id },
    });

    await this.awsService.deleteUserFiles(fileid);

    return 'user deleted ';
  }

  async changePassword(
    companyId: string,
    { confirmPassword, newPassword, oldPassword }: ChangePasswordDto,
  ) {
    const exsistCompany = await this.companyModel.findById(companyId);
    if (!exsistCompany) throw new NotFoundException('company Not Found');

    const isPasswordEqual = await bcrypt.compare(
      oldPassword,
      exsistCompany.password,
    );

    console.log(oldPassword, 'oldpassword');
    console.log(isPasswordEqual, 'isEqual');
    if (!isPasswordEqual)
      throw new BadRequestException('old password is not correct');

    if (newPassword === oldPassword)
      throw new BadRequestException('canot have same password');
    if (!(confirmPassword === newPassword))
      throw new BadRequestException('new password dosent equal confirm');

    await this.companyModel.findByIdAndUpdate(companyId, {
      $set: { password: newPassword },
    });

    await this.emailSender.sendEmailText(
      exsistCompany.email,
      'password changed',
      'your password has been changed',
    );

    return 'password changed';
  }

  async checkCurrentSubscription(companyId: string) {
    if (!isValidObjectId(companyId))
      throw new BadRequestException('invalid object id');

    const exsistCompany = await this.companyModel.findById(companyId);

    if (!exsistCompany) throw new NotFoundException('company not found');

    return exsistCompany.subscriptionPlan;
  }

  async UpgradeSubscriptionPlan(
    companyId,
    subscriptionPlan: ChangeSubscriptionPlanDto,
  ) {
    const newPlan = subscriptionPlan.subscriptionPlan;
    if (!isValidObjectId(companyId))
      throw new BadRequestException('invalid object id');

    const exsistCompany = await this.companyModel.findById(companyId);

    if (!exsistCompany) throw new NotFoundException('company not found');

    let price = exsistCompany.price;

    if (newPlan == 'premium') {
      price = 300;
    }

    const updatedUser = await this.companyModel.findByIdAndUpdate(
      companyId,
      { $set: { subscriptionPlan: newPlan, price: price } },
      { new: true },
    );

    return updatedUser;
  }

  async downGradeSubscriptionPlan(
    companyId,
    subscriptionPlan: ChangeSubscriptionPlanDto,
  ) {
    const newPlan = subscriptionPlan.subscriptionPlan;
    if (!isValidObjectId(companyId))
      throw new BadRequestException('invalid object id');

    const exsistCompany = await this.companyModel.findById(companyId);

    if (!exsistCompany) throw new NotFoundException('company not found');

    let newprice = exsistCompany.price;

    if (
      newPlan === 'basic' &&
      (exsistCompany.users.length > 10 || exsistCompany.files.length > 100)
    ) {
      throw new BadRequestException(
        'delete your files or users to allowed amount to change subscription plan',
      );
    }

    if (newPlan == 'basic') newprice = exsistCompany.users.length * 5;

    if (
      newPlan == 'free' &&
      (exsistCompany.users.length > 1 || exsistCompany.files.length > 10)
    ) {
      throw new BadRequestException(
        'delete your files or users to allowed amount to change subscription plan',
      );
    }

    if (newPlan == 'free') newprice = 0;

    const updatedUser = await this.companyModel.findByIdAndUpdate(
      companyId,
      {
        $set: { subscriptionPlan: newPlan, price: newprice },
      },
      { new: true },
    );

    return updatedUser;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto) {
    if (!isValidObjectId(id))
      throw new BadRequestException('invlaid object id');

    const exsistCompany = await this.companyModel.findById(id);
    if (!exsistCompany) throw new BadRequestException('company not found');

    const updatedCompany = await this.companyModel.findByIdAndUpdate(
      id,
      updateCompanyDto,
      {
        new: true,
      },
    );

    return updatedCompany;
  }

  async remove(id: string) {
    if (!isValidObjectId(id))
      throw new BadRequestException('invalid object id');

    const deletedCompany = await this.companyModel.findByIdAndDelete(id);
    if (!deletedCompany) {
      throw new NotFoundException('Company not found');
    }

    await this.userModel.deleteMany({ companyId: id });

    const fileUrls = await this.fileModel.find({ companyId: id });

    const filePaths = fileUrls.map((file) => file.fileUrl);

    if (filePaths.length > 0) {
      await this.awsService.deleteUserFiles(filePaths);
    }

    await this.fileModel.deleteMany({ companyId: id });

    return 'company deleted';
  }

  async checkBill(id: string) {
    if (!isValidObjectId(id))
      throw new BadRequestException('invalid object id');

    const company = await this.companyModel.findById(id);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return { bill: company.price };
  }

  async payBill(id: string, { amount }: BillDto) {
    if (!isValidObjectId(id))
      throw new BadRequestException('invalid object id');

    const company = await this.companyModel.findById(id);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    if (company.price > Number(amount)) {
      throw new BadRequestException({
        message: 'you have to pay the entire bill',
        currentBill: company.price,
      });
    }

    if (company.price < Number(amount)) {
      throw new BadRequestException({
        message: 'canot pay too much',
        currentBill: company.price,
      });
    }

    const editedCompany = await this.companyModel.findByIdAndUpdate(
      id,
      { $set: { price: 0 } },
      { new: true },
    );

    return { message: 'bill payed', company: editedCompany };
  }
}
