import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiApi } from '@/entities/ai/api/client';
import { useAiChatSession } from './useAiChatSession';

vi.mock('@/entities/ai/api/client', () => ({
    aiApi: { chat: vi.fn() },
}));

const chatMock = vi.mocked(aiApi.chat);

describe('useAiChatSession', () => {
    beforeEach(() => {
        chatMock.mockReset();
    });

    it('sends crop context to local RAG and stores sources on assistant messages', async () => {
        chatMock.mockResolvedValue({
            userMessage: 'What water is allowed?',
            cropContext: 'rice plot A',
            assistantMessage: 'Use clean irrigation water.',
            sources: [{ file_name: 'vietgap.md', heading: 'Water', snippet: 'Check water.' }],
        });

        const { result } = renderHook(() =>
            useAiChatSession({ welcomeMessage: 'Welcome farmer' }),
        );

        await act(async () => {
            await result.current.sendMessage('  What water is allowed?  ', ' rice plot A ');
        });

        expect(chatMock).toHaveBeenCalledWith({
            userMessage: 'What water is allowed?',
            cropContext: ' rice plot A ',
        });

        await waitFor(() => {
            expect(result.current.messages).toHaveLength(3);
        });
        expect(result.current.messages.map((message) => message.content)).toEqual([
            'Welcome farmer',
            'What water is allowed?',
            'Use clean irrigation water.',
        ]);
        expect(result.current.messages[2].sources).toEqual([
            { file_name: 'vietgap.md', heading: 'Water', snippet: 'Check water.' },
        ]);
    });
});
