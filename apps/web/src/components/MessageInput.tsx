import { useState } from "react";
import { useTRPC } from "~/lib/trpc";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useVoiceRecorder } from "~/hooks/useVoiceRecorder";

interface MessageInputProps {
  conversationId: string;
}

export function MessageInput({ conversationId }: MessageInputProps) {
  const [text, setText] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { isRecording, duration, startRecording, stopRecording, cancelRecording } =
    useVoiceRecorder();

  const sendText = useMutation(
    trpc.messages.sendText.mutationOptions({
      onSuccess: () => {
        setText("");
        queryClient.invalidateQueries({
          queryKey: trpc.messages.list.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.conversations.list.queryKey(),
        });
      },
    })
  );

  const sendVoice = useMutation(
    trpc.messages.sendVoice.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.messages.list.queryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: trpc.conversations.list.queryKey(),
        });
      },
    })
  );

  function handleSubmitText(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    sendText.mutate({ conversationId, text: text.trim() });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitText(e);
    }
  }

  async function handleVoiceToggle() {
    if (isRecording) {
      const blob = await stopRecording();
      if (blob && blob.size > 0) {
        // Convert to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          sendVoice.mutate({
            conversationId,
            audioBase64: base64,
            mimeType: blob.type,
          });
        };
        reader.readAsDataURL(blob);
      }
    } else {
      try {
        await startRecording();
      } catch {
        alert("Could not access microphone. Please grant permission.");
      }
    }
  }

  function formatDuration(ms: number) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  if (isVoiceMode || isRecording) {
    return (
      <div className="border-t border-gray-200 bg-white p-3">
        <div className="flex items-center gap-3">
          {isRecording ? (
            <>
              <button
                onClick={cancelRecording}
                className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Cancel
              </button>
              <div className="flex flex-1 items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <span className="text-sm text-gray-600">
                  Recording {formatDuration(duration)}
                </span>
              </div>
              <button
                onClick={handleVoiceToggle}
                disabled={sendVoice.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {sendVoice.isPending ? "Sending..." : "Send"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsVoiceMode(false)}
                className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100"
              >
                Text
              </button>
              <div className="flex-1 text-center text-sm text-gray-500">
                Tap the mic to start recording
              </div>
              <button
                onClick={handleVoiceToggle}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmitText} className="border-t border-gray-200 bg-white p-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsVoiceMode(true)}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          title="Voice message"
        >
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!text.trim() || sendText.isPending}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </form>
  );
}
