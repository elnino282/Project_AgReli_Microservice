import { useCallback, useState } from 'react';
import { type AiChatSource } from '@/entities/ai/api/aiChatService';
import { aiApi } from '@/entities/ai/api/client';
import type { AiChatMessage, AiChatRole } from './useAiChatSession';

type BuyerAiChatSessionOptions = {
    welcomeMessage?: string;
    fallbackMessage?: string;
};

const DEFAULT_WELCOME_MESSAGE =
    'Xin chào! Tôi là trợ lý mua nông sản. Tôi có thể giúp bạn kiểm tra chất lượng, giá, truy xuất nguồn gốc, vận chuyển và điều kiện đổi trả.';

const DEFAULT_FALLBACK_MESSAGE =
    'Hiện tại tôi chưa thể trả lời. Vui lòng thử lại hoặc đặt câu hỏi khác liên quan đến việc chọn mua nông sản.';

const createMessage = (
    role: AiChatRole,
    content: string,
    sources?: AiChatSource[],
): AiChatMessage => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    ...(sources?.length ? { sources } : {}),
});

// Context builder removed as the new API takes userMessage and buyerContext separately.

export function useBuyerAiChatSession(options: BuyerAiChatSessionOptions = {}) {
    const welcomeMessage = options.welcomeMessage ?? DEFAULT_WELCOME_MESSAGE;
    const fallbackMessage = options.fallbackMessage ?? DEFAULT_FALLBACK_MESSAGE;

    const [messages, setMessages] = useState<AiChatMessage[]>(() => [
        createMessage('assistant', welcomeMessage),
    ]);
    const [isSending, setIsSending] = useState(false);

    const reset = useCallback(() => {
        setMessages([createMessage('assistant', welcomeMessage)]);
    }, [welcomeMessage]);

    const sendMessage = useCallback(async (userMessage: string, buyerContext?: string | null) => {
        const trimmedMessage = userMessage.trim();
        if (!trimmedMessage || isSending) {
            return null;
        }

        setMessages((prev) => [...prev, createMessage('user', trimmedMessage)]);
        setIsSending(true);

        try {
            const response = await aiApi.buyerChat({
                userMessage: trimmedMessage,
                buyerContext: buyerContext ?? undefined
            });
            const assistantText = response.assistantMessage?.trim() || fallbackMessage;
            const assistantMessage = createMessage(
                'assistant',
                assistantText,
                response.sources.map((source) => ({
                    file_name: source.file_name ?? '',
                    heading: source.heading ?? '',
                    ...(source.page ? { page: source.page } : {}),
                    ...(source.snippet ? { snippet: source.snippet } : {}),
                })),
            );
            setMessages((prev) => [...prev, assistantMessage]);
            return assistantMessage;
        } catch {
            const assistantMessage = createMessage('assistant', fallbackMessage);
            setMessages((prev) => [...prev, assistantMessage]);
            return assistantMessage;
        } finally {
            setIsSending(false);
        }
    }, [fallbackMessage, isSending]);

    return {
        messages,
        isSending,
        sendMessage,
        reset,
    };
}
