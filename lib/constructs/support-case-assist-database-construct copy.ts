import { RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, Billing, TableV2 } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class SupportCaseAssistDatabaseConstruct extends Construct {
    constructor(scope: Construct, id: string) {
        super(scope, id);
        // Create a new DynamoDB table named 'BookingTable'
        new TableV2(this, 'SupportRequestTable', {
            // Define the partition key as 'booking_id' with type string
            partitionKey: { name: 'support_case_id', type: AttributeType.STRING },
            // Set the billing mode to on-demand
            billing: Billing.onDemand(),
            // Set the table name explicitly to 'SupportRequestTable'
            tableName: 'SupportRequestTable',
            // Set the removal policy to destroy the table when the stack is deleted
            removalPolicy: RemovalPolicy.DESTROY,
        });
    }
}


