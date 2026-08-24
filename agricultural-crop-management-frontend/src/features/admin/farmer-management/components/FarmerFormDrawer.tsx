import { User } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/shared/ui/select';
import { Separator } from '@/shared/ui/separator';
import { Switch } from '@/shared/ui/switch';
import { Farmer, FarmerFormData, FarmerRole, FarmerStatus } from '../types';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface FarmerFormDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingFarmer: Farmer | null;
    formData: FarmerFormData;
    onFormDataChange: (data: FarmerFormData) => void;
    onSave: () => void;
}

export function FarmerFormDrawer({
    open,
    onOpenChange,
    editingFarmer,
    formData,
    onFormDataChange,
    onSave,
}: FarmerFormDrawerProps) {
    const { t } = useI18n();

    const updateField = (field: keyof FarmerFormData, value: string | boolean) => {
        onFormDataChange({ ...formData, [field]: value });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:w-[540px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        {editingFarmer
                            ? t('admin.farmerManagement.form.editTitle')
                            : t('admin.farmerManagement.form.addTitle')}
                    </SheetTitle>
                    <SheetDescription>
                        {editingFarmer
                            ? t('admin.farmerManagement.form.editDescription')
                            : t('admin.farmerManagement.form.addDescription')}
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">{t('auth.signUp.fullName')} *</Label>
                        <Input
                            id="name"
                            placeholder={t('admin.farmerManagement.form.fullNamePlaceholder')}
                            value={formData.name}
                            onChange={(e) => updateField('name', e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">{t('auth.signUp.email')} *</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder={t('admin.farmerManagement.form.emailPlaceholder')}
                            value={formData.email}
                            onChange={(e) => updateField('email', e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">{t('auth.signUp.phoneNumber')} *</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder={t('admin.farmerManagement.form.phonePlaceholder')}
                            value={formData.phone}
                            onChange={(e) => updateField('phone', e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="role">{t('admin.farmerManagement.fields.role')} *</Label>
                            <Select value={formData.role} onValueChange={(v: string) => updateField('role', v as FarmerRole)}>
                                <SelectTrigger id="role">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="farmer">{t('admin.farmerManagement.roles.farmer')}</SelectItem>
                                    <SelectItem value="manager">{t('admin.farmerManagement.roles.manager')}</SelectItem>
                                    <SelectItem value="owner">{t('admin.farmerManagement.roles.owner')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="status">{t('common.status')} *</Label>
                            <Select value={formData.status} onValueChange={(v: string) => updateField('status', v as FarmerStatus)}>
                                <SelectTrigger id="status">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">{t('admin.farmerManagement.status.active')}</SelectItem>
                                    <SelectItem value="inactive">{t('admin.farmerManagement.status.inactive')}</SelectItem>
                                    <SelectItem value="locked">{t('admin.farmerManagement.status.locked')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {!editingFarmer && (
                        <>
                            <Separator />
                            <div className="space-y-2">
                                <Label htmlFor="tempPassword">{t('admin.farmerManagement.form.temporaryPassword')}</Label>
                                <Input
                                    id="tempPassword"
                                    type="password"
                                    placeholder={t('admin.farmerManagement.form.temporaryPasswordPlaceholder')}
                                    value={formData.tempPassword}
                                    onChange={(e) => updateField('tempPassword', e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('admin.farmerManagement.form.temporaryPasswordHelp')}
                                </p>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                                <div className="flex-1">
                                    <Label htmlFor="sendEmail" className="cursor-pointer">
                                        {t('admin.farmerManagement.form.sendWelcomeEmail')}
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {t('admin.farmerManagement.form.sendWelcomeEmailHelp')}
                                    </p>
                                </div>
                                <Switch
                                    id="sendEmail"
                                    checked={formData.sendEmail}
                                    onCheckedChange={(checked: boolean) => updateField('sendEmail', checked)}
                                />
                            </div>
                        </>
                    )}

                    <Separator />

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => onOpenChange(false)}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={onSave}
                        >
                            {editingFarmer
                                ? t('admin.farmerManagement.form.updateFarmer')
                                : t('admin.farmerManagement.form.createFarmer')}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
