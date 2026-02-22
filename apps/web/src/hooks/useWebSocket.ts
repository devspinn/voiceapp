import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "~/lib/trpc";

export function useWebSocket(enabled: boolean) {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  const connect = useCallback(() => {
    if (!enabled || wsRef.current) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "new_message" || data.type === "message_updated") {
          queryClient.invalidateQueries({
            queryKey: trpc.messages.list.queryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: trpc.conversations.list.queryKey(),
          });
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      // Reconnect after delay
      if (enabled) {
        setTimeout(connect, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [enabled, queryClient, trpc]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);
}
