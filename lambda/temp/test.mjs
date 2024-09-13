
import { handler as orgHandler } from './org-creation.mjs';
import { handler as datasourceSyncHandler } from './datasource-sync.mjs';
import { handler as emailHandler } from './email-handler.mjs';
import dotenv from 'dotenv';

dotenv.config();

// Mock event for creating an organization
const createEvent = {
    RequestType: 'Create',
    ResourceProperties: {
    }
};

const deleteEvent = {
    RequestType: 'Delete',
    ResourceProperties: {
    }
};

const emailEvent = {
    summaryVersion: "2019-07-28",
    envelope: {
        mailFrom: {
            address: "mishra.manu@outlook.com"
        },
        recipients: [
            {
                address: "support@org-workmailorg-749484261413.awsapps.com"
            }
        ]
    },
    truncated: false,
    sender: null,
    subject: "RE: Table reservation request",
    messageId: "bb096e1a-61c4-3985-a0aa-835478620849",
    //messageId: "ef19f82a-aeda-3272-9e19-febf885bc74b",
    invocationId: "0bc595bb0c8daf3787943fc45991e398c55a392d",
    flowDirection: "INBOUND"
};

const context = {};

async function testOrgCreation() {
    try {
        console.log("Testing Organization Creation...");
        const result = await orgHandler(createEvent, context);
        console.log("Handler result:", result);
    } catch (error) {
        console.error("Error during test:", error);
    }
}

async function testDataSourceSync() {
    try {
        console.log("Testing Datasource Sync...");
        const result = await datasourceSyncHandler(createEvent, context);
        console.log("Handler result:", result);
    } catch (error) {
        console.error("Error during test:", error);
    }
}

async function testEmailHandler() {
    try {
        console.log("Testing EmailHandler Sync...");
        const result = await emailHandler(emailEvent, context);
        console.log("Handler result:", result);
    } catch (error) {
        console.error("Error during test:", error);
    }
}

//testOrgCreation();
//testDataSourceSync();
testEmailHandler();
