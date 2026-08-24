import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, MessageSquare } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import "./ChatPage.css";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib";
import { ChatComposer } from "@/features/chat/components/ChatComposer";
import { ChatConversationList } from "@/features/chat/components/ChatConversationList";
import { ChatEmptyState } from "@/features/chat/components/ChatEmptyState";
import { ChatIdentityPanel } from "@/features/chat/components/ChatIdentityPanel";
import { ChatThreadView } from "@/features/chat/components/ChatThreadView";
import { ChatAvatar } from "@/features/chat/components/ChatAvatar";
import { useChatRealtimeState } from "@/features/chat/hooks/useChatRealtimeState";
import { useConversations } from "@/features/chat/hooks/useConversations";
import { useMarkConversationRead } from "@/features/chat/hooks/useMarkConversationRead";
import { useMessages } from "@/features/chat/hooks/useMessages";
import { useSendMessage } from "@/features/chat/hooks/useSendMessage";
import {
  formatRole,
  getChatDisplayName,
  getChatSubtitle,
  getRoleBadgeClass,
  joinDefinedParts,
} from "@/features/chat/lib/chatDisplayHelpers";
import { useChatBootstrap } from "@/features/chat/model/useChatBootstrap";

export function ChatPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const bootstrap = useChatBootstrap();

  const currentUid = bootstrap.status === "ready" ? bootstrap.appUid : null;
  const currentRole = bootstrap.status === "ready" ? bootstrap.role : null;

  const {
    conversations,
    isLoading: isConversationsLoading,
    hasLoadedConversations,
    isStartingConversation,
    error: conversationError,
    startDirectConversation,
  } = useConversations(currentUid, currentRole);

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showMobileThread, setShowMobileThread] = useState(false);
  const autoStartedPeerUserIdRef = useRef<number | null>(null);
  const requestedPeerUserId = useMemo(() => {
    const value = new URLSearchParams(location.search).get("peerUserId");
    const parsed = value ? Number(value) : NaN;
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [location.search]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedConversationId) ?? null,
    [conversations, selectedConversationId]
  );

  const messagesState = useMessages(currentUid, selectedConversationId);
  const sendState = useSendMessage(currentUid, currentRole);
  const markReadState = useMarkConversationRead(currentUid);
  const realtimeState = useChatRealtimeState({
    currentUid,
    conversationId: selectedConversationId,
    peerUid: selectedConversation?.peerUid ?? null,
  });
  const markedReadTrackerRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
      return;
    }

    if (!selectedConversationId || selectedConversation) {
      return;
    }

    if (isConversationsLoading || !hasLoadedConversations || Boolean(conversationError)) {
      return;
    }

    setSelectedConversationId(conversations[0]?.id ?? null);
  }, [
    conversationError,
    conversations,
    hasLoadedConversations,
    isConversationsLoading,
    selectedConversation,
    selectedConversationId,
  ]);

  useEffect(() => {
    if (!selectedConversationId || !currentUid) {
      return;
    }

    const latestSeq =
      messagesState.messages[messagesState.messages.length - 1]?.seq ??
      selectedConversation?.lastSeq ??
      0;

    if (latestSeq <= 0) {
      return;
    }

    const previousMarkedSeq = markedReadTrackerRef.current[selectedConversationId] ?? 0;
    if (latestSeq <= previousMarkedSeq) {
      return;
    }

    markedReadTrackerRef.current[selectedConversationId] = latestSeq;
    void markReadState.markRead({
      conversationId: selectedConversationId,
      lastReadSeq: latestSeq,
    });
  }, [
    currentUid,
    markReadState,
    messagesState.messages,
    selectedConversation?.lastSeq,
    selectedConversationId,
  ]);

  const handleSelectConversation = (conversationId: string) => {
    realtimeState.clearTypingState();
    setSelectedConversationId(conversationId);
    setShowMobileThread(true);
  };

  const handleStartConversation = async (peerUserId: number) => {
    const conversationId = await startDirectConversation(peerUserId);
    setSelectedConversationId(conversationId);
    setShowMobileThread(true);
  };

  useEffect(() => {
    if (!requestedPeerUserId || !currentUid) {
      return;
    }

    if (autoStartedPeerUserIdRef.current === requestedPeerUserId) {
      return;
    }

    autoStartedPeerUserIdRef.current = requestedPeerUserId;
    void startDirectConversation(requestedPeerUserId)
      .then((conversationId) => {
        realtimeState.clearTypingState();
        setSelectedConversationId(conversationId);
        setShowMobileThread(true);
      })
      .catch(() => {
        autoStartedPeerUserIdRef.current = null;
      });
  }, [currentUid, realtimeState, requestedPeerUserId, startDirectConversation]);

  const handleSendMessage = async (text: string) => {
    realtimeState.clearTypingState();
    await sendState.sendMessage({
      conversationId: selectedConversationId,
      text,
    });
  };

  const handleMobileBack = () => {
    realtimeState.clearTypingState();
    setShowMobileThread(false);
  };

  if (bootstrap.status === "disabled") {
    return (
      <section className="chat-page-root flex h-screen items-center justify-center p-4 sm:p-6">
        <div className="chat-panel-card max-w-md rounded-2xl p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <MessageSquare className="h-7 w-7 text-slate-400" />
          </div>
          <h1 className="chat-text-strong text-lg font-semibold">
            {t("chat.status.unavailableTitle", { defaultValue: "Chat Unavailable" })}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{bootstrap.error}</p>
        </div>
      </section>
    );
  }

  if (bootstrap.status === "loading") {
    return (
      <section className="chat-page-root flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="chat-spinner h-10 w-10 animate-spin rounded-full border-4 border-t-transparent" />
          <p className="text-sm text-slate-500">
            {t("chat.status.initializing", { defaultValue: "Initializing chat..." })}
          </p>
        </div>
      </section>
    );
  }

  if (bootstrap.status === "error") {
    return (
      <section className="chat-page-root flex h-screen items-center justify-center p-4 sm:p-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-7 w-7 text-red-400" />
          </div>
          <h1 className="text-lg font-semibold text-red-800">
            {t("chat.status.connectionFailedTitle", { defaultValue: "Connection Failed" })}
          </h1>
          <p className="mt-2 text-sm text-red-600">{bootstrap.error}</p>
          <Button
            variant="outline"
            className="mt-4 border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => window.location.reload()}
          >
            {t("chat.status.retryConnection", { defaultValue: "Retry Connection" })}
          </Button>
        </div>
      </section>
    );
  }

  const peerProfile = selectedConversation?.peerProfile ?? null;
  const threadHeaderName = getChatDisplayName(peerProfile, selectedConversation?.peerUid);
  const threadHeaderSubtitle = joinDefinedParts(
    [getChatSubtitle(peerProfile), peerProfile?.address],
    " · "
  );
  const composerTargetLabel = peerProfile?.representativeName || peerProfile?.displayName || null;
  const typingLabel = t("chat.realtime.typing", {
    defaultValue: "{{name}} is typing...",
    name: threadHeaderName,
  });

  const renderMobileBackButton = () => (
    <button
      type="button"
      aria-label={t("chat.actions.backToMessages", { defaultValue: "Back to messages" })}
      onClick={handleMobileBack}
      className="chat-back-button chat-focusable rounded-lg p-1 transition"
    >
      <ArrowLeft className="h-5 w-5" />
    </button>
  );

  const renderThreadCard = (showBackButton: boolean) => {
    if (!selectedConversation) {
      return (
        <section className="chat-panel-card flex h-full flex-col overflow-hidden rounded-2xl">
          <header className="chat-thread-header shrink-0 border-b px-4 py-3">
            <div className="flex items-center gap-3">
              {showBackButton ? renderMobileBackButton() : null}
              <MessageSquare className="chat-icon-accent h-5 w-5" />
              <h2 className="text-sm font-semibold text-slate-400">
                {t("chat.empty.selectConversationTitle", {
                  defaultValue: "Select a conversation",
                })}
              </h2>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-hidden">
            <ChatEmptyState variant="no-conversation" />
          </div>
        </section>
      );
    }

    return (
      <section className="chat-panel-card flex h-full flex-col overflow-hidden rounded-2xl">
        <header className="chat-thread-header shrink-0 border-b px-4 py-3">
          <div className="flex items-center gap-3">
            {showBackButton ? renderMobileBackButton() : null}

            <ChatAvatar
              size="sm"
              profile={peerProfile}
              fallbackUid={selectedConversation?.peerUid ?? null}
            />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="chat-text-strong truncate text-sm font-semibold">{threadHeaderName}</h2>
                {peerProfile?.role ? (
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                      getRoleBadgeClass(peerProfile.role)
                    )}
                  >
                    {formatRole(peerProfile.role)}
                  </span>
                ) : null}
              </div>
              {threadHeaderSubtitle ? (
                <p className="mt-0.5 truncate text-xs text-slate-500">{threadHeaderSubtitle}</p>
              ) : null}
            </div>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          <ChatThreadView
            messages={messagesState.messages}
            currentUid={currentUid}
            peerProfile={peerProfile}
            isLoading={messagesState.isLoading}
            error={messagesState.error}
            hasConversationSelected
            isPeerTyping={realtimeState.isPeerTyping}
            peerLastReadSeq={realtimeState.peerLastReadSeq}
            typingLabel={typingLabel}
          />
        </div>

        <ChatComposer
          disabled={!selectedConversationId}
          isSending={sendState.isSending}
          targetLabel={composerTargetLabel}
          onSend={handleSendMessage}
          onTypingStateChange={realtimeState.publishTypingState}
          error={sendState.error || markReadState.error}
        />
      </section>
    );
  };

  return (
    <section
      className="chat-page-root"
      aria-label={t("chat.pageAria", { defaultValue: "Chat" })}
      data-chat-current-uid={currentUid ?? ""}
      data-chat-selected-conversation-id={selectedConversationId ?? ""}
      data-chat-conversations-count={String(conversations.length)}
      data-chat-messages-count={String(messagesState.messages.length)}
    >
      <div
        data-testid="chat-desktop-grid"
        className="chat-layout-frame chat-desktop-grid"
        style={{ gridTemplateColumns: "340px minmax(0, 1fr) 300px" }}
      >
        <aside data-testid="chat-left-panel" className="chat-panel-shell">
          <ChatConversationList
            currentUid={currentUid}
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            onStartConversation={handleStartConversation}
            isLoading={isConversationsLoading}
            isStartingConversation={isStartingConversation}
            error={conversationError}
          />
        </aside>

        <main data-testid="chat-center-panel" className="chat-panel-shell">
          {renderThreadCard(false)}
        </main>

        <aside data-testid="chat-right-panel" className="chat-panel-shell">
          <div className="chat-panel-card h-full overflow-hidden rounded-2xl">
            <ChatIdentityPanel
              profile={peerProfile}
              peerUid={selectedConversation?.peerUid ?? null}
              hasConversation={Boolean(selectedConversation)}
            />
          </div>
        </aside>
      </div>

      <div data-testid="chat-mobile-layout" className="chat-layout-frame chat-mobile-layout">
        {showMobileThread ? (
          renderThreadCard(true)
        ) : (
          <ChatConversationList
            currentUid={currentUid}
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            onStartConversation={handleStartConversation}
            isLoading={isConversationsLoading}
            isStartingConversation={isStartingConversation}
            error={conversationError}
          />
        )}
      </div>
    </section>
  );
}

