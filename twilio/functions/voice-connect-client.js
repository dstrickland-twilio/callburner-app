/**
 * TwiML endpoint that connects the call back to the browser client
 * Used when calls are initiated via REST API
 */
exports.handler = function(context, event, callback) {
  const { identity, record } = event;
  const baseUrl = `https://${context.DOMAIN_NAME}`;
  
  // Validate CallSid to prevent XSS
  const callSid = event.CallSid || 'unknown';
  const safeCallSid = String(callSid).replace(/[^A-Za-z0-9]/g, '');
  
  console.log('Connecting to client:', {
    identity,
    record,
    callSid: safeCallSid
  });
  
  const twiml = new Twilio.twiml.VoiceResponse();
  
  // Start transcription - add this manually as TwiML helper doesn't support it yet
  const transcriptionXml = `<Start><Transcription name="Transcription for ${safeCallSid}" track="both_tracks" statusCallbackUrl="${baseUrl}/transcription-realtime" /></Start>`;
  
  // Build Dial options
  const dialOptions = {
    answerOnBridge: true,
    action: `${baseUrl}/voice-continue`,
    method: 'POST'
  };
  
  // Add caller ID if configured
  if (context.TWILIO_CALLER_ID) {
    dialOptions.callerId = context.TWILIO_CALLER_ID;
  }
  
  // Add recording if enabled
  if (record === 'true') {
    dialOptions.record = 'record-from-answer';
    dialOptions.trim = 'trim-silence';
    dialOptions.recordingStatusCallback = `${baseUrl}/calls-status`;
    dialOptions.recordingStatusCallbackEvent = 'in-progress completed';
    dialOptions.recordingStatusCallbackMethod = 'POST';
  }
  
  const dial = twiml.dial(dialOptions);
  dial.client(identity);
  
  // Insert transcription at the beginning
  const twimlStr = twiml.toString();
  const finalTwiml = twimlStr.replace('<Response>', `<Response>${transcriptionXml}`);
  
  console.log('Generated TwiML:', finalTwiml);
  
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'text/xml');
  response.setBody(finalTwiml);
  callback(null, response);
};
