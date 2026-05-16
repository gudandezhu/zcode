"use client";

import { ChatPanel } from "@/components/chat/ChatPanel";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ChatInner() {
  const searchParams = useSearchParams();
  const initialAgent = searchParams.get("agent") || "";
  const initialTaskId = searchParams.get("task") || "";

  return <ChatPanel initialAgent={initialAgent} initialTaskId={initialTaskId} />;
}

export default function ChatPage() {
  return (
    <div className="h-full flex flex-col">
      <Suspense fallback={<div className="flex-1 flex items-center justify-center text-muted-foreground">加载中...</div>}>
        <ChatInner />
      </Suspense>
    </div>
  );
}
