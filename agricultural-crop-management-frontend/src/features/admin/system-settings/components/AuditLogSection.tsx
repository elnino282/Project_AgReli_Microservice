import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import type { AuditLog } from '../types';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface AuditLogProps {
    logs: AuditLog[];
    getStatusBadge: (status: string) => string;
}

export function AuditLogSection({ logs, getStatusBadge }: AuditLogProps) {
    const { t } = useI18n();

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('admin.systemSettings.audit.title')}</CardTitle>
                <CardDescription>{t('admin.systemSettings.audit.description')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('admin.systemSettings.audit.table.time')}</TableHead>
                                <TableHead>{t('admin.systemSettings.audit.table.admin')}</TableHead>
                                <TableHead>{t('admin.systemSettings.audit.table.action')}</TableHead>
                                <TableHead>{t('admin.systemSettings.audit.table.module')}</TableHead>
                                <TableHead>{t('admin.systemSettings.audit.table.result')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium">{log.time}</TableCell>
                                    <TableCell>{log.admin}</TableCell>
                                    <TableCell>{log.action}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">{log.module}</Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className={getStatusBadge(log.result)}>
                                            {t(`admin.systemSettings.status.${log.result}`, log.result)}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
