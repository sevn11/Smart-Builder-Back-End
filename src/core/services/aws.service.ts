import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fromEnv, fromInstanceMetadata } from "@aws-sdk/credential-providers";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand, PutObjectCommandInput } from "@aws-sdk/client-s3";

@Injectable()
export class AWSService {
    s3client = null
    constructor(private readonly config: ConfigService) {
        let s3ClientParams = {
            region: this.config.get('AWS_REGION'),
            credentials: fromInstanceMetadata()
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
            Expires: expiry,
            ContentType: contentType
        }
        const command = new PutObjectCommand(putObjectParams);
        return getSignedUrl(this.s3client, command, { expiresIn: 3600 });
    }

}
