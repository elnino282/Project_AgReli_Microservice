import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SecurityPage } from './SecurityPage';

const {
  mockMutateAsync,
  mockToastSuccess,
  mockToastError,
} = vi.hoisted(() => ({
  mockMutateAsync: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('@/entities/user', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/user')>();
  return {
    ...actual,
    useProfileChangePassword: () => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
    }),
  };
});

vi.mock('sonner', () => ({
  toast: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

describe('SecurityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({
      id: 10,
      username: 'buyer-user',
      email: 'buyer@example.com',
      fullName: 'Buyer User',
      phone: '0900000000',
    });
  });

  it('does not submit when confirm password does not match', async () => {
    const { container } = render(<SecurityPage />);
    const user = userEvent.setup();

    const currentPassword = container.querySelector('#currentPassword') as HTMLInputElement;
    const newPassword = container.querySelector('#newPassword') as HTMLInputElement;
    const confirmPassword = container.querySelector('#confirmPassword') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

    await user.type(currentPassword, 'OldPass123!');
    await user.type(newPassword, 'NewPass123!');
    await user.type(confirmPassword, 'WrongPass123!');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
    
    // Wait for the validation error to appear to prevent act(...) warning
    expect(await screen.findByText('Mật khẩu xác nhận không khớp')).toBeInTheDocument();
    
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('submits currentPassword and newPassword payload on valid form', async () => {
    const { container } = render(<SecurityPage />);
    const user = userEvent.setup();

    const currentPassword = container.querySelector('#currentPassword') as HTMLInputElement;
    const newPassword = container.querySelector('#newPassword') as HTMLInputElement;
    const confirmPassword = container.querySelector('#confirmPassword') as HTMLInputElement;
    const submitButton = container.querySelector('button[type="submit"]') as HTMLButtonElement;

    await user.type(currentPassword, 'OldPass123!');
    await user.type(newPassword, 'NewPass123!');
    await user.type(confirmPassword, 'NewPass123!');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
      });
    });

    expect(mockToastSuccess).toHaveBeenCalledWith('Đổi mật khẩu thành công');
    await waitFor(() => {
      expect(currentPassword).toHaveValue('');
      expect(newPassword).toHaveValue('');
      expect(confirmPassword).toHaveValue('');
    });
  });
});
