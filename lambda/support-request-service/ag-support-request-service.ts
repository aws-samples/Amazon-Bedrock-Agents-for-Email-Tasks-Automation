import { DynamoDBClient, GetItemCommand, PutItemCommand, DeleteItemCommand, DescribeTableCommand } from "@aws-sdk/client-dynamodb";
const crypto = require('crypto');
const ddbClient = new DynamoDBClient({});
const tableName = "SupportRequestTable";

function generateSecureId(): string {
    const randomBytes = crypto.randomBytes(4);
    const randomInt = randomBytes.readUInt32BE(0);
    return randomInt.toString(36).toUpperCase();
}

function extractParameter(parameters: Array<{ name: string; type: string; value: any }>, parameterName: string): any {
    const parameter = parameters.find(param => param.name === parameterName);
    return parameter ? parameter.value : undefined;
}

async function createSupportCase(customerName: string, customerEmailAddress: string, supportRequest: string): Promise<{ supportCaseId?: string; error?: string }> {
    try {
        const supportCaseId = generateSecureId();
        const input = {
            TableName: tableName,
            Item: {
                support_case_id: { S: supportCaseId },
                customer_name: { S: customerName },
                customer_email_address: { S: customerEmailAddress },
                support_request: { S: supportRequest },
                created_at: { S: new Date().toISOString() },
            }
        };
        await ddbClient.send(new PutItemCommand(input));
        return { supportCaseId };
    } catch (err) {
        console.error("Error creating support case:", err);
        return { error: "Failed to create support case." };
    }
}

async function getSupportCaseDetails(supportCaseId: string): Promise<{ [key: string]: any } | { message?: string; error?: string }> {
    try {
        const response = await ddbClient.send(
            new GetItemCommand({
                TableName: tableName,
                Key: { support_case_id: { S: supportCaseId } },
            })
        );

        if (response.Item) {
            return response.Item;
        } else {
            return { message: `No support case found with ID ${supportCaseId}` };
        }
    } catch (err) {
        console.error("Error retrieving support case details:", err);
        return { error: "Failed to retrieve support case details." };
    }
}

async function deleteSupportCase(supportCaseId: string): Promise<{ message?: string; error?: string }> {
    try {
        await ddbClient.send(
            new DeleteItemCommand({
                TableName: tableName,
                Key: { support_case_id: { S: supportCaseId } },
            })
        );
        return { message: `Support case with ID ${supportCaseId} deleted successfully.` };
    } catch (err) {
        console.error("Error deleting support case:", err);
        return { error: "Failed to delete support case." };
    }
}

function handleResponse(actionGroup: string, functionName: string, responseBody: any, messageVersion: string): { [key: string]: any } {
    const actionResponse = {
        actionGroup,
        function: functionName,
        functionResponse: {
            responseBody,
        },
    };

    const functionResponse = { response: actionResponse, messageVersion };
    console.log("Response:", functionResponse);
    return functionResponse;
}

export const handler = async (event: { actionGroup: string; function: string; parameters: Array<{ name: string; type: string; value: any }> }, _context: unknown): Promise<{ [key: string]: any }> => {
    const { actionGroup, function: functionName, parameters } = event;
    const messageVersion = "1.0";
    console.log("Received event:", JSON.stringify(event, null, 2));

    try {
        if (functionName === "create_support_case") {
            const customerName = extractParameter(parameters, "customer_name");
            const customerEmailAddress = extractParameter(parameters, "customer_email_address");
            const supportRequest = extractParameter(parameters, "support_request");

            if (customerName && customerEmailAddress && supportRequest) {
                const response = await createSupportCase(customerName, customerEmailAddress, supportRequest);
                const responseBody = { TEXT: { body: JSON.stringify(response) } };
                return handleResponse(actionGroup, functionName, responseBody, messageVersion);
            } else {
                const responseBody = { TEXT: { body: "Missing required parameters for creating a support case." } };
                return handleResponse(actionGroup, functionName, responseBody, messageVersion);
            }
        } else if (functionName === "get_support_case_details") {
            const id = extractParameter(parameters, "id");
            if (id) {
                const response = await getSupportCaseDetails(id);
                const responseBody = { TEXT: { body: JSON.stringify(response) } };
                return handleResponse(actionGroup, functionName, responseBody, messageVersion);
            } else {
                const responseBody = { TEXT: { body: "Missing required parameter: id." } };
                return handleResponse(actionGroup, functionName, responseBody, messageVersion);
            }
        } else if (functionName === "delete_support_case") {
            const supportCaseId = extractParameter(parameters, "support_case_id");
            if (supportCaseId) {
                const response = await deleteSupportCase(supportCaseId);
                const responseBody = { TEXT: { body: JSON.stringify(response) } };
                return handleResponse(actionGroup, functionName, responseBody, messageVersion);
            } else {
                const responseBody = { TEXT: { body: "Missing required parameter: support_case_id." } };
                return handleResponse(actionGroup, functionName, responseBody, messageVersion);
            }
        } else {
            const responseBody = { TEXT: { body: "Invalid function name." } };
            return handleResponse(actionGroup, functionName, responseBody, messageVersion);
        }
    } catch (err) {
        console.error("Error processing request:", err);
        const responseBody = { TEXT: { body: "An error occurred while processing your request." } };
        return handleResponse(actionGroup, functionName, responseBody, messageVersion);
    }
};
