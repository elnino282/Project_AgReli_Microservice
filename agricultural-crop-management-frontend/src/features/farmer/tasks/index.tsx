import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTaskWorkspace } from './hooks/useTaskWorkspace';
import { TaskHeader } from './components/TaskHeader';
import { SearchFilterBar } from './components/SearchFilterBar';
import { BoardView } from './components/BoardView';
import { ListView } from './components/ListView';
import { CalendarView } from './components/CalendarView';
import { CreateTaskDialog } from './components/CreateTaskDialog';
import { ReassignDialog } from './components/ReassignDialog';
import { BulkActionToolbar } from './components/BulkActionToolbar';
import { DueDateDialog } from './components/DueDateDialog';
import { EditTaskDialog } from './components/EditTaskDialog';
import { TaskProgressReportsPanel } from './components/TaskProgressReportsPanel';
import { PageContainer } from '@/shared/ui';

export function TaskWorkspace() {
  const [searchParams] = useSearchParams();
  const {
    viewMode,
    setViewMode,
    calendarMode,
    setCalendarMode,
    currentDate,
    setCurrentDate,
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    selectedTasks,
    setSelectedTasks,
    createTaskOpen,
    setCreateTaskOpen,
    reassignOpen,
    setReassignOpen,
    dueDateOpen,
    setDueDateOpen,
    filteredTasks,
    uniqueAssignees,
    uniquePlots,
    assigneeOptions,
    workTeamOptions,
    handleTaskMove,
    handleBulkComplete,
    handleDeleteTask,
    handleSelectAll,
    handleSelectTask,
    handleReassign,
    handleBulkDueDateChange,
    handleCreateTask,
    handleEditTask,
    handleUpdateTask,
    handleCompleteTask,
    editTaskOpen,
    setEditTaskOpen,
    editingTaskId,
    setEditingTaskId,
    seasonId,
    isSeasonWriteLocked,
    seasonWriteLockReason,
    rawTasks,
  } = useTaskWorkspace();

  const qParam = searchParams.get('q') ?? '';
  const seasonFilter = seasonId > 0 ? seasonId : null;

  useEffect(() => {
    if (qParam !== searchQuery) {
      setSearchQuery(qParam);
    }
  }, [qParam, searchQuery, setSearchQuery]);

  const scopedTasks = useMemo(() => {
    if (!seasonFilter) return filteredTasks;
    return filteredTasks.filter((task) => task.seasonId === seasonFilter);
  }, [filteredTasks, seasonFilter]);

  const editingTaskInitialData = useMemo(() => {
    if (!editingTaskId || !rawTasks) return null;
    return rawTasks.find(t => String(t.taskId) === editingTaskId) || null;
  }, [editingTaskId, rawTasks]);

  return (
    <DndProvider backend={HTML5Backend}>
      <PageContainer variant="wide" className="pb-20">
        <div className="space-y-6">
          <TaskHeader
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onCreateTask={() => setCreateTaskOpen(true)}
            disableMutations={isSeasonWriteLocked}
            lockMessage={seasonWriteLockReason}
          />

          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            filters={filters}
            onFiltersChange={setFilters}
            uniqueAssignees={uniqueAssignees}
            uniquePlots={uniquePlots}
          />

          {viewMode === 'board' && (
            <BoardView
              tasks={scopedTasks}
              onTaskMove={handleTaskMove}
              onEdit={handleEditTask}
              onComplete={handleCompleteTask}
              onReassign={(id) => { setEditingTaskId(id); setReassignOpen(true); }}
              onDelete={handleDeleteTask}
              disableMutations={isSeasonWriteLocked}
            />
          )}
          {viewMode === 'list' && (
            <ListView
              tasks={scopedTasks}
              selectedTasks={selectedTasks}
              onSelectAll={handleSelectAll}
              onSelectTask={handleSelectTask}
              onEdit={handleEditTask}
              onComplete={handleCompleteTask}
              onReassign={(id) => { setEditingTaskId(id); setReassignOpen(true); }}
              onChangeDueDate={(id) => { setEditingTaskId(id); setDueDateOpen(true); }}
              onDelete={handleDeleteTask}
              disableMutations={isSeasonWriteLocked}
            />
          )}
          {viewMode === 'calendar' && (
            <CalendarView
              tasks={scopedTasks}
              mode={calendarMode}
              currentDate={currentDate}
              onModeChange={setCalendarMode}
              onDateChange={setCurrentDate}
            />
          )}
          {seasonFilter && <TaskProgressReportsPanel seasonId={seasonFilter} />}
        </div>

        {selectedTasks.length > 0 && !isSeasonWriteLocked && (
          <BulkActionToolbar
            selectedCount={selectedTasks.length}
            onComplete={handleBulkComplete}
            onReassign={() => setReassignOpen(true)}
            onChangeDueDate={() => setDueDateOpen(true)}
            onClose={() => setSelectedTasks([])}
          />
        )}

        <CreateTaskDialog
          open={createTaskOpen}
          onOpenChange={setCreateTaskOpen}
          onCreateTask={handleCreateTask}
          seasonId={seasonFilter ?? undefined}
          hideSeasonSelector={true}
          uniquePlots={uniquePlots}
          assigneeOptions={assigneeOptions}
          workTeamOptions={workTeamOptions}
          isFormDisabled={isSeasonWriteLocked}
          disabledReason={seasonWriteLockReason}
        />

        <ReassignDialog
          open={reassignOpen}
          onOpenChange={(open) => {
            setReassignOpen(open);
            if (!open) setEditingTaskId(null);
          }}
          selectedCount={editingTaskId ? 1 : selectedTasks.length}
          onReassign={(userId) => {
            if (editingTaskId) {
              handleUpdateTask(editingTaskId, { assigneeUserId: userId });
              setReassignOpen(false);
            } else {
              handleReassign(userId);
            }
          }}
          seasonId={seasonFilter ?? undefined}
          disabled={isSeasonWriteLocked}
          disabledReason={seasonWriteLockReason}
        />

        <DueDateDialog
          open={dueDateOpen}
          onOpenChange={(open) => {
            setDueDateOpen(open);
            if (!open) setEditingTaskId(null);
          }}
          selectedCount={editingTaskId ? 1 : selectedTasks.length}
          onChangeDueDate={(dueDate) => {
            if (editingTaskId) {
              handleUpdateTask(editingTaskId, { dueDate });
              setDueDateOpen(false);
            } else {
              handleBulkDueDateChange(dueDate);
            }
          }}
          disabled={isSeasonWriteLocked}
          disabledReason={seasonWriteLockReason}
        />

        <EditTaskDialog
          open={editTaskOpen}
          onOpenChange={setEditTaskOpen}
          taskId={Number(editingTaskId)}
          initialData={editingTaskInitialData}
          onSaveTask={handleUpdateTask}
          seasonId={seasonFilter ?? undefined}
          hideSeasonSelector={false}
          uniquePlots={uniquePlots}
          assigneeOptions={assigneeOptions}
          workTeamOptions={workTeamOptions}
          isFormDisabled={isSeasonWriteLocked}
          disabledReason={seasonWriteLockReason}
        />
      </PageContainer>
    </DndProvider>
  );
}




