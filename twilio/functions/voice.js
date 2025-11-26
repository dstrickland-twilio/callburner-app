exports.handler = function voiceHandler(context, event, callback) {
  const { TWILIO_CALLER_ID } = context;
  const baseUrl = `https://${context.DOMAIN_NAME}`;
  const destination = event.To;

  console.log('Voice webhook called with params:', {
    CallSid: event.CallSid,
    To: event.To,
    amd: event.amd,
    record: event.record,
    amdType: typeof event.amd,
    amdCheck: event.amd === 'true',
    allParams: event
  });

  // Use Twilio TwiML library for proper XML generation
  const twiml = new Twilio.twiml.VoiceResponse();

  // Add transcription start manually (TwiML helper doesn't support Transcription tag yet)
  // We need to add this FIRST, before the Dial
  const transcriptionXml = `<Start><Transcription name="Transcription for ${event.CallSid}" track="both_tracks" statusCallbackUrl="${baseUrl}/transcription-realtime" /></Start>`;

  // Build Dial options - ONLY recording-related and answerOnBridge attributes are supported on <Dial>
  // Call status tracking is handled via the API when creating the call, not in TwiML
  const dialOptions = {
    answerOnBridge: true
  };

  if (TWILIO_CALLER_ID) {
    dialOptions.callerId = TWILIO_CALLER_ID;
  }

  if (event.record === 'true') {
    dialOptions.record = 'record-from-answer';
    dialOptions.trim = 'trim-silence';
    dialOptions.recordingStatusCallback = `${baseUrl}/calls-status`;
    dialOptions.recordingStatusCallbackEvent = 'in-progress completed';
    dialOptions.recordingStatusCallbackMethod = 'POST';
  }

  // AMD is configured at the API level when creating the call, not in TwiML
  if (event.amd === 'true') {
    console.log('AMD enabled for call', event.CallSid, '- configured via API parameters');
  }

  const dial = twiml.dial(dialOptions);

  // Add destination
  if (destination && /^\+?[\d*#]+$/.test(destination)) {
    if (!TWILIO_CALLER_ID) {
      twiml.say('Outbound dialing is not configured. Please set a caller ID number.');
    } else {
      // Configure AMD on the Number element
      const numberOptions = {};
      
      if (event.amd === 'true') {
        const amdCallbackUrl = `${baseUrl}/calls-amd`;
        console.log('Configuring AMD on <Number> for call', event.CallSid);
        console.log('AMD callback URL:', amdCallbackUrl);
        
        numberOptions.machineDetection = 'DetectMessageEnd';
        numberOptions.amdStatusCallback = amdCallbackUrl;
        numberOptions.amdStatusCallbackMethod = 'POST';
        numberOptions.machineDetectionTimeout = 30;
        numberOptions.machineDetectionSpeechThreshold = 2400;
        numberOptions.machineDetectionSpeechEndThreshold = 1500;
        
        console.log('Number AMD options:', JSON.stringify(numberOptions, null, 2));
      }
      
      dial.number(numberOptions, destination);
      
      // Log the TwiML immediately after adding the number
      const twimlAfterNumber = twiml.toString();
      console.log('TwiML after adding Number:', twimlAfterNumber);
    }
  } else if (destination) {
    dial.client(destination);
  } else {
    twiml.say('No destination number provided.');
  }

  // Get the TwiML string and insert transcription at the beginning
  const twimlStr = twiml.toString();
  const finalTwiml = twimlStr.replace('<Response>', `<Response>${transcriptionXml}`);
  
  console.log('Final TwiML with transcription:', finalTwiml);

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'text/xml');
  response.setBody(finalTwiml);
  callback(null, response);
};
