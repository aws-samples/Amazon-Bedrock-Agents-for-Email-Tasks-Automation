import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import { aws_bedrock as bedrock } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as opensearch from 'aws-cdk-lib/aws-opensearchserverless';
import { KnowledgeBaseDataSyncCustomResource } from './kb-data-sync-cr';
import { knowledge_base_datasource_name, knowledge_base_name, knowledge_base_role_name, oss_collection_metadata_field_name, oss_collection_text_field_name, oss_collection_vector_field_name, oss_collection_vector_index_name } from '../name_constants';


export class KbBedrockKbConstruct extends Construct {
    public bedrockKnowledgeBase: bedrock.CfnKnowledgeBase;
    constructor(scope: Construct, id: string, props:{
      bucket: s3.IBucket;
      bucketKmsKey: kms.Key;
      ossCollection: opensearch.CfnCollection;})
    {
        super(scope, id);
        const knowledgeBaseRole = new iam.Role(this, 'knowledgeBaseExecutionRole', {
          roleName:knowledge_base_role_name,
          assumedBy: new iam.ServicePrincipal('bedrock.amazonaws.com'),
          description: 'Role assumed by Bedrock Knowledge Base Service',
        });
        // Grant S3 read/write access to the knowledge base role
        props.bucket.grantReadWrite(knowledgeBaseRole);
    
        // Grant KMS decrypt and encrypt permissions to the knowledge base role
        props.bucketKmsKey.grantEncryptDecrypt(knowledgeBaseRole);
        knowledgeBaseRole.addToPolicy(new iam.PolicyStatement({
          sid: 'BedrockInvokeModelStatement',
          effect: iam.Effect.ALLOW,
          actions: ['bedrock:InvokeModel'],
          resources: [bedrock.FoundationModel.fromFoundationModelId(this, 'EmbeddingModel', bedrock.FoundationModelIdentifier.AMAZON_TITAN_EMBED_TEXT_V2_0).modelArn]
        }));
    
        knowledgeBaseRole.addToPolicy(new iam.PolicyStatement({
          sid: 'OpenSearchServerlessAPIAccessAllStatement',
          effect: iam.Effect.ALLOW,
          actions: ['aoss:APIAccessAll'],
          resources: [props.ossCollection.attrArn]
        }));
    
        const dataAccessPolicy = new opensearch.CfnAccessPolicy(this, 'bedrock-knowledgebase-dap', {
          name: 'bedrock-knowledgebase-dap',
          policy: JSON.stringify([
            {
              Rules: [
                {
                  ResourceType: 'collection',
                  Resource: [`collection/${props.ossCollection.name}`],
                  Permission: [
                    'aoss:*'
                  ],
                },
                {
                  ResourceType: 'index',
                  Resource: [`index/*/*`],
                  Permission: [
                    'aoss:*'
                  ],
                },
              ],
              Principal: [
                knowledgeBaseRole.roleArn
              ],
            },
          ]),
          type: 'data',
          description: 'Data access policy for collection used by bedrock knowledgebases',
        });
    
        const knowledgeBase = new bedrock.CfnKnowledgeBase(this, 'bedrockKnowledgeBase', {
          description: 'knowledge base to hold support Q&A',
          name: knowledge_base_name,
          knowledgeBaseConfiguration: {
            type: 'VECTOR',
            vectorKnowledgeBaseConfiguration: {
              embeddingModelArn: bedrock.FoundationModel.fromFoundationModelId(this, 'EmbeddingModel', bedrock.FoundationModelIdentifier.AMAZON_TITAN_EMBED_TEXT_V2_0).modelArn
            }
          },
          roleArn: knowledgeBaseRole.roleArn,
          storageConfiguration: {
            type: 'OPENSEARCH_SERVERLESS',
            opensearchServerlessConfiguration: {
              collectionArn: props.ossCollection.attrArn,
              fieldMapping: {
                metadataField: oss_collection_metadata_field_name,
                textField: oss_collection_text_field_name,
                vectorField: oss_collection_vector_field_name
              },
              vectorIndexName: oss_collection_vector_index_name
            }
          }
        });
        knowledgeBase.node.addDependency(knowledgeBaseRole);
        knowledgeBase.node.addDependency(dataAccessPolicy);
        knowledgeBase.node.addDependency(props.bucket);
        knowledgeBase.node.addDependency(props.ossCollection);
        const dataSource = new bedrock.CfnDataSource(this, 'KnowledgeBaseDataSource', {
          name: knowledge_base_datasource_name,
          dataSourceConfiguration: {
            s3Configuration: {
              bucketArn: props.bucket.bucketArn,
            },
            type: 'S3'
          },
          knowledgeBaseId: knowledgeBase.attrKnowledgeBaseId,
          serverSideEncryptionConfiguration: {
            kmsKeyArn: props.bucketKmsKey.keyArn
          },
          vectorIngestionConfiguration: {
            chunkingConfiguration: {
              chunkingStrategy: 'FIXED_SIZE',
              fixedSizeChunkingConfiguration: {
                maxTokens: 500,
                overlapPercentage: 20
              }
            }
          }
        });
        this.bedrockKnowledgeBase = knowledgeBase;
        const DataSyncCustomResource= KnowledgeBaseDataSyncCustomResource(scope, knowledgeBase.attrKnowledgeBaseId, dataSource.attrDataSourceId);
        DataSyncCustomResource.node.addDependency(dataSource);

    }
}


