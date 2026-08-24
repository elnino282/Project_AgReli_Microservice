import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { aiApi } from '@/entities/ai/api/client';
import { useBuyerAiChatSession } from './useBuyerAiChatSession';

vi.mock('@/entities/ai/api/client', () => ({
    aiApi: { buyerChat: vi.fn() },
}));

const buyerChatMock = vi.mocked(aiApi.buyerChat);

describe('useBuyerAiChatSession', () => {
    beforeEach(() => {
        buyerChatMock.mockReset();
    });

    it('stores user and assistant messages when buyer chat succeeds', async () => {
        buyerChatMock.mockResolvedValue({
            userMessage: 'Should I buy this lot?',
            buyerContext: 'black beans',
            assistantMessage: 'Check traceability first.',
            sources: [{ file_name: 'buyer.md', heading: 'Traceability', page: 2 }],
        });

        const { result } = renderHook(() =>
            useBuyerAiChatSession({ welcomeMessage: 'Welcome buyer' }),
        );

        await act(async () => {
            await result.current.sendMessage('  Should I buy this lot?  ', ' black beans ');
        });

        expect(buyerChatMock).toHaveBeenCalledWith({
            userMessage: 'Should I buy this lot?',
            buyerContext: ' black beans ',
        });

        await waitFor(() => {
            expect(result.current.messages).toHaveLength(3);
        });
        expect(result.current.messages.map((message) => message.content)).toEqual([
            'Welcome buyer',
            'Should I buy this lot?',
            'Check traceability first.',
        ]);
        expect(result.current.messages[2].sources).toEqual([
            { file_name: 'buyer.md', heading: 'Traceability', page: 2 },
        ]);
    });

    it('adds the configured fallback message when buyer chat fails', async () => {
        buyerChatMock.mockRejectedValue(new Error('network'));

        const { result } = renderHook(() =>
            useBuyerAiChatSession({
                welcomeMessage: 'Welcome buyer',
                fallbackMessage: 'Try again later.',
            }),
        );

        await act(async () => {
            await result.current.sendMessage('Should I buy this lot?', 'black beans');
        });

        await waitFor(() => {
            expect(result.current.messages[result.current.messages.length - 1]?.content).toBe('Try again later.');
        });
    });
});
