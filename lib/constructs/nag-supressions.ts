import { Stack } from "aws-cdk-lib"
import { NagSuppressions } from "cdk-nag";

export function ApplyNagRules(stack: Stack): void {
    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C/ServiceRole/Resource',
        [{ id: 'AwsSolutions-IAM4', reason: 'CDK Bucket deployment requires these' }]
    );

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C/ServiceRole/DefaultPolicy/Resource',
        [{ id: 'AwsSolutions-IAM5', reason: 'CDK Bucket deployment requires these' }]
    );

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C/Resource',
        [{ id: 'AwsSolutions-L1', reason: 'no control over this' }]
    );
// Open search collection deployment deployment 
    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/KbOssCollection/LambdaExecutionRole/Resource',
        [{ id: 'AwsSolutions-IAM4', reason: 'basic execution role in place' }]
    );

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/KbOssCollection/LambdaExecutionRole/DefaultPolicy/Resource',
        [{ id: 'AwsSolutions-IAM4', reason: 'basic execution role in place' }]
    );
    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/KbOssCollection/CustomResourceProvider/framework-onEvent/ServiceRole/Resource',
        [{ id: 'AwsSolutions-IAM4', reason: 'basic execution role in place. CDK managed construct' }]
    );

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/KbOssCollection/CustomResourceProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        [{ id: 'AwsSolutions-IAM5', reason: 'basic execution role in place. CDK managed construct' }]
    );

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/KbOssCollection/LambdaExecutionRole/DefaultPolicy/Resource',
        [{ id: 'AwsSolutions-IAM5', reason: 'basic execution role in place. CDK managed construct' }]
    );

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/KbOssCollection/CustomResourceProvider/framework-onEvent/Resource',
        [{ id: 'AwsSolutions-L1', reason: 'basic execution role in place. CDK managed construct' }]
    );

    // Knowledge base
    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/BedrockKb/knowledgeBaseExecutionRole/DefaultPolicy/Resource',
        [{ id: 'AwsSolutions-IAM5', reason: 'dedicated bucket for KB' }]
    );
    // Knowledge base data sync custom resourse
    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/KnowledgeBaseDataSyncLambdaExecutionRole/Resource',
        [{ id: 'AwsSolutions-IAM4', reason: 'required for automated data sync trigger' }]
    );

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/KnowledgeBaseDataSyncLambdaExecutionRole/DefaultPolicy/Resource',
        [{ id: 'AwsSolutions-IAM5', reason: 'required for automated data sync trigger' }]
    );
    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/KnowledgeBaseDataSyncCustomResourceProvider/framework-onEvent/ServiceRole/Resource',
        [{ id: 'AwsSolutions-IAM4', reason: 'required for automated data sync trigger' }]
    );
    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/KnowledgeBaseDataSyncCustomResourceProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        [{ id: 'AwsSolutions-IAM5', reason: 'required for automated data sync trigger' }]
    );
    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/KnowledgeBaseDataSyncCustomResourceProvider/framework-onEvent/Resource',
        [{ id: 'AwsSolutions-L1', reason: 'required for automated data sync trigger' }]
    );

    // Table booking Lambda
    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/BedrockAgentConstruct/TableBookingsActionGroup/LambdaRole/Resource',
        [{ id: 'AwsSolutions-IAM4', reason: 'basic execution role in place for log group creation' }]
    );
    // Temporary password
    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/WorkmailIntegrationConstruct/WorkmailOrg/WorkmailSecret/Resource',
        [{ id: 'AwsSolutions-SMG4', reason: 'The secret is to safely deliver admin output of cdk, no need to rotate' }]
    );

    // Work mail creation custom resource
    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/WorkmailIntegrationConstruct/WorkmailOrg/CreateWorkmailOrgLambdaExecutionRole/Resource',
        [{ id: 'AwsSolutions-IAM4', reason: 'basic custom resource defenition' }]
    );

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/WorkmailIntegrationConstruct/WorkmailOrg/CreateWorkmailOrgLambdaExecutionRole/DefaultPolicy/Resource',
        [{ id: 'AwsSolutions-IAM5', reason: 'basic custom resource defenition' }]
    );

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/WorkmailIntegrationConstruct/WorkmailOrg/WorkmailCRProvider/framework-onEvent/ServiceRole/Resource',
        [{ id: 'AwsSolutions-IAM4', reason: 'basic custom resource defenition' }]
    );

    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/WorkmailIntegrationConstruct/WorkmailOrg/WorkmailCRProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        [{ id: 'AwsSolutions-IAM4', reason: 'basic custom resource defenition' }]
    );
    NagSuppressions.addResourceSuppressionsByPath(
        stack,
        '/EmailSupportAgent/WorkmailIntegrationConstruct/WorkmailOrg/WorkmailCRProvider/framework-onEvent/ServiceRole/DefaultPolicy/Resource',
        [{ id: 'AwsSolutions-IAM5', reason: 'basic custom resource defenition' }]
    );

// Email execution 
NagSuppressions.addResourceSuppressionsByPath(
    stack,
    '/EmailSupportAgent/WorkmailIntegrationConstruct/EmailHandler/WorkMailEmailHandlerLambdaExecutionRole/Resource',
    [{ id: 'AwsSolutions-IAM4', reason: 'basic custom resource defenition' }]
);
NagSuppressions.addResourceSuppressionsByPath(
    stack,
    '/EmailSupportAgent/WorkmailIntegrationConstruct/EmailHandler/WorkMailEmailHandlerLambdaExecutionRole/DefaultPolicy/Resource',
    [{ id: 'AwsSolutions-IAM5', reason: 'basic custom resource defenition' }]
);

}