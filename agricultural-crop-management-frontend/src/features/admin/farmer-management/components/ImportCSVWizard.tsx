import { Upload, AlertCircle, XCircle, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Progress } from '@/shared/ui/progress';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/shared/ui/table';
import { CSVPreviewRow, ValidationError } from '../types';
import { ROLE_BADGE_COLORS, STATUS_BADGE_COLORS } from '../constants';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface ImportCSVWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    step: number;
    onStepChange: (step: number) => void;
    csvPreview: CSVPreviewRow[];
    validationErrors: ValidationError[];
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onImportConfirm: () => void;
    canImport?: boolean;
    importUnsupportedMessage?: string;
}

export function ImportCSVWizard({
    open,
    onOpenChange,
    step,
    onStepChange,
    csvPreview,
    validationErrors,
    onFileUpload,
    onImportConfirm,
    canImport = false,
    importUnsupportedMessage,
}: ImportCSVWizardProps) {
    const { t } = useI18n();
    const validEntriesCount = csvPreview.length - validationErrors.length;
    const unsupportedMessage = importUnsupportedMessage ?? t('admin.farmerManagement.import.unsupported');

    const handleClose = () => {
        onOpenChange(false);
        onStepChange(1);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="w-5 h-5" />
                        {t('admin.farmerManagement.import.title')}
                    </DialogTitle>
                    <DialogDescription>
                        {t('admin.farmerManagement.import.stepLabel', {
                            step,
                            total: 3,
                            label: t(`admin.farmerManagement.import.steps.${step}`),
                        })}
                    </DialogDescription>
                </DialogHeader>

                {/* Progress Indicator */}
                <div className="py-4">
                    <Progress value={(step / 3) * 100} className="h-2" />
                </div>

                {step === 1 && (
                    <div className="space-y-4">
                        <div className="border-2 border-dashed rounded-lg p-8 text-center">
                            <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <h4 className="mb-2">{t('admin.farmerManagement.import.uploadTitle')}</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                {t('admin.farmerManagement.import.uploadDescription')}
                            </p>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={onFileUpload}
                                className="hidden"
                                id="csv-upload"
                            />
                            <label htmlFor="csv-upload">
                                <Button variant="outline" asChild>
                                    <span>{t('admin.farmerManagement.import.browseFiles')}</span>
                                </Button>
                            </label>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                            <div className="flex gap-3">
                                <AlertCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-medium text-emerald-900 mb-1">{t('admin.farmerManagement.import.requirementsTitle')}</p>
                                    <ul className="text-emerald-800 space-y-1 list-disc list-inside">
                                        <li>{t('admin.farmerManagement.import.requirements.columns')}</li>
                                        <li>{t('admin.farmerManagement.import.requirements.roles')}</li>
                                        <li>{t('admin.farmerManagement.import.requirements.statuses')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        {validationErrors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex gap-3">
                                    <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <div className="text-sm">
                                        <p className="font-medium text-red-900 mb-2">
                                            {t('admin.farmerManagement.import.validationErrorsFound', {
                                                count: validationErrors.length,
                                            })}
                                        </p>
                                        <ul className="text-red-800 space-y-1">
                                            {validationErrors.map((err, i) => (
                                                <li key={i}>
                                                    {t('admin.farmerManagement.import.rowError', {
                                                        row: err.row,
                                                        field: err.field,
                                                        message: err.message,
                                                    })}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12">#</TableHead>
                                        <TableHead>{t('common.name')}</TableHead>
                                        <TableHead>{t('auth.signUp.email')}</TableHead>
                                        <TableHead>{t('auth.signUp.phoneNumber')}</TableHead>
                                        <TableHead>{t('admin.farmerManagement.fields.role')}</TableHead>
                                        <TableHead>{t('common.status')}</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {csvPreview.map((row, index) => {
                                        const hasError = validationErrors.some(err => err.row === index + 1);
                                        return (
                                            <TableRow key={index} className={hasError ? 'bg-red-50' : ''}>
                                                <TableCell>{index + 1}</TableCell>
                                                <TableCell>{row.name}</TableCell>
                                                <TableCell>{row.email}</TableCell>
                                                <TableCell>{row.phone}</TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={ROLE_BADGE_COLORS[row.role]}>
                                                        {t(`admin.farmerManagement.roles.${row.role}`, row.role)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className={STATUS_BADGE_COLORS[row.status]}>
                                                        {t(`admin.farmerManagement.status.${row.status}`, row.status)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {hasError ? (
                                                        <XCircle className="w-4 h-4 text-red-600" />
                                                    ) : (
                                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            {t('admin.farmerManagement.import.validEntries', { count: validEntriesCount })}
                            {' '}
                            {t('admin.farmerManagement.import.rowsWithErrorsSkipped')}
                        </p>
                        {!canImport && (
                            <p className="text-sm text-destructive">{unsupportedMessage}</p>
                        )}
                    </div>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            if (step > 1) {
                                onStepChange(step - 1);
                            } else {
                                handleClose();
                            }
                        }}
                    >
                        {step === 1 ? t('common.cancel') : t('common.back')}
                    </Button>
                    {step === 2 && (
                        <Button
                            onClick={onImportConfirm}
                            disabled={validEntriesCount === 0 || !canImport}
                        >
                            {t('admin.farmerManagement.import.importCount', { count: validEntriesCount })}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
