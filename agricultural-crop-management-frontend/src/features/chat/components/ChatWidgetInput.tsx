import { useState } from "react";
import { ClipboardList, ImageIcon, Loader2, SendHorizonal, Smile, Video } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";

type ChatWidgetInputProps = {
  disabled: boolean;
  isSending: boolean;
  onSend: (content: string) => Promise<void>;
};

export function ChatWidgetInput({ disabled, isSending, onSend }: ChatWidgetInputProps) {
  const [value, setValue] = useState("");
  const canSend = value.trim().length > 0 && !disabled && !isSending;

  const handleSend = async () => {
    const trimmedValue = value.trim();
    if (!trimmedValue || disabled || isSending) {
      return;
    }

    await onSend(trimmedValue);
    setValue("");
  };

  return (
    <form
      className="chat-widget-input"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSend();
      }}
    >
      <div className="chat-widget-input__main">
        <Textarea
          aria-label="Message input"
          value={value}
          disabled={disabled || isSending}
          rows={1}
          placeholder="Nhập nội dung tin nhắn"
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
        />
        <div className="chat-widget-input__tools" aria-hidden="true">
          <span>
            <Smile className="h-5 w-5" />
          </span>
          <span>
            <ImageIcon className="h-5 w-5" />
          </span>
          <span>
            <Video className="h-5 w-5" />
          </span>
          <span>
            <ClipboardList className="h-5 w-5" />
          </span>
        </div>
      </div>
      <Button
        type="submit"
        aria-label="Send message"
        className="chat-widget-input__send"
        disabled={!canSend}
      >
        {isSending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <SendHorizonal className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
    </form>
  );
}
