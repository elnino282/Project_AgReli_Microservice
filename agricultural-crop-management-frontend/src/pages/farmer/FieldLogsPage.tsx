import { useI18n } from '@/shared/lib/hooks/useI18n';
import { useOptionalSeason } from '@/shared/contexts';
import type { AxiosError } from 'axios';
import { AlertCircle, Calendar, FileText, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
    useCreateFieldLog,
    useDeleteFieldLog,
    useEmployeeAssignedSeasons,
    useFieldLogsBySeason,
    useUpdateFieldLog,
    useUserSeasons
} from '@/entities/field-log/api/hooks';
import { LOG_TYPES } from '@/entities/field-log/model/schemas';
import type { FieldLog, FieldLogCreateRequest } from '@/entities/field-log/model/types';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    BackButton,
    Badge,
    Button,
    Card,
    CardContent,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
    Label,
    PageContainer,
    PageHeader,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Textarea,
} from '@/shared/ui';

const selectTriggerClass =
    'rounded-xl border-2 border-input bg-input-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/50 focus-visible:border-primary focus-visible:ring-primary/20 data-[placeholder]:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-muted';

const getActorBadgeClass = (actorType?: string | null) => {
    if (actorType === 'EMPLOYEE') return 'bg-[var(--portal-badge-secondary-bg)] text-[var(--portal-badge-secondary-fg)] border-[var(--portal-badge-secondary-border)]';
    if (actorType === 'FARMER') return 'bg-[var(--portal-status-measured-bg)] text-[var(--portal-status-measured-fg)] border-[var(--portal-status-measured-border)]';
    return 'bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)]';
};

// ═══════════════════════════════════════════════════════════════
// FIELD LOGS PAGE
// ═══════════════════════════════════════════════════════════════

