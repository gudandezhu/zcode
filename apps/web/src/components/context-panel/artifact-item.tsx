"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { extractMarkdownText } from "@/lib/artifact-utils";

export function ArtifactItem({ artifact, compact }: { artifact: unknown; compact?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const raw = extractMarkdownText(artifact);

  const MAX_PREVIEW = compact ? 300 : 600;
  const isLong = raw.length > MAX_PREVIEW;
  const display = expanded || !isLong ? raw : raw.slice(0, MAX_PREVIEW);

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="bg-muted/50 px-3 py-2 text-xs prose prose-sm dark:prose-invert max-w-none [&_h1]:text-sm [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-xs [&_h3]:font-semibold [&_p]:text-xs [&_p]:leading-relaxed [&_ul]:text-xs [&_ol]:text-xs [&_li]:text-xs [&_code]:text-[11px] [&_pre]:text-[11px] [&_pre]:bg-background [&_pre]:rounded-md [&_blockquote]:text-xs [&_table]:text-xs [&_th]:px-2 [&_td]:px-2">
        <ReactMarkdown>{display}</ReactMarkdown>
      </div>
      {isLong && (
        <button
          className="w-full px-3 py-1.5 text-[10px] text-primary hover:bg-accent/50 transition-colors border-t cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "收起" : `展开全部 (${raw.length} 字符)`}
        </button>
      )}
    </div>
  );
}
