import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Bot, Leaf, RotateCcw, Send, Sparkles } from 'lucide-react';
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
import { cn } from '@/shared/lib';
import { AiChatSources, useAiChatSession } from '@/features/ai';
import { MarkdownMessage } from '@/shared/ui/markdown-message';
import type { AiDrawerProps } from '../model/types';

const QUICK_CHIPS = [
    {
        label: 'Thời tiết',
        prompt: 'Đang giữa mùa nắng hạn gắt, vườn bưởi da xanh đang mang trái non bị héo rũ lá vào buổi trưa. Tôi nên tưới nước vào khung giờ nào và tủ gốc ra sao để cây không bị sốc nhiệt?',
    },
    {
        label: 'Chăm sóc cây',
        prompt: 'Ruộng lúa đài thơm 8 đang ở giai đoạn đẻ nhánh rộ nhưng lá chuyển màu vàng nhạt. Tôi nên bón thúc loại phân gì và liều lượng bao nhiêu kg cho 1 công (1000m2)?',
    },
    {
        label: 'Sâu bệnh',
        prompt: 'Ruộng lúa OM18 đang làm đòng thì phát hiện rầy nâu bu dưới gốc, mật độ khoảng 5-7 con/tép. Tôi cần sử dụng hoạt chất gì để phun xịt ngay bây giờ?',
    },
    {
        label: 'Chi phí',
        prompt: 'Để tiết kiệm tối đa chi phí thuê nhân công làm cỏ cho vườn xoài, tôi có thể trồng xen canh loại cây họ đậu nào phía dưới nền đất để vừa ép cỏ dại vừa cải tạo đất?',
    },
];

/**
 * AiDrawer Component
 *
 * Side drawer for AI assistant chat interface.
 * Provides quick access to AI features with context chips.
 *
 * Single Responsibility: AI assistant UI
 */
export function AiDrawer({ open, onOpenChange, portalColor }: AiDrawerProps) {
    const { messages, isSending, sendMessage, reset } = useAiChatSession({
        welcomeMessage: 'Xin chào! Tôi có thể hỗ trợ tư vấn nông nghiệp cho bạn.',
    });
    const [draft, setDraft] = useState('');
    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;

        const openClassName = 'farmer-ai-assistant-open';
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
        void sendMessage(trimmed);
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
                className="flex w-full max-w-full gap-0 overflow-hidden border-l border-border bg-background p-0 text-foreground shadow-2xl sm:w-[640px] sm:max-w-[640px] lg:w-[720px] lg:max-w-[720px]"
            >
                <SheetHeader className="px-5 py-6 pr-14 text-left sm:px-6">
                    <div className="flex items-start gap-3">
                        <div
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                            style={{ background: `linear-gradient(135deg, ${portalColor} 0%, #16a34a 100%)` }}
                        >
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 mt-0.5">
                            <SheetTitle className="text-lg font-bold text-foreground">
                                Trợ lý AI mùa vụ
                            </SheetTitle>
                            <SheetDescription className="mt-0.5 max-w-[34rem] text-sm text-muted-foreground">
                                Nhận gợi ý về thời tiết, chăm sóc cây trồng, sâu bệnh và chi phí vận hành trang trại.
                            </SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-4 sm:px-6 sm:pb-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex flex-wrap gap-2">
                            {QUICK_CHIPS.map((chip) => (
                                <button
                                    key={chip.label}
                                    type="button"
                                    className="inline-flex h-8 items-center rounded-full bg-primary/5 px-3.5 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus:outline-none focus:ring-2 focus:ring-primary/45 focus:ring-offset-2"
                                    onClick={() => setDraft(chip.prompt)}
                                >
                                    {chip.label}
                                </button>
                            ))}
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                            onClick={() => {
                                reset();
                                setDraft('');
                            }}
                            disabled={messages.length <= 1 || isSending}
                            aria-label="Làm mới hội thoại"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <div className="min-h-0 flex-1">
                        <ScrollArea className="h-full">
                            <div className="space-y-6 p-2">
                                {messages.map((message) => {
                                    const isUser = message.role === 'user';
                                    return (
                                        <div
                                            key={message.id}
                                            className={cn(
                                                'flex items-start gap-3',
                                                isUser ? 'justify-end' : 'justify-start',
                                            )}
                                        >
                                            {!isUser && (
                                                <div className="flex h-8 w-8 mt-0.5 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                                    <Sparkles className="h-4 w-4" />
                                                </div>
                                            )}
                                            <div
                                                className={cn(
                                                    'max-w-[85%] text-sm leading-relaxed',
                                                    isUser
                                                        ? 'rounded-2xl bg-primary text-primary-foreground px-4 py-2.5 shadow-sm'
                                                        : 'text-foreground pt-1.5',
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
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-8 w-8 mt-0.5 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                                            <Sparkles className="h-4 w-4" />
                                        </div>
                                        <div className="animate-pulse text-sm text-muted-foreground pt-1.5">
                                            Đang phân tích...
                                        </div>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="relative mt-2 rounded-3xl border border-border bg-card shadow-sm transition-shadow focus-within:border-primary focus-within:shadow-md focus-within:ring-1 focus-within:ring-primary">
                        <Textarea
                            placeholder="Hỏi về cây trồng, sâu bệnh, đất..."
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={isSending}
                            rows={1}
                            className="min-h-[52px] resize-none border-0 bg-transparent px-4 py-3.5 pr-14 text-sm shadow-none focus-visible:ring-0 leading-relaxed"
                        />
                        <Button
                            type="button"
                            size="icon"
                            className="absolute right-2 top-2 h-9 w-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-transform active:scale-95 disabled:opacity-50"
                            onClick={handleSend}
                            disabled={!draft.trim() || isSending}
                        >
                            <Send className="h-4 w-4 ml-0.5" />
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
