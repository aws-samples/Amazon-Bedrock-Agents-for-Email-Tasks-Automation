import { Construct } from 'constructs';
import { AgentActionGroup} from '@aws/agents-for-amazon-bedrock-blueprints';
import { readFileSync } from 'fs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { join } from 'path';
//import { RestaurantAssistDatabaseConstruct } from './restaurant-assist-database-construct';
import { SupportCaseAssistDatabaseConstruct } from './support-case-assist-database-construct copy';
import { agent_booking_action_group_name } from '../name_constants';

export function GetSupportAgentActionGroup(scope: Construct): AgentActionGroup {

    const managedPolicies = [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess')
    ];
    
    const getSupportCaseDetailFunction = {
        'name': 'get_support_case_details',
        'description': 'Retrieve details of a support case',
        'parameters': {
            'id': {
                'description': 'The ID of the supportcase to retrieve',
                'required': true,
                'type': 'string'
            }
        }
    };

    const createSupportCaseFunction = {
        'name': 'create_support_case',
        'description': 'Create a new support case',
        'parameters': {
            'customer_name': {
                'description': 'Name of the customer',
                'required': true,
                'type': 'string'
            },
            'customer_email_address': {
                'description': 'The email address of the customer',
                'required': true,
                'type': 'string'
            },
            'support_request': {
                'description': 'detailed description of customer challenge or query',
                'required': true,
                'type': 'string'
            }
        }
    };

    // Define the function schema for deleting a booking
    const deleteSupportCaseFunction = {
        'name': 'delete_booking',
        'description': 'Delete an existing restaurant booking',
        'parameters': {
            'support_case_id': {
                'description': 'The ID of the support case to delete',
                'required': true,
                'type': 'string'
            }
        }
    };

    //new RestaurantAssistDatabaseConstruct(scope, 'RestaurantAssistDatabaseStack');
    new SupportCaseAssistDatabaseConstruct(scope, 'RestaurantAssistDatabaseStack');
    // Create Agent Action Group
    return new AgentActionGroup(scope, 'SupportCaseActionGroup', {
        actionGroupName: agent_booking_action_group_name,
        description: 'Actions for getting support case, when user user wants to get in touch with actual human support agent, create a new support case or delete an existing support case',
        actionGroupExecutor: {
            lambdaDefinition: {
                lambdaCode: readFileSync(join(__dirname, '..', '..', 'lambda', 'support-request-service', 'ag-support-request-service.ts')),
                lambdaHandler: 'handler',
                lambdaRuntime: Runtime.NODEJS_20_X,
                timeoutInMinutes: 4,
                managedPolicies: managedPolicies,
            }

        },
        schemaDefinition: {
            functionSchema: {
                functions: [getSupportCaseDetailFunction, createSupportCaseFunction, deleteSupportCaseFunction]
            }
        },
    });
}

