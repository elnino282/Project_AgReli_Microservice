import { Database, Download, Upload, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Separator } from '@/shared/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import type { BackupPoint } from '../types';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface BackupRestoreProps {
    backupPoints: BackupPoint[];
    onManualBackup: () => void;
    onExportConfig: () => void;
    onImportConfig: () => void;
    onRestore: () => void;
    getStatusBadge: (status: string) => string;
}

export function BackupRestoreSection({
    backupPoints,
    onManualBackup,
    onExportConfig,
    onImportConfig,
    onRestore,
    getStatusBadge,
}: BackupRestoreProps) {
    const { t } = useI18n();

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('admin.systemSettings.backup.title')}</CardTitle>
                <CardDescription>{t('admin.systemSettings.backup.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button onClick={onManualBackup}>
                        <Database className="w-4 h-4 mr-2" />
                        {t('admin.systemSettings.backup.manualBackup')}
                    </Button>
                    <Button variant="outline" onClick={onExportConfig}>
                        <Download className="w-4 h-4 mr-2" />
                        {t('admin.systemSettings.backup.exportConfig')}
                    </Button>
                    <Button variant="outline" onClick={onImportConfig}>
                        <Upload className="w-4 h-4 mr-2" />
                        {t('admin.systemSettings.backup.importConfig')}
                    </Button>
                </div>

                <Separator />

                <div>
                    <h4 className="mb-4">{t('admin.systemSettings.backup.history')}</h4>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('admin.systemSettings.backup.table.dateTime')}</TableHead>
                                    <TableHead>{t('admin.systemSettings.backup.table.size')}</TableHead>
                                    <TableHead>{t('common.type')}</TableHead>
                                    <TableHead>{t('common.status')}</TableHead>
                                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {backupPoints.map((backup) => (
                                    <TableRow key={backup.id}>
                                        <TableCell className="font-medium">{backup.date}</TableCell>
                                        <TableCell>{backup.size}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                className={
                                                    backup.type === 'auto' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'
                                                }
                                            >
                                                {t(`admin.systemSettings.backup.type.${backup.type}`)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className={getStatusBadge(backup.status)}>
                                                {t(`admin.systemSettings.status.${backup.status}`, backup.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm">
                                                    <Download className="w-4 h-4 mr-2" />
                                                    {t('admin.systemSettings.backup.download')}
                                                </Button>
                                                {backup.status === 'success' && (
                                                    <Button variant="outline" size="sm" onClick={onRestore}>
                                                        <RefreshCw className="w-4 h-4 mr-2" />
                                                        {t('admin.systemSettings.backup.restore')}
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
