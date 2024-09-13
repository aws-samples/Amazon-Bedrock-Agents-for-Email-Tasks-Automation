import { BedrockAgentClient, StartIngestionJobCommand } from "@aws-sdk/client-bedrock-agent";
import { defaultProvider } from '@aws-sdk/credential-provider-node';

export async function handler(event, context) {
    const brAgentClient = new BedrockAgentClient({ credentials: defaultProvider() });
    const requestType = event.RequestType;
    const physicalResourceId = event.PhysicalResourceId || 'skip';
    const knowledgeBaseId = process.env.KNOWLEDGE_BASE_ID;
    const dataSourceId = process.env.DATA_SOURCE_ID;

    if (requestType === 'Create') {
        return await onCreate(brAgentClient, knowledgeBaseId, dataSourceId);
    } else {
        return { PhysicalResourceId: physicalResourceId };
    }
};

async function onCreate(brAgentClient, knowledgeBaseId, dataSourceId) {
    try {
        console.log(`invoking datasync for kb ${knowledgeBaseId} and DS ${dataSourceId}`);
        const dataSyncResponse = await brAgentClient.send(
            new StartIngestionJobCommand({
                knowledgeBaseId,
                dataSourceId,
            })
        );
        return {
            PhysicalResourceId: dataSyncResponse && dataSyncResponse.ingestionJob
                ? `datasync_${dataSyncResponse.ingestionJob.ingestionJobId}`
                : 'datasync_failed',
        };
    } catch (err) {
        return {
            PhysicalResourceId: 'datasync_failed',
            Reason: `Failed to start ingestion job: ${err}`,
        };
    }
}
