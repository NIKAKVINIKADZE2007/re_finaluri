import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Request,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IsAuth } from 'guards/isAuth.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('user')
@UseGuards(IsAuth)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/add-file')
  @UseInterceptors(FileInterceptor('file'))
  create(@UploadedFile() file: Express.Multer.File, @Request() request) {
    const userId = request.id;

    return this.userService.addFile(file, userId);
  }

  @Delete('/delete-file/:id')
  @UseGuards(IsAuth)
  deletefile(@Param('id') id: string, @Request() request) {
    const userId = request.id;
    const role = request.role;

    return this.userService.deleteFile(id, userId, role);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }
}
