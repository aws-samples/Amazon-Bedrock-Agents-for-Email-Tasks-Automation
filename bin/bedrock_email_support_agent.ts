#!/usr/bin/env node
import 'source-map-support/register';
import { App, Aspects } from 'aws-cdk-lib';
import { BedrockEmailSupportAgentStack } from '../lib/email_support_agent-stack';
import { stack_name } from '../lib/name_constants';
import { AwsSolutionsChecks } from 'cdk-nag';

const app = new App();
new BedrockEmailSupportAgentStack(app, 'EmailSupportAgent', {
  stackName:stack_name,
  description:'This is a stack to deploy sample code for Generative AI based Automated Email Assistant. mode details are at https://github.com/aws-samples/Amazon-Bedrock-Agents-for-Email-Tasks-Automation'
});

Aspects.of(app).add(new AwsSolutionsChecks());