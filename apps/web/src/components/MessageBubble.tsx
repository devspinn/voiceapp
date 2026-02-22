import { AudioPlayer } from "./AudioPlayer";

interface MessageBubbleProps {
  message: {
    id: string;
    text: string | null;
    audioUrl: string | null;
    originalType: "voice" | "text";
    processingStatus: "pending" | "processing" | "completed" | "failed";
    senderId: string;
    createdAt: Date;
  };
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[70%] rounded-lg px-3 py-2 ${
          isOwn
            ? "bg-blue-600 text-white"
            : "bg-white text-gray-900 shadow-sm border border-gray-100"
        }`}
      >
        {/* Audio player for voice messages or TTS-generated audio */}
        {message.audioUrl && (
          <div className="mb-1 min-w-[200px]">
            <AudioPlayer url={message.audioUrl} isOwn={isOwn} />
          </div>
        )}

        {/* Text content */}
        {message.text && (
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>
        )}

        {/* Processing states */}
        {message.originalType === "voice" &&
          !message.text &&
          (message.processingStatus === "pending" ||
            message.processingStatus === "processing") && (
            <p className="text-sm italic opacity-70">Transcribing...</p>
          )}

        {message.originalType === "text" &&
          !message.audioUrl &&
          message.processingStatus !== "failed" && (
            <p
              className={`mt-1 text-xs italic ${isOwn ? "text-blue-200" : "text-gray-400"}`}
            >
              Generating audio...
            </p>
          )}

        {message.processingStatus === "failed" && (
          <p className="text-xs italic opacity-60">Processing failed</p>
        )}

        <div
          className={`mt-1 text-xs ${
            isOwn ? "text-blue-200" : "text-gray-400"
          }`}
        >
          {time}
        </div>
      </div>
    </div>
  );
}
