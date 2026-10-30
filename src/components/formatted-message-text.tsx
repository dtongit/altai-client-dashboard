import React from "react";

const LINK_REGEX =
  /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|((?:https?:\/\/|www\.)[^\s<]+[^<.,:;"')\]\s])/g;

interface FormattedMessageTextProps {
  text: string;
  isAssistant?: boolean;
  className?: string;
}

function renderTextWithLinks(text: string, isAssistant: boolean): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  LINK_REGEX.lastIndex = 0;

  while ((match = LINK_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const key = `link_${match.index}`;
    if (match[1] && match[2]) {
      const label = match[1];
      const href = match[2];
      nodes.push(
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={
            isAssistant
              ? "text-amber-600 dark:text-amber-400 underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-300 break-words font-medium transition-colors"
              : "underline underline-offset-2 hover:opacity-80 break-words font-medium transition-colors"
          }
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </a>
      );
    } else if (match[3]) {
      const url = match[3];
      const href = url.startsWith("http") ? url : `https://${url}`;
      nodes.push(
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={
            isAssistant
              ? "text-amber-600 dark:text-amber-400 underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-300 break-words font-medium transition-colors"
              : "underline underline-offset-2 hover:opacity-80 break-words font-medium transition-colors"
          }
          onClick={(e) => e.stopPropagation()}
        >
          {url}
        </a>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

export function FormattedMessageText({
  text,
  isAssistant = true,
  className = "space-y-3",
}: FormattedMessageTextProps) {
  if (!text) return null;

  // For assistant, strictly sanitize any em dashes (—) or en dashes (–) into regular hyphens (-)
  const sanitizedText = isAssistant ? text.replace(/[—–]/g, "-") : text;

  // Split into paragraphs by blank lines (\n\s*\n)
  const paragraphs = sanitizedText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  if (paragraphs.length <= 1) {
    return (
      <div className="whitespace-pre-line leading-relaxed">
        {renderTextWithLinks(sanitizedText, isAssistant)}
      </div>
    );
  }

  return (
    <div className={className}>
      {paragraphs.map((p, idx) => (
        <p key={idx} className="whitespace-pre-line leading-relaxed">
          {renderTextWithLinks(p.trim(), isAssistant)}
        </p>
      ))}
    </div>
  );
}
