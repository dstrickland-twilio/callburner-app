/**
 * Hangup a call via Twilio API
 */
exports.handler = async function(context, event, callback) {
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
    const callSid = event.callSid;

    if (!callSid) {
      response.setStatusCode(400);
      response.setBody(JSON.stringify({ error: 'callSid is required' }));
      return callback(null, response);
    }

    const client = context.getTwilioClient();
    await client.calls(callSid).update({ status: 'completed' });

    response.setStatusCode(204);
    response.setBody('');
    callback(null, response);

  } catch (error) {
    console.error('Error hanging up call:', error);
    response.setStatusCode(500);
    response.setBody(JSON.stringify({ error: error.message }));
    callback(null, response);
  }
};
