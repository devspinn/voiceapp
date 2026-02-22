import { useState } from "react";
import { useTRPC } from "~/lib/trpc";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

export function UserSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const searchQuery = useQuery(
    trpc.users.search.queryOptions(
      { query },
      { enabled: query.length > 0 }
    )
  );

  const createConversation = useMutation(
    trpc.conversations.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: trpc.conversations.list.queryKey() });
        navigate({ to: "/conversations/$conversationId", params: { conversationId: data.id } });
        setIsOpen(false);
        setQuery("");
      },
    })
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
      >
        New Conversation
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-md border border-gray-200 bg-white shadow-lg">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full border-b border-gray-200 px-3 py-2 text-sm focus:outline-none"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto">
            {searchQuery.data?.map((u) => (
              <button
                key={u.id}
                onClick={() => createConversation.mutate({ otherUserId: u.id })}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
                disabled={createConversation.isPending}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-700">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>
              </button>
            ))}
            {query && searchQuery.data?.length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">
                No users found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
