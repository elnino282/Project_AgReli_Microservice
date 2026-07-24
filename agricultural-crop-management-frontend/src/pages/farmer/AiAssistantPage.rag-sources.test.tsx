import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { AiAssistantPage } from './AiAssistantPage';

vi.mock('@/shared/lib/hooks/useI18n', () => ({
    useI18n: () => ({
        t: (_key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : _key),
    }),
}));

vi.mock('@/features/ai', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/features/ai')>()),
    useAiChatSession: () => ({
        messages: [
            {
                id: 'assistant-1',
                role: 'assistant',
                content: 'Nguon nuoc tuoi can duoc kiem soat.',
                createdAt: '2026-06-23T00:00:00.000Z',
                sources: [
                    {
                        file_name: 'vietgap.md',
                        heading: 'Nguon nuoc',
                        page: 3,
                        snippet: 'Khong dung nguon nuoc o nhiem.',
                    },
                ],
            },
        ],
        isSending: false,
        sendMessage: vi.fn(),
        reset: vi.fn(),
    }),
}));

describe('AiAssistantPage RAG sources', () => {
    beforeAll(() => {
        Element.prototype.scrollIntoView = vi.fn();
    });

    it('renders clean source details under assistant answers', () => {
        render(<AiAssistantPage />);

        expect(screen.getByText('Nguồn tham khảo')).toBeInTheDocument();
        expect(screen.getByText('Nguon nuoc')).toBeInTheDocument();
        expect(screen.getByText('vietgap.md')).toBeInTheDocument();
        expect(screen.getByText('Trang 3')).toBeInTheDocument();
        expect(screen.getByText('Khong dung nguon nuoc o nhiem.')).toBeInTheDocument();
    });
});
