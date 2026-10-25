"use client";

import React from "react";

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export function MarkdownView({ content, className = "" }: MarkdownViewProps) {
  if (!content) {
    return <div className="text-zinc-400 text-xs italic">Инструкция не загружена</div>;
  }

  // Parse lines into blocks
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLang = "";
  let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;
  let tableBuffer: string[] = [];

  const flushList = () => {
    if (!listBuffer) return;
    const { type, items } = listBuffer;
    const key = `list_${blocks.length}`;
    if (type === "ul") {
      blocks.push(
        <ul key={key} className="my-2.5 space-y-1.5 pl-5 list-disc text-zinc-800 dark:text-zinc-200 text-xs">
          {items.map((it, i) => (
            <li key={i} className="leading-relaxed">
              {renderInline(it)}
            </li>
          ))}
        </ul>
      );
    } else {
      blocks.push(
        <ol key={key} className="my-2.5 space-y-1.5 pl-5 list-decimal text-zinc-800 dark:text-zinc-200 text-xs">
          {items.map((it, i) => (
            <li key={i} className="leading-relaxed">
              {renderInline(it)}
            </li>
          ))}
        </ol>
      );
    }
    listBuffer = null;
  };

  const flushTable = () => {
    if (tableBuffer.length === 0) return;
    const rows = tableBuffer.map((r) =>
      r
        .split("|")
        .slice(1, -1)
        .map((cell) => cell.trim())
    );
    const key = `table_${blocks.length}`;
    if (rows.length > 0) {
      const headerRow = rows[0];
      const dataRows = rows.slice(1).filter((r) => !r.every((c) => /^[-:]+$/.test(c)));
      blocks.push(
        <div key={key} className="my-3 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-zinc-800/80 border-b border-zinc-200 dark:border-zinc-800">
                {headerRow.map((h, i) => (
                  <th key={i} className="px-3.5 py-2 font-semibold text-zinc-900 dark:text-white">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60 bg-white/40 dark:bg-zinc-900/40">
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3.5 py-2 text-zinc-800 dark:text-zinc-200">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    tableBuffer = [];
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();

    // Code blocks
    if (trimmed.startsWith("```")) {
      if (inCodeBlock) {
        // End code block
        blocks.push(
          <div key={`code_${blocks.length}`} className="my-3 rounded-xl bg-zinc-900 dark:bg-zinc-950 p-4 font-mono text-[11px] text-zinc-200 overflow-x-auto border border-zinc-800 shadow-inner">
            <pre className="whitespace-pre">{codeBuffer.join("\n")}</pre>
          </div>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        flushList();
        flushTable();
        inCodeBlock = true;
        codeLang = trimmed.replace(/^```/, "").trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Table rows
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      flushList();
      tableBuffer.push(trimmed);
      continue;
    } else {
      flushTable();
    }

    // Horizontal Rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushList();
      blocks.push(
        <hr key={`hr_${idx}`} className="my-4 border-zinc-200 dark:border-zinc-800" />
      );
      continue;
    }

    // Headers
    if (trimmed.startsWith("# ")) {
      flushList();
      blocks.push(
        <h1 key={`h1_${idx}`} className="mt-5 mb-2.5 text-base font-extrabold text-zinc-900 dark:text-white flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-1.5">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          <span>{renderInline(trimmed.substring(2))}</span>
        </h1>
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      blocks.push(
        <h2 key={`h2_${idx}`} className="mt-4 mb-2 text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500/70" />
          <span>{renderInline(trimmed.substring(3))}</span>
        </h2>
      );
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushList();
      blocks.push(
        <h3 key={`h3_${idx}`} className="mt-3.5 mb-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
          {renderInline(trimmed.substring(4))}
        </h3>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      flushList();
      const quoteText = trimmed.replace(/^>\s?/, "");
      blocks.push(
        <div key={`quote_${idx}`} className="my-2.5 rounded-xl border-l-4 border-amber-500 bg-amber-500/5 dark:bg-amber-950/20 px-4 py-2.5 text-xs text-zinc-800 dark:text-zinc-200 italic">
          {renderInline(quoteText)}
        </div>
      );
      continue;
    }

    // Unordered List
    if (/^[-*]\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^[-*]\s+/, "");
      if (!listBuffer || listBuffer.type !== "ul") {
        flushList();
        listBuffer = { type: "ul", items: [itemText] };
      } else {
        listBuffer.items.push(itemText);
      }
      continue;
    }

    // Ordered List
    if (/^\d+\.\s+/.test(trimmed)) {
      const itemText = trimmed.replace(/^\d+\.\s+/, "");
      if (!listBuffer || listBuffer.type !== "ol") {
        flushList();
        listBuffer = { type: "ol", items: [itemText] };
      } else {
        listBuffer.items.push(itemText);
      }
      continue;
    }

    // Empty line
    if (trimmed === "") {
      flushList();
      continue;
    }

    // Regular paragraph
    flushList();
    blocks.push(
      <p key={`p_${idx}`} className="my-2 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
        {renderInline(rawLine)}
      </p>
    );
  }

  flushList();
  flushTable();

  return <div className={`space-y-1 ${className}`}>{blocks}</div>;
}

// Inline formatting: **bold**, *italic*, `code`, and links
function renderInline(text: string): React.ReactNode {
  if (!text) return "";

  // Split tokens by bold, code, and links
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-zinc-900 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="italic text-zinc-700 dark:text-zinc-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 font-mono text-[11px] text-amber-700 dark:text-amber-300 border border-zinc-300/40 dark:border-zinc-700/50"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noreferrer"
          className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
