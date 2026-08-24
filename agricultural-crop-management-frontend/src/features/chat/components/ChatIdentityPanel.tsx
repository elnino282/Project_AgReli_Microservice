import type { ComponentType } from "react";
import {
  Hash,
  Info,
  MapPin,
  MessageSquare,
  Shield,
  Tractor,
  UserRound,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib";
import {
  formatRole,
  getChatDisplayName,
  getRoleBadgeClass,
} from "../lib/chatDisplayHelpers";
import type { ChatContactProfile } from "../model/types";
import { ChatAvatar } from "./ChatAvatar";

type ChatIdentityPanelProps = {
  profile: ChatContactProfile | null;
  peerUid: string | null;
  hasConversation: boolean;
};

function InfoRow({
  icon: Icon,
  label,
  value,
  emptyValue,
  muted = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | null;
  emptyValue: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="chat-info-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
        <p
          className={cn(
            "mt-0.5 text-sm leading-relaxed",
            muted ? "italic text-slate-400" : "chat-text-strong"
          )}
        >
          {value || emptyValue}
        </p>
      </div>
    </div>
  );
}

function IdentityPlaceholder() {
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col">
      <div className="chat-contact-header shrink-0 border-b px-4 py-3">
        <h3 className="chat-text-strong text-sm font-semibold">
          {t("chat.identity.title", { defaultValue: "Contact details" })}
        </h3>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="relative mb-5">
          <div className="chat-empty-orb flex h-20 w-20 items-center justify-center rounded-full">
            <UserRound className="h-9 w-9" />
          </div>
          <div className="chat-floating-icon absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border bg-white shadow-sm">
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
        </div>

        <h4 className="chat-text-strong mb-2 text-center text-sm font-semibold">
          {t("chat.identity.title", { defaultValue: "Contact details" })}
        </h4>
        <p className="mb-6 text-center text-xs leading-relaxed text-slate-500">
          {t("chat.identity.selectConversationHint", {
            defaultValue:
              "Select a conversation to view farm, representative, role, address, and internal ID.",
          })}
        </p>

        <div className="chat-context-card w-full rounded-xl border p-4">
          <div className="mb-2 flex items-center gap-2">
            <Info className="chat-icon-accent h-3.5 w-3.5" />
            <p className="chat-section-kicker text-[11px] font-semibold uppercase tracking-wider">
              {t("chat.identity.whyThisMatters", { defaultValue: "Why this matters" })}
            </p>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            {t("chat.identity.verifyIdentity", {
              defaultValue:
                "Verify identity before discussing orders, pricing, delivery, or farm work.",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ChatIdentityPanel({
  profile,
  peerUid,
  hasConversation,
}: ChatIdentityPanelProps) {
  const { t } = useTranslation();

  if (!hasConversation) {
    return <IdentityPlaceholder />;
  }

  const displayName = getChatDisplayName(profile, peerUid);
  const emptyValue = t("chat.identity.notProvided", { defaultValue: "Not provided yet" });

  if (!profile) {
    return (
      <div className="flex h-full flex-col">
        <div className="chat-contact-header shrink-0 border-b px-4 py-3">
          <h3 className="chat-text-strong text-sm font-semibold">
            {t("chat.identity.title", { defaultValue: "Contact details" })}
          </h3>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center">
            <div className="mx-auto mb-4 h-20 w-20 animate-pulse rounded-full bg-slate-100" />
            <div className="mx-auto mb-2 h-4 w-32 animate-pulse rounded bg-slate-100" />
            <div className="mx-auto h-3 w-20 animate-pulse rounded bg-slate-50" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="chat-contact-header shrink-0 border-b px-4 py-3">
        <h3 className="chat-text-strong text-sm font-semibold">
          {t("chat.identity.title", { defaultValue: "Contact details" })}
        </h3>
      </div>

      <div className="chat-identity-scroll flex-1 overflow-y-auto p-5">
        <div className="chat-identity-card mb-6 rounded-2xl border p-4 text-center">
          <ChatAvatar
            size="lg"
            profile={profile}
            fallbackUid={peerUid}
            className="mx-auto mb-3 chat-avatar-ring"
          />
          <h4 className="chat-text-strong text-base font-semibold">{displayName}</h4>
          {profile.role ? (
            <Badge
              className={cn(
                "mt-2 text-xs font-medium",
                getRoleBadgeClass(profile.role)
              )}
            >
              {formatRole(profile.role)}
            </Badge>
          ) : null}
        </div>

        <div className="chat-divider mb-4 border-t" />

        <div className="space-y-1">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {t("chat.identity.contactInformation", { defaultValue: "Contact information" })}
          </p>

          <InfoRow
            icon={Tractor}
            label={t("chat.identity.farm", { defaultValue: "Farm" })}
            value={profile.farmName}
            emptyValue={emptyValue}
            muted={!profile.farmName}
          />
          <InfoRow
            icon={UserRound}
            label={t("chat.identity.representative", { defaultValue: "Representative" })}
            value={profile.representativeName}
            emptyValue={emptyValue}
          />
          <InfoRow
            icon={MapPin}
            label={t("chat.identity.address", { defaultValue: "Address" })}
            value={profile.address}
            emptyValue={emptyValue}
            muted={!profile.address}
          />
          <InfoRow
            icon={Shield}
            label={t("chat.identity.role", { defaultValue: "Role" })}
            value={profile.role ? formatRole(profile.role) : null}
            emptyValue={emptyValue}
            muted={!profile.role}
          />
          <InfoRow
            icon={Hash}
            label={t("chat.identity.internalId", { defaultValue: "Internal ID" })}
            value={`#${profile.userId}`}
            emptyValue={emptyValue}
          />
        </div>

        <div className="chat-context-card mt-6 rounded-xl border p-3">
          <p className="chat-section-kicker mb-1 text-[11px] font-medium">
            {t("chat.identity.conversationContext", { defaultValue: "Conversation context" })}
          </p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            {t("chat.identity.contextDescription", {
              defaultValue:
                "Contact details are provided to help verify identity before discussing orders, pricing, delivery, or farm work.",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
