/**
 * Register a new call in Twilio Sync
 */
exports.handler = async function(context, event, callback) {
  const { TWILIO_SYNC_SERVICE_SID } = context;

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', context.ALLOWED_ORIGIN || '*');
  response.appendHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    response.setStatusCode(200);
    response.setBody('');
    return callback(null, response);
  }

  try {
    const { callSid, to, startedAt } = typeof event === 'string' ? JSON.parse(event) : event;

    if (!callSid || !to) {
      response.setStatusCode(400);
      response.setBody(JSON.stringify({ error: 'callSid and to are required' }));
      return callback(null, response);
    }

    const callData = {
      callSid,
      dialedNumber: to,
      startedAt,
      status: 'in-progress'
    };

    const client = context.getTwilioClient();

    // Store call in Sync Document
    try {
      await client.sync.v1.services(TWILIO_SYNC_SERVICE_SID)
        .documents
        .create({
          uniqueName: `call-${callSid}`,
          data: callData
        });
    } catch (error) {
      if (error.code === 54301) {
        // Document already exists, update it
        await client.sync.v1.services(TWILIO_SYNC_SERVICE_SID)
          .documents(`call-${callSid}`)
          .update({ data: callData });
      } else {
        throw error;
      }
    }

    response.setStatusCode(204);
    response.setBody('');
    callback(null, response);

  } catch (error) {
    console.error('Error registering call:', error);
    response.setStatusCode(500);
    response.setBody(JSON.stringify({ error: error.message }));
    callback(null, response);
  }
};
