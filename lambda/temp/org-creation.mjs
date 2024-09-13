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
    try {
        let organizationId;
        const existingOrg = await findExistingOrganization(orgName);

        if (existingOrg) {
            console.log(`Organization with alias '${orgName}' already exists.`);
            organizationId = existingOrg.OrganizationId;
        } else {
            const createOrgResponse = await workMailClient.send(new CreateOrganizationCommand({
                Alias: orgName
            }));
            console.log(`Organization created with ID: ${createOrgResponse.OrganizationId}`);
            await isOrganizationActive(createOrgResponse.OrganizationId, orgName);
            organizationId = createOrgResponse.OrganizationId;
        }

        // Proceed to check or create user irrespective of whether the organization was newly created or already existed
        await manageUser(organizationId, orgName);
        return {
            PhysicalResourceId: resourceId,
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
    const orgInfo = await findExistingOrganization(orgName);
    if (!orgInfo) {
        console.log(`No organization found with the alias: ${orgName}. Exiting without action.`);
        return { 
            PhysicalResourceId: resourceId,
            Message: `No organization found with the alias: ${orgName}. No action taken.` 
        };
    }
    const organizationId = orgInfo.OrganizationId;
    console.log(`Initiating deletion for organization ID: ${organizationId} and user: ${userName}`);
    try {
        const userAvail = await workMailClient.send(new ListUsersCommand({
            OrganizationId: organizationId
        }));
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

async function manageUser(organizationId, orgName) {
    const existingUser = await findExistingUser(organizationId, userName);
    if (existingUser) {
        console.log(`User 'support' already exists in organization.`);
        return { UserId: existingUser.Id, Message: "User already exists." };
    } else {
        return await createUser(organizationId, orgName);
    }
}

async function findExistingOrganization(orgAlias) {
    const orgs = await workMailClient.send(new ListOrganizationsCommand({}));
    return orgs.OrganizationSummaries.find(org => org.Alias.toLowerCase() === orgAlias.toLowerCase() && org.State === 'Active');
}

async function isOrganizationActive(organizationId, orgName) {
    while (true) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds delay
        const orgDesc = await workMailClient.send(new DescribeOrganizationCommand({
            OrganizationId: organizationId
        }));
        if (orgDesc.State === 'Active') {
            console.log(`Organization is active: ${orgDesc.State}`);
            break;
        }
        console.log(`Waiting for organization to become active. Current state: ${orgDesc.State}`);
    }
}

async function createUser(organizationId, orgName) {
    const userName = "support";
    const password = generateSecurePassword();
    try {
        const userResponse = await workMailClient.send(new CreateUserCommand({
            OrganizationId: organizationId,
            Name: userName,
            DisplayName: userName,
            Password: password,
        }));
        console.log(`User ${userName} created with ID: ${userResponse.UserId}`);
        await secretsManagerClient.send(new PutSecretValueCommand({
            SecretId: process.env.SECRET_ARN,
            SecretString: JSON.stringify({ username: userName, password: password })
        }));
        console.log(`Credentials stored in Secrets Manager under ARN: ${process.env.SECRET_ARN}`);
        try {
            await workMailClient.send(new RegisterToWorkMailCommand({
                OrganizationId: organizationId,
                EntityId: userResponse.UserId,
                Email: `${userName}@${orgName}.awsapps.com`.toLowerCase()
            }));
            console.log(`User ${userName} registered to WorkMail with email: ${userName}@${orgName}.awsapps.com`);

        } catch (error) {
            console.log(`Unable to register user. User must be manually enabled.`);
        }

        return { UserId: userResponse.UserId };
    } catch (error) {
        console.error(`Error creating user or storing credentials: ${error}`);
        throw error;
    }
}

async function findExistingUser(organizationId, userName) {
    const users = await workMailClient.send(new ListUsersCommand({
        OrganizationId: organizationId
    }));
    console.log(users);
    return users.Users.find(user => user.Name === userName && user.State !== 'DELETED');
}

function generateSecurePassword() {
    const length = 16;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
    let retVal = "";
    for (let i = 0, n = charset.length; i < length; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    return retVal;
}

async function deregisterAndDeleteUser(organizationId, userId) {
    try {
        await workMailClient.send(new DeregisterFromWorkMailCommand({
            OrganizationId: organizationId,
            EntityId: userId
        }));
        await workMailClient.send(new DeleteUserCommand({
            OrganizationId: organizationId,
            UserId: userId
        }));
    } catch (error) {
        console.log(`Error deleting users: ${error}`);
    }

}

async function deleteOrganization(organizationId) {
    await workMailClient.send(new DeleteOrganizationCommand({
        OrganizationId: organizationId,
        DeleteDirectory: true
    }));
}
