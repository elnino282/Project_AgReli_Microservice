import { useState } from "react";
import { AlertCircle, Image, Loader2, SendHorizonal, Smile } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib";

type ChatComposerProps = {
  disabled: boolean;
  isSending: boolean;
  targetLabel?: string | null;
  onSend: (text: string) => Promise<void>;
  onTypingStateChange?: (isTyping: boolean) => void;
  error: string | null;
};

const MAX_CHARACTERS = 2000;

/**
 * ChatComposer — message input area.
 *
 * Figma spec (node 324-107):
 *  - Top toolbar row: icon buttons (Image, Sticker/Smile) with border-bottom
 *  - Textarea below toolbar
 *  - Send button (circle-ish) on the right
 *  - Toolbar buttons are 31.5×31.5px, rounded 3.5px
 */
export function ChatComposer({
  disabled,
  isSending,
  targetLabel,
  onSend,
  onTypingStateChange,
  error,
}: ChatComposerProps) {
  const { t } = useTranslation();
  const [text, setText] = useState("");

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || disabled || isSending) {
      return;
    }

    onTypingStateChange?.(false);
    await onSend(trimmed);
    setText("");
  };

  const charCount = text.length;
  const isNearLimit = charCount > MAX_CHARACTERS * 0.9;

  return (
    <div className="chat-composer rounded-b-2xl border-t">
      {/* Error banner */}
      {error ? (
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-2 py-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
          <p className="flex-1 text-xs text-red-600">{error}</p>
        </div>
      ) : null}

      {/* ── Toolbar row (Figma: icon buttons above textarea) ── */}
      <div
        className="chat-composer-toolbar flex items-center gap-[7px] border-b px-[10.5px] pb-[7.8px] pt-[7px]"
        role="toolbar"
        aria-label={t("chat.composer.toolbarAria", { defaultValue: "Message options" })}
      >
        {/* Image upload — UI placeholder (disabled until backend support) */}
        <button
          type="button"
          disabled
          title={t("chat.composer.imageUpload", { defaultValue: "Image (coming soon)" })}
          aria-label={t("chat.composer.imageUpload", { defaultValue: "Attach image" })}
          className="chat-composer-toolbar-btn"
        >
          <Image className="h-[17.5px] w-[17.5px]" aria-hidden="true" />
        </button>

        {/* Sticker / Emoji — UI placeholder */}
        <button
          type="button"
          disabled
          title={t("chat.composer.sticker", { defaultValue: "Sticker (coming soon)" })}
          aria-label={t("chat.composer.sticker", { defaultValue: "Add sticker" })}
          className="chat-composer-toolbar-btn"
        >
          <Smile className="h-[17.5px] w-[17.5px]" aria-hidden="true" />
        </button>
      </div>

      {/* ── Text input + send button ── */}
      <div className="flex items-end gap-2 px-3 py-3">
        <div className="relative flex-1">
          <Textarea
            value={text}
            onChange={(event) => {
              const nextValue = event.target.value;
              const normalizedValue =
                nextValue.length > MAX_CHARACTERS
                  ? nextValue.slice(0, MAX_CHARACTERS)
                  : nextValue;

              setText(normalizedValue);
              onTypingStateChange?.(Boolean(normalizedValue.trim()));
            }}
            onBlur={() => onTypingStateChange?.(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSend();
              }
            }}
            placeholder={
              disabled
                ? t("chat.composer.selectConversationPlaceholder", {
                    defaultValue: "Select a conversation to start typing...",
                  })
                : targetLabel
                  ? t("chat.composer.messageTargetPlaceholder", {
                      defaultValue: "Message {{target}}...",
                      target: targetLabel,
                    })
                  : t("chat.composer.messagePlaceholder", {
                      defaultValue: "Nhập tin nhắn...",
                    })
            }
            aria-label={t("chat.composer.messageInputAria", {
              defaultValue: "Message input",
            })}
            rows={2}
            disabled={disabled || isSending}
            className={cn(
              "chat-input min-h-[60px] resize-none pr-14 text-[14px]",
              disabled && "bg-slate-50"
            )}
          />
          <div className="absolute bottom-1.5 right-2">
            <span
              className={cn(
                "text-[10px]",
                isNearLimit ? "font-medium text-amber-500" : "text-slate-300"
              )}
            >
              {charCount}/{MAX_CHARACTERS}
            </span>
          </div>
        </div>

        {/* Send button */}
        <Button
          type="button"
          aria-label={t("chat.composer.sendAria", {
            defaultValue: "Send message",
          })}
          className={cn(
            "chat-send-button h-10 w-10 rounded-xl p-0 transition-all",
            disabled || isSending || !text.trim()
              ? "cursor-not-allowed bg-slate-200 text-slate-400"
              : "text-white shadow-sm hover:shadow-md"
          )}
          disabled={disabled || isSending || !text.trim()}
          onClick={() => {
            void handleSend();
          }}
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SendHorizonal className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
