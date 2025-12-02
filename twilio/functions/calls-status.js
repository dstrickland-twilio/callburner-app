/**
 * Handle call status updates from Twilio and update Sync
 */
exports.handler = async function(context, event, callback) {
  const { TWILIO_SYNC_SERVICE_SID } = context;

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'text/plain');

  try {
    const { CallSid, CallStatus, RecordingUrl, RecordingSid, TranscriptionUrl, Timestamp, RecordingStatus } = event;

    if (!CallSid) {
      response.setStatusCode(400);
      response.setBody('Missing CallSid');
      return callback(null, response);
    }

    const client = context.getTwilioClient();

    // Get existing call data
    let callData;
    try {
      const doc = await client.sync.v1.services(TWILIO_SYNC_SERVICE_SID)
        .documents(`call-${CallSid}`)
        .fetch();
      callData = doc.data;
    } catch (error) {
      // Document doesn't exist, create minimal data
      callData = { callSid: CallSid };
    }

    // Update call data
    if (CallStatus) {
      callData.status = CallStatus;
    }

    if (CallStatus === 'completed') {
      callData.endedAt = new Date().toISOString();
    }

    // Track AMD status progression
    if (callData.amdEnabled) {
      if (CallStatus === 'initiated') {
        callData.amdStatus = 'Pending';
      } else if (CallStatus === 'ringing' || CallStatus === 'in-progress') {
        // Only update to Detecting if we haven't received AMD result yet
        if (!callData.answeredBy && !callData.amdResult) {
          callData.amdStatus = 'Detecting';
        }
      }
    }

    if (RecordingUrl) {
      callData.recordingUrl = RecordingUrl;
    }

    if (RecordingSid) {
      callData.recordingSid = RecordingSid;
    }

    if (TranscriptionUrl) {
      callData.transcriptUrl = TranscriptionUrl;
    }

    if (Timestamp) {
      callData.statusUpdatedAt = Timestamp;
    }

    // Update Sync document
    try {
      await client.sync.v1.services(TWILIO_SYNC_SERVICE_SID)
        .documents(`call-${CallSid}`)
        .update({ data: callData });
    } catch (error) {
      if (error.code === 20404) {
        // Document doesn't exist, create it
        await client.sync.v1.services(TWILIO_SYNC_SERVICE_SID)
          .documents
          .create({
            uniqueName: `call-${CallSid}`,
            data: callData
          });
      } else {
        throw error;
      }
    }

    console.log(`Updated call ${CallSid} status:`, callData);

    response.setStatusCode(200);
    response.setBody('ok');
    callback(null, response);

  } catch (error) {
    console.error('Error updating call status:', error);
    response.setStatusCode(500);
    response.setBody(error.message);
    callback(null, response);
  }
};
