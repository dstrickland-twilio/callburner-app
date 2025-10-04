/**
 * Generate a Twilio Sync access token for the client
 */
exports.handler = function(context, event, callback) {
  const { TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_SYNC_SERVICE_SID } = context;

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', context.ALLOWED_ORIGIN || '*');
  response.appendHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    response.setStatusCode(200);
    response.setBody('');
    return callback(null, response);
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET || !TWILIO_SYNC_SERVICE_SID) {
    response.setStatusCode(500);
    response.setBody(JSON.stringify({ error: 'Missing Twilio Sync configuration' }));
    return callback(null, response);
  }

  try {
    const identity = event.identity || 'callburner-user';

    const { AccessToken } = Twilio.jwt;
    const { SyncGrant } = AccessToken;

    const token = new AccessToken(
      TWILIO_ACCOUNT_SID,
      TWILIO_API_KEY,
      TWILIO_API_SECRET,
      { identity, ttl: 3600 }
    );

    const syncGrant = new SyncGrant({
      serviceSid: TWILIO_SYNC_SERVICE_SID
    });

    token.addGrant(syncGrant);

    response.setBody({ token: token.toJwt() });
    callback(null, response);

  } catch (error) {
    console.error('Error generating Sync token:', error);
    response.setStatusCode(500);
    response.setBody(JSON.stringify({ error: error.message }));
    callback(null, response);
  }
};
