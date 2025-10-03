/**
 * Webhook handler for real-time transcription events from Twilio
 * Writes transcription events to Twilio Sync for real-time broadcast to clients
 */
exports.handler = async function(context, event, callback) {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SYNC_SERVICE_SID } = context;

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'text/plain');

  try {
    // Parse the incoming transcription event
    const eventType = event.EventType || event.eventType;
    const transcriptionPayload = typeof event.Transcription === 'string'
      ? JSON.parse(event.Transcription)
      : event.Transcription;

    const segmentPayload = event.segment || event.Segment || transcriptionPayload?.segment;
    const callSid = event.CallSid || event.callSid || transcriptionPayload?.callSid || segmentPayload?.callSid;

    const text = segmentPayload?.text ||
                 segmentPayload?.transcript ||
                 segmentPayload?.alternatives?.[0]?.transcript ||
                 event.TranscriptionText ||
                 event.text;

    if (!callSid || !text) {
      console.log('Invalid transcription event - missing callSid or text');
      response.setStatusCode(202);
      response.setBody('ignored');
      return callback(null, response);
    }

    const chunkId = segmentPayload?.sid ||
                    event.SegmentSid ||
                    event.TranscriptionSid ||
                    `twilio-${Date.now()}`;

    const status = segmentPayload?.status || event.SegmentStatus || event.status;
    const isFinal = segmentPayload?.isFinal ||
                    event.IsFinal ||
                    (status && ['final', 'completed'].includes(status.toLowerCase())) ||
                    (eventType && eventType.toLowerCase().includes('completed'));

    const timestamp = Date.now();

    // Create transcription event object
    const transcriptionEvent = {
      chunkId,
      text,
      isFinal: Boolean(isFinal),
      timestamp,
      source: 'twilio'
    };

    console.log(`Transcription for call ${callSid}:`, transcriptionEvent);

    // Write to Twilio Sync List
    const client = context.getTwilioClient();
    const syncListName = `transcriptions-${callSid}`;

    try {
      // Try to add to existing list
      await client.sync.v1.services(TWILIO_SYNC_SERVICE_SID)
        .syncLists(syncListName)
        .syncListItems
        .create({
          data: transcriptionEvent
        });
    } catch (error) {
      if (error.code === 20404) {
        // List doesn't exist, create it first
        await client.sync.v1.services(TWILIO_SYNC_SERVICE_SID)
          .syncLists
          .create({ uniqueName: syncListName });

        // Now add the item
        await client.sync.v1.services(TWILIO_SYNC_SERVICE_SID)
          .syncLists(syncListName)
          .syncListItems
          .create({
            data: transcriptionEvent
          });
      } else {
        throw error;
      }
    }

    response.setStatusCode(204);
    response.setBody('');
    callback(null, response);

  } catch (error) {
    console.error('Error processing transcription:', error);
    response.setStatusCode(500);
    response.setBody(JSON.stringify({ error: error.message }));
    callback(null, response);
  }
};
