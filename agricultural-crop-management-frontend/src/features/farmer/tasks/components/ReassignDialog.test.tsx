import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReassignDialog } from './ReassignDialog';
import * as taskHooks from '@/entities/task/api/hooks';

vi.mock('@/shared/lib/hooks/useI18n', () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => (typeof options === 'string' ? options : (options?.defaultValue ?? key)),
    isLoading: false,
    locale: 'en-US'
  }),
}));

vi.mock('@/entities/task/api/hooks', () => ({
  useEligibleAssignees: vi.fn(),
}));

const ensurePointerCapturePolyfill = () => {
  if (!HTMLElement.prototype.hasPointerCapture) {
    Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
      value: () => false,
      configurable: true,
    });
  }
  if (!HTMLElement.prototype.setPointerCapture) {
    Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
      value: () => undefined,
      configurable: true,
    });
  }
  if (!HTMLElement.prototype.releasePointerCapture) {
    Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
      value: () => undefined,
      configurable: true,
    });
  }
  if (!Element.prototype.scrollIntoView) {
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      value: () => undefined,
      configurable: true,
    });
  }
};

describe('ReassignDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensurePointerCapturePolyfill();
  });

  it('passes selected assignee user id to callback', async () => {
    const onReassign = vi.fn();
    vi.mocked(taskHooks.useEligibleAssignees).mockReturnValue({
      data: [
        { employeeUserId: 11, employeeName: 'Alice Worker', isTrained: true },
        { employeeUserId: 22, employeeName: 'Bob Worker', isTrained: false },
      ],
      isLoading: false,
    } as any);

    render(
      <ReassignDialog
        open={true}
        onOpenChange={vi.fn()}
        selectedCount={3}
        onReassign={onReassign}
        seasonId={1}
      />
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.mouseDown(trigger);
    if (trigger.getAttribute('aria-expanded') !== 'true') {
      fireEvent.click(trigger);
    }

    const option = await screen.findByRole('option', { name: /Bob Worker/i });
    fireEvent.click(option);
    
    // Check that warning appears since Bob is untrained
    expect(screen.getByText(/Nhân viên này chưa qua đào tạo/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /reassignSubmit/i }));

    await waitFor(() => {
      expect(onReassign).toHaveBeenCalledWith(22);
    });
  });

  it('keeps reassign action disabled until assignee is selected', () => {
    const onReassign = vi.fn();
    vi.mocked(taskHooks.useEligibleAssignees).mockReturnValue({
      data: [{ employeeUserId: 11, employeeName: 'Alice Worker', isTrained: true }],
      isLoading: false,
    } as any);

    render(
      <ReassignDialog
        open={true}
        onOpenChange={vi.fn()}
        selectedCount={1}
        onReassign={onReassign}
        seasonId={1}
      />
    );

    const button = screen.getByRole('button', { name: /reassignSubmit/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onReassign).not.toHaveBeenCalled();
  });
});
