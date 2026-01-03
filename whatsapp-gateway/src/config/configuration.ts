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
  kafka: {
    brokerUrl: process.env.KAFKA_BROKER_URL,
    topics: {
      incoming: process.env.KAFKA_TOPIC_INCOMING,
      incomingFile: process.env.KAFKA_TOPIC_INCOMING_FILE,
      outgoing: process.env.KAFKA_TOPIC_OUTGOING,
    },
  },
});
