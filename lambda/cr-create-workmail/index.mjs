import {
    WorkMailClient,
    CreateOrganizationCommand,
    CreateUserCommand,
    ListUsersCommand,
    DeleteOrganizationCommand,
    RegisterToWorkMailCommand,
    DescribeOrganizationCommand,
    DeregisterFromWorkMailCommand,
    DeleteUserCommand,
    ListOrganizationsCommand
} from "@aws-sdk/client-workmail";
import { SecretsManagerClient, PutSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import crypto from 'crypto';
const workMailClient = new WorkMailClient({ credentials: defaultProvider(), region: process.env.AWS_REGION });
const secretsManagerClient = new SecretsManagerClient({ credentials: defaultProvider(), region: process.env.AWS_REGION });
const userName = 'support';

export async function handler(event, context) {
    console.log(event);
    const orgName = process.env.WORKMAIL_ORG_NAME;
    const requestType = event.RequestType;
    const resourceId = event.PhysicalResourceId || 'initial-resource-id'; // Default to a placeholder if no PhysicalResourceId is provided.

    switch (requestType) {
        case 'Create':
            return await onCreate(orgName, resourceId);
        case 'Update':
            return await onUpdate(event);
        case 'Delete':
            return await onDelete(orgName, resourceId);
        default:
            throw new Error(`Invalid request type: ${requestType}`);
    }
}

async function onCreate(orgName, resourceId) {
    const sanitizedResourceId = validateId(resourceId, 'resourceId');
    const sanitizedOrgName = validateId(orgName, 'orgName');
    try {
        let organizationId;
        const existingOrg = await findExistingOrganization(sanitizedOrgName);

        if (existingOrg) {
            console.log(`Organization with alias '${sanitizedOrgName}' already exists.`);
            organizationId = existingOrg.OrganizationId;
        } else {
            const input = {
                Alias: sanitizedOrgName
            };
            const command = new CreateOrganizationCommand(input);
            const createOrgResponse = await sendCommand(command);
            console.log(`Organization created with ID: ${createOrgResponse.OrganizationId}`);
            await isOrganizationActive(createOrgResponse.OrganizationId);
            organizationId = createOrgResponse.OrganizationId;
        }

        // Proceed to check or create user irrespective of whether the organization was newly created or already existed
        await manageUser(organizationId, sanitizedOrgName);
        return {
            PhysicalResourceId: sanitizedResourceId,
            Message: 'Create operation complete',
            Data: { OrganizationId: organizationId }
        };
    } catch (error) {
        console.error(`Error while processing the organization: ${error}`);
        throw error;
    }
}

async function onUpdate(event) {
    console.log(`Update operation: No changes made to resource ${event.PhysicalResourceId}.`);
    return {
        PhysicalResourceId: event.PhysicalResourceId,
        Message: 'Update processed, no changes made.'
    };
}

async function onDelete(orgName, resourceId) {
    const sanitizedResourceId = validateId(resourceId, 'resourceId');
    
    // Fetch orgName from Secrets Manager if available
    let sanitizedOrgName;
    try {
        const secretData = await secretsManagerClient.send(new GetSecretValueCommand({ SecretId: process.env.SECRET_ARN }));
        const secretString = secretData.SecretString ? JSON.parse(secretData.SecretString) : null;
        sanitizedOrgName = secretString && secretString.orgName ? validateId(secretString.orgName, 'orgName') : validateId(orgName, 'orgName');
    } catch (error) {
        console.error(`Error retrieving org name from Secrets Manager, using parameter orgName: ${error}`);
        sanitizedOrgName = validateId(orgName, 'orgName');
    }

    const orgInfo = await findExistingOrganization(sanitizedOrgName);
    if (!orgInfo) {
        console.log(`No organization found with the alias: ${sanitizedOrgName}. Exiting without action.`);
        return {
            PhysicalResourceId: sanitizedResourceId,
            Message: `No organization found with the alias: ${sanitizedOrgName}. No action taken.`
        };
    }

    const organizationId = orgInfo.OrganizationId;
    console.log(`Initiating deletion for organization ID: ${organizationId} and user: ${userName}`);
    
    try {
        const input = { OrganizationId: organizationId };
        const userAvail = await sendCommand(new ListUsersCommand(input));
        for (const user of userAvail.Users) {
            if (user.Name === userName) {
                await deregisterAndDeleteUser(organizationId, user.Id);
            }
        }
    } catch (error) {
        console.error(`Error while deleting user: ${error}`);
    }

    try {
        await deleteOrganization(organizationId);
        console.log(`Organization ${organizationId} and user ${userName} deleted successfully.`);
    } catch (error) {
        console.error(`Error while deleting organization: ${error}`);
    }

    return {
        PhysicalResourceId: resourceId,
        Message: 'Delete operation complete'
    };
}


async function manageUser(orgId, orgName) {
    const sanitizedOrgId = validateId(orgId, 'orgId');
    const sanitizedOrgName = validateId(orgName, 'orgName');
    const existingUser = await findExistingUser(sanitizedOrgId, userName);
    if (existingUser) {
        console.log(`User 'support' already exists in organization.`);
        return { UserId: existingUser.Id, Message: "User already exists." };
    } else {
        return await createUser(sanitizedOrgId, sanitizedOrgName);
    }
}

async function findExistingOrganization(orgAlias) {
    const sanitizedOrgAlias = validateId(orgAlias, 'orgAlias');
    const orgs = await sendCommand(new ListOrganizationsCommand({}));
    return orgs.OrganizationSummaries.find(org => org.Alias.toLowerCase() === sanitizedOrgAlias.toLowerCase() && org.State === 'Active');
}

async function isOrganizationActive(orgId) {
    const sanitizedOrgId = validateId(orgId, 'orgId');

    while (true) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds delay
        const input = {
            OrganizationId: sanitizedOrgId
        }
        const command = new DescribeOrganizationCommand(input);
        const orgDesc = await sendCommand(command);
        if (orgDesc.State === 'Active') {
            console.log(`Organization is active: ${orgDesc.State}`);
            break;
        }
        console.log(`Waiting for organization to become active. Current state: ${orgDesc.State}`);
    }
}

