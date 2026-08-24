import { Plus, Upload } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useEffect, useState } from 'react';
import { useFarmerManagement } from './hooks/useFarmerManagement';
import { FarmerFilters } from './components/FarmerFilters';
import { BulkActionToolbar } from './components/BulkActionToolbar';
import { FarmerTable } from './components/FarmerTable';
import { FarmerPagination } from './components/FarmerPagination';
import { FarmerFormDrawer } from './components/FarmerFormDrawer';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { AuditHistoryDrawer } from './components/AuditHistoryDrawer';
import { ImportCSVWizard } from './components/ImportCSVWizard';
import { useI18n } from '@/shared/lib/hooks/useI18n';

export function FarmerManagement() {
    const { t } = useI18n();
    const [resetTargetFarmerId, setResetTargetFarmerId] = useState<string | null>(null);

    const {
        // State
        farmers,
        filteredFarmers,
        searchQuery,
        selectedFarmers,
        filterOpen,
        createEditOpen,
        resetPasswordOpen,
        historyOpen,
        importWizardOpen,
        editingFarmer,
        currentPage,
        itemsPerPage,
        sortColumn,
        sortDirection,
        roleFilter,
        statusFilter,
        formData,
        importStep,
        csvPreview,
        validationErrors,
        totalPages,
        totalFarmers,

        // Setters
        setSearchQuery,
        setFilterOpen,
        setCreateEditOpen,
        setResetPasswordOpen,
        setHistoryOpen,
        setImportWizardOpen,
        setCurrentPage,
        setItemsPerPage,
        setRoleFilter,
        setStatusFilter,
        setFormData,
        setImportStep,

        // Handlers
        handleSort,
        handleSelectAll,
        handleSelectFarmer,
        handleEdit,
        handleCreate,
        handleSave,
        handleDelete,
        handleLock,
        handleBulkAction,
        handleCSVUpload,
        handleImportConfirm,
        handleResetPassword,
        clearFilters,

        // API status
        isLoading,
        error,
    } = useFarmerManagement();

    useEffect(() => {
        if (!resetPasswordOpen) {
            setResetTargetFarmerId(null);
        }
    }, [resetPasswordOpen]);

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="mb-1">{t('admin.farmerManagement.title')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t('admin.farmerManagement.subtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => setImportWizardOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        {t('admin.farmerManagement.actions.importCsv')}
                    </Button>
                    <Button onClick={handleCreate}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t('admin.farmerManagement.actions.addFarmer')}
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <FarmerFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filterOpen={filterOpen}
                onFilterOpenChange={setFilterOpen}
                roleFilter={roleFilter}
                statusFilter={statusFilter}
                onRoleFilterChange={setRoleFilter}
                onStatusFilterChange={setStatusFilter}
                onClearFilters={clearFilters}
            />

            {/* Bulk Actions */}
            <BulkActionToolbar
                selectedCount={selectedFarmers.length}
                totalCount={filteredFarmers.length}
                onSelectAll={handleSelectAll}
                onBulkAction={handleBulkAction}
            />

            {/* Farmer Table */}
            {isLoading && (
                <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                    {t('admin.farmerManagement.loading')}
                </div>
            )}
            {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                    {error}
                </div>
            )}
            <FarmerTable
                farmers={farmers}
                selectedFarmers={selectedFarmers}
                allSelected={selectedFarmers.length === filteredFarmers.length}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSelectAll={handleSelectAll}
                onSelectFarmer={handleSelectFarmer}
                onSort={handleSort}
                onEdit={handleEdit}
                onLock={handleLock}
                onDelete={handleDelete}
                onResetPassword={(id) => {
                    setResetTargetFarmerId(id);
                    setResetPasswordOpen(true);
                }}
                onViewHistory={() => setHistoryOpen(true)}
            />

            {/* Pagination */}
            <FarmerPagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                totalItems={totalFarmers}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
            />

            {/* Modals & Drawers */}
            <FarmerFormDrawer
                open={createEditOpen}
                onOpenChange={setCreateEditOpen}
                editingFarmer={editingFarmer}
                formData={formData}
                onFormDataChange={setFormData}
                onSave={handleSave}
            />

            <ResetPasswordModal
                open={resetPasswordOpen}
                onOpenChange={(open) => {
                    setResetPasswordOpen(open);
                    if (!open) {
                        setResetTargetFarmerId(null);
                    }
                }}
                onResetPassword={(method) => {
                    if (!resetTargetFarmerId) return;
                    handleResetPassword(resetTargetFarmerId, method);
                }}
            />

            <AuditHistoryDrawer
                open={historyOpen}
                onOpenChange={setHistoryOpen}
            />

            <ImportCSVWizard
                open={importWizardOpen}
                onOpenChange={setImportWizardOpen}
                step={importStep}
                onStepChange={setImportStep}
                csvPreview={csvPreview}
                validationErrors={validationErrors}
                onFileUpload={handleCSVUpload}
                onImportConfirm={handleImportConfirm}
                canImport={false}
                importUnsupportedMessage={t('admin.farmerManagement.import.unsupported')}
            />
        </div>
    );
}
