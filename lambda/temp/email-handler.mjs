import { WorkMailMessageFlowClient, GetRawMessageContentCommand } from "@aws-sdk/client-workmailmessageflow";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { simpleParser } from 'mailparser';
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";

const workMailClient = new WorkMailMessageFlowClient({ region: process.env.AWS_REGION });
const sesClient = new SESClient({ region: process.env.AWS_REGION });

async function parseEmailContent(stream) {
    return simpleParser(stream);
}

async function invokeBedrockAgent(emailInfo, sessionId) {
    const client = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION });
    const agentId = process.env.AGENT_ID;
    const agentAliasId = process.env.AGENT_ALIAS_ID;

    const command = new InvokeAgentCommand({
        agentId,
        agentAliasId,
        sessionId,
        inputText: JSON.stringify(emailInfo),
    });

    try {
        let completion = "";
        const response = await client.send(command);
        for await (let chunkEvent of response.completion) {
            const chunk = chunkEvent.chunk;
            const decodedResponse = new TextDecoder("utf-8").decode(chunk.bytes);
            completion += decodedResponse;
        }
        return { sessionId: sessionId, completion };
    } catch (err) {
        console.error('Error invoking Bedrock agent:', err);
        throw err;
    }
}

async function sendResponseEmail(emailResponse, originalEmailInfo) {
    const sourceEmail = process.env.SUPPORT_EMAIL_ADDRESS;
    const destinationEmail = originalEmailInfo.from.text; // Updated to use parsed email info

    // Check if 'Re:' is already present in the subject
    const subjectPrefix = originalEmailInfo.subject.startsWith("Re:") ? "" : "Re: ";

    const responseEmail = {
        Source: sourceEmail,
        Destination: {
            ToAddresses: [destinationEmail]
        },
        Message: {
            Subject: {
                Data: `${subjectPrefix}${originalEmailInfo.subject}`
            },
            Body: {
                Text: {
                    Data: `${emailResponse}\n\n---\nOriginal Message:\nFrom: ${originalEmailInfo.from.text}\nSubject: ${originalEmailInfo.subject}\n\n${originalEmailInfo.text}`
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
}

export async function handler(event) {

    const msgId = event.messageId;
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
        console.log(emailParsed.inReplyTo);
         //console.log(emailInfo);
        // const bedrockResult = await invokeBedrockAgent(emailInfo, msgId);
        // console.log('Bedrock Agent Response:', bedrockResult);

        // await sendResponseEmail(bedrockResult.completion, emailParsed);
    } catch (error) {
        console.error(`Error processing message: ${error}`);
        throw error;
    }
}
