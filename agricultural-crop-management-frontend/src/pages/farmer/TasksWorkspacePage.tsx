import type { TaskListParams } from '@/entities/task';
import { taskApi, taskKeys } from '@/entities/task';
import { useApproveTask, useRejectTask, useTaskProgressLogs } from '@/entities/labor';
import { useI18n } from '@/shared/lib/hooks/useI18n';
import { useDebounce } from '@/shared/lib';
import {
    AsyncState,
    BackButton,
    Badge,
    Button,
    Card,
    CardContent,
    ConfirmDialog,
    DataTablePagination,
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, ClipboardList, Plus, Search, CheckCircle, XCircle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function TasksWorkspacePage() {
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const [filters, setFilters] = useState<TaskListParams>({
    page: 0,
    size: 20,
    sortBy: 'createdAt',
    sortDirection: 'desc',
  });
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);

  // Dialog states
  const [startConfirmOpen, setStartConfirmOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [completionDate, setCompletionDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const approveTaskMutation = useApproveTask();
  const rejectTaskMutation = useRejectTask();
  const { data: progressLogs, isLoading: isProgressLoading } = useTaskProgressLogs(reviewDialogOpen ? selectedTaskId : null);


  // Fetch tasks using workspace API (no seasonId filter by default)
  const {
    data: tasksData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: taskKeys.listWorkspace({ ...filters, q: debouncedSearch || undefined }),
    queryFn: () => taskApi.listWorkspace({ ...filters, q: debouncedSearch || undefined }),
  });

  // Start task mutation
  const startTaskMutation = useMutation({
    mutationFn: (id: number) => taskApi.updateStatus(id, { 
      status: 'IN_PROGRESS', 
      actualStartDate: new Date().toISOString().split('T')[0] 
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.listWorkspace() });
      toast.success(t('tasks.toast.startSuccess'));
      setStartConfirmOpen(false);
      setSelectedTaskId(null);
    },
    onError: () => {
      toast.error(t('tasks.toast.startError'));
    },
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { actualEndDate?: string; actualStartDate?: string } }) =>
      taskApi.updateStatus(id, { 
        status: 'DONE', 
        actualEndDate: data.actualEndDate,
        actualStartDate: data.actualStartDate
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.listWorkspace() });
      toast.success(t('tasks.toast.completeSuccess'));
      setCompleteDialogOpen(false);
      setSelectedTaskId(null);
    },
    onError: () => {
      toast.error(t('tasks.toast.completeError'));
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      PENDING: 'outline',
      IN_PROGRESS: 'default',
      REVIEWING: 'default', // Using default with custom styling maybe? Or just default
      DONE: 'secondary',
      CANCELLED: 'destructive',
      OVERDUE: 'destructive',
    };

    return (
      <Badge variant={variants[status] || 'default'} className={status === 'REVIEWING' ? 'bg-orange-500 hover:bg-orange-600' : ''}>
        {status === 'REVIEWING' ? 'CHỜ NGHIỆM THU' : status.replace('_', ' ')}
      </Badge>
    );
  };

  const handleOpenStartConfirm = (id: number) => {
    setSelectedTaskId(id);
    setStartConfirmOpen(true);
  };

  const handleStartTask = () => {
    if (selectedTaskId) {
      startTaskMutation.mutate(selectedTaskId);
    }
  };

  const handleOpenCompleteDialog = (id: number) => {
    setSelectedTaskId(id);
    setCompletionDate(new Date().toISOString().split('T')[0]);
    setCompleteDialogOpen(true);
  };

  const handleCompleteTask = () => {
    if (selectedTaskId && completionDate) {
      const task = items.find((t) => t.taskId === selectedTaskId);
      const actualStartDate = task?.actualStartDate || new Date().toISOString().split('T')[0];
      completeTaskMutation.mutate({
        id: selectedTaskId,
        data: { 
          actualEndDate: completionDate,
          actualStartDate
        },
      });
    }
  };

  const handleOpenReviewDialog = (id: number) => {
    setSelectedTaskId(id);
    setRejectReason('');
    setReviewDialogOpen(true);
  };

  const handleApproveTask = () => {
    if (selectedTaskId) {
      approveTaskMutation.mutate(selectedTaskId, {
        onSuccess: () => {
          toast.success("Nghiệm thu thành công");
          setReviewDialogOpen(false);
          setSelectedTaskId(null);
        },
        onError: () => toast.error("Có lỗi xảy ra")
      });
    }
  };

  const handleRejectTask = () => {
    if (selectedTaskId && rejectReason) {
      rejectTaskMutation.mutate({ taskId: selectedTaskId, rejectReason }, {
        onSuccess: () => {
          toast.success("Đã từ chối nghiệm thu");
          setReviewDialogOpen(false);
          setSelectedTaskId(null);
        },
        onError: () => toast.error("Có lỗi xảy ra")
      });
    } else {
      toast.error("Vui lòng nhập lý do từ chối");
    }
  };

  // Get items from API response (handle different response formats)
  const items = tasksData?.items ?? [];
  const totalElements = tasksData?.totalElements ?? 0;
  const totalPages = tasksData?.totalPages ?? 0;

  return (
    <PageContainer>
      <div className="mb-6">
        <PageHeader
          icon={<ClipboardList className="w-8 h-8" />}
          title={t('tasks.title')}
          subtitle={t('tasks.subtitle')}
          actions={
            <Button className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
              <Plus className="w-4 h-4 mr-2" />
              {t('tasks.createButton')}
            </Button>
          }
        />
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="px-6 py-4">
          <div className="flex flex-wrap items-center justify-start gap-4">
            <div className="relative w-[320px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('tasks.searchPlaceholder')}
                className="pl-10 rounded-xl border-border focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  status: value === 'all' ? undefined : (value as any),
                  page: 0,
                }))
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('tasks.filters.allStatuses')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tasks.filters.allStatuses')}</SelectItem>
                <SelectItem value="PENDING">{t('tasks.status.pending')}</SelectItem>
                <SelectItem value="IN_PROGRESS">{t('tasks.status.inProgress')}</SelectItem>
                <SelectItem value="REVIEWING">Chờ nghiệm thu</SelectItem>
                <SelectItem value="DONE">{t('tasks.status.done')}</SelectItem>
                <SelectItem value="OVERDUE">{t('tasks.status.overdue')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
      <CardContent className="px-6 py-4">
          <AsyncState
            isLoading={isLoading}
            isEmpty={items.length === 0}
            error={error as Error | null}
            onRetry={() => refetch()}
            loadingText={t('tasks.loading')}
            emptyIcon={<ClipboardList className="w-6 h-6 text-[#777777]" />}
            emptyTitle={t('tasks.empty.title')}
            emptyDescription={t('tasks.empty.description')}
            emptyAction={
              <Button className="min-h-[44px] mt-2 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background">
                <Plus className="w-4 h-4 mr-2" />
                {t('tasks.createButton')}
              </Button>
            }
          >
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('tasks.table.title')}</TableHead>
                    <TableHead>{t('tasks.table.season')}</TableHead>
                    <TableHead>{t('tasks.table.plannedDate')}</TableHead>
                    <TableHead>{t('tasks.table.dueDate')}</TableHead>
                    <TableHead>{t('tasks.table.status')}</TableHead>
                    <TableHead className="text-right">{t('tasks.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((task) => (
                    <TableRow key={task.taskId}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>{task.seasonName || t('tasks.noSeason')}</TableCell>
                      <TableCell>{task.plannedDate || '-'}</TableCell>
                      <TableCell>{task.dueDate || '-'}</TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {task.status === 'PENDING' && (
                            <Button
                              size="sm"
                              onClick={() => handleOpenStartConfirm(task.taskId)}
                              disabled={startTaskMutation.isPending}
                              className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
                            >
                              {t('tasks.actions.start')}
                            </Button>
                          )}
                          {(task.status === 'IN_PROGRESS' || task.status === 'OVERDUE') && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleOpenCompleteDialog(task.taskId)}
                              disabled={completeTaskMutation.isPending}
                              className="min-h-[44px] shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 ring-offset-background"
                            >
                              {t('tasks.actions.complete')}
                            </Button>
                          )}
                          {(task.status as any) === 'REVIEWING' && (
                            <Button
                              size="sm"
                              className="min-h-[44px] bg-orange-500 hover:bg-orange-600 shadow-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ring-offset-background text-white"
                              onClick={() => handleOpenReviewDialog(task.taskId)}
                            >
                              Nghiệm thu
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
              <DataTablePagination
                currentPage={filters.page ?? 0}
                totalPages={totalPages}
                totalItems={totalElements}
                pageSize={filters.size ?? 20}
                onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
                onPageSizeChange={(size) => setFilters((prev) => ({ ...prev, size, page: 0 }))}
              />
            )}
          </AsyncState>
        </CardContent>
      </Card>

      {/* Start Task Confirmation Dialog */}
      <ConfirmDialog
        open={startConfirmOpen}
        onOpenChange={setStartConfirmOpen}
        title={t('tasks.dialog.startTitle')}
        description={t('tasks.dialog.startDescription')}
        confirmText={t('tasks.dialog.startConfirm')}
        onConfirm={handleStartTask}
        isLoading={startTaskMutation.isPending}
      />

      {/* Complete Task Dialog with Date Input */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <BackButton onClick={() => setCompleteDialogOpen(false)} className="w-fit" />
            <DialogTitle>{t('tasks.dialog.completeTitle')}</DialogTitle>
            <DialogDescription>
              {t('tasks.dialog.completeDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="completionDate">{t('tasks.dialog.completionDateLabel')}</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="completionDate"
                  type="date"
                  value={completionDate}
                  onChange={(e) => setCompletionDate(e.target.value)}
                  className="pl-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="min-h-[44px]"
              onClick={() => setCompleteDialogOpen(false)}
              disabled={completeTaskMutation.isPending}
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="min-h-[44px]"
              onClick={handleCompleteTask}
              disabled={completeTaskMutation.isPending || !completionDate}
            >
              {completeTaskMutation.isPending ? t('tasks.dialog.completing') : t('tasks.dialog.completeConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review Task Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={(open) => !open && setReviewDialogOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <BackButton onClick={() => setReviewDialogOpen(false)} className="w-fit" />
            <DialogTitle>Nghiệm thu công việc</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto py-4 space-y-4">
            {isProgressLoading ? (
              <div className="flex justify-center p-8">Đang tải lịch sử báo cáo...</div>
            ) : progressLogs && progressLogs.length > 0 ? (
              <div className="space-y-6">
                {progressLogs.map((log: any) => (
                  <div key={log.id} className="border p-4 rounded-lg bg-gray-50 space-y-2">
                    <div className="flex justify-between items-center text-sm mb-2 border-b pb-2">
                      <span className="font-semibold text-gray-700">{log.employeeName}</span>
                      <span className="text-gray-500">{new Date(log.loggedAt!).toLocaleString()}</span>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Badge variant="outline">{log.progressPercent}%</Badge>
                      <span className="text-sm text-gray-700">{log.note || "Không có ghi chú"}</span>
                    </div>
                    {log.evidenceUrl && (
                      <div className="mt-3 relative w-full max-w-sm rounded-md overflow-hidden border bg-white">
                        <img src={log.evidenceUrl} alt="Evidence" className="w-full h-auto object-cover" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">Chưa có báo cáo nào.</div>
            )}
            
            <div className="border-t pt-4 mt-4 space-y-3">
              <Label>Lý do từ chối (Nếu có)</Label>
              <Textarea 
                placeholder="Nhập lý do bắt làm lại..." 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="mt-4 shrink-0">
            <Button variant="destructive" className="min-h-[44px]" onClick={handleRejectTask} disabled={rejectTaskMutation.isPending || !rejectReason}>
              <XCircle className="w-4 h-4 mr-2" /> Từ chối
            </Button>
            <Button className="min-h-[44px] bg-orange-500 hover:bg-orange-600 text-white" onClick={handleApproveTask} disabled={approveTaskMutation.isPending}>
              <CheckCircle className="w-4 h-4 mr-2" /> Duyệt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
