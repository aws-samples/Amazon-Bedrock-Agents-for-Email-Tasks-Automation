import { Construct } from "constructs";
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as opensearch from 'aws-cdk-lib/aws-opensearchserverless';
import * as iam from 'aws-cdk-lib/aws-iam';
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { oss_collection_name, oss_collection_vector_field_name, oss_collection_vector_index_name } from "../name_constants";

export class KbOssConstruct extends Construct {

    public ossCollection: opensearch.CfnCollection;
    constructor(scope: Construct, id: string, props:{nodeJsLayer: lambda.LayerVersion;}) {
        super(scope, id);

        const dimensions = "1024";
        
        const opensearchCollection = new opensearch.CfnCollection(this, 'KnowledgeBaseCollection', {
          name: oss_collection_name,
          type: "VECTORSEARCH",
          description: 'A serverless OpenSearch collection for the knowledge base',
        });
        
        // Static network policy to allow access only from AWS
        const networkPolicy =  new opensearch.CfnSecurityPolicy(this, "OSSNetworkPolicy", {
          name: "oss-network-policy",
          policy: JSON.stringify([
            {
              Rules: [
                {
                  ResourceType: "collection",
                  Resource: [`collection/${oss_collection_name}`],
                },
                {
                  ResourceType: "dashboard",
                  Resource: [`collection/${oss_collection_name}`],
                },
              ],
              AllowFromPublic: true,
            }
          ]),
          type: "network",
        });
    
        // Encryption policy
        const encryptionPolicy = new opensearch.CfnSecurityPolicy(this, 'OSSEncryptionPolicy', {
          name: 'oss-data-encryption-policy',
          type: 'encryption',
          description: 'Encryption policy for the knowledge base collection',
    
          policy: JSON.stringify({
            Rules: [
              {
                ResourceType: "collection",
                Resource: [`collection/${oss_collection_name}`]
              }
            ],
            AWSOwnedKey: true
          }),
        });
    
        const logGroup = new LogGroup(this,'CreateKnnIndexCustomResourceLambdaLogGroup',{
          logGroupClass: cdk.aws_logs.LogGroupClass.INFREQUENT_ACCESS,
          removalPolicy: cdk.RemovalPolicy.DESTROY
        });
        const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
          assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
          description: 'Role for custom resource Lambda to manage OpenSearch collection'
        });
        lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));
        lambdaRole.addToPolicy(new iam.PolicyStatement({
          actions: [
            'aoss:*'
          ],
          resources: [
            `arn:aws:aoss:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:collection/*`,
            `arn:aws:aoss:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:index/*/*`
            ],
        }));
        // Lambda function to create the KNN index
        const createKnnIndexLambda = new lambda.Function(this, 'CreateKnnIndexLambda', {
          runtime: lambda.Runtime.NODEJS_20_X,
          handler: 'index.handler',
          code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda/cr-create-oss-index')),
          layers:[props.nodeJsLayer],
          role:lambdaRole,
          timeout:cdk.Duration.minutes(5),
          logGroup:logGroup,
          environment:{
            ENDPOINT: opensearchCollection.attrCollectionEndpoint,
            INDEX_NAME: oss_collection_vector_index_name,
            VECTOR_FIELD: oss_collection_vector_field_name,
            DIMENSIONS: dimensions,
            COLLECTION_NAME: oss_collection_name,
          }
        });
        const dataAccessPolicy = new opensearch.CfnAccessPolicy(this, 'OSSAccessPolicy', {
          name: 'ossdataaccesspolicy',
          policy: JSON.stringify([
            {
              Rules: [
                {
                  ResourceType: 'collection',
                  Resource: [`collection/${oss_collection_name}`],
                  Permission: [
                    'aoss:*'
                  ],
                },
                {
                  ResourceType: 'index',
                  Resource: [`index/${oss_collection_name}/*`],
                  Permission: [
                    'aoss:*'
                  ],
                },
              ],
              Principal: [
                lambdaRole.roleArn,
                `arn:aws:iam::${cdk.Stack.of(this).account}:root`,
              ],
            },
          ]),
          type: 'data',
          description: 'Data access policy for collection',
        });
        
        // Create the custom resource
        const provider = new cr.Provider(this, 'CustomResourceProvider', {
          onEventHandler: createKnnIndexLambda,
        });
    
        const knnIndexResource = new cdk.CustomResource(this, 'CustomResource', {
          serviceToken: provider.serviceToken,
        });
        
        
        // // Ensure the custom resource is created after the collection
        createKnnIndexLambda.node.addDependency(lambdaRole);
        knnIndexResource.node.addDependency(opensearchCollection);
        knnIndexResource.node.addDependency(lambdaRole);
        knnIndexResource.node.addDependency(dataAccessPolicy);
        opensearchCollection.node.addDependency(networkPolicy);
        opensearchCollection.node.addDependency(encryptionPolicy);
        this.ossCollection = opensearchCollection;
    }
}


