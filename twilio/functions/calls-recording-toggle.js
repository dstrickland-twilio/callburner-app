/**
 * Start or stop recording for a call
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
    const { callSid, action } = typeof event === 'string' ? JSON.parse(event) : event;

    if (!callSid || !action) {
      response.setStatusCode(400);
      response.setBody(JSON.stringify({ error: 'callSid and action are required' }));
      return callback(null, response);
    }

    const client = context.getTwilioClient();

    if (action === 'start') {
      // Check if there's already an in-progress recording
      const recordings = await client.recordings.list({
        callSid: callSid,
        status: 'in-progress'
      });

      if (recordings.length === 0) {
        // Create new recording
        await client.calls(callSid).recordings.create({
          recordingStatusCallback: context.PUBLIC_BASE_URL
            ? `${context.PUBLIC_BASE_URL}/calls-status`
            : undefined,
          recordingStatusCallbackEvent: ['in-progress', 'completed']
        });
      }
    } else if (action === 'stop') {
      // Find and stop all in-progress recordings
      const recordings = await client.recordings.list({
        callSid: callSid,
        status: 'in-progress'
      });

      for (const recording of recordings) {
        await client.calls(callSid)
          .recordings(recording.sid)
          .update({ status: 'stopped' });
      }
    }

    response.setStatusCode(204);
    response.setBody('');
    callback(null, response);

  } catch (error) {
    console.error('Error toggling recording:', error);
    response.setStatusCode(500);
    response.setBody(JSON.stringify({ error: error.message }));
    callback(null, response);
  }
};
