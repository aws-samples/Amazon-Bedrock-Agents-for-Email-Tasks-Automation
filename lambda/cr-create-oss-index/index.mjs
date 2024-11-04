import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Client } from '@opensearch-project/opensearch';
import { AwsSigv4Signer } from '@opensearch-project/opensearch/aws';

const AWS_REGION = process.env.AWS_REGION;
const ENDPOINT = process.env.ENDPOINT;
const INDEX_NAME = process.env.INDEX_NAME;
const VECTOR_FIELD = process.env.VECTOR_FIELD;
const DIMENSIONS = process.env.DIMENSIONS;

export async function handler(event, context) {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const requestType = event.RequestType;
  const physicalResourceId = event.PhysicalResourceId || INDEX_NAME;

  const client = new Client({
      ...AwsSigv4Signer({
          region: AWS_REGION,
          service: 'aoss',
          getCredentials: ()=>{
            const credentialsProvider = defaultProvider();
            return credentialsProvider();
          } 
      }),
      node: ENDPOINT,
  });

  try {
      if (requestType === 'Create') {
          return await onCreate(client);
      } else if (requestType === 'Update') {
          return await onUpdate(client, physicalResourceId);
      } else if (requestType === 'Delete') {
          return await onDelete(client, physicalResourceId);
      } else {
          throw new Error(`Unsupported request type: ${requestType}`);
      }
  } catch (error) {
      console.error('Error handling request:', error);
      throw error; 
  }
};

async function onCreate(client) {
  const mapping = createMapping(VECTOR_FIELD, DIMENSIONS);
  const settings = createSetting();

  try {
      const response = await client.indices.create({
          index: INDEX_NAME,
          body: {
              settings,
              mappings: mapping
          }
      });
      console.log(`Index ${INDEX_NAME} created successfully.`);
      return { PhysicalResourceId: INDEX_NAME, Response: response.body };
  } catch (error) {
      console.error('Error creating index:', error);
      throw error;
  }
}

async function onUpdate(client, indexName) {
  try {
      await onDelete(client, indexName);
      return await onCreate(client);
  } catch (error) {
      console.error('Error updating index:', error);
      throw error;
  }
}

async function onDelete(client, indexName) {
  try {
      const response = await client.indices.delete({ index: indexName });
      console.log(`Index ${indexName} deleted successfully.`);
      return { PhysicalResourceId: indexName, Response: response.body };
  } catch (error) {
      console.error('Error deleting index:', error);
      throw error;
  }
}

function createMapping(vectorField, dimensions) {
  return {
      properties: {
          [vectorField]: {
              type: 'knn_vector',
              dimension: dimensions,
              method: {
                  engine: 'faiss',
                  space_type: 'l2',
                  name: 'hnsw',
                  parameters: {},
              },
          },
          id: {
              type: 'text',
              fields: { keyword: { type: 'keyword', ignore_above: 256 } },
          },
          AMAZON_BEDROCK_METADATA: {
            type: 'text',
            index: false,
          },
          AMAZON_BEDROCK_TEXT_CHUNK: {
            type: 'text',
            index: true,
          }
      },
  };
}

function createSetting() {
  return {
      index: {
          number_of_shards: '2',
          'knn.algo_param': { ef_search: '512' },
          knn: 'true',
      },
  };
}
