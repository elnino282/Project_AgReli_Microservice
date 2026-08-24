import { useEffect, useMemo, useRef, useState } from "react";
import {
  FolderOpen,
  Loader2,
  MapPin,
  MessageCirclePlus,
  Search,
  Tractor,
  UserRound,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib";
import { searchChatContacts } from "../api/chatContactApi";
import {
  formatRole,
  getChatDisplayName,
  getChatSubtitle,
  getRoleBadgeClass,
  joinDefinedParts,
} from "../lib/chatDisplayHelpers";
import type { ChatContactProfile, ChatConversation } from "../model/types";
import { ChatAvatar } from "./ChatAvatar";

type ChatContactSearchProps = {
  currentUid: string | null;
  conversations: ChatConversation[];
  onStartConversation: (peerUserId: number) => Promise<void>;
  onOpenExistingConversation: (conversationId: string) => void;
  isStartingConversation: boolean;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unable to search chat contacts.";
}

export function ChatContactSearch({
  currentUid: _currentUid,
  conversations,
  onStartConversation,
  onOpenExistingConversation,
  isStartingConversation,
}: ChatContactSearchProps) {
  const { t } = useTranslation();
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<ChatContactProfile[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchRequestRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const clearSearch = () => {
    setSearchInput("");
    setSearchResults([]);
    setSelectedCandidateId(null);
    setSearchError(null);
  };

  useEffect(() => {
    const query = searchInput.trim();
    if (!query || query.length < 1) {
      setSearchResults([]);
      setSelectedCandidateId(null);
      setSearchError(null);
      setIsSearching(false);
      return;
    }

    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;

    const timeoutId = window.setTimeout(() => {
      setIsSearching(true);
      setSearchError(null);

      void searchChatContacts({ query, limit: 8 })
        .then((results) => {
          if (searchRequestRef.current !== requestId) {
            return;
          }
          setSearchResults(results);
          setSelectedCandidateId((prev) => {
            if (prev && results.some((item) => item.userId === prev)) {
              return prev;
            }
            return null;
          });
        })
        .catch((searchFailure) => {
          if (searchRequestRef.current !== requestId) {
            return;
          }
          setSearchResults([]);
          setSelectedCandidateId(null);
          setSearchError(getErrorMessage(searchFailure));
        })
        .finally(() => {
          if (searchRequestRef.current === requestId) {
            setIsSearching(false);
          }
        });
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  const selectedCandidate = useMemo(
    () => searchResults.find((c) => c.userId === selectedCandidateId) ?? null,
    [searchResults, selectedCandidateId]
  );

  const existingConversationForCandidate = useMemo(() => {
    if (!selectedCandidate) {
      return null;
    }

    const peerUid = `u_${selectedCandidate.userId}`;
    return conversations.find((c) => c.peerUid === peerUid) ?? null;
  }, [selectedCandidate, conversations]);

  const handleAction = async () => {
    if (!selectedCandidate || isStartingConversation) {
      return;
    }

    if (existingConversationForCandidate) {
      onOpenExistingConversation(existingConversationForCandidate.id);
      clearSearch();
      return;
    }

    try {
      await onStartConversation(selectedCandidate.userId);
      clearSearch();
    } catch {
      // Error is surfaced by useConversations.
    }
  };

  const isSearchActive = searchInput.trim().length > 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          ref={inputRef}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && isSearchActive) {
              event.preventDefault();
              clearSearch();
            }
          }}
          placeholder={t("chat.search.placeholder", {
            defaultValue: "Tìm theo nông trại, tên, địa chỉ hoặc ID...",
          })}
          aria-label={t("chat.search.ariaLabel", {
            defaultValue: "Search chat contacts",
          })}
          aria-expanded={isSearchActive}
          className="chat-input bg-white pl-9 pr-9"
        />
        {isSearching ? (
          <Loader2 className="chat-icon-accent absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" />
        ) : isSearchActive ? (
          <button
            type="button"
            aria-label={t("chat.search.clear", { defaultValue: "Clear search" })}
            onClick={clearSearch}
            className="chat-focusable absolute right-2 top-1/2 rounded-md p-1 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {isSearchActive ? (
        <div className="chat-search-results overflow-hidden rounded-xl border">
          <div className="border-b px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {isSearching
                ? t("chat.search.searching", { defaultValue: "Searching..." })
                : searchResults.length > 0
                  ? t("chat.search.contactsFound", {
                      defaultValue: "{{count}} contact found",
                      defaultValue_plural: "{{count}} contacts found",
                      count: searchResults.length,
                    })
                  : t("chat.search.noResultsTitle", { defaultValue: "No results" })}
            </p>
          </div>

          {searchResults.length === 0 && !isSearching && !searchError ? (
            <div className="px-4 py-6 text-center">
              <FolderOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm text-slate-500">
                {t("chat.search.noMatch", { defaultValue: "No contacts match your search." })}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {t("chat.search.tryDifferent", {
                  defaultValue: "Try a different farm name, representative, or ID.",
                })}
              </p>
            </div>
          ) : null}

          {isSearching && searchResults.length === 0 ? (
            <div className="space-y-1 p-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {searchResults.length > 0 ? (
            <div className="max-h-52 space-y-0.5 overflow-y-auto p-1.5">
              {searchResults.map((candidate) => {
                const isActive = selectedCandidateId === candidate.userId;
                const primaryName = getChatDisplayName(candidate);
                const subtitle = joinDefinedParts(
                  [getChatSubtitle(candidate), candidate.address],
                  " · "
                );

                return (
                  <button
                    key={candidate.userId}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelectedCandidateId(candidate.userId)}
                    className={cn(
                      "chat-search-result-button chat-focusable w-full rounded-lg border px-3 py-2.5 text-left transition-all duration-150",
                      isActive ? "is-active" : ""
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <ChatAvatar
                        size="sm"
                        profile={candidate}
                        roleOverride={candidate.role}
                        className={cn("text-xs", !isActive && "opacity-95")}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="chat-text-strong truncate text-sm font-medium">
                            {primaryName}
                          </p>
                          {candidate.role ? (
                            <span
                              className={cn(
                                "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                                getRoleBadgeClass(candidate.role)
                              )}
                            >
                              {formatRole(candidate.role)}
                            </span>
                          ) : null}
                        </div>

                        {subtitle ? (
                          <span className="mt-0.5 block truncate text-xs text-slate-500">
                            {subtitle}
                          </span>
                        ) : null}

                        <p className="mt-0.5 text-[10px] text-slate-400">
                          {t("chat.contact.idLabel", {
                            defaultValue: "ID: #{{id}}",
                            id: candidate.userId,
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}

          {searchError ? (
            <div className="px-4 py-3 text-center">
              <p className="text-xs text-red-600">{searchError}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {selectedCandidate ? (
        <div className="chat-confirm-card rounded-xl border p-4 shadow-sm">
          <p className="chat-section-kicker text-[11px] font-semibold uppercase tracking-wider">
            {t("chat.search.confirmContact", { defaultValue: "Confirm contact" })}
          </p>

          <div className="mt-3 flex items-start gap-3">
            <ChatAvatar
              size="sm"
              profile={selectedCandidate}
              roleOverride={selectedCandidate.role}
            />
            <div className="min-w-0 flex-1">
              <p className="chat-text-strong truncate text-sm font-semibold">
                {getChatDisplayName(selectedCandidate)}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">#{selectedCandidate.userId}</p>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <div className="chat-info-inline flex items-start gap-2.5 text-sm">
              <Tractor className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {selectedCandidate.farmName ||
                  t("chat.contact.noFarmProfile", { defaultValue: "No farm profile yet" })}
              </span>
            </div>
            <div className="chat-info-inline flex items-start gap-2.5 text-sm">
              <UserRound className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{selectedCandidate.representativeName}</span>
            </div>
            <div className="chat-info-inline flex items-start gap-2.5 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {selectedCandidate.address ||
                  t("chat.contact.noAddress", { defaultValue: "No address provided" })}
              </span>
            </div>
            {selectedCandidate.role ? (
              <div className="flex items-center gap-2.5">
                <Badge
                  className={cn(
                    "text-xs font-medium",
                    getRoleBadgeClass(selectedCandidate.role)
                  )}
                >
                  {formatRole(selectedCandidate.role)}
                </Badge>
              </div>
            ) : null}
          </div>

          <Button
            type="button"
            className="chat-primary-button mt-4 w-full text-white shadow-sm"
            disabled={isStartingConversation}
            onClick={() => {
              void handleAction();
            }}
          >
            {isStartingConversation ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageCirclePlus className="mr-2 h-4 w-4" />
            )}
            {existingConversationForCandidate
              ? t("chat.actions.openConversation", { defaultValue: "Open conversation" })
              : t("chat.actions.startConversationWith", {
                  defaultValue: "Start conversation with {{name}}",
                  name: getChatDisplayName(selectedCandidate),
                })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
