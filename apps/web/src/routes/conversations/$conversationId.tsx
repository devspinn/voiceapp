import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/lib/trpc";
import { authClient } from "~/lib/auth-client";
import { MessageBubble } from "~/components/MessageBubble";
import { MessageInput } from "~/components/MessageInput";
import { useEffect, useRef } from "react";

export const Route = createFileRoute("/conversations/$conversationId")({
  component: ConversationDetail,
});

function ConversationDetail() {
  const { conversationId } = Route.useParams();
  const trpc = useTRPC();
  const { data: session } = authClient.useSession();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const convQuery = useQuery(
    trpc.conversations.get.queryOptions({ id: conversationId })
  );

  const messagesQuery = useQuery(
    trpc.messages.list.queryOptions({
      conversationId,
      limit: 50,
    })
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    // Only auto-scroll if already near the bottom
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messagesQuery.data?.messages]);

  // Scroll to bottom on initial load
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView();
  }, [conversationId]);

  if (convQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-gray-500">Loading conversation...</div>
      </div>
    );
  }

  if (convQuery.error) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-red-500">Failed to load conversation</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 pl-14 md:pl-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
          {convQuery.data?.otherUser?.name?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
        <h2 className="font-semibold">
          {convQuery.data?.otherUser?.name ?? "Unknown"}
        </h2>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto bg-gray-50 px-4 py-2"
      >
        {messagesQuery.isLoading && (
          <div className="flex justify-center py-4">
            <div className="text-sm text-gray-400">Loading messages...</div>
          </div>
        )}

        {messagesQuery.data?.messages.length === 0 && !messagesQuery.isLoading && (
          <div className="flex flex-1 items-center justify-center py-20">
            <div className="text-center text-gray-400">
              <p className="text-lg">No messages yet</p>
              <p className="text-sm">Send a message to start the conversation</p>
            </div>
          </div>
        )}

        {messagesQuery.data?.messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.senderId === session?.user?.id}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <MessageInput conversationId={conversationId} />
    </div>
  );
}
