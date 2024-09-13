import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LogGroup } from "aws-cdk-lib/aws-logs";
import path = require('path');

export function KnowledgeBaseDataSyncCustomResource(scope: Construct, knowledgeBaseId:string, dataSourceId:string): cdk.CustomResource {
    
    const lambdaRole = new iam.Role(scope, 'KnowledgeBaseDataSyncLambdaExecutionRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        description: 'Role for custom resource Lambda to initiate Data Sync'
      });
      lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));
      lambdaRole.addToPolicy(new iam.PolicyStatement({
        actions: [
          'bedrock:*'
        ],
        resources: [
          `*`,
          ],
      }));
      const logGroup = new LogGroup(scope,'KnowledgeBaseDataSyncLambdaLogGroup',{
        logGroupClass: cdk.aws_logs.LogGroupClass.INFREQUENT_ACCESS,
        removalPolicy: cdk.RemovalPolicy.DESTROY
      });
      const StartDataSyncLambda = new lambda.Function(scope, 'KnowledgeBaseDataSyncLambda', {
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/cr-sync-data')),
        role:lambdaRole,
        timeout:cdk.Duration.minutes(5),
        logGroup:logGroup,
        environment:{
            KNOWLEDGE_BASE_ID:knowledgeBaseId,
            DATA_SOURCE_ID:dataSourceId
        }
      });

      const provider = new cr.Provider(scope, 'KnowledgeBaseDataSyncCustomResourceProvider', {
        onEventHandler: StartDataSyncLambda,
      });
  
      return new cdk.CustomResource(scope, 'KnowledgeBaseDataSyncCustomResource', {
        serviceToken: provider.serviceToken,
      });
    
}

