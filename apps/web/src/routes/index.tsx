import { createFileRoute, Navigate } from "@tanstack/react-router";
import { authClient } from "~/lib/auth-client";

export const Route = createFileRoute("/")({
  component: IndexPage,
});

function IndexPage() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/conversations" />;
  }

  return <Navigate to="/login" />;
}
