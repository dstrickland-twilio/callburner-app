import { useCallback, useEffect, useRef, useState } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { requestAccessToken, initiateCall } from '../services/api';
import type { CallPhase } from '../types';

interface UseTwilioDeviceOptions {
  identity: string;
  onIncomingCall?: (connection: Call) => void;
  onCallEnded?: (connection: Call) => void;
}

interface ConnectOptions {
  to: string;
  record: boolean;
  amd?: boolean;
}

export const useTwilioDevice = ({ identity, onIncomingCall, onCallEnded }: UseTwilioDeviceOptions) => {
  const deviceRef = useRef<Device | null>(null);
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [activeConnection, setActiveConnection] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingConnectionRef = useRef<{ callSid: string; resolve: (call: Call) => void; reject: (err: Error) => void } | null>(null);

  const createOrUpdateDevice = useCallback(async () => {
    try {
      setPhase('idle');
      setError(null);

      const token = await requestAccessToken(identity);

      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }

      const device = new Device(token, {
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        closeProtection: true
      });

      device.on('registered', () => setPhase('ready'));
      device.on('error', (deviceError) => {
        setPhase('error');
        setError(deviceError.message);
      });
      device.on('incoming', (connection) => {
        console.log('Incoming connection received:', connection.parameters);
        
        // Check if this is the incoming connection for a pending REST API call
        if (pendingConnectionRef.current) {
          console.log('Resolving pending REST API call with incoming connection');
          pendingConnectionRef.current.resolve(connection);
          pendingConnectionRef.current = null;
        }
        
        onIncomingCall?.(connection);
      });
      device.on('unregistered', () => setPhase('idle'));

      await device.register();
      deviceRef.current = device;
    } catch (err) {
      console.error('Unable to initialize Twilio Device', err);
      setPhase('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [identity, onIncomingCall]);

  useEffect(() => {
    createOrUpdateDevice();

    return () => {
      deviceRef.current?.destroy();
      deviceRef.current = null;
    };
  }, [createOrUpdateDevice]);

  const connect = useCallback(
    async ({ to, record, amd }: ConnectOptions) => {
      if (!deviceRef.current) {
        await createOrUpdateDevice();
      }

      const device = deviceRef.current;
      if (!device) {
        throw new Error('Device is not ready');
      }

      setPhase('dialing');

      // Use REST API approach for calls with AMD enabled OR for all calls (to maintain consistency)
      // This enables proper AsyncAmd support
      try {
        console.log('Initiating call via REST API with AMD:', amd);
        
        // Initiate call via REST API
        const callSid = await initiateCall({
          to,
          record,
          amd: amd ?? false,
          identity
        });

        console.log('REST API call initiated, CallSid:', callSid);

        // Wait for the incoming connection to be established
        const connection = await new Promise<Call>((resolve, reject) => {
          pendingConnectionRef.current = { callSid, resolve, reject };

          // Set a timeout in case the connection doesn't come through
          setTimeout(() => {
            if (pendingConnectionRef.current?.callSid === callSid) {
              pendingConnectionRef.current = null;
              reject(new Error('Timeout waiting for incoming connection'));
            }
          }, 30000); // 30 second timeout
        });

        console.log('Incoming connection received for REST API call');

        // Set up connection event handlers
        connection.on('accept', () => {
          setPhase(record ? 'recording' : 'in-call');
          setActiveConnection(connection);
        });

        connection.on('disconnect', () => {
          setPhase('ended');
          setActiveConnection(null);
          onCallEnded?.(connection);
        });

        connection.on('cancel', () => {
          setPhase('idle');
          setActiveConnection(null);
        });

        connection.on('error', (connectionError) => {
          setPhase('error');
          setError(connectionError.message);
        });

        return connection;
      } catch (err) {
        console.error('Failed to initiate call via REST API:', err);
        setPhase('error');
        setError(err instanceof Error ? err.message : 'Failed to initiate call');
        throw err;
      }
    },
    [createOrUpdateDevice, onCallEnded, identity]
  );

  const disconnect = useCallback(() => {
    activeConnection?.disconnect();
  }, [activeConnection]);

  return {
    connect,
    disconnect,
    phase,
    activeConnection,
    error,
    isRecording: phase === 'recording'
  };
};
