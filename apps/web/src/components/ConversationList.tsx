import { Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/lib/trpc";
import { authClient } from "~/lib/auth-client";
import { UserSearch } from "./UserSearch";

interface ConversationListProps {
  onSelect?: () => void;
}

function formatTime(date: Date | string) {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();

  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationList({ onSelect }: ConversationListProps) {
  const { data: session } = authClient.useSession();
  const trpc = useTRPC();
  const params = useParams({ strict: false });
  const activeId = (params as { conversationId?: string }).conversationId;

  const conversationsQuery = useQuery(trpc.conversations.list.queryOptions());

  async function handleSignOut() {
    await authClient.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="flex h-full w-80 flex-col border-r border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div>
          <h1 className="text-lg font-bold">VoiceApp</h1>
          <p className="text-xs text-gray-500">{session?.user?.name}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
        >
          Sign out
        </button>
      </div>

      <div className="p-2">
        <UserSearch />
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversationsQuery.isLoading && (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-gray-200" />
                  <div className="h-2 w-32 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {conversationsQuery.data?.map((conv) => (
          <Link
            key={conv.id}
            to="/conversations/$conversationId"
            params={{ conversationId: conv.id }}
            onClick={onSelect}
            className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 ${
              activeId === conv.id ? "bg-blue-50" : ""
            }`}
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
              {conv.otherUser?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {conv.otherUser?.name ?? "Unknown"}
                </span>
                {conv.lastMessage?.createdAt && (
                  <span className="text-xs text-gray-400">
                    {formatTime(conv.lastMessage.createdAt)}
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-gray-500">
                {conv.lastMessage?.originalType === "voice" &&
                !conv.lastMessage.text
                  ? "Voice message"
                  : conv.lastMessage?.text ?? "No messages yet"}
              </div>
            </div>
          </Link>
        ))}

        {conversationsQuery.data?.length === 0 && (
          <p className="p-4 text-center text-sm text-gray-400">
            No conversations yet
          </p>
        )}
      </div>
    </div>
  );
}
