import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Separator } from '@/shared/ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Switch } from '@/shared/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Textarea } from '@/shared/ui/textarea';
import {
    Building2,
    CheckCircle,
    Download,
    Filter,
    Info,
    XCircle,
} from 'lucide-react';
import type { AccountStatus, Buyer, BuyerFormData, BuyerRole, KYCStatus } from '../types';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface BuyerDetailDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    buyer: Buyer | null;
    formData: BuyerFormData;
    onFormDataChange: (data: BuyerFormData) => void;
    activeTab: string;
    onTabChange: (tab: string) => void;
    onSave: () => void;
    onKYCVerify: () => void;
    onKYCReject: () => void;
    getKYCBadge: (status: KYCStatus) => string;
    kycActionsSupported?: boolean;
}

export function BuyerDetailDrawer({
    open,
    onOpenChange,
    buyer,
    formData,
    onFormDataChange,
    activeTab,
    onTabChange,
    onSave,
    onKYCVerify,
    onKYCReject,
    getKYCBadge,
    kycActionsSupported = false,
}: BuyerDetailDrawerProps) {
    const { t } = useI18n();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:w-[700px] overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        {buyer ? t('admin.buyerManagement.detail.title') : t('admin.buyerManagement.detail.addTitle')}
                    </SheetTitle>
                    <SheetDescription>
                        {buyer
                            ? t('admin.buyerManagement.detail.manageBuyer', { name: buyer.companyName })
                            : t('admin.buyerManagement.detail.addDescription')}
                    </SheetDescription>
                </SheetHeader>

                <Tabs value={activeTab} onValueChange={onTabChange} className="mt-6">
                    <TabsList className="w-full overflow-x-auto">
                        <TabsTrigger value="general">{t('admin.buyerManagement.detail.tabs.general')}</TabsTrigger>
                        <TabsTrigger value="kyc" disabled={!buyer}>
                            {t('admin.buyerManagement.detail.tabs.kyc')}
                        </TabsTrigger>
                        <TabsTrigger value="permissions" disabled={!buyer}>
                            {t('admin.buyerManagement.detail.tabs.permissions')}
                        </TabsTrigger>
                        <TabsTrigger value="history" disabled={!buyer}>
                            {t('admin.buyerManagement.detail.tabs.history')}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-6 mt-6">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">{t('admin.buyerManagement.fields.companyName')} *</Label>
                            <Input
                                id="companyName"
                                placeholder={t('admin.buyerManagement.form.companyNamePlaceholder')}
                                value={formData.companyName}
                                onChange={(e) => onFormDataChange({ ...formData, companyName: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="taxId">{t('admin.buyerManagement.fields.taxId')} *</Label>
                            <Input
                                id="taxId"
                                placeholder={t('admin.buyerManagement.form.taxIdPlaceholder')}
                                value={formData.taxId}
                                onChange={(e) => onFormDataChange({ ...formData, taxId: e.target.value })}
                            />
                        </div>

                        <Separator />

                        <div className="space-y-2">
                            <Label htmlFor="contactName">{t('admin.buyerManagement.fields.contactName')} *</Label>
                            <Input
                                id="contactName"
                                placeholder={t('admin.buyerManagement.form.contactNamePlaceholder')}
                                value={formData.contactName}
                                onChange={(e) => onFormDataChange({ ...formData, contactName: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">{t('auth.signUp.email')} *</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder={t('admin.buyerManagement.form.emailPlaceholder')}
                                value={formData.email}
                                onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">{t('auth.signUp.phoneNumber')} *</Label>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder={t('admin.buyerManagement.form.phonePlaceholder')}
                                value={formData.phone}
                                onChange={(e) => onFormDataChange({ ...formData, phone: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">{t('admin.buyerManagement.fields.address')}</Label>
                            <Textarea
                                id="address"
                                placeholder={t('admin.buyerManagement.form.addressPlaceholder')}
                                value={formData.address}
                                onChange={(e) => onFormDataChange({ ...formData, address: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="role">{t('admin.buyerManagement.fields.role')} *</Label>
                                <Select
                                    value={formData.role}
                                    onValueChange={(v) => onFormDataChange({ ...formData, role: v as BuyerRole })}
                                >
                                    <SelectTrigger id="role">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="buyer">{t('admin.buyerManagement.roles.buyer')}</SelectItem>
                                        <SelectItem value="enterprise">{t('admin.buyerManagement.roles.enterprise')}</SelectItem>
                                        <SelectItem value="distributor">{t('admin.buyerManagement.roles.distributor')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="accountStatus">{t('admin.buyerManagement.fields.accountStatus')} *</Label>
                                <Select
                                    value={formData.accountStatus}
                                    onValueChange={(v) => onFormDataChange({ ...formData, accountStatus: v as AccountStatus })}
                                >
                                    <SelectTrigger id="accountStatus">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">{t('admin.buyerManagement.status.active')}</SelectItem>
                                        <SelectItem value="suspended">{t('admin.buyerManagement.status.suspended')}</SelectItem>
                                        <SelectItem value="closed">{t('admin.buyerManagement.status.closed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="paymentTerms">{t('admin.buyerManagement.fields.paymentTerms')}</Label>
                            <Input
                                id="paymentTerms"
                                placeholder={t('admin.buyerManagement.form.paymentTermsPlaceholder')}
                                value={formData.paymentTerms}
                                onChange={(e) => onFormDataChange({ ...formData, paymentTerms: e.target.value })}
                            />
                        </div>

                        <Separator />

                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                                {t('common.cancel')}
                            </Button>
                            <Button className="flex-1" onClick={onSave}>
                                {buyer ? t('admin.buyerManagement.form.updateBuyer') : t('admin.buyerManagement.form.createBuyer')}
                            </Button>
                        </div>
                    </TabsContent>

                    <TabsContent value="kyc" className="space-y-6 mt-6">
                        {buyer && (
                            <>
                                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                                    <div>
                                        <p className="font-medium text-sm">{t('admin.buyerManagement.kycPanel.currentStatus')}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {t('admin.buyerManagement.kycPanel.statusDescription')}
                                        </p>
                                    </div>
                                    <Badge variant="secondary" className={getKYCBadge(buyer.kycStatus)}>
                                        {t(`admin.buyerManagement.kyc.${buyer.kycStatus}`, buyer.kycStatus)}
                                    </Badge>
                                </div>

                                <Separator />

                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <h4>{t('admin.buyerManagement.kycPanel.documents')}</h4>
                                    </div>
                                    <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2 text-foreground mb-2">
                                            <Info className="w-4 h-4" />
                                            {t('admin.buyerManagement.kycPanel.unavailableTitle')}
                                        </div>
                                        <p>
                                            {t('admin.buyerManagement.kycPanel.unavailableDescription')}
                                        </p>
                                    </div>
                                </div>

                                <Separator />

                                <div className="flex gap-3">
                                    <Button
                                        variant="outline"
                                        className="flex-1 text-red-600 hover:text-red-700"
                                        onClick={onKYCReject}
                                        disabled={!kycActionsSupported || buyer.kycStatus === 'rejected'}
                                    >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        {t('admin.buyerManagement.kycPanel.reject')}
                                    </Button>
                                    <Button
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                                        onClick={onKYCVerify}
                                        disabled={!kycActionsSupported || buyer.kycStatus === 'verified'}
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        {t('admin.buyerManagement.kycPanel.verify')}
                                    </Button>
                                </div>
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="permissions" className="space-y-6 mt-6">
                        {buyer && (
                            <>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                                        <div className="flex-1">
                                            <Label htmlFor="canPlaceOrders" className="cursor-pointer">
                                                {t('admin.buyerManagement.permissions.placeOrders')}
                                            </Label>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {t('admin.buyerManagement.permissions.placeOrdersDescription')}
                                            </p>
                                        </div>
                                        <Switch id="canPlaceOrders" defaultChecked />
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                                        <div className="flex-1">
                                            <Label htmlFor="canViewPricing" className="cursor-pointer">
                                                {t('admin.buyerManagement.permissions.viewPricing')}
                                            </Label>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {t('admin.buyerManagement.permissions.viewPricingDescription')}
                                            </p>
                                        </div>
                                        <Switch id="canViewPricing" defaultChecked />
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                                        <div className="flex-1">
                                            <Label htmlFor="canExportData" className="cursor-pointer">
                                                {t('admin.buyerManagement.permissions.exportData')}
                                            </Label>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {t('admin.buyerManagement.permissions.exportDataDescription')}
                                            </p>
                                        </div>
                                        <Switch id="canExportData" />
                                    </div>

                                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                                        <div className="flex-1">
                                            <Label htmlFor="canViewReports" className="cursor-pointer">
                                                {t('admin.buyerManagement.permissions.viewReports')}
                                            </Label>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {t('admin.buyerManagement.permissions.viewReportsDescription')}
                                            </p>
                                        </div>
                                        <Switch id="canViewReports" defaultChecked />
                                    </div>
                                </div>

                                <Separator />

                                <div className="flex gap-3">
                                    <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                                        {t('common.cancel')}
                                    </Button>
                                    <Button className="flex-1" disabled>
                                        {t('admin.buyerManagement.permissions.save')}
                                    </Button>
                                </div>
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="history" className="space-y-4 mt-6">
                        {buyer && (
                            <>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" className="flex-1">
                                        <Filter className="w-4 h-4 mr-2" />
                                        {t('common.filter')}
                                    </Button>
                                    <Button variant="outline" size="sm" className="flex-1">
                                        <Download className="w-4 h-4 mr-2" />
                                        {t('common.export')}
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                                        {t('admin.buyerManagement.history.unavailable')}
                                    </div>
                                </div>
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            </SheetContent>
        </Sheet>
    );
}
