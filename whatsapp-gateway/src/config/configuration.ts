export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  meta: {
    verifyToken: process.env.META_VERIFY_TOKEN,
    appSecret: process.env.META_APP_SECRET,
  },
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  },
  azure: {
    storageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    containerName: process.env.AZURE_STORAGE_CONTAINER_NAME,
  },
  nats: {
    url: process.env.NATS_URL,
    streamName: process.env.NATS_STREAM_NAME || 'LEGALAID_EVENTS',
    subjects: {
      incomingText:
        process.env.NATS_SUBJECT_INCOMING_TEXT ||
        process.env.NATS_SUBJECT_INCOMING ||
        'whatsapp.incoming.text',
      incomingVoice:
        process.env.NATS_SUBJECT_INCOMING_VOICE || 'whatsapp.incoming.voice',
      incomingDocument:
        process.env.NATS_SUBJECT_INCOMING_DOCUMENT ||
        'whatsapp.incoming.document',
      incomingFile: process.env.NATS_SUBJECT_INCOMING_FILE,
      outgoingText:
        process.env.NATS_SUBJECT_OUTGOING_TEXT ||
        process.env.NATS_SUBJECT_OUTGOING ||
        'whatsapp.outgoing.text',
      outgoingMedia:
        process.env.NATS_SUBJECT_OUTGOING_MEDIA || 'whatsapp.outgoing.media',
    },
  },
});
