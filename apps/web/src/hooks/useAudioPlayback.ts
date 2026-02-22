import { useState, useRef, useCallback } from "react";

interface UseAudioPlaybackReturn {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  play: (url: string) => void;
  pause: () => void;
  stop: () => void;
}

export function useAudioPlayback(): UseAudioPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentUrlRef = useRef<string>("");

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  const play = useCallback(
    (url: string) => {
      // If different URL, create new audio element
      if (currentUrlRef.current !== url) {
        stop();
        const audio = new Audio(url);
        audioRef.current = audio;
        currentUrlRef.current = url;

        audio.onloadedmetadata = () => {
          setDuration(audio.duration);
        };

        audio.ontimeupdate = () => {
          setCurrentTime(audio.currentTime);
        };

        audio.onended = () => {
          setIsPlaying(false);
          setCurrentTime(0);
        };
      }

      audioRef.current?.play();
      setIsPlaying(true);
    },
    [stop]
  );

  return { isPlaying, currentTime, duration, play, pause, stop };
}
