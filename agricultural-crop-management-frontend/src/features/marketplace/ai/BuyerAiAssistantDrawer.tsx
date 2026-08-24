import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Bot, RotateCcw, Send, ShieldCheck, ShoppingBasket, Sparkles } from 'lucide-react';
import { MarkdownMessage } from '@/shared/ui/markdown-message';
import { AiChatSources, useBuyerAiChatSession } from '@/features/ai';
import { cn } from '@/shared/lib';
import {
  Button,
  ScrollArea,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Textarea,
} from '@/shared/ui';

type BuyerAiAssistantDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyerContext?: string;
  initialPrompt?: string;
  requestId: number;
};

const QUICK_PROMPTS = [
  {
    label: 'Độ tươi',
    prompt: 'Tôi định mua 2kg măng cụt trên mạng, làm sao để chắc chắn shop giao hàng mới hái và quả còn giữ được độ tươi ngon, không bị sượng vỏ khi nhận?',
  },
  {
    label: 'So sánh giá',
    prompt: 'Mình thấy hạt điều rang muối có chỗ bán 150k/kg, chỗ bán 250k/kg. Yếu tố nào quyết định sự chênh lệch giá này để mình cân nhắc chọn mua?',
  },
  {
    label: 'Truy xuất',
    prompt: 'Làm sao để tôi phân biệt và kiểm chứng được dâu tây bán trên sàn là hàng Đà Lạt thật chứ không phải hàng nhập nơi khác dán mác?',
  },
  {
    label: 'Vận chuyển',
    prompt: 'Mình muốn đặt mua 5kg nho mẫu đơn gửi từ Ninh Thuận vào TP.HCM. Cần yêu cầu shop đóng gói và chọn phương thức vận chuyển như thế nào để quả không bị rụng hay dập nát?',
  },
  {
    label: 'Đổi trả',
    prompt: 'Chính sách bồi thường cho hàng nông sản tươi sống thường quy định thời gian khiếu nại trong bao lâu kể từ lúc shipper giao hàng thành công?',
  },
];

export function BuyerAiAssistantDrawer({
  open,
  onOpenChange,
  buyerContext,
  initialPrompt,
  requestId,
}: BuyerAiAssistantDrawerProps) {
  const { messages, isSending, sendMessage, reset } = useBuyerAiChatSession();
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const contextPreview = useMemo(() => {
    const trimmed = buyerContext?.trim() ?? '';
    if (!trimmed) return '';
    return trimmed.length > 180 ? `${trimmed.slice(0, 180)}...` : trimmed;
  }, [buyerContext]);

  useEffect(() => {
    if (open && initialPrompt) {
      setDraft(initialPrompt);
    }
  }, [initialPrompt, open, requestId]);

  useEffect(() => {
    if (!open) return;

    const openClassName = 'buyer-ai-assistant-open';
    document.documentElement.classList.add(openClassName);
    document.body.classList.add(openClassName);

    return () => {
      document.documentElement.classList.remove(openClassName);
      document.body.classList.remove(openClassName);
    };
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSending]);

  const handleSend = () => {
    const trimmed = draft.trim();
    if (!trimmed || isSending) return;
    setDraft('');
    void sendMessage(trimmed, buyerContext);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-full gap-0 overflow-hidden border-l border-border bg-background p-0 shadow-2xl sm:w-[640px] sm:max-w-[640px] lg:w-[720px] lg:max-w-[720px]"
      >
        <SheetHeader className="border-b border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 px-5 py-5 pr-14 text-left sm:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
              <ShoppingBasket className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base font-semibold text-foreground sm:text-lg">
                Trợ lý mua nông sản
              </SheetTitle>
              <SheetDescription className="mt-1 max-w-[34rem] text-sm leading-6 text-muted-foreground">
                Đánh giá chất lượng, giá, truy xuất và rủi ro trước khi chốt đơn.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2.5">
              {QUICK_PROMPTS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  className="inline-flex h-9 items-center rounded-full border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                  onClick={() => setDraft(item.prompt)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-primary"
              onClick={() => {
                reset();
                setDraft('');
              }}
              disabled={messages.length <= 1 || isSending}
              aria-label="Làm mới hội thoại"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {contextPreview && (
            <div className="rounded-2xl border border-primary/25 bg-card px-4 py-3 text-sm text-foreground shadow-sm">
              <div className="mb-1.5 flex items-center gap-2 font-semibold text-primary">
                <ShieldCheck className="h-4 w-4" />
                Sản phẩm đang xem
              </div>
              <p className="line-clamp-3 break-words leading-6">{contextPreview}</p>
            </div>
          )}

          <div className="min-h-0 flex-1 rounded-2xl border border-border bg-card/80 shadow-inner">
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4 sm:p-5">
                {messages.map((message) => {
                  const isUser = message.role === 'user';
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        'flex items-start gap-2',
                        isUser ? 'justify-end' : 'justify-start',
                      )}
                    >
                      {!isUser && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <Bot className="h-4 w-4" />
                        </div>
                      )}
                      <div
                        className={cn(
                          'max-w-[84%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm',
                          isUser
                            ? 'bg-emerald-700 text-white'
                            : 'border border-border bg-background text-foreground',
                        )}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        ) : (
                          <>
                            <MarkdownMessage content={message.content} />
                            <AiChatSources sources={message.sources} />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {isSending && (
                  <div className="flex items-start gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground shadow-sm">
                      Đang phân tích...
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          </div>

          <div className="rounded-2xl border border-border bg-card p-3 shadow-sm focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/20">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Hỏi về chất lượng, giá, nguồn gốc hoặc vận chuyển..."
              rows={3}
              disabled={isSending}
              className="min-h-[88px] resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                AI buyer
              </span>
              <Button
                type="button"
                onClick={handleSend}
                disabled={!draft.trim() || isSending}
                className="rounded-full bg-emerald-700 px-4 text-white hover:bg-emerald-800"
              >
                <Send className="h-4 w-4" />
                Gửi
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
