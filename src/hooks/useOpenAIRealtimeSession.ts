import { useCallback, useEffect, useRef, useState } from 'react';
import { getApiUrl } from '../lib/config';
import { composeLiveSystemInstruction } from '../lib/liveSystemInstruction';
import { generateTurnId, logBridge } from '../lib/interactionBridge';
import { useConversationStore } from '../store/useConversationStore';
import { useLiveUiSessionStore } from '../state/liveUiSession';
import {
  applyToolResultToStore,
  compactToolResponse,
  fetchLiveRuntimeConfig,
  SYSTEM_INSTRUCTION_SILESIAN,
  SYSTEM_INSTRUCTION_STANDARD,
  type LiveProviderFailure,
  type LiveTextSendResult,
} from './useGeminiLiveSession';
import { useGeminiFunctionRelay, type GeminiFunctionCall } from './useGeminiFunctionRelay';
import { getActiveDemoContextPayload } from '../lib/demoContext';
import { getAccessToken } from '../lib/supabase';

const OPENAI_AMBER_VOICE_STYLE = [
  'Speak exclusively in Polish.',
  'Use a warm, bright, feminine-presenting voice with an upbeat and reassuring character.',
  'Keep the vocal register light and moderately high, while sounding natural rather than theatrical.',
  'Maintain a steady, confident cadence. Sound like a knowledgeable local culinary guide: professional, friendly, approachable, and genuinely enthusiastic about food.',
  'Use clear Polish pronunciation and natural rhythm. Subtly emphasize dish names, ingredients, prices, allergens, and confirmations.',
  'Avoid a low, dark, masculine-presenting, overly serious, radio-announcer, robotic, seductive, dramatic, or English-accented delivery.',
].join(' ');

type OpenAIRealtimeEvent = Record<string, any> & { type?: string };

export interface UseOpenAIRealtimeSessionOptions {
  wsRef: React.MutableRefObject<WebSocket | null>;
  enabled?: boolean;
  sessionId?: string;
  onTerminalFailure?: (failure: LiveProviderFailure) => void;
}

