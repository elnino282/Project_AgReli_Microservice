import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";
import { Key, Mail } from "lucide-react";
import { useI18n } from "@/shared/lib/hooks/useI18n";

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResetPassword: (method: "email" | "temp") => void;
}

export function ResetPasswordModal({
  open,
  onOpenChange,
  onResetPassword,
}: ResetPasswordModalProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            {t('admin.farmerManagement.resetPassword.title')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.farmerManagement.resetPassword.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => onResetPassword("email")}
          >
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-primary mt-0.5" />
              <div className="text-left">
                <div className="font-medium text-sm">
                  {t('admin.farmerManagement.resetPassword.emailTitle')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t('admin.farmerManagement.resetPassword.emailDescription')}
                </div>
              </div>
            </div>
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start h-auto p-4"
            onClick={() => onResetPassword("temp")}
          >
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-left">
                <div className="font-medium text-sm">
                  {t('admin.farmerManagement.resetPassword.tempTitle')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t('admin.farmerManagement.resetPassword.tempDescription')}
                </div>
              </div>
            </div>
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
