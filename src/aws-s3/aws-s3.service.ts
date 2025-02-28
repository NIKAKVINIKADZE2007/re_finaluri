import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Readable } from 'stream';

@Injectable()
export class AwsS3Service {
  private storageService;
  private bucketName;

  constructor() {
    this.bucketName = process.env.AWS_BUCKET_NAME;
    this.storageService = new S3Client({
      credentials: {
        accessKeyId: process.env.AWS_ACCSESS_KEY,
        secretAccessKey: process.env.AWS_SECRET_ACCSESS_KEY,
      },
      region: process.env.AWS_REGION,
    });
  }

  async uploadFile(filePath: string, fileBuffer: Buffer) {
    if (!filePath || !fileBuffer)
      throw new BadRequestException('File is required');

    const config = {
      Key: filePath,
      Bucket: this.bucketName,
      Body: fileBuffer,
    };

    const command = new PutObjectCommand(config);

    await this.storageService.send(command);

    return filePath;
  }

  async getFileById(filePath: string) {
    if (!filePath) return null;

    const config = {
      Key: filePath,
      Bucket: this.bucketName,
    };

    const command = new GetObjectCommand(config);
    const fileStream = await this.storageService.send(command);
    const chunks: any[] = [];

    if (fileStream.Body instanceof Readable) {
      for await (const chunk of fileStream.Body) {
        chunks.push(chunk);
      }

      const fileBuffer = Buffer.concat(chunks);
      const b64 = fileBuffer.toString('base64');

      const contentType = fileStream.ContentType;
      console.log(b64, 'b64');
      const file = `data:${contentType};base64,${b64}`;
      return file;
    }

    return null;
  }

  async deleteFileById(filePath: string) {
    if (!filePath) return null;

    const config = {
      Key: filePath,
      Bucket: this.bucketName,
    };

    const command = new DeleteObjectCommand(config);
    await this.storageService.send(command);

    return filePath;
  }

  async deleteUserFiles(filePaths: string[]) {
    if (filePaths.length === 0) return null;

    const objects = filePaths.map((path) => ({ Key: path.replace(/^\//, '') }));

    const command = new DeleteObjectsCommand({
      Bucket: this.bucketName,
      Delete: { Objects: objects },
    });
    await this.storageService.send(command);

    return filePaths;
  }
}
