/**
 * Handle AsyncAmd callback results for calls initiated via REST API
 * This is specifically for the AsyncAmd parameter, different from the existing calls-amd.js
 */
exports.handler = async function(context, event, callback) {
  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'text/xml');
  
  try {
    const { CallSid, AnsweredBy, MachineDetectionDuration } = event;
    
    console.log('AsyncAmd callback received:', {
      CallSid,
      AnsweredBy,
      MachineDetectionDuration,
      allParams: event
    });
    
    if (!CallSid || !AnsweredBy) {
      console.warn('Missing required parameters in AMD callback');
      response.setStatusCode(200);
      response.setBody('<Response/>');
      return callback(null, response);
    }
    
    // Map AMD result to user-friendly status
    const amdStatusMap = {
      'human': 'Human',
      'machine_start': 'Machine (Start)',
      'machine_end_beep': 'Machine (Beep)',
      'machine_end_silence': 'Machine (Silence)',
      'machine_end_other': 'Machine (Other)',
      'fax': 'Fax Machine',
      'unknown': 'Unknown'
    };
    
    const amdStatus = amdStatusMap[AnsweredBy] || AnsweredBy;
    
    // Update call in Sync if service is configured
    if (context.TWILIO_SYNC_SERVICE_SID) {
      const client = context.getTwilioClient();
      
      try {
        const document = await client.sync.v1.services(context.TWILIO_SYNC_SERVICE_SID)
          .documents(`call-${CallSid}`)
          .fetch();
        
        const updatedData = {
          ...document.data,
          amdStatus,
          amdResult: AnsweredBy,
          answeredBy: AnsweredBy,
          machineDetectionDuration: parseInt(MachineDetectionDuration) || 0,
          amdTimestamp: new Date().toISOString()
        };
        
        await client.sync.v1.services(context.TWILIO_SYNC_SERVICE_SID)
          .documents(`call-${CallSid}`)
          .update({ data: updatedData });
        
        console.log('AMD Status updated in Sync:', {
          callSid: CallSid,
          amdStatus,
          answeredBy: AnsweredBy
        });
        
      } catch (syncError) {
        console.error('Error updating Sync document:', syncError);
        // Don't fail the callback if Sync update fails
      }
    } else {
      console.warn('TWILIO_SYNC_SERVICE_SID not configured, skipping Sync update');
    }
    
    response.setStatusCode(200);
    response.setBody('<Response/>');
    callback(null, response);
    
  } catch (error) {
    console.error('Error processing AMD callback:', error);
    // Always return 200 to Twilio to acknowledge receipt
    response.setStatusCode(200);
    response.setBody('<Response/>');
    callback(null, response);
  }
};
