import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { IsAuth } from 'guards/isAuth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AdminGuard } from 'guards/Admin.guard';
import { ChangeSubscriptionPlanDto } from './dto/chnageSubscriptionPlan.dto';
import { BillDto } from './dto/bill.dto';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @UseGuards(IsAuth, AdminGuard)
  @Delete('delete-company')
  remove(@Request() request) {
    const companyid = request.id;
    return this.companyService.remove(companyid);
  }

  @UseGuards(IsAuth)
  @Post('add-user')
  addUser(@Request() request, @Body('email') email: string) {
    const companyId = request.id;
    return this.companyService.addUser(email, companyId);
  }

  @UseGuards(IsAuth, AdminGuard)
  @Get('current-subscriptionPlan')
  subscriptionPlan(@Request() requst) {
    const companyId = requst.id;
    return this.companyService.checkCurrentSubscription(companyId);
  }

  @UseGuards(IsAuth, AdminGuard)
  @Patch('upgrade-subscriptionPlan')
  UpgradeSubscriptionPlan(
    @Request() requst,
    @Body() changeSubscriptionPlanDto: ChangeSubscriptionPlanDto,
  ) {
    const companyId = requst.id;
    return this.companyService.UpgradeSubscriptionPlan(
      companyId,
      changeSubscriptionPlanDto,
    );
  }

  @UseGuards(IsAuth, AdminGuard)
  @Patch('downgrade-subscriptionPlan')
  downGradeSubscriptionPlan(
    @Request() requst,
    @Body() changeSubscriptionPlanDto: ChangeSubscriptionPlanDto,
  ) {
    const companyId = requst.id;
    return this.companyService.downGradeSubscriptionPlan(
      companyId,
      changeSubscriptionPlanDto,
    );
  }

  @UseGuards(IsAuth, AdminGuard)
  @Delete('/delete-user/:id')
  deleteUser(@Param('id') id: string, @Request() request) {
    const companyId = request.id;
    return this.companyService.deleteUser(id);
  }

  @UseGuards(IsAuth)
  @Patch('/edit-password')
  editPassword(
    @Request() request,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const companyId = request.id;
    return this.companyService.changePassword(companyId, changePasswordDto);
  }

  @UseGuards(IsAuth, AdminGuard)
  @Patch('edit-company')
  editCompany(@Request() request, @Body() updateCompanyDto: UpdateCompanyDto) {
    const companyId = request.id;

    return this.companyService.update(companyId, updateCompanyDto);
  }

  @UseGuards(IsAuth, AdminGuard)
  @Get('check-bill')
  checkBill(@Request() request) {
    const id = request.id;
    return this.companyService.checkBill(id);
  }

  @UseGuards(IsAuth, AdminGuard)
  @Patch('pay-bill')
  payBill(@Request() request, @Body() billDto: BillDto) {
    const id = request.id;
    return this.companyService.payBill(id, billDto);
  }
}
