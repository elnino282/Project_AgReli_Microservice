import { useState } from 'react';
import { useAuth } from '@/features/auth';
import { useProfileMe, useProfileUpdate } from '@/entities/user';
import { Button } from '@/shared/ui';
import { useI18n } from '@/shared/lib/hooks/useI18n';
import axios from 'axios';
import { toast } from 'sonner';
import { PersonalInfoForm } from '../components/PersonalInfoForm';
import { Loader2, Mail, Phone, User, Pencil } from 'lucide-react';

type PersonalInfoFormData = {
  name: string;
  phone: string;
};

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiMessage = (error.response?.data as { message?: string } | undefined)?.message;
    if (apiMessage) {
      return apiMessage;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Có lỗi xảy ra khi cập nhật thông tin';
}

export function PersonalInfoPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const profileQuery = useProfileMe();
  const updateProfile = useProfileUpdate();
  const [isEditing, setIsEditing] = useState(false);

  const userData = {
    name: profileQuery.data?.fullName || user?.profile?.fullName || user?.username || '',
    email: profileQuery.data?.email || user?.email || user?.profile?.email || '',
    phone: profileQuery.data?.phone || user?.profile?.phone || '',
  };

  const handleSave = async (data: PersonalInfoFormData) => {
    try {
      await updateProfile.mutateAsync({
        fullName: data.name,
        phone: data.phone,
      });

      toast.success('Cập nhật thông tin thành công');
      setIsEditing(false);
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message);
      throw new Error(message);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  if (profileQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Thông tin cá nhân</h1>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý thông tin hồ sơ của bạn
          </p>
        </div>
        {!isEditing && (
          <Button
            variant="outline"
            onClick={() => setIsEditing(true)}
            disabled={updateProfile.isPending}
            className="gap-2 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
          >
            <Pencil className="h-4 w-4" />
            Chỉnh sửa
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {isEditing ? (
          /* ─── Edit Mode ─── */
          <div className="p-6">
            <PersonalInfoForm
              initialData={{ name: userData.name, phone: userData.phone }}
              email={userData.email}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        ) : (
          /* ─── View Mode ─── */
          <div className="divide-y divide-gray-50">
            {/* Full Name */}
            <div className="flex items-start gap-4 p-5 transition-colors hover:bg-gray-50/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <User className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Họ và tên
                </p>
                <p className="mt-1 text-base font-medium text-gray-900">
                  {userData.name || '—'}
                </p>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-4 p-5 transition-colors hover:bg-gray-50/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                <Mail className="h-5 w-5 text-blue-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Email
                </p>
                <p className="mt-1 text-base font-medium text-gray-900">
                  {userData.email || '—'}
                </p>
              </div>
              <span className="mt-1 inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                Không thể thay đổi
              </span>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-4 p-5 transition-colors hover:bg-gray-50/50">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                <Phone className="h-5 w-5 text-violet-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Số điện thoại
                </p>
                <p className="mt-1 text-base font-medium text-gray-900">
                  {userData.phone || '—'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
