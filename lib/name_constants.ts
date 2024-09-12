export const stack_name:string='gen-ai-email-support-agent-sample';
export const stack_name_Abbreviation:string='gaesas-stk';
export const lambda_layer_version_name:string=`${stack_name_Abbreviation}-nodejs-layer`;

export const guardrail_name:string=`${stack_name_Abbreviation}-guardrail`;
export const agent_name:string=`${stack_name_Abbreviation}-agent`;
export const agent_booking_action_group_name:string=`${stack_name_Abbreviation}-table-booking-action-group`;

export const knowledge_base_name:string=`${stack_name_Abbreviation}-knowledge-base`;
export const knowledge_base_datasource_name:string=`${stack_name_Abbreviation}-knowledge-base-data-source`;
export const knowledge_base_role_name:string=`${stack_name_Abbreviation}-knowledge-base-execution-role`;


export const oss_collection_name:string=`${stack_name_Abbreviation}-kb-oss-collection`;
export const oss_collection_metadata_field_name:string='AMAZON_BEDROCK_METADATA';
export const oss_collection_text_field_name:string='AMAZON_BEDROCK_TEXT_CHUNK';
export const oss_collection_vector_field_name:string='AMAZON_BEDROCK_DEFAULT_VECTOR';
export const oss_collection_vector_index_name:string=`${stack_name_Abbreviation}-kb-oss-index`;

export const workmail_org_name:string=`gaesas-stk-org`;
export const workmail_secret_name:string=`${stack_name_Abbreviation}-workmail-user-secrets`;
export const email_processor_lambda_name:string=`${stack_name_Abbreviation}-email-processor-lambda`;

