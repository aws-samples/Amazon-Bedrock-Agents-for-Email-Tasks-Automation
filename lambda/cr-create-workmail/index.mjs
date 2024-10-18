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
import { validateId } from '../../common/index.mjs';

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
    sanitizedResourceId = validateId(resourceId, 'resourceId');
    sanitizedOrgName = validateId(orgName, 'orgName');
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
            const createOrgResponse = sendCommand(command);
            console.log(`Organization created with ID: ${createOrgResponse.OrganizationId}`);
            await isOrganizationActive(createOrgResponse.OrganizationId, sanitizedOrgName);
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
    sanitizedResourceId = validateId(resourceId, 'resourceId');
    sanitizedOrgName = validateId(orgName, 'orgName');

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
        const input = {
            OrganizationId: organizationId
        };
        const command = new ListUsersCommand(input);
        const userAvail = sendCommand(command);
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
    }
    catch (error) {
        console.error(`Error while deleting organization: ${error}`);
    }
    return {
        PhysicalResourceId: resourceId,
        Message: 'Delete operation complete'
    };
}

async function manageUser(orgId, orgName) {
    sanitizedOrgId = validateId(orgId, 'orgId');
    sanitizedOrgName = validateId(orgName, 'orgName');
    const existingUser = await findExistingUser(sanitizedOrgId, userName);
    if (existingUser) {
        console.log(`User 'support' already exists in organization.`);
        return { UserId: existingUser.Id, Message: "User already exists." };
    } else {
        return await createUser(sanitizedOrgId, sanitizedOrgName);
    }
}

async function findExistingOrganization(orgAlias) {
    sanitizedOrgAlias = validateId(orgAlias, 'orgAlias');
    const orgs = sendCommand(new ListOrganizationsCommand({}));
    return orgs.OrganizationSummaries.find(org => org.Alias.toLowerCase() === sanitizedOrgAlias.toLowerCase() && org.State === 'Active');
}

async function isOrganizationActive(orgId, orgName) {
    sanitizedOrgId = validateId(orgId, 'orgId');
    sanitizedOrgName = validateId(orgName, 'orgName');

    while (true) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds delay
        const input = {
            OrganizationId: sanitizedOrgId
        }
        const command = new DescribeOrganizationCommand(input);
        const orgDesc = sendCommand(command);
        if (orgDesc.State === 'Active') {
            console.log(`Organization is active: ${orgDesc.State}`);
            break;
        }
        console.log(`Waiting for organization to become active. Current state: ${orgDesc.State}`);
    }
}

async function createUser(orgId, orgName) {
    sanitizedOrgId = validateId(orgId, 'orgId');
    sanitizedOrgName = validateId(orgName, 'orgName');

    const userName = "support";
    const password = generateSecurePassword();
    try {
        const input = {
            OrganizationId: sanitizedUserName,
            Name: userName,
            DisplayName: userName,
            Password: password,
        };
        const command = new CreateUserCommand(input);
        const userResponse = sendCommand(command);
        console.log(`User ${userName} created with ID: ${userResponse.UserId}`);
        await secretsManagerClient.send(new PutSecretValueCommand({
            SecretId: process.env.SECRET_ARN,
            SecretString: JSON.stringify({ username: userName, password: password })
        }));
        console.log(`Credentials stored in Secrets Manager under ARN: ${process.env.SECRET_ARN}`);
        try {
            await workMailClient.send(new RegisterToWorkMailCommand({
                OrganizationId: sanitizedUserName,
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
    sanitizedOrgId = validateId(orgId, 'orgId');
    sanitizedUserName = validateId(userName, 'userName');
    const input = { OrganizationId: sanitizedOrgId };
    const listCommand = new ListUsersCommand(input);
    const users = sendCommand(listCommand);
    return users.Users.find(user => user.Name === sanitizedUserName && user.State !== 'DELETED');
}

function generateSecurePassword() {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let retVal = "";
    const randomBytes = crypto.randomBytes(length);

    for (let i = 0; i < length; i++) {
        retVal += charset[randomBytes[i] % charset.length];
    }

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
    sanitizedOrgId = validateId(orgId, 'orgId');
    sanitizedUserId = validateId(userId, 'userId');

    try {
        const input = {
            OrganizationId: sanitizedOrgId,
            EntityId: sanitizedUserId
        };

        const deregister = new DeregisterFromWorkMailCommand(input);

        sendCommand(deregister);

        const deleteUser = new DeleteUserCommand({
            OrganizationId: sanitizedOrgId,
            UserId: sanitizedUserId
        })
        sendCommand(deleteUser);
    } catch (error) {
        console.log(`Error deleting users: ${error}`);
    }
}

async function deleteOrganization(orgId) {
    sanitizedOrgId = validateId(orgId, 'orgId');
    const input = {
        OrganizationId: sanitizedOrgId
    };
    const delCommand = new DeleteOrganizationCommand(input);
    sendCommand(delCommand);
}
