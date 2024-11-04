import { Construct } from 'constructs';
import { AgentActionGroup} from '@aws/agents-for-amazon-bedrock-blueprints';
import { readFileSync } from 'fs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { join } from 'path';
import { RestaurantAssistDatabaseConstruct } from './restaurant-assist-database-construct';
import { agent_booking_action_group_name } from '../name_constants';

export function GetAgentActionGroup(scope: Construct): AgentActionGroup {

    const managedPolicies = [
        ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess')
    ];
    
    const getBookingDetailsFunction = {
        'name': 'get_booking_details',
        'description': 'Retrieve details of a restaurant booking',
        'parameters': {
            'booking_id': {
                'description': 'The ID of the booking to retrieve',
                'required': true,
                'type': 'string'
            }
        }
    };

    const createBookingFunction = {
        'name': 'create_booking',
        'description': 'Create a new restaurant booking',
        'parameters': {
            'date': {
                'description': 'The date of the booking',
                'required': true,
                'type': 'string'
            },
            'name': {
                'description': 'Name to idenfity your reservation',
                'required': true,
                'type': 'string'
            },
            'hour': {
                'description': 'The hour of the booking',
                'required': true,
                'type': 'string'
            },
            'num_guests': {
                'description': 'The number of guests for the booking',
                'required': true,
                'type': 'integer'
            }
        }
    };

    // Define the function schema for deleting a booking
    const deleteBookingFunction = {
        'name': 'delete_booking',
        'description': 'Delete an existing restaurant booking',
        'parameters': {
            'booking_id': {
                'description': 'The ID of the booking to delete',
                'required': true,
                'type': 'string'
            }
        }
    };

    new RestaurantAssistDatabaseConstruct(scope, 'RestaurantAssistDatabaseStack');
    // Create Agent Action Group
    return new AgentActionGroup(scope, 'TableBookingsActionGroup', {
        actionGroupName: agent_booking_action_group_name,
        description: 'Actions for getting table booking information, create a new booking or delete an existing booking',
        actionGroupExecutor: {
            lambdaDefinition: {
                lambdaCode: readFileSync(join(__dirname, '..', '..', 'lambda', 'table-booking-service', 'ag-table-booking-service.ts')),
                lambdaHandler: 'handler',
                lambdaRuntime: Runtime.NODEJS_20_X,
                timeoutInMinutes: 4,
                managedPolicies: managedPolicies,
            }

        },
        schemaDefinition: {
            functionSchema: {
                functions: [getBookingDetailsFunction, createBookingFunction, deleteBookingFunction]
            }
        },
    });
}

