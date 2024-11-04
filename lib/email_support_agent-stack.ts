import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BedrockAgentConstruct, BedrockKbConstruct, WorkMailConstruct } from './constructs';
import { NodejsLambdaLayerConstruct } from './constructs';
import { ApplyNagRules } from './constructs/nag-supressions';


export class BedrockEmailSupportAgentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const lambdaLayer = new NodejsLambdaLayerConstruct(this, 'NodeJsLambdaLayer').lambdaLayer;
    const kbConstruct = new BedrockKbConstruct(this, 'BedrockKbConstruct', { lambdaLayer: lambdaLayer });
    
    //Create Agent Flow.
    const agentConstruct = new BedrockAgentConstruct(this, 'BedrockAgentConstruct', { bedrockKb: kbConstruct.bedrockKnowledgeBase });
    agentConstruct.node.addDependency(kbConstruct);
    
    //Create WorkMail based flow
    const workmailConstruct = new WorkMailConstruct(this, 'WorkmailIntegrationConstruct', {lambdaLayer:lambdaLayer, agent:agentConstruct.agent, agentAlias: agentConstruct.agentAlias});
    workmailConstruct.node.addDependency(agentConstruct)
    ApplyNagRules(this);
  }
}
