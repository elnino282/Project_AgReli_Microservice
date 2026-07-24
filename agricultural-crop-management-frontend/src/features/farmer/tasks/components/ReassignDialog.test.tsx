import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReassignDialog } from './ReassignDialog';

vi.mock('@/shared/lib/hooks/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, options?: any) => (typeof options === 'string' ? options : (options?.defaultValue ?? key)),
    isLoading: false,
    locale: 'en-US'
  }),
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

    render(
      <ReassignDialog
        open={true}
        onOpenChange={vi.fn()}
        selectedCount={3}
        onReassign={onReassign}
        assigneeOptions={[
          { userId: 11, displayName: 'Alice Worker' },
          { userId: 22, displayName: 'Bob Worker' },
        ]}
      />
    );

    const trigger = screen.getByRole('combobox');
    fireEvent.mouseDown(trigger);
    if (trigger.getAttribute('aria-expanded') !== 'true') {
      fireEvent.click(trigger);
    }

    const option = await screen.findByRole('option', { name: 'Bob Worker' });
    fireEvent.click(option);
    fireEvent.click(screen.getByRole('button', { name: /reassign/i }));

    await waitFor(() => {
      expect(onReassign).toHaveBeenCalledWith(22);
    });
  });

  it('keeps reassign action disabled until assignee is selected', () => {
    const onReassign = vi.fn();

    render(
      <ReassignDialog
        open={true}
        onOpenChange={vi.fn()}
        selectedCount={1}
        onReassign={onReassign}
        assigneeOptions={[{ userId: 11, displayName: 'Alice Worker' }]}
      />
    );

    const button = screen.getByRole('button', { name: /reassign/i });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onReassign).not.toHaveBeenCalled();
  });
});
