import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";
import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/shared/lib/hooks/useI18n";

interface RestoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmRestore: () => void;
}

export function RestoreModal({
  open,
  onOpenChange,
  onConfirmRestore,
}: RestoreModalProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            {t('admin.systemSettings.restore.title')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.systemSettings.restore.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            {t('admin.systemSettings.restore.confirmation')}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirmRestore}>
            {t('admin.systemSettings.restore.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
