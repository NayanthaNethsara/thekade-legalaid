import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  META_VERIFY_TOKEN: Joi.string().required(),
  META_APP_SECRET: Joi.string().required(),
  WHATSAPP_PHONE_NUMBER_ID: Joi.string().required(),
  WHATSAPP_ACCESS_TOKEN: Joi.string().required(),
  AZURE_STORAGE_CONNECTION_STRING: Joi.string().required(),
  AZURE_STORAGE_CONTAINER_NAME: Joi.string().required(),
  NATS_URL: Joi.string().required(),
  NATS_STREAM_NAME: Joi.string().default('LEGALAID_EVENTS'),
  NATS_SUBJECT_INCOMING: Joi.string().required(),
  NATS_SUBJECT_INCOMING_FILE: Joi.string().required(),
  NATS_SUBJECT_OUTGOING: Joi.string().required(),
});
