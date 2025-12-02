/**
 * Initiate outbound calls via Twilio REST API with AMD support
 * This function is designed for Twilio Serverless Functions architecture
 */
exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'application/json');
  response.appendHeader('Access-Control-Allow-Origin', '*');
  response.appendHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
  response.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    response.setStatusCode(204);
    return callback(null, response);
  }

  try {
    const { to, record, amd, identity } = event;
    
    if (!to || !identity) {
      response.setStatusCode(400);
      response.setBody({ error: 'Missing required parameters: to, identity' });
      return callback(null, response);
    }
    
    const client = context.getTwilioClient();
    const baseUrl = `https://${context.DOMAIN_NAME}`;
    
    console.log('Initiating call via REST API:', {
      to,
      from: context.TWILIO_CALLER_ID,
      identity,
      record,
      amd
    });
    
    // Build call parameters
    const voiceUrl = new URL(`${baseUrl}/voice-connect-client`);
    voiceUrl.searchParams.set('identity', identity);
    voiceUrl.searchParams.set('record', record);
    
    const callParams = {
      to: to,
      from: context.TWILIO_CALLER_ID,
      url: voiceUrl.toString(),
      statusCallback: `${baseUrl}/calls-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST'
    };
    
    // Add AMD configuration if enabled
    if (amd === 'true' || amd === true) {
      callParams.machineDetection = 'DetectMessageEnd';
      callParams.asyncAmd = 'true';
      callParams.asyncAmdStatusCallback = `${baseUrl}/calls-amd-status`;
      callParams.asyncAmdStatusCallbackMethod = 'POST';
      callParams.machineDetectionTimeout = 30;
      callParams.machineDetectionSpeechThreshold = 2400;
      callParams.machineDetectionSpeechEndThreshold = 1500;
      
      console.log('AMD enabled with AsyncAmd configuration');
    }
    
    // Create call via REST API
    const call = await client.calls.create(callParams);
    
    console.log('REST API call initiated:', call.sid);
    
    // Register call in Sync if service is configured
    if (context.TWILIO_SYNC_SERVICE_SID) {
      const callData = {
        callSid: call.sid,
        dialedNumber: to,
        startedAt: new Date().toISOString(),
        status: 'initiated',
        direction: 'outbound-api',
        amdEnabled: amd === 'true' || amd === true,
        ...(amd === 'true' || amd === true ? { amdStatus: 'Pending' } : {})
      };
      
      try {
        await client.sync.v1.services(context.TWILIO_SYNC_SERVICE_SID)
          .documents
          .create({
            uniqueName: `call-${call.sid}`,
            data: callData
          });
        console.log('Call registered in Sync:', call.sid);
      } catch (syncError) {
        if (syncError.code === 54301) {
          // Document exists, update it
          await client.sync.v1.services(context.TWILIO_SYNC_SERVICE_SID)
            .documents(`call-${call.sid}`)
            .update({ data: callData });
          console.log('Call updated in Sync:', call.sid);
        } else {
          console.error('Error registering call in Sync:', syncError);
        }
      }
    }
    
    response.setStatusCode(200);
    response.setBody({ callSid: call.sid });
    callback(null, response);
    
  } catch (error) {
    console.error('Error initiating call:', error);
    response.setStatusCode(500);
    response.setBody({ error: error.message });
    callback(null, response);
  }
};
