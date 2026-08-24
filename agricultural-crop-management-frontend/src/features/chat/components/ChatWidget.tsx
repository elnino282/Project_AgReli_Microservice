import { useEffect, useRef, useState } from "react";
import { Maximize2, Minus, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib";
import { useChatWidget } from "../hooks/useChatWidget";
import { ChatWidgetConversationList } from "./ChatWidgetConversationList";
import "./ChatWidget.css";
import { ChatWidgetWindow } from "./ChatWidgetWindow";

type ChatWidgetProps = {
  isOpen: boolean;
  onMinimize: () => void;
  onClose: () => void;
  onExpand: () => void;
  onUnreadCountChange?: (count: number) => void;
  activePeerUserId?: number | null;
};

/**
 * ChatWidget renders the floating popup.
 *
 * When `isOpen` is false the shell is hidden via CSS (`display: none`)
 * rather than unmounted. This preserves conversation state, selected
 * conversation, search query, scroll position, and loaded messages
 * across minimize/reopen cycles.
 */
export function ChatWidget({
  isOpen,
  onMinimize,
  onClose,
  onExpand,
  onUnreadCountChange,
  activePeerUserId,
}: ChatWidgetProps) {
  const widget = useChatWidget();
  const [showMobileDetail, setShowMobileDetail] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const totalUnreadLabel =
    widget.totalUnreadCount > 99 ? "99+" : String(widget.totalUnreadCount);

  useEffect(() => {
    onUnreadCountChange?.(widget.totalUnreadCount);
  }, [onUnreadCountChange, widget.totalUnreadCount]);

  useEffect(() => {
    if (isOpen && activePeerUserId != null) {
      void widget.startConversation(activePeerUserId).then(() => {
        setShowMobileDetail(true);
      });
    }
  }, [isOpen, activePeerUserId, widget.startConversation]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onMinimize();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onMinimize]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.documentElement.classList.add("chat-widget-page-lock");
    document.body.classList.add("chat-widget-page-lock");

    return () => {
      document.documentElement.classList.remove("chat-widget-page-lock");
      document.body.classList.remove("chat-widget-page-lock");
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [widget.messages.length, widget.selectedConversationId, isOpen]);

  const handleSelectConversation = (conversationId: string) => {
    void widget.selectConversation(conversationId);
    setShowMobileDetail(true);
  };

  const handleMobileBack = () => {
    setShowMobileDetail(false);
  };

  return (
    <section
      className={cn("chat-widget-shell", !isOpen && "chat-widget-shell--hidden")}
      role="dialog"
      aria-label="Chat"
      aria-modal="false"
      aria-hidden={!isOpen}
    >
      <header className="chat-widget-header">
        <div className="chat-widget-header__title">
          <h2>Chat</h2>
          <span aria-label={`${totalUnreadLabel} unread messages`}>({totalUnreadLabel})</span>
        </div>
        <div className="chat-widget-header__actions">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Minimize chat"
            onClick={onMinimize}
          >
            <Minus className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Expand chat"
            onClick={onExpand}
          >
            <Maximize2 className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close chat"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </header>

      <div className="chat-widget-body">
        <div
          className={cn(
            "chat-widget-mobile-pane",
            showMobileDetail && "chat-widget-mobile-pane--hidden",
          )}
        >
          <ChatWidgetConversationList
            conversations={widget.filteredConversations}
            selectedConversationId={widget.selectedConversationId}
            searchQuery={widget.searchQuery}
            filter={widget.filter}
            isLoading={widget.isLoading}
            error={widget.error}
            onSearchChange={widget.setSearchQuery}
            onFilterChange={widget.setFilter}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        <div
          className={cn(
            "chat-widget-mobile-pane",
            !showMobileDetail && "chat-widget-mobile-pane--detail-hidden",
          )}
        >
          <ChatWidgetWindow
            conversation={widget.selectedConversation}
            messages={widget.messages}
            currentUid={widget.currentUid}
            isMessagesLoading={widget.isMessagesLoading}
            isSending={widget.isSending}
            error={widget.messagesError}
            onBack={handleMobileBack}
            onSend={widget.sendMessage}
            bottomRef={bottomRef}
          />
        </div>
      </div>
    </section>
  );
}
