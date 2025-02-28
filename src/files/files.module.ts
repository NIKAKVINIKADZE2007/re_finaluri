import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { fileSchema } from './schema/file.schema';

@Module({
  controllers: [FilesController],
  providers: [FilesService],
  imports: [MongooseModule.forFeature([{ name: 'file', schema: fileSchema }])],
})
export class FilesModule {}
