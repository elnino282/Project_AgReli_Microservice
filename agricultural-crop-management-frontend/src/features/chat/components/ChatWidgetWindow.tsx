import type { RefObject } from "react";
import { ArrowLeft, Star, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { useMarketplaceFarmDetail } from "@/features/marketplace/hooks";
import {
  getChatDisplayName,
  getChatSubtitle,
  joinDefinedParts,
} from "../lib/chatDisplayHelpers";
import type { ChatConversation, ChatMessage } from "../model/types";
import { ChatWidgetEmptyState } from "./ChatWidgetEmptyState";
import { ChatWidgetInput } from "./ChatWidgetInput";
import { ChatWidgetMessageBubble } from "./ChatWidgetMessageBubble";

type ChatWidgetWindowProps = {
  conversation: ChatConversation | null;
  messages: ChatMessage[];
  currentUid: string | null;
  isMessagesLoading: boolean;
  isSending: boolean;
  error: string | null;
  onBack: () => void;
  onSend: (content: string) => Promise<void>;
  bottomRef: RefObject<HTMLDivElement>;
};

function getAvatarLabel(conversation: ChatConversation): string {
  return getChatDisplayName(conversation.peerProfile, conversation.peerUid)
    .slice(0, 1)
    .toUpperCase();
}

function getFarmId(conversation: ChatConversation): number | null {
  return conversation.peerProfile?.farmId ?? conversation.peerUserId ?? null;
}

function getRatingDisplay(
  source: { ratingAverage?: number | null; ratingCount?: number | null } | null | undefined,
): { score: string; countLabel: string } | null {
  const rating = source?.ratingAverage;
  const count = source?.ratingCount;
  if (typeof rating !== "number" || typeof count !== "number" || count <= 0) {
    return null;
  }

  return {
    score: rating.toFixed(1),
    countLabel: `(${count} đánh giá)`,
  };
}

export function ChatWidgetWindow({
  conversation,
  messages,
  currentUid,
  isMessagesLoading,
  isSending,
  error,
  onBack,
  onSend,
  bottomRef,
}: ChatWidgetWindowProps) {
  const farmId = conversation ? getFarmId(conversation) : null;
  const farmDetailQuery = useMarketplaceFarmDetail(farmId ?? undefined);

  if (!conversation) {
    return (
      <main className="chat-widget-window chat-widget-window--empty">
        <ChatWidgetEmptyState />
      </main>
    );
  }

  const profile = conversation.peerProfile;
  const displayName = getChatDisplayName(profile, conversation.peerUid);
  const subtitle = joinDefinedParts([getChatSubtitle(profile), profile?.address], " - ");
  const ratingDisplay = getRatingDisplay(farmDetailQuery.data ?? profile);

  return (
    <main className="chat-widget-window">
      <header className="chat-widget-thread-header">
        <button
          type="button"
          className="chat-widget-back"
          aria-label="Back to conversations"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="chat-widget-thread-header__identity">
          <div className="chat-widget-avatar chat-widget-avatar--header" aria-hidden="true">
            {profile?.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" referrerPolicy="no-referrer" />
            ) : (
              getAvatarLabel(conversation)
            )}
          </div>

          <div className="chat-widget-farm-card">
            <div className="chat-widget-farm-card__main">
              <h3 className="chat-widget-thread-header__name">
                <span>{displayName}</span>
              </h3>
              {subtitle ? <p>{subtitle}</p> : null}
              <div className="chat-widget-farm-card__meta">
                {farmDetailQuery.isLoading ? (
                  <span className="chat-widget-farm-card__rating-muted">
                    Đang tải đánh giá...
                  </span>
                ) : ratingDisplay ? (
                  <span className="chat-widget-farm-card__rating">
                    <Star className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{ratingDisplay.score}</span>
                    <span className="chat-widget-farm-card__rating-count">
                      {ratingDisplay.countLabel}
                    </span>
                  </span>
                ) : (
                  <span className="chat-widget-farm-card__rating-muted">
                    Chưa có đánh giá
                  </span>
                )}
              </div>
            </div>

            {farmId ? (
              <div className="chat-widget-farm-card__actions">
                <Button asChild size="sm" className="chat-widget-farm-card__button">
                  <Link to={`/marketplace/farms/${farmId}`}>
                    <Store className="h-3.5 w-3.5" aria-hidden="true" />
                    Xem nông trại
                  </Link>
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="chat-widget-messages" aria-live="polite">
        {isMessagesLoading ? <p className="chat-widget-muted">Đang tải tin nhắn...</p> : null}
        {error ? <p className="chat-widget-error">{error}</p> : null}
        {!isMessagesLoading && !error && messages.length === 0 ? (
          <p className="chat-widget-muted">Chưa có tin nhắn nào.</p>
        ) : null}
        {messages.map((message) => (
          <ChatWidgetMessageBubble
            key={message.id}
            message={message}
            currentUid={currentUid}
            peerLabel={displayName}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <ChatWidgetInput disabled={!conversation} isSending={isSending} onSend={onSend} />
    </main>
  );
}
