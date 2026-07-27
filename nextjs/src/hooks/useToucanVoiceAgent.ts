"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type VoiceStatus = "idle" | "connecting" | "active" | "disconnected" | "error";

type TranscriptRole = "user" | "assistant" | "system";

export type ToucanTranscriptEntry = {
  role: TranscriptRole;
  text: string;
  isFinal?: boolean;
};

type VoiceCallLike = {
  disconnect(): void;
  mute(muted: boolean): void;
  isMuted(): boolean;
  on(event: string, callback: (...args: unknown[]) => void): void;
  parameters?: { CallSid?: string };
  getRemoteStream?: () => MediaStream | undefined;
};

type VoiceDeviceLike = {
  register(): Promise<void>;
  connect(options: { params: Record<string, string> }): Promise<VoiceCallLike>;
  destroy(): void;
  on(event: string, callback: (...args: unknown[]) => void): void;
};

type SyncStreamLike = {
  close(): void;
  on(event: string, callback: (event: { message?: { data?: Record<string, unknown> } }) => void): void;
};

type SyncClientLike = {
  shutdown(): Promise<void> | void;
  updateToken(token: string): Promise<void>;
  stream(name: string): Promise<SyncStreamLike>;
  on(event: string, callback: (...args: unknown[]) => void): void;
};

const DEFAULT_TO = "portfolio-toucans";
const DEFAULT_PROMPT =
  "Greet the visitor as two friendly toucans on Mitchell Kimbell's portfolio. Keep the greeting very short and invite them to ask about Mitchell's projects, experience, or skills.";

const makeIdentity = () => {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `toucan-web-${random}`;
};

const normalizeNgrokUrl = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? trimmed
    : `https://${trimmed}`;
};

