/**
 * Continue handler for after dial completes
 * Called after the <Dial> verb completes
 */
exports.handler = function(context, event, callback) {
  console.log('Voice continue webhook received:', {
    CallSid: event.CallSid,
    DialCallStatus: event.DialCallStatus
  });
  
  const twiml = new Twilio.twiml.VoiceResponse();
  
  // Just hangup after the dial completes
  twiml.hangup();
  
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'text/xml');
  response.setBody(twiml.toString());
  callback(null, response);
};
