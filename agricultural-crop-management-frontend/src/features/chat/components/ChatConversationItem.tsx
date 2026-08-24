import { Badge } from "@/shared/ui/badge";
import { useTranslation } from "react-i18next";
import { cn } from "@/shared/lib";
import {
  formatChatTime,
  formatRole,
  getChatDisplayName,
  getChatSubtitle,
  getRoleBadgeClass,
  joinDefinedParts,
} from "../lib/chatDisplayHelpers";
import type { ChatConversation } from "../model/types";
import { ChatAvatar } from "./ChatAvatar";

type ChatConversationItemProps = {
  conversation: ChatConversation;
  isSelected: boolean;
  onSelect: () => void;
};

function getSmartSubtitle(conversation: ChatConversation): string | null {
  const profile = conversation.peerProfile;
  if (!profile) {
    return null;
  }

  const primary = getChatDisplayName(profile, conversation.peerUid);
  const baseSubtitle = getChatSubtitle(profile);
  const formattedRole = profile.role ? formatRole(profile.role) : null;

  if (baseSubtitle && baseSubtitle === formattedRole) {
    return profile.address || null;
  }

  if (baseSubtitle && baseSubtitle === primary) {
    return profile.address || null;
  }

  return joinDefinedParts([baseSubtitle, profile.address], " · ");
}

export function ChatConversationItem({
  conversation,
  isSelected,
  onSelect,
}: ChatConversationItemProps) {
  const { t } = useTranslation();
  const profile = conversation.peerProfile;
  const primaryName = getChatDisplayName(profile, conversation.peerUid);
  const subtitle = getSmartSubtitle(conversation);
  const timeLabel = formatChatTime(conversation.lastMessageAt);
  const hasUnread = conversation.unreadCount > 0;
  const openConversationLabel = t("chat.actions.openConversationWith", {
    defaultValue: "Open conversation with {{name}}",
    name: primaryName,
  }).replace("{{name}}", primaryName);
  const unreadCountLabel = t("chat.messages.unreadCount", {
    defaultValue: "{{count}} unread messages",
    count: conversation.unreadCount,
  }).replace("{{count}}", String(conversation.unreadCount));

  return (
    <button
      type="button"
      aria-current={isSelected ? "true" : undefined}
      aria-selected={isSelected}
      aria-label={openConversationLabel}
      data-conversation-id={conversation.id}
      data-selected={isSelected ? "true" : "false"}
      className="chat-conversation-item chat-focusable group w-full rounded-xl px-2 py-1 text-left"
      onClick={onSelect}
    >
      <div
        className={cn(
          "chat-conversation-item__card relative flex items-start gap-3 rounded-xl px-3 py-3 transition-all duration-150",
          isSelected ? "is-selected" : ""
        )}
      >
        <div className="relative shrink-0">
          <ChatAvatar
            size="md"
            profile={profile}
            fallbackUid={conversation.peerUid}
          />
          {/* Online indicator dot — Figma spec: red dot top-right of avatar */}
          {hasUnread ? (
            <span
              className="chat-online-dot"
              aria-hidden="true"
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p
                  className={cn(
                    "chat-text-strong truncate text-[13px] leading-tight",
                    hasUnread ? "font-bold" : "font-semibold"
                  )}
                >
                  {primaryName}
                </p>
                {profile?.role ? (
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-medium",
                      getRoleBadgeClass(profile.role)
                    )}
                  >
                    {formatRole(profile.role)}
                  </span>
                ) : null}
              </div>

              {subtitle ? (
                <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-500">
                  {subtitle}
                </p>
              ) : null}
            </div>

            <div className="shrink-0 pt-0.5 text-right">
              {timeLabel ? (
                <span
                  className={cn(
                    "block whitespace-nowrap text-[10px]",
                    hasUnread ? "chat-timestamp--unread font-semibold" : "text-slate-400"
                  )}
                >
                  {timeLabel}
                </span>
              ) : null}
              {hasUnread ? (
                <Badge
                  className="chat-unread-badge mt-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] text-white shadow-sm"
                  aria-label={unreadCountLabel}
                >
                  {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
                </Badge>
              ) : null}
            </div>
          </div>

          <p
            className={cn(
              "mt-1.5 line-clamp-1 text-[11px] leading-relaxed",
              hasUnread ? "font-medium text-slate-700" : "text-slate-400"
            )}
          >
            {conversation.lastMessageText ||
              t("chat.messages.noMessagesYet", { defaultValue: "No messages yet" })}
          </p>
        </div>
      </div>
    </button>
  );
}
