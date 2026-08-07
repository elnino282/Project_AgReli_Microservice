import { useCallback, useState } from 'react';
import { type AiChatSource } from '@/entities/ai/api/aiChatService';
import { aiApi } from '@/entities/ai/api/client';

export type AiChatRole = 'assistant' | 'user';

export type AiChatMessage = {
    id: string;
    role: AiChatRole;
    content: string;
    createdAt: string;
    sources?: AiChatSource[];
};

type AiChatSessionOptions = {
    welcomeMessage?: string;
    fallbackMessage?: string;
};

const DEFAULT_WELCOME_MESSAGE =
    'Xin chào! Tôi là trợ lý nông nghiệp. Hãy hỏi về cây trồng, sâu bệnh, đất, tưới tiêu hoặc lịch mùa vụ.';

const DEFAULT_FALLBACK_MESSAGE =
    'Hiện tại tôi chưa thể trả lời. Vui lòng thử lại hoặc đặt câu hỏi khác liên quan đến nông nghiệp.';

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

// Context builder removed as the new API takes userMessage and cropContext separately.

export function useAiChatSession(options: AiChatSessionOptions = {}) {
    const welcomeMessage = options.welcomeMessage ?? DEFAULT_WELCOME_MESSAGE;
    const fallbackMessage = options.fallbackMessage ?? DEFAULT_FALLBACK_MESSAGE;

    const [messages, setMessages] = useState<AiChatMessage[]>(() => [
        createMessage('assistant', welcomeMessage),
    ]);
    const [isSending, setIsSending] = useState(false);

    const reset = useCallback(() => {
        setMessages([createMessage('assistant', welcomeMessage)]);
    }, [welcomeMessage]);

    const sendMessage = useCallback(async (userMessage: string, cropContext?: string | null) => {
        const trimmedMessage = userMessage.trim();
        if (!trimmedMessage || isSending) {
            return null;
        }

        setMessages((prev) => [...prev, createMessage('user', trimmedMessage)]);
        setIsSending(true);

        try {
            const response = await aiApi.chat({
                userMessage: trimmedMessage,
                cropContext: cropContext ?? undefined
            });
            const assistantText = response.assistantMessage?.trim() || fallbackMessage;
            const assistantMessage = createMessage('assistant', assistantText, []);
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
