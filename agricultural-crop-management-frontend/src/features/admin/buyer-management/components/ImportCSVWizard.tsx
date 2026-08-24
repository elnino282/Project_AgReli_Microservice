import { Upload, AlertCircle, CheckCircle } from 'lucide-react';
import type { BuyerRole } from '../types';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/ui/table';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface ImportCSVWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    step: number;
    onStepChange: (step: number) => void;
    csvPreview: any[];
    validationErrors?: { row: number; error: string }[];
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onConfirm: () => void;
    getRoleBadge: (role: BuyerRole) => string;
    canImport?: boolean;
    importUnsupportedMessage?: string;
}

export function ImportCSVWizard({
    open,
    onOpenChange,
    step,
    onStepChange,
    csvPreview,
    validationErrors = [],
    onFileUpload,
    onConfirm,
    getRoleBadge,
    canImport = false,
    importUnsupportedMessage,
}: ImportCSVWizardProps) {
    const { t } = useI18n();
    const unsupportedMessage = importUnsupportedMessage ?? t('admin.buyerManagement.import.unsupported');

    const handleBack = () => {
        if (step > 1) {
            onStepChange(step - 1);
        } else {
            onOpenChange(false);
            onStepChange(1);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        {t('admin.buyerManagement.import.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('admin.buyerManagement.import.stepLabel', {
                            step,
                            total: 2,
                            label: t(`admin.buyerManagement.import.steps.${step}`),
                        })}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Progress value={(step / 2) * 100} className="h-2" />
                </div>

                {step === 1 && (
                    <div className="space-y-4">
                        <div className="border-2 border-dashed rounded-lg p-8 text-center">
                            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <h4 className="mb-2">{t('admin.buyerManagement.import.uploadTitle')}</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                {t('admin.buyerManagement.import.uploadDescription')}
                            </p>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={onFileUpload}
                                className="hidden"
                                id="csv-upload-buyer"
                            />
                            <label htmlFor="csv-upload-buyer">
                                <Button variant="outline" asChild>
                                    <span>{t('admin.buyerManagement.import.browseFiles')}</span>
                                </Button>
                            </label>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                            <div className="flex gap-3">
                                <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-medium text-emerald-900 mb-1">{t('admin.buyerManagement.import.requirementsTitle')}</p>
                                    <ul className="text-emerald-800 space-y-1 list-disc list-inside">
                                        <li>{t('admin.buyerManagement.import.requirements.columns')}</li>
                                        <li>{t('admin.buyerManagement.import.requirements.roles')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        {validationErrors.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
                                {t('admin.buyerManagement.import.invalidRowsSkipped', {
                                    count: validationErrors.length,
                                })}
                            </div>
                        )}
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>{t('admin.buyerManagement.import.table.company')}</TableHead>
                                        <TableHead>{t('admin.buyerManagement.fields.taxId')}</TableHead>
                                        <TableHead>{t('admin.buyerManagement.table.primaryContact')}</TableHead>
                                        <TableHead>{t('auth.signUp.email')}</TableHead>
                                        <TableHead>{t('admin.buyerManagement.fields.role')}</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {csvPreview.map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{index + 1}</TableCell>
                                            <TableCell>{row.companyName}</TableCell>
                                            <TableCell>{row.taxId}</TableCell>
                                            <TableCell>{row.contactName}</TableCell>
                                            <TableCell>{row.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className={getRoleBadge(row.role)}>
                                                    {t(`admin.buyerManagement.roles.${row.role}`, row.role)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <CheckCircle className="w-4 h-4 text-green-600" />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            {t('admin.buyerManagement.import.validEntries', { count: csvPreview.length })}
                        </p>
                        {!canImport && (
                            <p className="text-sm text-destructive">{unsupportedMessage}</p>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={handleBack}>
                        {step === 1 ? t('common.cancel') : t('common.back')}
                    </Button>
                    {step === 2 && (
                        <Button
                            onClick={onConfirm}
                            disabled={!canImport || csvPreview.length === 0}
                        >
                            {t('admin.buyerManagement.import.importCount', { count: csvPreview.length })}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
