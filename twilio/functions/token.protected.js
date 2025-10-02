exports.handler = async function tokenHandler(context, event, callback) {
  const response = new Twilio.Response();
  const allowOrigin = context.ALLOWED_ORIGIN || '*';
  response.appendHeader('Access-Control-Allow-Origin', allowOrigin);
  response.appendHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (event.httpMethod === 'OPTIONS') {
    response.setStatusCode(204);
    callback(null, response);
    return;
  }

  const { TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_TWIML_APP_SID } = context;

  if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET || !TWILIO_TWIML_APP_SID) {
    response.setStatusCode(500);
    response.setBody({ error: 'Missing Twilio credentials in function configuration.' });
    callback(null, response);
    return;
  }

  const AccessToken = Twilio.jwt.AccessToken;
  const VoiceGrant = AccessToken.VoiceGrant;

  const identity = (event.identity && String(event.identity)) || 'callburner-operator';

  const token = new AccessToken(TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, {
    identity,
    ttl: 3600 // Token valid for 1 hour
  });

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: TWILIO_TWIML_APP_SID,
    incomingAllow: true,
    endpointId: `${identity}_${Date.now()}`, // Unique endpoint identifier with timestamp
    forwardedFrom: context.TWILIO_CALLER_ID, // Add caller ID to the grant
    params: {
      // Additional parameters for Voice SDK
      allowIncomingWhileBusy: true,
      maxConnectionsPerEndpoint: 1,
      region: 'gll' // Global region
    }
  });

  token.addGrant(voiceGrant);

  response.setStatusCode(200);
  response.setBody({ token: token.toJwt() });

  callback(null, response);
};
