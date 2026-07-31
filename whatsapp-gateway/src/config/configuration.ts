export default () => ({
  port: parseInt(process.env.PORT || '8080', 10),
  meta: {
    verifyToken: process.env.META_VERIFY_TOKEN,
    appSecret: process.env.META_APP_SECRET,
  },
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    mediaSupported: process.env.WHATSAPP_MEDIA_SUPPORTED === 'true',
    typing: {
      refreshMs: parseInt(
        process.env.WHATSAPP_TYPING_REFRESH_MS || '20000',
        10,
      ),
      maxMs: parseInt(process.env.WHATSAPP_TYPING_MAX_MS || '300000', 10),
    },
  },
  nats: {
    url: process.env.NATS_URL,
    streamName: process.env.NATS_STREAM_NAME || 'KAKILLE_AGENT_EVENTS',
    subjects: {
      incomingText:
        process.env.NATS_SUBJECT_INCOMING_TEXT ||
        process.env.NATS_SUBJECT_INCOMING ||
        'whatsapp.incoming.text',
      incomingImage:
        process.env.NATS_SUBJECT_INCOMING_IMAGE ||
        'whatsapp.incoming.media.image',
      incomingVideo:
        process.env.NATS_SUBJECT_INCOMING_VIDEO ||
        'whatsapp.incoming.media.video',
      incomingAudio:
        process.env.NATS_SUBJECT_INCOMING_AUDIO ||
        'whatsapp.incoming.media.audio',
      incomingDocument:
        process.env.NATS_SUBJECT_INCOMING_DOCUMENT ||
        'whatsapp.incoming.media.document',
      outgoing: process.env.NATS_SUBJECT_OUTGOING || 'whatsapp.outgoing',
    },
  },
});
