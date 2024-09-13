import { Construct } from "constructs";
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { email_processor_lambda_name, workmail_org_name } from "../name_constants";
import * as crypto from 'crypto';

export class WorkmailEmailHandlerConstruct extends Construct {

    constructor(scope: Construct, id: string, props: { 
        nodeJsLayer: lambda.LayerVersion;
        agent: cdk.aws_bedrock.CfnAgent;
        agentAlias: cdk.aws_bedrock.CfnAgentAlias;
     }) {
        super(scope, id);
        const accountIdHash = this.createAccountIdHash(cdk.Stack.of(this).account);

        const logGroup = new LogGroup(this, 'WorkMailEmailHandlerLambdaLogGroup', {
            logGroupName :`${email_processor_lambda_name}`,
            logGroupClass: cdk.aws_logs.LogGroupClass.STANDARD,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        });

        const lambdaRole = new iam.Role(this, 'WorkMailEmailHandlerLambdaExecutionRole', {
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            description: 'Role for WorkMailEmailHandlerLambda to process emails'
        });

        lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));
        
        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                'workmailmessageflow:GetRawMessageContent',
            ],
            resources: ['*'] 
        }));

        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                'bedrock:*',
            ],
            resources: ['*'] 
        }));
        lambdaRole.addToPolicy(new iam.PolicyStatement({
            actions: [
                'ses:SendEmail',
            ],
            resources: ['*'] 
        }));

        // Lambda function to manage WorkMail org and users
        const manageWorkMailLambda = new lambda.Function(this, 'WorkMailEmailHandlerLambda', {
            functionName: email_processor_lambda_name,
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/email-processor-lambda')),
            layers: [props.nodeJsLayer],
            role: lambdaRole,
            timeout: cdk.Duration.minutes(5),
            logGroup: logGroup,
            environment:{
                AGENT_ID:props.agent.attrAgentId,
                AGENT_ALIAS_ID:props.agentAlias.attrAgentAliasId,
                SUPPORT_EMAIL_ADDRESS: `support@${workmail_org_name}-${accountIdHash}.awsapps.com`
            }
        });

        const principal = new cdk.aws_iam.ServicePrincipal(`workmail.${cdk.Stack.of(this).region}.amazonaws.com`)        
        manageWorkMailLambda.grantInvoke(principal);

        
    }
    private createAccountIdHash(accountId: string): string {
        return crypto.createHash('sha256').update(accountId).digest('hex').substring(0, 12);
    }
}