export interface UseOpenAIRealtimeSessionResult {
  start: () => Promise<boolean>;
  stop: () => void;
  sendText: (text: string) => Promise<LiveTextSendResult>;
  isActive: boolean;
  error: string | null;
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function currentRestaurantId(): string | undefined {
  const state = useConversationStore.getState();
  if (state.currentRestaurant?.id) return String(state.currentRestaurant.id);
  const response = state.lastFullResponse as Record<string, any> | null;
  const recovered = response?.context?.currentRestaurant?.id
    || response?.context?.current_restaurant?.id
    || response?.restaurant?.id
    || response?.meta?.restaurant?.id;
  return recovered ? String(recovered) : undefined;
}

export function useOpenAIRealtimeSession({
  wsRef,
  enabled = true,
  sessionId: propSessionId,
  onTerminalFailure,
}: UseOpenAIRealtimeSessionOptions): UseOpenAIRealtimeSessionResult {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RTCDataChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef(false);
  const desiredActiveRef = useRef(false);
  const startInFlightRef = useRef(false);
  const sessionIdRef = useRef(propSessionId);
  const latestTranscriptRef = useRef<string | null>(null);
  const latestTranscriptTurnIdRef = useRef<string | null>(null);
  const currentTurnIdRef = useRef<string | null>(null);
  const assistantTranscriptRef = useRef('');
  const responseActiveRef = useRef(false);
  const handledCallsRef = useRef(new Set<string>());
  const onTerminalFailureRef = useRef(onTerminalFailure);

  useEffect(() => { sessionIdRef.current = propSessionId; }, [propSessionId]);
  useEffect(() => { onTerminalFailureRef.current = onTerminalFailure; }, [onTerminalFailure]);

  const { relay } = useGeminiFunctionRelay({
    wsRef,
    getLatestTranscript: () => latestTranscriptRef.current,
    takeLatestTranscript: () => {
      const transcript = latestTranscriptRef.current;
      latestTranscriptRef.current = null;
      latestTranscriptTurnIdRef.current = null;
      return transcript;
    },
    getTranscriptForTurn: (requestedTurnId) => {
      if (!requestedTurnId || latestTranscriptTurnIdRef.current !== requestedTurnId) {
        return null;
      }
      return latestTranscriptRef.current;
    },
    getSessionId: () => sessionIdRef.current,
    getCurrentRestaurantId: currentRestaurantId,
  });

  const cleanup = useCallback(() => {
    activeRef.current = false;
    setIsActive(false);

    const channel = channelRef.current;
    channelRef.current = null;
    if (channel) {
      channel.onopen = null;
      channel.onclose = null;
      channel.onerror = null;
      channel.onmessage = null;
      try { channel.close(); } catch { /* noop */ }
    }

    const peer = peerRef.current;
    peerRef.current = null;
    if (peer) {
      peer.ontrack = null;
      peer.onconnectionstatechange = null;
      try { peer.close(); } catch { /* noop */ }
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) {
      audio.onplaying = null;
      audio.onpause = null;
      audio.onended = null;
      audio.srcObject = null;
      audio.remove();
    }

    assistantTranscriptRef.current = '';
    latestTranscriptRef.current = null;
    latestTranscriptTurnIdRef.current = null;
    currentTurnIdRef.current = null;
    responseActiveRef.current = false;
    handledCallsRef.current.clear();
  }, []);

  const stop = useCallback(() => {
    desiredActiveRef.current = false;
    startInFlightRef.current = false;
    cleanup();
    setError(null);
    useLiveUiSessionStore.getState().setPaused();
  }, [cleanup]);

  const fail = useCallback((code: string, kind: LiveProviderFailure['kind'] = 'provider') => {
    if (!desiredActiveRef.current) return;
    desiredActiveRef.current = false;
    setError(code);
    cleanup();
    const message = kind === 'microphone'
      ? (code === 'microphone_unavailable' ? 'Nie znaleziono mikrofonu.' : 'Zezwól aplikacji na dostęp do mikrofonu.')
      : 'Tryb głosowy jest chwilowo niedostępny. Użyj mikrofonu w trybie zapasowym.';
    useLiveUiSessionStore.getState().setError(message);
    onTerminalFailureRef.current?.({ kind, provider: 'openai', code });
  }, [cleanup]);

  const sendEvent = useCallback((event: Record<string, unknown>) => {
    const channel = channelRef.current;
    if (!channel || channel.readyState !== 'open') throw new Error('openai_data_channel_closed');
    channel.send(JSON.stringify(event));
  }, []);

  const sendText = useCallback(async (text: string): Promise<LiveTextSendResult> => {
    const sanitized = text.trim();
    const channel = channelRef.current;
    if (!sanitized || !activeRef.current || !channel || channel.readyState !== 'open') {
      return {
        accepted: false,
        reason: 'live_not_ready',
        message: 'Sesja OpenAI Live nie jest jeszcze gotowa na wiadomość tekstową.',
      };
    }

    const textTurnId = generateTurnId(sessionIdRef.current || 'unknown');
    latestTranscriptRef.current = sanitized;
    latestTranscriptTurnIdRef.current = textTurnId;
    currentTurnIdRef.current = textTurnId;
    assistantTranscriptRef.current = '';

    const liveUi = useLiveUiSessionStore.getState();
    liveUi.setTranscript('user', sanitized);
    liveUi.setProcessing('Analizuję...');
    logBridge('user_input_received', {
      turn_id: textTurnId,
      session_id: sessionIdRef.current,
      source: 'voicebar_text_live',
      provider: 'openai',
      text: sanitized.slice(0, 80),
    });
    logBridge('transcript_received', {
      turn_id: textTurnId,
      session_id: sessionIdRef.current,
      source: 'voicebar_text_live',
      provider: 'openai',
      text: sanitized.slice(0, 80),
    });

    try {
      if (responseActiveRef.current) {
        sendEvent({ type: 'response.cancel' });
      }
      sendEvent({
        type: 'conversation.item.create',
        item: {
          type: 'message',
          role: 'user',
          content: [{ type: 'input_text', text: sanitized }],
        },
      });
      sendEvent({ type: 'response.create' });
      return { accepted: true, provider: 'openai', turnId: textTurnId };
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'openai_live_text_send_failed';
      setError(message);
      return {
        accepted: false,
        reason: 'provider_error',
        message: 'Nie udało się wysłać tekstu do OpenAI Live.',
      };
    }
  }, [sendEvent]);

  const handleFunctionCall = useCallback(async (item: OpenAIRealtimeEvent) => {
    const callId = String(item.call_id || item.id || '').trim();
    const name = String(item.name || '').trim();
    if (!callId || !name || handledCallsRef.current.has(callId)) return;
    handledCallsRef.current.add(callId);

    const turnId = currentTurnIdRef.current || generateTurnId(sessionIdRef.current || 'unknown');
    const call: GeminiFunctionCall = {
      id: callId,
      name,
      args: parseJsonObject(item.arguments),
      turnId,
    };
    logBridge('toolcall_received', {
      turn_id: turnId,
      session_id: sessionIdRef.current,
      tools: name,
      provider: 'openai',
    });
    useLiveUiSessionStore.getState().setProcessing('Analizuję...', name);

    try {
      const result = await relay(call);
      const response = (result.response ?? {}) as Record<string, unknown>;
      applyToolResultToStore(result.name, response);
      const compact = compactToolResponse(result.name, response);
      sendEvent({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify(compact),
        },
      });
      sendEvent({ type: 'response.create' });
    } catch (relayError) {
      sendEvent({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify({
            ok: false,
            error: relayError instanceof Error ? relayError.message : 'tool_relay_failed',
          }),
        },
      });
      sendEvent({ type: 'response.create' });
    }
  }, [relay, sendEvent]);

  const handleServerEvent = useCallback((event: OpenAIRealtimeEvent) => {
    const liveUi = useLiveUiSessionStore.getState();
    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        assistantTranscriptRef.current = '';
        currentTurnIdRef.current = generateTurnId(sessionIdRef.current || 'unknown');
        logBridge('user_input_received', {
          turn_id: currentTurnIdRef.current,
          session_id: sessionIdRef.current,
          source: 'live_audio',
          provider: 'openai',
        });
        liveUi.setListening('Słucham...');
        break;
      case 'input_audio_buffer.speech_stopped':
        liveUi.setProcessing('Analizuję...');
        break;
      case 'response.created':
        responseActiveRef.current = true;
        liveUi.setProcessing('Analizuję...');
        break;
      case 'conversation.item.input_audio_transcription.completed': {
        const transcript = String(event.transcript || '').trim();
        if (transcript) {
          latestTranscriptRef.current = transcript;
          latestTranscriptTurnIdRef.current = currentTurnIdRef.current;
          liveUi.setTranscript('user', transcript);
          logBridge('transcript_received', {
            turn_id: currentTurnIdRef.current,
            session_id: sessionIdRef.current,
            text: transcript.slice(0, 80),
            provider: 'openai',
          });
        }
        break;
      }
      case 'response.output_audio_transcript.delta': {
        const delta = String(event.delta || '');
        if (delta) {
          assistantTranscriptRef.current += delta;
          liveUi.setTranscript('assistant', assistantTranscriptRef.current);
          liveUi.setSpeaking('Amber odpowiada...');
        }
        break;
      }
      case 'response.output_audio_transcript.done': {
        const transcript = String(event.transcript || assistantTranscriptRef.current || '').trim();
        if (transcript) liveUi.setTranscript('assistant', transcript);
        break;
      }
      case 'response.function_call_arguments.done':
        void handleFunctionCall(event);
        break;
      case 'response.done': {
        responseActiveRef.current = false;
        const outputs = Array.isArray(event.response?.output) ? event.response.output : [];
        outputs
          .filter((item: OpenAIRealtimeEvent) => item?.type === 'function_call')
          .forEach((item: OpenAIRealtimeEvent) => { void handleFunctionCall(item); });
        if (!outputs.some((item: OpenAIRealtimeEvent) => item?.type === 'function_call')) {
          liveUi.setListening('Słucham...');
        }
        break;
      }
      case 'error': {
        const code = String(event.error?.code || event.error?.type || 'openai_realtime_error');
        console.error('[OPENAI_REALTIME_EVENT_ERROR]', code, event.error?.message || '');
        fail(code, 'provider');
        break;
      }
      default:
        break;
    }
  }, [fail, handleFunctionCall]);

  const start = useCallback(async () => {
    if (!enabled || startInFlightRef.current || activeRef.current) return activeRef.current;
    startInFlightRef.current = true;
    desiredActiveRef.current = true;
    setError(null);
    cleanup();
    desiredActiveRef.current = true;
    useLiveUiSessionStore.getState().setProcessing('Łączę z zapasowym OpenAI Live...');

    try {
      // Resolve the deterministic scenario before requesting microphone access.
      const activeDemoContext = getActiveDemoContextPayload();
      const runtime = await fetchLiveRuntimeConfig();
      const baseInstruction = runtime.speechStyle === 'silesian'
        ? SYSTEM_INSTRUCTION_SILESIAN
        : SYSTEM_INSTRUCTION_STANDARD;
      const instructions = composeLiveSystemInstruction({
        baseInstruction,
        customStylePrompt: [runtime.amberPrompt, OPENAI_AMBER_VOICE_STYLE].filter(Boolean).join(' '),
        demoContext: activeDemoContext,
      });

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (!desiredActiveRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return false;
      }
      streamRef.current = stream;

      const peer = new RTCPeerConnection();
      peerRef.current = peer;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      const audio = document.createElement('audio');
      audio.autoplay = true;
      audio.setAttribute('playsinline', 'true');
      audio.style.display = 'none';
      document.body.appendChild(audio);
      audioRef.current = audio;
      audio.onplaying = () => useLiveUiSessionStore.getState().setSpeaking('Amber odpowiada...');
      audio.onpause = () => {
        if (activeRef.current) useLiveUiSessionStore.getState().setListening('Słucham...');
      };
      audio.onended = audio.onpause;
      peer.ontrack = (trackEvent) => {
        audio.srcObject = trackEvent.streams[0] || new MediaStream([trackEvent.track]);
        void audio.play().catch(() => {
          useLiveUiSessionStore.getState().setProcessing('Dotknij mikrofonu, aby odtworzyć odpowiedź.');
        });
      };

      const channel = peer.createDataChannel('oai-events');
      channelRef.current = channel;
      channel.onmessage = (message) => {
        try { handleServerEvent(JSON.parse(String(message.data))); } catch { /* ignore malformed provider event */ }
      };
      channel.onerror = () => fail('openai_data_channel_error', 'provider');
      channel.onclose = () => {
        if (desiredActiveRef.current) fail('openai_data_channel_closed', 'provider');
      };

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === 'failed' && desiredActiveRef.current) {
          fail('openai_webrtc_connection_failed', 'provider');
        }
      };

      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      const accessToken = await getAccessToken();
      const response = await fetch(getApiUrl('/api/voice/live/openai-session'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          instructions,
          session_id: sessionIdRef.current,
          demo_context: activeDemoContext,
        }),
      });
      const sessionData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(sessionData?.error || 'openai_realtime_session_failed');
      }
      const clientSecret = typeof sessionData?.client_secret === 'string'
        ? sessionData.client_secret.trim()
        : '';
      const offerSdp = peer.localDescription?.sdp || offer.sdp || '';
      if (!clientSecret) throw new Error('openai_realtime_token_missing');
      if (!offerSdp) throw new Error('openai_realtime_sdp_missing');

      const sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp',
        },
        body: offerSdp,
      });
      const answerSdp = await sdpResponse.text();
      if (!sdpResponse.ok) {
        console.error('[OPENAI_REALTIME_CONNECT_FAILED]', {
          status: sdpResponse.status,
          detail: answerSdp.slice(0, 500),
        });
        let code = 'openai_realtime_session_failed';
        try { code = JSON.parse(answerSdp)?.error?.code || code; } catch { /* SDP endpoint returned text */ }
        throw new Error(code);
      }
      await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      activeRef.current = true;
      setIsActive(true);
      useLiveUiSessionStore.getState().setListening('Słucham przez OpenAI...');
      return true;
    } catch (startError) {
      const name = startError instanceof Error ? startError.name : '';
      const message = startError instanceof Error ? startError.message : 'openai_realtime_start_failed';
      const microphoneFailure =
        name === 'NotAllowedError'
        || name === 'SecurityError'
        || name === 'NotFoundError'
        || /permission|microphone|audio input device/i.test(message);
      const code = microphoneFailure
        ? (name === 'NotFoundError' ? 'microphone_unavailable' : 'microphone_permission_denied')
        : message;
      fail(code, microphoneFailure ? 'microphone' : 'provider');
      return false;
    } finally {
      startInFlightRef.current = false;
    }
  }, [cleanup, enabled, fail, handleServerEvent]);

  useEffect(() => () => {
    desiredActiveRef.current = false;
    cleanup();
  }, [cleanup]);

  return { start, stop, sendText, isActive, error };
}
