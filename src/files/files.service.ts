import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { isValidObjectId, Model } from 'mongoose';

import { InjectModel } from '@nestjs/mongoose';
import { File } from './schema/file.schema';

@Injectable()
export class FilesService {
  constructor(@InjectModel('file') private fileModel: Model<File>) {}

  async findOne(id: string, userId: string, role: string) {
    if (!isValidObjectId(id)) throw new BadRequestException('invalid id');

    const file = await this.fileModel.findById(id);
    if (!file) throw new NotFoundException('file not found');

    let isVisibal = false;
    if (role === 'user') {
      file.visibleTo.map((el) => {
        if (el.toString() === userId) isVisibal = true;
      });

      if (isVisibal)
        throw new BadRequestException(
          'you do not have permition to view this file',
        );
    }
    return file;
  }

  update(id: number, updateFileDto: UpdateFileDto) {
    return `This action updates a #${id} file`;
  }
}
