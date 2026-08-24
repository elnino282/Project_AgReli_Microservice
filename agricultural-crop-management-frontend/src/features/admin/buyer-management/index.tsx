import { Plus, Upload } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useBuyerManagement } from './hooks/useBuyerManagement';
import { BuyerStatCards } from './components/BuyerStatCards';
import { BuyerFilters } from './components/BuyerFilters';
import { BulkActionToolbar } from './components/BulkActionToolbar';
import { BuyerTable } from './components/BuyerTable';
import { BuyerPagination } from './components/BuyerPagination';
import { BuyerDetailDrawer } from './components/BuyerDetailDrawer';
import { ResetPasswordModal } from './components/ResetPasswordModal';
import { ImportCSVWizard } from './components/ImportCSVWizard';
import { useI18n } from '@/shared/lib/hooks/useI18n';

export default function BuyerManagement() {
    const { t } = useI18n();
    const {
        // State
        searchQuery,
        setSearchQuery,
        selectedBuyers,
        filterOpen,
        setFilterOpen,
        detailDrawerOpen,
        setDetailDrawerOpen,
        resetPasswordOpen,
        importWizardOpen,
        setImportWizardOpen,
        selectedBuyer,
        detailTab,
        setDetailTab,
        currentPage,
        setCurrentPage,
        itemsPerPage,
        setItemsPerPage,
        sortColumn,
        sortDirection,
        importStep,
        setImportStep,
        csvPreview,
        roleFilter,
        setRoleFilter,
        kycFilter,
        setKycFilter,
        statusFilter,
        setStatusFilter,
        formData,
        setFormData,
        // Data
        filteredBuyers,
        paginatedBuyers,
        totalPages,
        stats,
        // Handlers
        handleSort,
        handleSelectAll,
        handleSelectBuyer,
        handleViewEdit,
        handleAddBuyer,
        handleSave,
        handleDelete,
        handleToggleSuspend,
        handleKYCAction,
        handleBulkAction,
        handleCSVUpload,
        handleImportConfirm,
        handleResetPassword,
        handleResetPasswordSubmit,
        handleResetPasswordModalOpenChange,
        // Helper functions
        getRoleBadge,
        getKYCBadge,
        getStatusBadge,
        // API state
        isLoading,
        error,
        totalResults,
        validationErrors,
    } = useBuyerManagement();

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="mb-1">{t('admin.buyerManagement.title')}</h1>
                    <p className="text-sm text-muted-foreground">
                        {t('admin.buyerManagement.subtitle')}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => setImportWizardOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        {t('admin.buyerManagement.actions.importCsv')}
                    </Button>
                    <Button onClick={handleAddBuyer}>
                        <Plus className="w-4 h-4 mr-2" />
                        {t('admin.buyerManagement.actions.addBuyer')}
                    </Button>
                </div>
            </div>

            {/* Summary Stats */}
            <BuyerStatCards stats={stats} />

            {/* Search and Filter */}
            <BuyerFilters
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                filterOpen={filterOpen}
                onFilterOpenChange={setFilterOpen}
                roleFilter={roleFilter}
                onRoleFilterChange={setRoleFilter}
                kycFilter={kycFilter}
                onKycFilterChange={setKycFilter}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
            />

            {/* Bulk Action Toolbar */}
            <BulkActionToolbar
                selectedCount={selectedBuyers.length}
                onSelectAll={handleSelectAll}
                isAllSelected={selectedBuyers.length === filteredBuyers.length}
                onActivate={() => handleBulkAction('activate')}
                onSuspend={() => handleBulkAction('suspend')}
                onDelete={() => handleBulkAction('delete')}
            />

            {/* Buyer Table with Pagination */}
            <div className="space-y-0">
                {isLoading && (
                    <div className="rounded-lg border p-3 text-sm text-muted-foreground">
                        {t('admin.buyerManagement.loading')}
                    </div>
                )}
                {error && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                        {error}
                    </div>
                )}
                <BuyerTable
                    buyers={paginatedBuyers}
                    selectedBuyers={selectedBuyers}
                    allSelected={selectedBuyers.length === filteredBuyers.length}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSelectAll={handleSelectAll}
                    onSelectBuyer={handleSelectBuyer}
                    onSort={handleSort}
                    onViewEdit={handleViewEdit}
                    onToggleSuspend={handleToggleSuspend}
                    onResetPassword={handleResetPassword}
                    onDelete={handleDelete}
                    getRoleBadge={getRoleBadge}
                    getKYCBadge={getKYCBadge}
                    getStatusBadge={getStatusBadge}
                />
                <BuyerPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    itemsPerPage={itemsPerPage}
                    totalResults={totalResults}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                />
            </div>

            {/* Modals and Drawers */}
            <BuyerDetailDrawer
                open={detailDrawerOpen}
                onOpenChange={setDetailDrawerOpen}
                buyer={selectedBuyer}
                formData={formData}
                onFormDataChange={setFormData}
                activeTab={detailTab}
                onTabChange={setDetailTab}
                onSave={handleSave}
                onKYCVerify={() => handleKYCAction('verify')}
                onKYCReject={() => handleKYCAction('reject')}
                getKYCBadge={getKYCBadge}
                kycActionsSupported={false}
            />

            <ResetPasswordModal
                open={resetPasswordOpen}
                onOpenChange={handleResetPasswordModalOpenChange}
                onResetPassword={handleResetPasswordSubmit}
            />

            <ImportCSVWizard
                open={importWizardOpen}
                onOpenChange={setImportWizardOpen}
                step={importStep}
                onStepChange={setImportStep}
                csvPreview={csvPreview}
                validationErrors={validationErrors}
                onFileUpload={handleCSVUpload}
                onConfirm={handleImportConfirm}
                getRoleBadge={getRoleBadge}
                canImport={false}
                importUnsupportedMessage={t('admin.buyerManagement.import.unsupported')}
            />
        </div>
    );
}