export function FieldLogsPage() {
    const { t } = useI18n();
    const seasonContext = useOptionalSeason();
    const location = useLocation();
    const { seasonId: workspaceSeasonIdParam } = useParams();
    const workspaceScope = location.pathname.startsWith('/employee') ? 'employee' : 'farmer';
    const isEmployeeWorkspace = workspaceScope === 'employee';
    const workspaceSeasonId = Number(workspaceSeasonIdParam);
    const isWorkspaceScoped = Number.isFinite(workspaceSeasonId) && workspaceSeasonId > 0;
    const contextSeasonId = seasonContext?.selectedSeasonId ?? null;
    const lockedSeasonId = isWorkspaceScoped ? workspaceSeasonId : contextSeasonId;
    
    // State
    const [selectedSeasonId, setSelectedSeasonId] = useState<number | null>(
        lockedSeasonId
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<FieldLog | null>(null);
    const [deleteLogId, setDeleteLogId] = useState<number | null>(null);
    
    // Form state
    const [formData, setFormData] = useState<{
        logDate: string;
        logType: string;
        notes: string;
    }>({
        logDate: new Date().toISOString().split('T')[0],
        logType: '',
        notes: '',
    });
    const initialFormRef = useRef<string | null>(null);
    
    // Queries
    const { data: farmerSeasons, isLoading: farmerSeasonsLoading } = useUserSeasons({
        enabled: !isEmployeeWorkspace,
    });
    const { data: employeeSeasons, isLoading: employeeSeasonsLoading } = useEmployeeAssignedSeasons({
        enabled: isEmployeeWorkspace,
    });
    const seasons = isEmployeeWorkspace ? employeeSeasons : farmerSeasons;
    const seasonsLoading = isEmployeeWorkspace ? employeeSeasonsLoading : farmerSeasonsLoading;
    const { data: logsData, isLoading: logsLoading, isError } = useFieldLogsBySeason(
        selectedSeasonId ?? 0,
        {
            q: searchQuery.length >= 2 ? searchQuery : undefined,
            type: typeFilter !== 'all' ? typeFilter : undefined,
            page: 0,
            size: 100,
        },
        { enabled: !!selectedSeasonId },
        workspaceScope
    );

    useEffect(() => {
        if (!lockedSeasonId || lockedSeasonId === selectedSeasonId) return;
        setSelectedSeasonId(lockedSeasonId);
    }, [lockedSeasonId, selectedSeasonId]);

    useEffect(() => {
        if (!lockedSeasonId) return;
        if (seasonContext?.selectedSeasonId === lockedSeasonId) return;
        seasonContext?.setSelectedSeasonId(lockedSeasonId);
    }, [lockedSeasonId, seasonContext]);
    
    // Mutations
    const createMutation = useCreateFieldLog(selectedSeasonId ?? 0, {
        onSuccess: () => {
            toast.success(t('fieldLogs.toast.createSuccess'));
            closeModal({ skipConfirm: true });
        },
        onError: (error) => {
            const axiosError = error as AxiosError<{ message?: string }>;
            const message = axiosError.response?.data?.message || t('fieldLogs.toast.createError');
            toast.error(message);
        },
    }, workspaceScope);
    
    const updateMutation = useUpdateFieldLog(selectedSeasonId ?? 0, {
        onSuccess: () => {
            toast.success(t('fieldLogs.toast.updateSuccess'));
            closeModal({ skipConfirm: true });
        },
        onError: (error) => {
            const axiosError = error as AxiosError<{ message?: string }>;
            const message = axiosError.response?.data?.message || t('fieldLogs.toast.updateError');
            toast.error(message);
        },
    }, workspaceScope);
    
    const deleteMutation = useDeleteFieldLog(selectedSeasonId ?? 0, {
        onSuccess: () => {
            toast.success(t('fieldLogs.toast.deleteSuccess'));
            setDeleteLogId(null);
        },
        onError: (error) => {
            const axiosError = error as AxiosError<{ message?: string }>;
            const message = axiosError.response?.data?.message || t('fieldLogs.toast.deleteError');
            toast.error(message);
        },
    }, workspaceScope);
    
    // Computed values
    const selectedSeason = useMemo(() => 
        seasons?.find(s => s.seasonId === selectedSeasonId),
        [seasons, selectedSeasonId]
    );
    const selectedSeasonStatus = useMemo(
        () => selectedSeason?.status
            ?? seasonContext?.seasons.find((season) => season.id === selectedSeasonId)?.status
            ?? null,
        [seasonContext?.seasons, selectedSeason, selectedSeasonId]
    );
    const isSeasonWriteLocked =
        selectedSeasonStatus === "COMPLETED"
        || selectedSeasonStatus === "CANCELLED"
        || selectedSeasonStatus === "ARCHIVED";
    const seasonWriteLockReason = isSeasonWriteLocked
        ? t("fieldLogs.validation.seasonLocked")
        : undefined;
    
    const logs = logsData?.items ?? [];
    
    const summaryStats = useMemo(() => {
        if (!logs.length) return { total: 0, latestDate: null, commonType: null };
        
        const typeCounts: Record<string, number> = {};
        let latestDate = logs[0]?.logDate;
        
        logs.forEach(log => {
            typeCounts[log.logType] = (typeCounts[log.logType] || 0) + 1;
            if (log.logDate > latestDate) latestDate = log.logDate;
        });
        
        const commonType = Object.entries(typeCounts)
            .sort((a, b) => b[1] - a[1])[0]?.[0];
        
        return { total: logs.length, latestDate, commonType };
    }, [logs]);

    const ensureSeasonWritable = () => {
        if (!isSeasonWriteLocked) return true;
        toast.error(seasonWriteLockReason);
        return false;
    };
    
    // Handlers
    const openCreateModal = () => {
        if (!ensureSeasonWritable()) return;
        const nextFormData = {
            logDate: new Date().toISOString().split('T')[0],
            logType: '',
            notes: '',
        };
        setEditingLog(null);
        setFormData(nextFormData);
        initialFormRef.current = JSON.stringify(nextFormData);
        setIsModalOpen(true);
    };
    
    const openEditModal = (log: FieldLog) => {
        if (!ensureSeasonWritable()) return;
        if (log.canEdit === false) {
            toast.error(t('fieldLogs.validation.noPermission'));
            return;
        }
        const nextFormData = {
            logDate: log.logDate,
            logType: log.logType,
            notes: log.notes ?? '',
        };
        setEditingLog(log);
        setFormData(nextFormData);
        initialFormRef.current = JSON.stringify(nextFormData);
        setIsModalOpen(true);
    };
    
    const isFormDirty = isModalOpen && initialFormRef.current !== null && initialFormRef.current !== JSON.stringify(formData);

    const closeModal = ({ skipConfirm = false }: { skipConfirm?: boolean } = {}) => {
        if (
            !skipConfirm &&
            isFormDirty &&
            !window.confirm(t('common.unsavedChangesConfirm', 'You have unsaved changes. Leave this page?'))
        ) {
            return;
        }
        setIsModalOpen(false);
        setEditingLog(null);
        initialFormRef.current = null;
        setFormData({ logDate: '', logType: '', notes: '' });
    };
    
    const handleSubmit = () => {
        if (!ensureSeasonWritable()) return;
        if (!formData.logDate || !formData.logType) {
            toast.error(t('fieldLogs.validation.fillRequired'));
            return;
        }
        
        // Validate date within season range
        if (selectedSeason) {
            const logDate = new Date(formData.logDate);
            const startDate = selectedSeason.startDate ? new Date(selectedSeason.startDate) : null;
            const endDate = selectedSeason.endDate 
                ? new Date(selectedSeason.endDate) 
                : selectedSeason.plannedHarvestDate 
                    ? new Date(selectedSeason.plannedHarvestDate) 
                    : null;
            
            if (startDate && logDate < startDate) {
                toast.error(`${t("fieldLogs.validation.dateAfterStart")} (${selectedSeason.startDate})`);
                return;
            }
            if (endDate && logDate > endDate) {
                toast.error(`${t("fieldLogs.validation.dateBeforeEnd")} (${selectedSeason.endDate ?? selectedSeason.plannedHarvestDate})`);
                return;
            }
        }
        
        const payload: FieldLogCreateRequest = {
            logDate: formData.logDate,
            logType: formData.logType,
            notes: formData.notes || undefined,
        };
        
        if (editingLog) {
            updateMutation.mutate({ id: editingLog.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };
    
    const handleDelete = () => {
        if (!ensureSeasonWritable()) {
            setDeleteLogId(null);
            return;
        }
        const target = logs.find((log) => log.id === deleteLogId);
        if (target?.canDelete === false) {
            toast.error(t('fieldLogs.validation.noPermission'));
            setDeleteLogId(null);
            return;
        }
        if (deleteLogId) {
            deleteMutation.mutate(deleteLogId);
        }
    };
    
    const getLogTypeConfig = (type: string) => {
        return LOG_TYPES.find(t => t.value === type) ?? { label: type, color: 'bg-muted text-muted-foreground' };
    };

    const getLogTypeLabel = (type: string) =>
        t(`fieldLogs.logTypes.${type}`, getLogTypeConfig(type).label);

    const getActorLabel = (actorType?: string | null) => {
        if (actorType === 'EMPLOYEE') return t('employee.actor.EMPLOYEE');
        if (actorType === 'FARMER') return t('employee.actor.FARMER');
        return t('employee.actor.UNKNOWN');
    };
    
    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('vi-VN');
    };
    
    const formatDateTime = (dateStr: string | null | undefined) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('vi-VN');
    };

    return (
        <PageContainer>
            <div className="mb-6">
                <PageHeader
                    icon={<FileText className="w-8 h-8" />}
                    title={t('fieldLogs.title')}
                    subtitle={t('fieldLogs.subtitle')}
                    actions={
                        <Button 
                            onClick={openCreateModal}
                            disabled={!selectedSeasonId || isSeasonWriteLocked}
                            title={isSeasonWriteLocked ? seasonWriteLockReason : undefined}
                            variant="accent"
                            className="min-h-[44px] bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 ring-offset-[var(--background)]"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('fieldLogs.createButton')}
                        </Button>
                    }
                />
            </div>

            {/* Filters */}
            <Card className="mb-6 border border-border rounded-xl shadow-sm">
                <CardContent className="px-6 py-4">
                    {!isWorkspaceScoped && seasonsLoading ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {t('fieldLogs.loadingSeasons')}
                        </div>
                    ) : !isWorkspaceScoped && seasons?.length === 0 ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <AlertCircle className="w-4 h-4" />
                            {t('fieldLogs.noSeasons')}
                        </div>
                    ) : (
                        <div className="flex flex-wrap items-center justify-start gap-4">
                            <div className="relative w-[320px]">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder={t('fieldLogs.searchPlaceholder')}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 rounded-xl border-border focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                                    disabled={!selectedSeasonId}
                                />
                            </div>

                            {isWorkspaceScoped ? (
                                <div className="rounded-xl border border-border px-3 py-2 text-sm bg-card">
                                    {t("fieldLogs.currentSeason")}{" "}
                                    <span className="font-medium">
                                        {selectedSeason?.seasonName ?? `${t("seasons.title")} #${selectedSeasonId}`}
                                    </span>
                                </div>
                            ) : (
                                <Select
                                    value={selectedSeasonId?.toString() ?? ''}
                                    onValueChange={(value) => {
                                        const nextSeasonId = Number(value);
                                        if (!Number.isFinite(nextSeasonId)) return;
                                        setSelectedSeasonId(nextSeasonId);
                                        seasonContext?.setSelectedSeasonId(nextSeasonId);
                                    }}
                                >
                                    <SelectTrigger className="rounded-xl border-border w-[180px]">
                                        <SelectValue placeholder={t('fieldLogs.selectSeason')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {seasons?.map((season) => (
                                            <SelectItem key={season.seasonId} value={season.seasonId.toString()}>
                                                {season.seasonName}
                                                {season.startDate && (
                                                    <span className="ml-2 text-muted-foreground text-sm">
                                                        ({formatDate(season.startDate)})
                                                    </span>
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="rounded-xl border-border w-[180px]" disabled={!selectedSeasonId}>
                                <SelectValue placeholder={t('fieldLogs.allTypes')} />
                            </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t('fieldLogs.allTypes')}</SelectItem>
                                    {LOG_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {getLogTypeLabel(type.value)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
            </Card>

            {isSeasonWriteLocked && (
                <Card className="mb-6 border border-[var(--portal-status-estimated-border)] bg-[var(--portal-status-estimated-bg)] rounded-[var(--radius-xl)]">
                    <CardContent className="px-6 py-3 text-sm text-[var(--portal-status-estimated-fg)]">
                        {seasonWriteLockReason}
                    </CardContent>
                </Card>
            )}

            {/* Content when season is selected */}
            {selectedSeasonId && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card>
                            <CardContent className="px-6 py-4">
                                <div className="text-2xl font-bold text-primary">{summaryStats.total}</div>
                                <div className="text-sm text-muted-foreground">{t('fieldLogs.summary.totalLogs')}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="px-6 py-4">
                                <div className="text-2xl font-bold">
                                    {summaryStats.latestDate ? formatDate(summaryStats.latestDate) : '-'}
                                </div>
                                <div className="text-sm text-muted-foreground">{t('fieldLogs.summary.latestDate')}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="px-6 py-4">
                                <div className="text-2xl font-bold">
                                    {summaryStats.commonType 
                                        ? getLogTypeLabel(summaryStats.commonType)
                                        : '-'}
                                </div>
                                <div className="text-sm text-muted-foreground">{t('fieldLogs.summary.commonType')}</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Logs Table */}
                    <Card>
                        <CardContent className="px-6 py-4">
                            {logsLoading ? (
                                <div className="flex items-center justify-center h-48">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                    <span className="ml-2 text-muted-foreground">{t('fieldLogs.loading')}</span>
                                </div>
                            ) : isError ? (
                                <div className="flex items-center justify-center h-48 text-destructive">
                                    <AlertCircle className="w-5 h-5 mr-2" />
                                    {t('fieldLogs.error')}
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                    <FileText className="w-12 h-12 mb-2 opacity-50" />
                                    <p>{t('fieldLogs.empty')}</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('fieldLogs.table.logDate')}</TableHead>
                                            <TableHead>{t('fieldLogs.table.type')}</TableHead>
                                            <TableHead className="max-w-xs">{t('fieldLogs.table.notes')}</TableHead>
                                            <TableHead>{t('fieldLogs.table.createdBy')}</TableHead>
                                            <TableHead>{t('fieldLogs.table.createdAt')}</TableHead>
                                            <TableHead className="text-right">{t('fieldLogs.table.actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log) => {
                                            const typeConfig = getLogTypeConfig(log.logType);
                                            return (
                                                <TableRow key={log.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar className="w-4 h-4 text-muted-foreground" />
                                                            {formatDate(log.logDate)}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={typeConfig.color}>
                                                            {getLogTypeLabel(log.logType)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="max-w-xs truncate">
                                                        {log.notes || '-'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-sm font-medium">
                                                                {log.createdByDisplayName ?? log.createdByUsername ?? '-'}
                                                            </span>
                                                            <Badge className={getActorBadgeClass(log.createdByType)}>
                                                                {getActorLabel(log.createdByType)}
                                                            </Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        {formatDateTime(log.createdAt)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="min-h-[44px] min-w-[44px] transition-colors duration-200 hover:bg-[var(--portal-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-md"
                                                                onClick={() => openEditModal(log)}
                                                                disabled={isSeasonWriteLocked || log.canEdit === false}
                                                                title={isSeasonWriteLocked
                                                                    ? seasonWriteLockReason
                                                                    : log.canEdit === false
                                                                        ? t('fieldLogs.validation.noPermission')
                                                                        : undefined}
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="min-h-[44px] min-w-[44px] text-[var(--destructive)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/10 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--destructive)] rounded-md"
                                                                onClick={() => setDeleteLogId(log.id)}
                                                                disabled={isSeasonWriteLocked || log.canDelete === false}
                                                                title={isSeasonWriteLocked
                                                                    ? seasonWriteLockReason
                                                                    : log.canDelete === false
                                                                        ? t('fieldLogs.validation.noPermission')
                                                                        : undefined}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Create/Edit Modal */}
            <Dialog
                open={isModalOpen}
                onOpenChange={(nextOpen) => {
                    if (nextOpen) {
                        setIsModalOpen(true);
                        return;
                    }
                    closeModal();
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <BackButton onClick={() => closeModal()} className="w-fit" />
                        <DialogTitle>
                            {editingLog ? t('fieldLogs.dialog.editTitle') : t('fieldLogs.dialog.createTitle')}
                        </DialogTitle>
                        <DialogDescription>
                            {editingLog 
                                ? t('fieldLogs.dialog.editDescription')
                                : t('fieldLogs.dialog.createDescription')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="logDate">
                                {t('fieldLogs.form.logDate')} <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="logDate"
                                type="date"
                                value={formData.logDate}
                                onChange={(e) => setFormData({ ...formData, logDate: e.target.value })}
                            />
                            {selectedSeason && (
                                <p className="text-xs text-muted-foreground">
                                    {t("fieldLogs.form.seasonRange")}: {formatDate(selectedSeason.startDate)} - {formatDate(selectedSeason.endDate ?? selectedSeason.plannedHarvestDate)}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="logType">
                                {t('fieldLogs.form.logType')} <span className="text-destructive">*</span>
                            </Label>
                            <Select 
                                value={formData.logType} 
                                onValueChange={(value) => setFormData({ ...formData, logType: value })}
                            >
                                <SelectTrigger className={selectTriggerClass}>
                                    <SelectValue placeholder={t('fieldLogs.form.selectType')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {LOG_TYPES.map((type) => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {getLogTypeLabel(type.value)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">{t('fieldLogs.form.notes')}</Label>
                            <Textarea
                                id="notes"
                                placeholder={t('fieldLogs.form.notesPlaceholder')}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                rows={4}
                            />
                        </div>
                        
                        {/* Inventory integration hint for FERTILIZE/SPRAY */}
                        {(formData.logType === 'FERTILIZE' || formData.logType === 'SPRAY') && (
                            <div className="p-3 bg-[var(--portal-badge-secondary-bg)] border border-[var(--portal-badge-secondary-border)] rounded-lg">
                                <p className="text-sm text-[var(--portal-badge-secondary-fg)]">
                                    💡 <strong>{t('fieldLogs.form.tip')}</strong> {t('fieldLogs.form.inventoryHint')}
                                </p>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => closeModal()}>
                            {t('common.cancel')}
                        </Button>
                        <Button 
                            onClick={handleSubmit}
                            disabled={isSeasonWriteLocked || createMutation.isPending || updateMutation.isPending}
                            variant="accent"
                            className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 ring-offset-[var(--background)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                        >
                            {(createMutation.isPending || updateMutation.isPending) && (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            {editingLog ? t('common.update') : t('common.create')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteLogId !== null} onOpenChange={() => setDeleteLogId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('fieldLogs.dialog.deleteTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('fieldLogs.dialog.deleteDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : null}
                            {t('common.delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageContainer>
    );
}
