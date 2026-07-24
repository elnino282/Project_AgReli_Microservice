import { MarkdownMessage } from '@/components/MarkdownMessage';
import { AiChatSources, useAiChatSession } from '@/features/ai';
import { useI18n } from '@/shared/lib/hooks/useI18n';
import { cn } from '@/shared/lib';
import {
    Badge,
    Button,
    PageContainer,
    PageHeader,
    ScrollArea,
    Textarea,
} from '@/shared/ui';
import { Bot, Leaf, RotateCcw, Send, Sparkles, User } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

export function AiAssistantPage() {
    const { t } = useI18n();
    const { messages, isSending, sendMessage, reset } = useAiChatSession();
    const [draft, setDraft] = useState('');
    const [cropContext, setCropContext] = useState('');
    const bottomRef = useRef<HTMLDivElement | null>(null);

    const QUICK_PROMPTS = useMemo(() => [
        t('ai.quickPrompts.yellowLeaves'),
        t('ai.quickPrompts.tomatoWatering'),
        t('ai.quickPrompts.leafRoller'),
        t('ai.quickPrompts.cornFertilizer'),
        t('ai.quickPrompts.acidSoil'),
        t('ai.quickPrompts.watermelonHarvest'),
    ], [t]);

    const CONTEXT_TEMPLATES = useMemo(() => [
        {
            label: t('ai.contextTemplates.riceTillering.label'),
            value: t('ai.contextTemplates.riceTillering.value'),
        },
        {
            label: t('ai.contextTemplates.vegetables.label'),
            value: t('ai.contextTemplates.vegetables.value'),
        },
        {
            label: t('ai.contextTemplates.coffeeFlowering.label'),
            value: t('ai.contextTemplates.coffeeFlowering.value'),
        },
        {
            label: t('ai.contextTemplates.fruitTrees.label'),
            value: t('ai.contextTemplates.fruitTrees.value'),
        },
    ], [t]);

    const contextPreview = useMemo(() => {
        const trimmed = cropContext.trim();
        if (!trimmed) return '';
        return trimmed.length > 140 ? `${trimmed.slice(0, 140)}...` : trimmed;
    }, [cropContext]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [messages, isSending]);

    const handleSend = () => {
        const trimmed = draft.trim();
        if (!trimmed || isSending) return;
        setDraft('');
        void sendMessage(trimmed, cropContext);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSend();
        }
    };

    const handleReset = () => {
        reset();
        setDraft('');
    };

    const handleContextApply = (value: string) => {
        setCropContext((prev) => {
            const trimmed = prev.trim();
            if (!trimmed) return value;
            if (trimmed.includes(value)) return prev;
            return `${trimmed}\n${value}`;
        });
    };

    const canReset = messages.length > 1;

    return (
        <PageContainer maxWidth="default">
            {/* --- BẮT ĐẦU PHẦN CHỈNH SỬA --- */}
            <div className="mb-8">
                <PageHeader
                    className="mb-0"
                    icon={<Bot className="w-8 h-8 text-primary" />}
                    title={t('ai.assistant.title')}
                    subtitle={t('ai.assistant.subtitle')}
                    actions={(
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReset}
                            disabled={!canReset}
                            className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                        >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            {t('common.reset', 'Làm mới hội thoại')}
                        </Button>
                    )}
                />
            </div>
            {/* --- KẾT THÚC PHẦN CHỈNH SỬA --- */}

            <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
                <section className="flex flex-col w-full max-w-3xl">
                    <header className="mb-4">
                        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                            <Leaf className="w-5 h-5 text-primary" />
                            {t('ai.chat.title')}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('ai.chat.description')}
                        </p>
                    </header>
                    <div className="flex flex-1 flex-col gap-4">
                        <ScrollArea className="h-[420px] sm:h-[520px] rounded-xl border bg-card shadow-sm">
                            <div className="space-y-4 p-4">
                                {messages.map((message) => {
                                    const isUser = message.role === 'user';
                                    return (
                                        <div
                                            key={message.id}
                                            className={cn(
                                                'flex items-start gap-3',
                                                isUser ? 'justify-end' : 'justify-start'
                                            )}
                                        >
                                            {!isUser && (
                                                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                                    <Bot className="h-4 w-4" />
                                                </div>
                                            )}
                                            <div
                                                className={cn(
                                                    'max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed shadow-sm',
                                                    isUser
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-card border'
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
                                            {isUser && (
                                                <div className="h-9 w-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                                                    <User className="h-4 w-4" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {isSending && (
                                    <div className="flex items-start gap-3">
                                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                                            <Bot className="h-4 w-4" />
                                        </div>
                                        <div className="rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground animate-pulse">
                                            {t('ai.chat.analyzing')}
                                        </div>
                                    </div>
                                )}
                                <div ref={bottomRef} />
                            </div>
                        </ScrollArea>

                        {contextPreview && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="info">{t('ai.context.label')}</Badge>
                                <span className="truncate flex-1 min-w-0">{contextPreview}</span>
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-1">
                            {QUICK_PROMPTS.map((prompt) => (
                                <Button
                                    key={prompt}
                                    variant="outline"
                                    size="sm"
                                    className="min-h-[44px] whitespace-normal text-left h-auto py-1.5 px-3 text-xs bg-muted/30 hover:bg-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                                    onClick={() => setDraft(prompt)}
                                >
                                    <Sparkles className="w-3 h-3 mr-1.5 text-primary" />
                                    {prompt}
                                </Button>
                            ))}
                        </div>

                        <div className="space-y-3">
                            <Textarea
                                placeholder={t('ai.chat.placeholder')}
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                                onKeyDown={handleKeyDown}
                                rows={3}
                                disabled={isSending}
                                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                            />
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-xs text-muted-foreground">
                                    {t('ai.chat.sendHint')}
                                </p>
                                <Button onClick={handleSend} disabled={!draft.trim() || isSending} className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background">
                                    <Send className="w-4 h-4 mr-2" />
                                    {t('common.send')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>

                <aside className="space-y-10 lg:pl-6 lg:border-l">
                    <section>
                        <header className="mb-4">
                            <h3 className="flex items-center gap-2 text-base font-semibold">
                                <Leaf className="w-4 h-4 text-primary" />
                                {t('ai.context.title')}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t('ai.context.description')}
                            </p>
                        </header>
                        <div className="space-y-3">
                            <Textarea
                                placeholder={t('ai.context.placeholder')}
                                value={cropContext}
                                onChange={(event) => setCropContext(event.target.value)}
                                rows={4}
                                className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                            />
                            <div className="flex flex-wrap gap-2">
                                {CONTEXT_TEMPLATES.map((template) => (
                                    <Button
                                        key={template.label}
                                        variant="outline"
                                        size="sm"
                                        className="min-h-[44px] whitespace-normal transition-colors duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                                        onClick={() => handleContextApply(template.value)}
                                    >
                                        {template.label}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section>
                        <header className="mb-3">
                            <h3 className="flex items-center gap-2 text-base font-semibold">
                                {t('ai.scope.title')}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {t('ai.scope.description')}
                            </p>
                        </header>
                        <div className="text-sm text-muted-foreground space-y-2">
                            <p>{t('ai.scope.supported')}</p>
                            <p>{t('ai.scope.notSupported')}</p>
                        </div>
                    </section>
                </aside>
            </div>
        </PageContainer>
    );
}
