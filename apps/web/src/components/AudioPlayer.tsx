import { useAudioPlayback } from "~/hooks/useAudioPlayback";

interface AudioPlayerProps {
  url: string;
  isOwn: boolean;
}

export function AudioPlayer({ url, isOwn }: AudioPlayerProps) {
  const { isPlaying, currentTime, duration, play, pause } =
    useAudioPlayback();

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => (isPlaying ? pause() : play(url))}
        className={`flex h-8 w-8 items-center justify-center rounded-full ${
          isOwn
            ? "bg-blue-500 text-white hover:bg-blue-400"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
        }`}
      >
        {isPlaying ? (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>

      <div className="flex-1">
        <div
          className={`h-1 rounded-full ${isOwn ? "bg-blue-400" : "bg-gray-300"}`}
        >
          <div
            className={`h-1 rounded-full ${isOwn ? "bg-white" : "bg-blue-600"}`}
            style={{
              width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
            }}
          />
        </div>
      </div>

      <span
        className={`text-xs tabular-nums ${isOwn ? "text-blue-200" : "text-gray-400"}`}
      >
        {isPlaying ? formatTime(currentTime) : duration > 0 ? formatTime(duration) : "0:00"}
      </span>
    </div>
  );
}
