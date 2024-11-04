import { Construct } from 'constructs';
import { aws_bedrock as bedrock } from 'aws-cdk-lib';
import { BedrockGuardrailsBuilder, FilterType, ManagedWordsTypes, PIIAction, PIIType } from '@aws/agents-for-amazon-bedrock-blueprints';
import { guardrail_name } from '../name_constants';

export function GetGuardRail(scope: Construct): bedrock.CfnGuardrail {
    const builder = new BedrockGuardrailsBuilder(scope, "AgentGuardrail", {
        name: guardrail_name,
        generateKmsKey: true,
    });

    const guardRail = builder
        .withFiltersConfig(FilterType.INSULTS)
        .withManagedWordsConfig(ManagedWordsTypes.PROFANITY)
        .withWordsConfig(['competitor', 'confidential', 'proprietary'])
        .withPIIConfig(PIIAction.ANONYMIZE, PIIType.US_SOCIAL_SECURITY_NUMBER)
        .withTopicConfig("Avoid Religion", "Anything related to religion or religious topics", ['religion', 'faith', 'belief'])
        .build();

    return guardRail;
}

