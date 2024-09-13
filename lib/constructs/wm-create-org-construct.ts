import { Construct } from "constructs";
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { workmail_org_name, workmail_secret_name } from "../name_constants";
import * as crypto from 'crypto';

export class WorkmailCreateOrgConstruct extends Construct {

    constructor(scope: Construct, id: string, props: { nodeJsLayer: lambda.LayerVersion; }) {
        super(scope, id);

        // Create a hashed unique identifier based on the account ID
        const accountIdHash = this.createAccountIdHash(cdk.Stack.of(this).account);

        // Create a secret in Secrets Manager
        const workmailSecret = new secretsmanager.Secret(this, 'WorkmailSecret', {
            secretName: `${workmail_secret_name}_${id}`, 
            description: 'Stores credentials for the Workmail support user'
        });
        
        const logGroup = new LogGroup(this, 'CreateWorkmailOrgCustomResourceLambdaLogGroup', {
            logGroupClass: cdk.aws_logs.LogGroupClass.INFREQUENT_ACCESS,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        const lambdaRole = new iam.Role(this, 'CreateWorkmailOrgLambdaExecutionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: 'Role for custom resource Lambda to create a workmail org and users'
        });

        lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));
        
        // Add permissions to manage WorkMail resources
        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                'workmail:*',
                'ds:*',
                'ses:*'
            ],
            resources: ['*'] 
        }));

        // Add permissions to manage secrets
        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                'secretsmanager:PutSecretValue',
                'secretsmanager:CreateSecret',
                'secretsmanager:UpdateSecret'
            ],
            resources: [workmailSecret.secretArn]
        }));

        // Lambda function to manage WorkMail org and users
        const manageWorkMailLambda = new lambda.Function(this, 'CreateWorkmailLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/cr-create-workmail')),
            layers: [props.nodeJsLayer],
            role: lambdaRole,
            timeout: cdk.Duration.minutes(5),
            logGroup: logGroup,
            environment: {
                SECRET_ARN: workmailSecret.secretArn,
                WORKMAIL_ORG_NAME: `${workmail_org_name}-${accountIdHash}` 
            }
        });

        // Create the custom resource
        const provider = new cr.Provider(this, 'WorkmailCRProvider', {
            onEventHandler: manageWorkMailLambda,
        });

        const createWorkmailResource = new cdk.CustomResource(this, 'CreateWorkmailCR', {
            serviceToken: provider.serviceToken,
        });
    }

    private createAccountIdHash(accountId: string): string {
        return crypto.createHash('sha256').update(accountId).digest('hex').substring(0, 12);
    }
}
