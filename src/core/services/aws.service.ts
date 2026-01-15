import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fromEnv } from "@aws-sdk/credential-providers";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand, PutObjectCommandInput, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

@Injectable()
export class AWSService {
    s3client = null
    constructor(private readonly config: ConfigService) {
        let s3ClientParams = {
            region: this.config.get('AWS_REGION'),
            credentials: fromEnv(),
        }
        this.s3client = new S3Client(s3ClientParams);
    }

    async generateS3PresignedUrl(
        key: string,
        contentType: string,
        expiry: Date = (() => { let exp = new Date(); exp.setHours(exp.getHours() + 1); return exp })()
    ) {

        let putObjectParams: PutObjectCommandInput = {
            Bucket: this.config.get('ASSET_BUCKET'),
            Key: key,
            ContentType: contentType
        }
        const command = new PutObjectCommand(putObjectParams);
        return getSignedUrl(this.s3client, command);
    }

    async uploadFileToS3(key: string, buffer: Buffer, contentType: string) {
        const putObjectParams: PutObjectCommandInput = {
            Bucket: this.config.get('ASSET_BUCKET'),
            Key: key,
            Body: buffer,
            ContentType: contentType,
        };
        
        const command = new PutObjectCommand(putObjectParams);
        
        // Upload the file
        await this.s3client.send(command);
        
        return `${key}`;
    }

    getS3BaseUrl() {
        const bucket = this.config.get<string>('ASSET_BUCKET');
        const region = this.config.get<string>('AWS_REGION');
        return `https://${bucket}.s3.${region}.amazonaws.com`;
    }

    async getUploadedFile(originalPdf){

        const bucketName = this.config.get("ASSET_BUCKET");

        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: originalPdf,
        });

        const response = await this.s3client.send(command);

        return response
    }

    async deleteFileFromS3(key: string) {
        const command = new DeleteObjectCommand({
            Bucket: this.config.get('ASSET_BUCKET'),
            Key: key,
        });
        
        return this.s3client.send(command);
    }

}
