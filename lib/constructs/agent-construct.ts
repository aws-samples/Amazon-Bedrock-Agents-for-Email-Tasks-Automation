import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { BedrockAgentBlueprintsConstruct, AgentDefinitionBuilder } from '@aws/agents-for-amazon-bedrock-blueprints';
import { GetAgentActionGroup, GetGuardRail } from '.';
import { AgentInstructionPrompt } from '../prompts';
import { agent_name } from '../name_constants';



export class BedrockAgentConstruct extends Construct {
    guardRail: cdk.aws_bedrock.CfnGuardrail;
    agent: cdk.aws_bedrock.CfnAgent;
    agentAlias: cdk.aws_bedrock.CfnAgentAlias;
    agentServiceRole: cdk.aws_iam.Role;
    constructor(scope: Construct, id: string, props: cdk.StackProps & { bedrockKb: cdk.aws_bedrock.CfnKnowledgeBase }) {
        super(scope, id);

        // Define the agent's properties
        const agentDef = new AgentDefinitionBuilder(this, 'AgentProps', {})
            .withAgentName(agent_name)
            .withInstruction(AgentInstructionPrompt)
            .withFoundationModel('anthropic.claude-3-sonnet-20240229-v1:0')
            .withUserInput()
            .build();

        this.guardRail = GetGuardRail(this);

        // Create the Bedrock Agent Blueprint
        const agentConstruct = new BedrockAgentBlueprintsConstruct(this, 'BedrockAgent', {
            agentDefinition: agentDef,
            actionGroups: [GetAgentActionGroup(this)],
            guardrail: this.guardRail,
        });

        agentConstruct.agent.knowledgeBases = [
            {
                knowledgeBaseState: 'ENABLED',
                knowledgeBaseId: props.bedrockKb.attrKnowledgeBaseId,
                description: 'Access the knowledge base when customers ask about the plates in the menu.'
            }
        ];
        agentConstruct.agent.autoPrepare = true;
        agentConstruct.agentServiceRole.addToPolicy(new iam.PolicyStatement({
            sid: 'retrieveKnowledgeBasePolicy',
            effect: iam.Effect.ALLOW,
            actions: ['bedrock:Retrieve'],
            resources: [props.bedrockKb.attrKnowledgeBaseArn]
        }));


        const date = new Date();
        const timestamp = date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 12); // Formats to 'YYYYMMDDHHmm'

        const agentAlias = new cdk.aws_bedrock.CfnAgentAlias(this, `EmailAgentAlias${timestamp}`, {
            agentAliasName: `EmailAgentAlias${timestamp}`, 
            agentId: agentConstruct.agent.attrAgentId,
            description: "main alias to invoke the agent"
        });
        agentAlias.addDependency(agentConstruct.agent);
        this.agentAlias = agentAlias;
        this.agent = agentConstruct.agent;
        this.agentServiceRole = agentConstruct.agentServiceRole;
    }
}
