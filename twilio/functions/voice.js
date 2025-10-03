exports.handler = function voiceHandler(context, event, callback) {
  const { TWILIO_CALLER_ID } = context;

  // Use the Twilio Functions domain for callbacks
  const baseUrl = `https://${context.DOMAIN_NAME}`;

  const dialOptions = {
    answerOnBridge: true // Enables media streams to be established before call is connected
  };

  if (TWILIO_CALLER_ID) {
    dialOptions.callerId = TWILIO_CALLER_ID;
  }

  if (event.record === 'true') {
    dialOptions.record = 'record-from-answer';
    dialOptions.trim = 'trim-silence';
  }

  const destination = event.To;

  // Build TwiML manually to include transcription
  let twimlStr = '<?xml version="1.0" encoding="UTF-8"?><Response>';

  // Add transcription start
  twimlStr += `<Start><Transcription name="Transcription for ${event.CallSid}" track="both_tracks" statusCallbackUrl="${baseUrl}/transcription-realtime" statusCallbackMethod="POST" /></Start>`;

  // Build dial options as XML attributes
  let dialAttrs = 'answerOnBridge="true"';
  if (TWILIO_CALLER_ID) {
    dialAttrs += ` callerId="${TWILIO_CALLER_ID}"`;
  }
  if (event.record === 'true') {
    dialAttrs += ' record="record-from-answer" trim="trim-silence"';
  }

  // Add callbacks to Twilio Functions endpoints
  dialAttrs += ` recordingStatusCallback="${baseUrl}/calls-status"`;
  dialAttrs += ' recordingStatusCallbackEvent="in-progress completed"';
  dialAttrs += ' recordingStatusCallbackMethod="POST"';
  dialAttrs += ` statusCallback="${baseUrl}/calls-status"`;
  dialAttrs += ' statusCallbackEvent="initiated ringing answered completed"';

  twimlStr += `<Dial ${dialAttrs}>`;

  if (destination && /^\+?[\d*#]+$/.test(destination)) {
    if (!TWILIO_CALLER_ID) {
      twimlStr = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Outbound dialing is not configured. Please set a caller ID number.</Say></Response>';
    } else {
      twimlStr += `<Number>${destination}</Number>`;
    }
  } else if (destination) {
    twimlStr += `<Client>${destination}</Client>`;
  } else {
    twimlStr = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>No destination number provided.</Say></Response>';
  }

  if (destination && (TWILIO_CALLER_ID || !/^\+?[\d*#]+$/.test(destination))) {
    twimlStr += '</Dial>';
  }
  twimlStr += '</Response>';

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'text/xml');
  response.setBody(twimlStr);
  callback(null, response);
};
