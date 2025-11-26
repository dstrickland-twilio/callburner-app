exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'text/plain');

  const transcriptionEvent = event.TranscriptionEvent;
  const callSid = event.CallSid;

  console.log(`Transcription event: ${transcriptionEvent} for call ${callSid}`);

  // Handle different transcription events
  switch (transcriptionEvent) {
    case 'transcription-started':
      console.log('Transcription started for call', callSid);
      response.setBody('ok');
      break;

    case 'transcription-stopped':
      console.log('Transcription stopped for call', callSid);
      response.setBody('ok');
      break;

    case 'transcription-content':
      // Get transcription data
      const transcriptionText = event.TranscriptionText;
      const track = event.Track; // 'inbound_track', 'outbound_track', or 'both_tracks'
      const sequenceId = event.SequenceId;

      if (!transcriptionText) {
        console.log('No transcription text in content event');
        response.setBody('ok');
        break;
      }

      console.log('Received transcription:', {
        callSid,
        track,
        sequenceId,
        text: transcriptionText
      });

      // Here you would normally broadcast via WebSocket to connected clients
      // For now, we just log it
      console.log(`[${callSid}] [${track}] ${transcriptionText}`);
      response.setBody('ok');
      break;

    default:
      console.log(`Unknown transcription event: ${transcriptionEvent}`);
      response.setBody('ok');
  }

  callback(null, response);
};
