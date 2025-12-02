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
  
  // XML escape function
  const escapeXml = (str) => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  
  console.log('Connecting to client:', {
    identity,
    record,
    callSid: safeCallSid
  });
  
  const twiml = new Twilio.twiml.VoiceResponse();
  
  // Start transcription - add this manually as TwiML helper doesn't support it yet
  const transcriptionName = escapeXml(`Transcription for ${safeCallSid}`);
  const transcriptionCallback = escapeXml(`${baseUrl}/transcription-realtime`);
  const transcriptionXml = `<Start><Transcription name="${transcriptionName}" track="both_tracks" statusCallbackUrl="${transcriptionCallback}" /></Start>`;
  
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
  
  // Insert transcription at the beginning using safer replacement
  const twimlStr = twiml.toString();
  // Only replace the first occurrence of <Response> tag
  const responseTagIndex = twimlStr.indexOf('<Response>');
  let finalTwiml = twimlStr;
  if (responseTagIndex !== -1) {
    finalTwiml = twimlStr.slice(0, responseTagIndex + 10) + transcriptionXml + twimlStr.slice(responseTagIndex + 10);
  }
  
  console.log('Generated TwiML:', finalTwiml);
  
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'text/xml');
  response.setBody(finalTwiml);
  callback(null, response);
};
