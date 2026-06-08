"use client";

import { useEffect } from "react";
import { Loader2, Mic, MicOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAiProvider } from "@/hooks/use-ai-provider";
import {
  useGoogleVoiceInput,
  type RecordingSttProvider,
} from "@/hooks/use-google-voice-input";
import { cn } from "@/lib/utils";

interface GoogleVoiceAskButtonProps {
  disabled?: boolean;
  onTranscript: (text: string) => void;
  onError?: (message: string) => void;
  className?: string;
}

export function GoogleVoiceAskButton({
  disabled,
  onTranscript,
  onError,
  className,
}: GoogleVoiceAskButtonProps) {
  const {
    provider,
    geminiAvailable,
    whisperAvailable: localSttAvailable,
    loaded: providerLoaded,
  } = useAiProvider();

  const recordingSttProvider: RecordingSttProvider =
    provider === "claude" ? "local" : "gemini";

  const recordingFallback =
    providerLoaded &&
    ((provider === "claude" && localSttAvailable) ||
      (provider === "gemini" && geminiAvailable));

  useEffect(() => {
    sessionStorage.removeItem("fi-voice-prefer-record");
    if (provider === "claude") {
      sessionStorage.removeItem("fi-voice-prefer-record-gemini");
    } else {
      sessionStorage.removeItem("fi-voice-prefer-record-local");
    }
  }, [provider]);

  const { listening, processing, toggle } = useGoogleVoiceInput({
    onTranscript: (text) => onTranscript(text),
    onError,
    recordingFallbackEnabled: recordingFallback,
    recordingSttProvider,
  });

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(
        "size-10 shrink-0",
        listening &&
          "!border-red-500 !bg-red-500/20 !text-red-600 ring-2 ring-red-500/40 animate-pulse",
        processing && "border-amber-500/50 bg-amber-500/10",
        className,
      )}
      disabled={disabled || processing}
      onClick={toggle}
      title={listening ? "Stop listening" : "Voice input"}
      aria-label={listening ? "Stop listening" : "Start voice input"}
      aria-pressed={listening}
    >
      {processing ? (
        <Loader2 className="size-4 animate-spin" />
      ) : listening ? (
        <MicOff className="size-4" />
      ) : (
        <Mic className="size-4" />
      )}
    </Button>
  );
}
