exports.handler = function voiceHandler(context, event, callback) {
  const { TWILIO_CALLER_ID, PUBLIC_BASE_URL } = context;
  const twiml = new Twilio.twiml.VoiceResponse();

  const dialOptions = {
    answerOnBridge: true // Enables media streams to be established before call is connected
  };

  if (TWILIO_CALLER_ID) {
    dialOptions.callerId = TWILIO_CALLER_ID;
  }

  if (event.record === 'true') {
    dialOptions.record = 'record-from-answer';
    dialOptions.recordingStatusCallback = `${PUBLIC_BASE_URL}/api/calls/status`;
    dialOptions.recordingStatusCallbackEvent = ['in-progress', 'completed'];
    dialOptions.recordingStatusCallbackMethod = 'POST';
    dialOptions.trim = 'trim-silence';
  }

  // Add recording status callback regardless of record parameter
  if (PUBLIC_BASE_URL) {
    dialOptions.recordingStatusCallback = `${PUBLIC_BASE_URL}/api/calls/status`;
    dialOptions.recordingStatusCallbackEvent = ['in-progress', 'completed'];
  }

  if (PUBLIC_BASE_URL) {
    dialOptions.statusCallback = `${PUBLIC_BASE_URL}/api/calls/status`;
    dialOptions.statusCallbackEvent = ['initiated', 'ringing', 'answered', 'completed'];
  }

  const destination = event.To;

  const dial = twiml.dial(dialOptions);
  if (destination && /^\+?[\d*#]+$/.test(destination)) {
    if (!TWILIO_CALLER_ID) {
      twiml.say('Outbound dialing is not configured. Please set a caller ID number.');
    } else {
      dial.number(destination);
    }
  } else if (destination) {
    dial.client(destination);
  } else {
    twiml.say('No destination number provided.');
  }

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'text/xml');
  response.setBody(twiml.toString());
  callback(null, response);
};
