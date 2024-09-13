import { RemovalPolicy } from "aws-cdk-lib";
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3_deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from "constructs";


export class KbS3Construct extends Construct {

    public kbSourceBucket:s3.Bucket;
    public kbSourceBucketKmsKey: kms.Key;
    constructor(scope: Construct, id: string) {
        super(scope, id);

        this.kbSourceBucketKmsKey = new kms.Key(this, 'KnowledgeBaseKmsKey', {
            enableKeyRotation: true,
          });
      
          const accessLogsBucket = new s3.Bucket(this, 'KnowledgeBaseBucketAccessLogs', {
            versioned: true,
            removalPolicy: RemovalPolicy.DESTROY,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            autoDeleteObjects: true,
          });
          // Create the S3 bucket with KMS encryption
          this.kbSourceBucket = new s3.Bucket(this, 'KnowledgeBaseBucket', {
            versioned: true,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            encryption: s3.BucketEncryption.KMS,
            encryptionKey: this.kbSourceBucketKmsKey,
            enforceSSL:true,
            serverAccessLogsBucket: accessLogsBucket,
        serverAccessLogsPrefix: 'logs',
          });
      
          // Deploy sample PDF to the bucket
          new s3_deployment.BucketDeployment(this, 'DeployBedrockUserGuidePDF', {
            sources: [s3_deployment.Source.asset('./assets/kb_documents')],
            destinationBucket: this.kbSourceBucket,
            destinationKeyPrefix: 'kb_documents/', 
          });
    }
}


