import { WorkMailMessageFlowClient, GetRawMessageContentCommand } from "@aws-sdk/client-workmailmessageflow";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { simpleParser } from 'mailparser';
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const workMailClient = new WorkMailMessageFlowClient({ region: process.env.AWS_REGION });
const sesClient = new SESClient({ region: process.env.AWS_REGION });
const smClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

let supportEmail;

async function getSupportEmail() {
    if (!supportEmail) { 
        const secretName = process.env.SECRET_ARN;
        const response = await smClient.send(
            new GetSecretValueCommand({
                SecretId: secretName,
                VersionStage: "AWSCURRENT",
            })
        );
        const secret = JSON.parse(response.SecretString);
        supportEmail = secret.email;
    }
    return supportEmail;
}

async function parseEmailContent(stream) {
    return simpleParser(stream);
}

export async function handler(event) {
    const msgId = event.messageId;
    console.log(JSON.stringify(event));
    console.log(`An Email received with messageId: [${msgId}]`);

    try {
        const rawMsgCommand = new GetRawMessageContentCommand({ messageId: msgId });
        const rawMsgResponse = await workMailClient.send(rawMsgCommand);

        const emailParsed = await parseEmailContent(rawMsgResponse.messageContent);
        const emailInfo = {
            From: emailParsed.from ? emailParsed.from.text : "Unknown sender",
            Subject: emailParsed.subject ? emailParsed.subject : "No subject",
            Body: emailParsed.text || "No body content"
        };

        console.log(emailInfo);

        const client = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION });
        const agentId = process.env.AGENT_ID;
        const agentAliasId = process.env.AGENT_ALIAS_ID;
        const sanitizedSessionId = validateId(msgId, 'sessionId');
        const sanitizedEmailInfo = JSON.stringify(emailInfo);

        const input = {
            agentId,
            agentAliasId,
            sessionId: sanitizedSessionId,
            inputText: sanitizedEmailInfo
        };

        const command = new InvokeAgentCommand(input);
        let bedrockResult;

        try {
            let completion = "";
            const response = await client.send(command);
            for await (let chunkEvent of response.completion) {
                const chunk = chunkEvent.chunk;
                const decodedResponse = new TextDecoder("utf-8").decode(chunk.bytes);
                completion += decodedResponse;
            }
            bedrockResult = { sessionId: sanitizedSessionId, completion };
        } catch (err) {
            console.error('Error invoking Bedrock agent:', err);
            throw err;
        }

        console.log('Bedrock Agent Response:', bedrockResult);
        const emailResponse = bedrockResult.completion;
        const originalEmailInfo = emailParsed;
        const sourceEmail = await getSupportEmail();
        const destinationEmail = originalEmailInfo.from.text;
        const body = `${emailResponse}\n\n---\nOriginal Message:\nFrom: ${originalEmailInfo.from.text}\nSubject: ${originalEmailInfo.subject}\n\n${originalEmailInfo.text}`;
        const sub = `${originalEmailInfo.subject}`;

        const responseEmail = {
            Source: sourceEmail,
            Destination: {
                ToAddresses: [destinationEmail]
            },
            Message: {
                Subject: {
                    Data: sub
                },
                Body: {
                    Text: {
                        Data: body
                    }
                }
            }
        };

        try {
            const sendCommand = new SendEmailCommand(responseEmail);
            await sesClient.send(sendCommand);
            console.log('Response email sent successfully.');
        } catch (error) {
            console.error('Failed to send response email:', error);
            throw error;
        }

    } catch (error) {
        console.error(`Error processing message: ${error}`);
        throw error;
    }
}

function validateId(id, type) {
    if (typeof id !== 'string' || id.length === 0 || id.length > 1024) {
        throw new Error(`Invalid ${type}. It must be a non-empty string with a maximum length of 1024 characters.`);
    }
    return id
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
