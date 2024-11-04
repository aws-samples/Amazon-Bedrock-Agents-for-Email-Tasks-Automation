import { BedrockAgentClient, StartIngestionJobCommand } from "@aws-sdk/client-bedrock-agent";
import { defaultProvider } from '@aws-sdk/credential-provider-node';

export async function handler(event, context) {
    const brAgentClient = new BedrockAgentClient({ credentials: defaultProvider() });
    const requestType = event.RequestType;
    const physicalResourceId = event.PhysicalResourceId || 'skip';
    const knowledgeBaseId = process.env.KNOWLEDGE_BASE_ID;
    const dataSourceId = process.env.DATA_SOURCE_ID;

    if (requestType === 'Create') {
        try {
            console.log(`invoking datasync for kb ${knowledgeBaseId} and DS ${dataSourceId}`);
            const input = {
                knowledgeBaseId,
                dataSourceId
            };
            const command = new StartIngestionJobCommand(input);
            const dataSyncResponse = await brAgentClient.send(command);
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
    } else {
        return { PhysicalResourceId: physicalResourceId };
    }
};