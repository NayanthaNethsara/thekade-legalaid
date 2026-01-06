import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  META_VERIFY_TOKEN: Joi.string().required(),
  META_APP_SECRET: Joi.string().required(),
  WHATSAPP_PHONE_NUMBER_ID: Joi.string().required(),
  WHATSAPP_ACCESS_TOKEN: Joi.string().required(),
  AZURE_STORAGE_CONNECTION_STRING: Joi.string().optional(),
  AZURE_STORAGE_CONTAINER_NAME: Joi.string().optional(),
  KAFKA_BROKER_URL: Joi.string().required(),
  KAFKA_TOPIC_INCOMING: Joi.string().required(),
  KAFKA_TOPIC_INCOMING_FILE: Joi.string().required(),
  KAFKA_TOPIC_OUTGOING: Joi.string().required(),
});
