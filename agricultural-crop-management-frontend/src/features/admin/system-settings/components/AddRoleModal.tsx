import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";
import { useI18n } from "@/shared/lib/hooks/useI18n";

interface AddRoleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateRole: () => void;
}

export function AddRoleModal({
  open,
  onOpenChange,
  onCreateRole,
}: AddRoleModalProps) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('admin.systemSettings.addRole.title')}</DialogTitle>
          <DialogDescription>
            {t('admin.systemSettings.addRole.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="roleName">{t('admin.systemSettings.addRole.name')}</Label>
            <Input id="roleName" placeholder={t('admin.systemSettings.addRole.namePlaceholder')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roleDescription">{t('common.description')}</Label>
            <Input
              id="roleDescription"
              placeholder={t('admin.systemSettings.addRole.descriptionPlaceholder')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={onCreateRole}>
            {t('admin.systemSettings.addRole.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
