"use client";

import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";

/**
 * Voice capture for quick logging.
 *
 * Uses the browser's own SpeechRecognition. On Chrome this is not fully
 * on-device — Chrome streams audio to Google's speech service — so the honest
 * statement is not "audio never leaves your device" but "Planora never
 * receives or stores audio". Claiming otherwise would be exactly the kind of
 * unverifiable privacy promise this product exists to avoid making.
 *
 * What is true, and what the UI says: Planora requests no microphone stream of
 * its own, receives only the transcript the browser hands back, and sends that
 * transcript to your local API and nowhere else.
 */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const candidate = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

export function VoiceCapture({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    setSupported(getRecognition() !== null);
    return () => recognitionRef.current?.stop();
  }, []);

  if (!supported) return null;

  function toggle() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const Recognition = getRecognition();
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const first = event.results[0]?.[0]?.transcript;
      if (first) onTranscript(first.trim());
    };
    recognition.onerror = () => {
      setError("The browser could not transcribe that. Type it instead.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    setError(null);
    setListening(true);
    recognition.start();
  }

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={listening}
        className={clsx(
          "focus-ring inline-flex min-h-touch items-center gap-2 rounded-md border px-4 text-callout font-semibold transition",
          listening ? "border-critical bg-critical-wash text-critical" : "border-line bg-surface text-ink hover:bg-sunken"
        )}
      >
        {listening ? <MicOff className="size-4" aria-hidden="true" /> : <Mic className="size-4" aria-hidden="true" />}
        {listening ? "Stop listening" : "Dictate"}
      </button>
      <p className="mt-2 max-w-prose text-footnote text-muted">
        Uses your browser&rsquo;s built-in speech recognition. Planora never receives or stores audio — only the text it
        hands back, which goes to your local API. Depending on the browser, transcription itself may happen on a vendor
        service rather than on this device.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-footnote font-medium text-critical">
          {error}
        </p>
      )}
    </div>
  );
}
