import { useCallback, useEffect, useRef, useState } from 'react';
import { Client as SyncClient } from 'twilio-sync';
import type { TranscriptionEvent } from '../types';

const TWILIO_FUNCTIONS_URL = import.meta.env.VITE_TWILIO_FUNCTIONS_URL ||
  'https://callburner-functions-2333-dev.twil.io';

/**
 * Hook to connect to Twilio Sync for real-time transcriptions
 */
export const useTwilioSync = (callSid?: string) => {
  const syncClientRef = useRef<SyncClient | null>(null);
  const [events, setEvents] = useState<TranscriptionEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const reset = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    if (!callSid) {
      syncClientRef.current?.shutdown();
      syncClientRef.current = null;
      setIsConnected(false);
      reset();
      return;
    }

    let syncClient: SyncClient;
    let isCleanedUp = false;

    const initSync = async () => {
      try {
        // Request a Sync token
        const response = await fetch(`${TWILIO_FUNCTIONS_URL}/sync-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identity: `callburner-${Date.now()}` })
        });

        if (!response.ok) {
          throw new Error('Failed to get Sync token');
        }

        const { token } = await response.json();

        if (isCleanedUp) return;

        // Initialize Sync client
        syncClient = new SyncClient(token);
        syncClientRef.current = syncClient;

        syncClient.on('connectionStateChanged', (state) => {
          console.log('Sync connection state:', state);
          setIsConnected(state === 'connected');
        });

        // Subscribe to the transcription list for this call
        const listName = `transcriptions-${callSid}`;

        try {
          const list = await syncClient.list(listName);

          // Get existing items
          const existingItems = await list.getItems();
          const existingEvents = existingItems.items.map(item => item.data as TranscriptionEvent);
          if (!isCleanedUp) {
            setEvents(existingEvents);
          }

          // Listen for new items
          list.on('itemAdded', (args) => {
            const transcriptionEvent = args.item.data as TranscriptionEvent;
            console.log('New transcription:', transcriptionEvent);

            if (!isCleanedUp) {
              setEvents((prev) => {
                // Check if we already have this chunk
                const existingIndex = prev.findIndex(
                  (item) => item.chunkId === transcriptionEvent.chunkId
                );

                if (existingIndex >= 0) {
                  // Update existing
                  const next = [...prev];
                  next[existingIndex] = transcriptionEvent;
                  return next;
                }

                // Add new
                return [...prev, transcriptionEvent];
              });
            }
          });

          list.on('itemUpdated', (args) => {
            const transcriptionEvent = args.item.data as TranscriptionEvent;
            console.log('Updated transcription:', transcriptionEvent);

            if (!isCleanedUp) {
              setEvents((prev) => {
                const next = [...prev];
                const existingIndex = next.findIndex(
                  (item) => item.chunkId === transcriptionEvent.chunkId
                );

                if (existingIndex >= 0) {
                  next[existingIndex] = transcriptionEvent;
                  return next;
                }

                return [...prev, transcriptionEvent];
              });
            }
          });

        } catch (error: any) {
          // List might not exist yet, that's okay
          console.log('Transcription list not yet created:', error.message);

          // Subscribe to list creation
          syncClient.on('listAdded', async (list) => {
            if (list.uniqueName === listName) {
              console.log('Transcription list created');
              // Re-run init to subscribe
              if (!isCleanedUp) {
                initSync();
              }
            }
          });
        }

      } catch (error) {
        console.error('Error initializing Sync:', error);
        setIsConnected(false);
      }
    };

    initSync();

    return () => {
      isCleanedUp = true;
      syncClient?.shutdown();
      syncClientRef.current = null;
      setIsConnected(false);
    };
  }, [callSid, reset]);

  return {
    events,
    reset,
    isConnected
  };
};
