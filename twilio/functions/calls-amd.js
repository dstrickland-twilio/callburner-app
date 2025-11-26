/**
 * Handle Answering Machine Detection (AMD) callbacks from Twilio
 */
exports.handler = async function(context, event, callback) {
  const { TWILIO_SYNC_SERVICE_SID } = context;

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'text/plain');

  console.log('AMD callback received:', JSON.stringify(event, null, 2));

  try {
    const {
      CallSid,
      AnsweredBy,
      MachineDetectionDuration,
      Confidence
    } = event;

    console.log('AMD parameters:', { CallSid, AnsweredBy, MachineDetectionDuration, Confidence });

    if (!CallSid) {
      console.error('AMD callback missing CallSid');
      response.setStatusCode(400);
      response.setBody('Missing CallSid');
      return callback(null, response);
    }

    const client = context.getTwilioClient();

    // Get existing call data from Sync
    let callData;
    try {
      const doc = await client.sync.v1.services(TWILIO_SYNC_SERVICE_SID)
        .documents(`call-${CallSid}`)
        .fetch();
      callData = doc.data;
    } catch (error) {
      // Document doesn't exist yet, create minimal data
      callData = { callSid: CallSid };
    }

    // Update AMD data
    callData.amdEnabled = true;
    callData.amdResult = AnsweredBy; // "human", "machine_start", "machine_end_beep", "machine_end_silence", "machine_end_other", "fax", "unknown"

    const durationNumber = typeof MachineDetectionDuration === 'string'
      ? Number(MachineDetectionDuration)
      : MachineDetectionDuration;
    callData.amdDuration = Number.isFinite(durationNumber) ? durationNumber : MachineDetectionDuration;

    const confidenceNumber = typeof Confidence === 'string'
      ? Number(Confidence)
      : Confidence;
    callData.amdConfidence = Number.isFinite(confidenceNumber) ? confidenceNumber : Confidence;

    callData.amdTimestamp = new Date().toISOString();

    // Simplify the result for display
    if (AnsweredBy === 'human') {
      callData.amdStatus = 'Human';
    } else if (AnsweredBy && AnsweredBy.startsWith('machine_end')) {
      callData.amdStatus = 'Voicemail';
    } else if (AnsweredBy === 'fax') {
      callData.amdStatus = 'Fax';
    } else {
      callData.amdStatus = 'Unknown';
    }

    // Update or create Sync document
    try {
      console.log(`Updating Sync document call-${CallSid} with AMD data:`, callData);
      await client.sync.v1.services(TWILIO_SYNC_SERVICE_SID)
        .documents(`call-${CallSid}`)
        .update({ data: callData });
      console.log(`Successfully updated Sync document call-${CallSid}`);
    } catch (error) {
      if (error.code === 20404) {
        // Document doesn't exist, create it
        console.log(`Sync document call-${CallSid} not found, creating new one`);
        await client.sync.v1.services(TWILIO_SYNC_SERVICE_SID)
          .documents
          .create({
            uniqueName: `call-${CallSid}`,
            data: callData
          });
        console.log(`Successfully created Sync document call-${CallSid}`);
      } else {
        console.error(`Error updating Sync document: ${error.message}`);
        throw error;
      }
    }

    console.log(`AMD result for call ${CallSid}:`, {
      answeredBy: AnsweredBy,
      status: callData.amdStatus,
      duration: MachineDetectionDuration,
      confidence: Confidence
    });

    response.setStatusCode(200);
    response.setBody('ok');
    callback(null, response);

  } catch (error) {
    console.error('Error processing AMD callback:', error);
    response.setStatusCode(500);
    response.setBody(error.message);
    callback(null, response);
  }
};
