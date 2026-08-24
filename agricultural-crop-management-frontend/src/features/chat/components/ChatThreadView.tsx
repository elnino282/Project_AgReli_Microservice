import { useEffect, useRef } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import { formatDateSeparator, getChatDisplayName } from "../lib/chatDisplayHelpers";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatMessageBubble } from "./ChatMessageBubble";
import type { ChatContactProfile, ChatMessage } from "../model/types";

type ChatThreadViewProps = {
  messages: ChatMessage[];
  currentUid: string | null;
  peerProfile: ChatContactProfile | null;
  isLoading: boolean;
  error: string | null;
  hasConversationSelected: boolean;
  isPeerTyping?: boolean;
  peerLastReadSeq?: number;
  typingLabel?: string;
  onRetry?: () => void;
};

function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) {
    return false;
  }

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function ChatThreadView({
  messages,
  currentUid,
  peerProfile,
  isLoading,
  error,
  hasConversationSelected,
  isPeerTyping = false,
  peerLastReadSeq = 0,
  typingLabel,
  onRetry,
}: ChatThreadViewProps) {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  const handleThreadScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom <= 48;
  };

  useEffect(() => {
    if (!shouldAutoScrollRef.current) {
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, isPeerTyping]);

  if (!hasConversationSelected) {
    return <ChatEmptyState variant="no-conversation" />;
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="chat-spinner h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-sm text-slate-500">
            {t("chat.thread.loadingMessages", { defaultValue: "Loading messages..." })}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <div className="max-w-xs text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <p className="mb-3 text-sm text-red-600">{error}</p>
          {onRetry ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="border-red-200 text-red-600 hover:bg-red-50"
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              {t("common.retry", { defaultValue: "Retry" })}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return <ChatEmptyState variant="no-messages" />;
  }

  const peerLabel = getChatDisplayName(peerProfile);
  const resolvedTypingLabel =
    typingLabel ??
    t("chat.realtime.typing", {
      defaultValue: "{{name}} is typing...",
      name: peerLabel,
    });

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleThreadScroll}
      className="chat-thread-scroll chat-thread-gradient h-full space-y-3 overflow-y-auto px-[14px] py-[14px]"
      data-chat-panel="thread"
      aria-live="polite"
    >
      {messages.map((message, index) => {
        const isMine = currentUid === message.senderUid;
        const prevMessage = index > 0 ? messages[index - 1] : null;
        const showDateSeparator =
          !prevMessage || !isSameDay(prevMessage.createdAt, message.createdAt);

        return (
          <div key={message.id}>
            {showDateSeparator ? (
              <div className="chat-date-separator-wrap py-3">
                <span className="chat-date-separator">{formatDateSeparator(message.createdAt)}</span>
              </div>
            ) : null}
            <ChatMessageBubble
              message={message}
              isMine={isMine}
              peerLabel={peerLabel}
              peerLastReadSeq={peerLastReadSeq}
            />
          </div>
        );
      })}

      {isPeerTyping ? (
        <div className="flex justify-start" aria-live="polite">
          <div className="chat-typing-indicator rounded-full px-3 py-2 text-xs font-medium">
            <span className="chat-typing-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span>{resolvedTypingLabel}</span>
          </div>
        </div>
      ) : null}

      <div ref={bottomRef} />
    </div>
  );
}
