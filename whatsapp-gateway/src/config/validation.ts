import * as Joi from 'joi';

export const validationSchema = Joi.object({
  PORT: Joi.number().default(3000),
  META_VERIFY_TOKEN: Joi.string().required(),
  META_APP_SECRET: Joi.string().required(),
  WHATSAPP_PHONE_NUMBER_ID: Joi.string().required(),
  WHATSAPP_ACCESS_TOKEN: Joi.string().required(),
  NATS_URL: Joi.string().required(),
  NATS_STREAM_NAME: Joi.string().default('LEGALAID_EVENTS'),
  NATS_SUBJECT_INCOMING: Joi.string().optional(),
  NATS_SUBJECT_INCOMING_TEXT: Joi.string().default('whatsapp.incoming.text'),
  NATS_SUBJECT_INCOMING_IMAGE: Joi.string().default(
    'whatsapp.incoming.media.image',
  ),
  NATS_SUBJECT_INCOMING_VIDEO: Joi.string().default(
    'whatsapp.incoming.media.video',
  ),
  NATS_SUBJECT_INCOMING_AUDIO: Joi.string().default(
    'whatsapp.incoming.media.audio',
  ),
  NATS_SUBJECT_INCOMING_DOCUMENT: Joi.string().default(
    'whatsapp.incoming.media.document',
  ),
  NATS_SUBJECT_OUTGOING: Joi.string().default('whatsapp.outgoing'),
});