async function createUser(orgId, orgName) {
    const sanitizedOrgId = validateId(orgId, 'orgId');
    const sanitizedOrgName = validateId(orgName, 'orgName');

    const userName = "support";
    const password = generateSecurePassword();
    try {
        const input = {
            OrganizationId: sanitizedOrgId,
            Name: userName,
            DisplayName: userName,
            Password: password,
        };
        const command = new CreateUserCommand(input);
        const userResponse = await sendCommand(command);
        console.log(`User ${userName} created with ID: ${userResponse.UserId}`);
        await secretsManagerClient.send(new PutSecretValueCommand({
            SecretId: process.env.SECRET_ARN,
            SecretString: JSON.stringify({ username: userName, password: password, email: `${userName}@${sanitizedOrgName}.awsapps.com`.toLowerCase(), orgName:sanitizedOrgName })
        }));
        console.log(`Credentials stored in Secrets Manager under ARN: ${process.env.SECRET_ARN}`);
        try {
            await workMailClient.send(new RegisterToWorkMailCommand({
                OrganizationId: sanitizedOrgId,
                EntityId: userResponse.UserId,
                Email: `${userName}@${sanitizedOrgName}.awsapps.com`.toLowerCase()
            }));
            console.log(`User ${userName} registered to WorkMail with email: ${userName}@${sanitizedOrgName}.awsapps.com`);

        } catch (error) {
            console.log(`Unable to register user. User must be manually enabled.`);
        }

        return { UserId: userResponse.UserId };
    } catch (error) {
        console.error(`Error creating user or storing credentials: ${error}`);
        throw error;
    }
}

async function findExistingUser(orgId, userName) {
    const sanitizedOrgId = validateId(orgId, 'orgId');
    const sanitizedUserName = validateId(userName, 'userName');
    const input = { OrganizationId: sanitizedOrgId };
    const listCommand = new ListUsersCommand(input);
    const users = await sendCommand(listCommand);
    return users.Users.find(user => user.Name === sanitizedUserName && user.State !== 'DELETED');
}

function generateSecurePassword() {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const special = "!@#$%^&*()_+";

    let retVal = "";

    // Ensure at least one character from each category
    retVal += lowercase[Math.floor(Math.random() * lowercase.length)];
    retVal += uppercase[Math.floor(Math.random() * uppercase.length)];
    retVal += numbers[Math.floor(Math.random() * numbers.length)];
    retVal += special[Math.floor(Math.random() * special.length)];

    const randomBytes = crypto.randomBytes(length - 4);

    for (let i = 0; i < length - 4; i++) {
        retVal += charset[randomBytes[i] % charset.length];
    }

    // Shuffle the password to randomize positions of guaranteed characters
    retVal = retVal.split('').sort(() => 0.5 - Math.random()).join('');

    return retVal;
}

async function sendCommand(command) {
    try {
        return await workMailClient.send(command);
    } catch (error) {
        console.error(`Error executing command: ${error}`);
        throw error;
    }
}

async function deregisterAndDeleteUser(orgId, userId) {
    const sanitizedOrgId = validateId(orgId, 'orgId');
    const sanitizedUserId = validateId(userId, 'userId');

    try {
        const input = {
            OrganizationId: sanitizedOrgId,
            EntityId: sanitizedUserId
        };

        const deregister = new DeregisterFromWorkMailCommand(input);

        await sendCommand(deregister);

        const deleteUser = new DeleteUserCommand({
            OrganizationId: sanitizedOrgId,
            UserId: sanitizedUserId
        })
        await sendCommand(deleteUser);
    } catch (error) {
        console.log(`Error deleting users: ${error}`);
    }
}

async function deleteOrganization(orgId) {
    const sanitizedOrgId = validateId(orgId, 'orgId');
    const input = {
        OrganizationId: sanitizedOrgId
    };
    const delCommand = new DeleteOrganizationCommand(input);
    await sendCommand(delCommand);
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