export function useToucanVoiceAgent() {
  const identityRef = useRef("");
  const deviceRef = useRef<VoiceDeviceLike | null>(null);
  const callRef = useRef<VoiceCallLike | null>(null);
  const syncClientRef = useRef<SyncClientLike | null>(null);
  const syncStreamRef = useRef<SyncStreamLike | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioFrameRef = useRef<number | null>(null);

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [identity, setIdentity] = useState("pending");
  const [callSid, setCallSid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [agentAudioLevel, setAgentAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState<ToucanTranscriptEntry[]>([]);

  const ensureIdentity = useCallback(() => {
    if (!identityRef.current) {
      identityRef.current = makeIdentity();
      setIdentity(identityRef.current);
    }
    return identityRef.current;
  }, []);

  useEffect(() => {
    ensureIdentity();
  }, [ensureIdentity]);

  const appendTranscript = useCallback((entry: ToucanTranscriptEntry) => {
    setTranscript((prev) => [...prev, entry]);
  }, []);

  const cleanupAudioMonitor = useCallback(() => {
    if (audioFrameRef.current !== null) {
      cancelAnimationFrame(audioFrameRef.current);
      audioFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setIsAgentSpeaking(false);
    setAgentAudioLevel(0);
  }, []);

  const cleanupSync = useCallback(async () => {
    if (syncStreamRef.current) {
      syncStreamRef.current.close();
      syncStreamRef.current = null;
    }
    if (syncClientRef.current) {
      await syncClientRef.current.shutdown();
      syncClientRef.current = null;
    }
  }, []);

  const cleanupDevice = useCallback(() => {
    cleanupAudioMonitor();
    if (deviceRef.current) {
      try {
        deviceRef.current.destroy();
      } catch {
        // no-op
      }
      deviceRef.current = null;
    }
    callRef.current = null;
    setIsMuted(false);
  }, [cleanupAudioMonitor]);

  const monitorRemoteAudio = useCallback((call: VoiceCallLike) => {
    if (!call.getRemoteStream) return;

    let attempts = 0;
    const maxAttempts = 50;
    const threshold = 0.012;
    let lastActiveAt = 0;

    const trySetup = () => {
      attempts += 1;
      const remoteStream = call.getRemoteStream?.();

      if (!remoteStream) {
        if (attempts < maxAttempts) setTimeout(trySetup, 100);
        return;
      }

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(remoteStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      audioContextRef.current = audioContext;

      const monitor = () => {
        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) sum += sample * sample;
        const rms = Math.sqrt(sum / samples.length);
        const now = Date.now();
        if (rms > threshold) lastActiveAt = now;

        setAgentAudioLevel(rms);
        setIsAgentSpeaking(now - lastActiveAt < 350);
        audioFrameRef.current = requestAnimationFrame(monitor);
      };

      monitor();
    };

    trySetup();
  }, []);

  const connectSync = useCallback(
    async (sessionCallSid: string) => {
      try {
        const currentIdentity = ensureIdentity();
        const tokenResponse = await fetch(
          `/api/twilio/sync-token?identity=${encodeURIComponent(
            `${currentIdentity}-observer`
          )}`
        );
        if (!tokenResponse.ok) {
          const text = await tokenResponse.text();
          console.warn("[ToucanVoice] Sync token unavailable", text);
          return;
        }

        const { token } = (await tokenResponse.json()) as { token: string };
        const { SyncClient } = (await import("twilio-sync")) as unknown as {
          SyncClient: new (token: string, options?: Record<string, unknown>) => SyncClientLike;
        };

        const client = new SyncClient(token, { logLevel: "warn" });
        syncClientRef.current = client;

        client.on("connectionStateChanged", (state) => {
          console.log("[ToucanVoice] Sync state", state);
        });
        client.on("tokenAboutToExpire", async () => {
          const res = await fetch(
            `/api/twilio/sync-token?identity=${encodeURIComponent(
              `${ensureIdentity()}-observer`
            )}`
          );
          const data = (await res.json()) as { token?: string };
          if (data.token) await client.updateToken(data.token);
        });

        const stream = await client.stream(`session-${sessionCallSid}`);
        syncStreamRef.current = stream;
        console.log("[ToucanVoice] Listening to Sync stream", `session-${sessionCallSid}`);

        stream.on("messagePublished", (event) => {
          const data = event.message?.data ?? {};
          console.log("[ToucanVoice] Sync message", data);

          if (data.type === "transcription") {
            const role = data.role === "assistant" ? "assistant" : "user";
            const text = String(data.text ?? "");
            const isFinal = Boolean(data.isFinal);
            if (text) appendTranscript({ role, text, isFinal });
          }

          if (data.type === "token" && data.token) {
            console.log("[ToucanVoice] assistant token", data.token);
          }
        });
      } catch (syncError) {
        console.warn("[ToucanVoice] Sync connection failed", syncError);
      }
    },
    [appendTranscript, ensureIdentity]
  );

  const start = useCallback(async () => {
    if (status === "connecting" || status === "active") return;

    setStatus("connecting");
    setError(null);
    setTranscript([]);
    setCallSid(null);

    const agentNgrokUrl = normalizeNgrokUrl(
      process.env.NEXT_PUBLIC_TOUCAN_AGENT_NGROK_URL
    );
    const agentBackendUrl =
      normalizeNgrokUrl(process.env.NEXT_PUBLIC_TOUCAN_AGENT_BACKEND_URL) ||
      agentNgrokUrl;

    const currentIdentity = ensureIdentity();

    console.log("[ToucanVoice] Starting browser voice session", {
      identity: currentIdentity,
      agentBackendUrl,
      agentNgrokUrl,
    });

    try {
      const tokenResponse = await fetch(
        `/api/twilio/voice-token?identity=${encodeURIComponent(currentIdentity)}`
      );
      if (!tokenResponse.ok) {
        const body = await tokenResponse.text();
        throw new Error(`Voice token request failed: ${body}`);
      }

      const { token, identity } = (await tokenResponse.json()) as {
        token: string;
        identity: string;
      };

      const voiceSdk = (await import("@twilio/voice-sdk")) as unknown as {
        Device: new (token: string, options?: Record<string, unknown>) => VoiceDeviceLike;
        Call: { Codec?: { Opus?: unknown } };
      };

      const codecPreferences = voiceSdk.Call.Codec?.Opus
        ? [voiceSdk.Call.Codec.Opus]
        : undefined;
      const device = new voiceSdk.Device(token, {
        logLevel: 1,
        ...(codecPreferences ? { codecPreferences } : {}),
      });
      deviceRef.current = device;

      device.on("registered", () => console.log("[ToucanVoice] Device registered"));
      device.on("error", (deviceError) => {
        console.error("[ToucanVoice] Device error", deviceError);
        setError("Twilio Voice device error");
        setStatus("error");
      });

      await device.register();

      const connectParams: Record<string, string> = {
        To: process.env.NEXT_PUBLIC_TOUCAN_AGENT_TO || DEFAULT_TO,
        prompt: process.env.NEXT_PUBLIC_TOUCAN_AGENT_INITIAL_PROMPT || DEFAULT_PROMPT,
        languageCode: process.env.NEXT_PUBLIC_TOUCAN_AGENT_LANGUAGE || "en-US",
      };

      if (agentBackendUrl) connectParams.agentBackendUrl = agentBackendUrl;
      if (agentNgrokUrl) connectParams.ngrokUrl = agentNgrokUrl;

      const call = await device.connect({ params: connectParams });
      callRef.current = call;

      call.on("accept", (acceptedCall?: unknown) => {
        const accepted = (acceptedCall || call) as VoiceCallLike;
        const acceptedCallSid = accepted.parameters?.CallSid || call.parameters?.CallSid || null;
        setCallSid(acceptedCallSid);
        setStatus("active");
        appendTranscript({ role: "system", text: "Call connected." });
        console.log("[ToucanVoice] Call accepted", { identity, callSid: acceptedCallSid });

        monitorRemoteAudio(accepted);
        if (acceptedCallSid) void connectSync(acceptedCallSid);
      });

      call.on("disconnect", () => {
        console.log("[ToucanVoice] Call disconnected");
        appendTranscript({ role: "system", text: "Call disconnected." });
        setStatus("disconnected");
        void cleanupSync();
        cleanupDevice();
      });

      call.on("cancel", () => {
        console.log("[ToucanVoice] Call canceled");
        setStatus("disconnected");
        void cleanupSync();
        cleanupDevice();
      });

      call.on("reject", () => {
        console.log("[ToucanVoice] Call rejected");
        setStatus("disconnected");
        void cleanupSync();
        cleanupDevice();
      });

      call.on("error", (callError) => {
        console.error("[ToucanVoice] Call error", callError);
        setError("Twilio call error");
        setStatus("error");
        void cleanupSync();
        cleanupDevice();
      });
    } catch (startError) {
      console.error("[ToucanVoice] Failed to start", startError);
      setError(startError instanceof Error ? startError.message : "Failed to start voice session");
      setStatus("error");
      cleanupDevice();
      void cleanupSync();
    }
  }, [appendTranscript, cleanupDevice, cleanupSync, connectSync, ensureIdentity, monitorRemoteAudio, status]);

  const stop = useCallback(() => {
    console.log("[ToucanVoice] Stopping voice session");
    callRef.current?.disconnect();
    void cleanupSync();
    cleanupDevice();
    setStatus("disconnected");
  }, [cleanupDevice, cleanupSync]);

  const toggleMute = useCallback(() => {
    const call = callRef.current;
    if (!call) return;
    const nextMuted = !call.isMuted();
    call.mute(nextMuted);
    setIsMuted(nextMuted);
  }, []);

  useEffect(() => {
    return () => {
      callRef.current?.disconnect();
      cleanupDevice();
      void cleanupSync();
    };
  }, [cleanupDevice, cleanupSync]);

  return {
    agentAudioLevel,
    callSid,
    error,
    identity,
    isAgentSpeaking,
    isMuted,
    start,
    status,
    stop,
    toggleMute,
    transcript,
  };
}
