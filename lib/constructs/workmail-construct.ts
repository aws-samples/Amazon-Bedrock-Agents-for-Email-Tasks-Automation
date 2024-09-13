import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { WorkmailCreateOrgConstruct, WorkmailEmailHandlerConstruct } from '.';
import * as lambda from 'aws-cdk-lib/aws-lambda';


export class WorkMailConstruct extends Construct {
    constructor(scope: Construct, id: string, props: cdk.StackProps & { 
        lambdaLayer: lambda.LayerVersion; 
        agent: cdk.aws_bedrock.CfnAgent;
        agentAlias: cdk.aws_bedrock.CfnAgentAlias;
    }) 
    {
        super(scope, id);
        const workmailOrg = new WorkmailCreateOrgConstruct(this, 'WorkmailOrg', { nodeJsLayer: props.lambdaLayer });
        const emailHandlerLambda = new WorkmailEmailHandlerConstruct(this, 'EmailHandler', { nodeJsLayer: props.lambdaLayer, agent:props.agent, agentAlias: props.agentAlias });
    }
}