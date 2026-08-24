import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { useI18n } from '@/shared/lib/hooks/useI18n';

interface BuyerPaginationProps {
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    totalResults: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange: (items: number) => void;
}

export function BuyerPagination({
    currentPage,
    totalPages,
    itemsPerPage,
    totalResults,
    onPageChange,
    onItemsPerPageChange,
}: BuyerPaginationProps) {
    const { t } = useI18n();
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, totalResults);

    const getPageNumbers = () => {
        const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
        if (totalPages <= 7) return pages;

        return pages.filter((page) => {
            if (page === 1 || page === totalPages) return true;
            if (Math.abs(page - currentPage) <= 1) return true;
            return false;
        });
    };

    const pageNumbers = getPageNumbers();

    return (
        <div className="flex items-center justify-between p-4 border-t">
            <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                    {t('pagination.showing')} {startIndex} {t('pagination.to')} {endIndex} {t('pagination.of')} {totalResults} {t('pagination.results')}
                </span>
                <Select
                    value={String(itemsPerPage)}
                    onValueChange={(v) => {
                        onItemsPerPageChange(Number(v));
                        onPageChange(1);
                    }}
                >
                    <SelectTrigger className="w-[100px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">{t('admin.buyerManagement.pagination.perPage', { count: 10 })}</SelectItem>
                        <SelectItem value="25">{t('admin.buyerManagement.pagination.perPage', { count: 25 })}</SelectItem>
                        <SelectItem value="50">{t('admin.buyerManagement.pagination.perPage', { count: 50 })}</SelectItem>
                        <SelectItem value="100">{t('admin.buyerManagement.pagination.perPage', { count: 100 })}</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                >
                    {t('pagination.previousPage')}
                </Button>
                {pageNumbers.map((page, index, arr) => {
                    const prevPage = arr[index - 1];
                    const showEllipsis = prevPage && page - prevPage > 1;
                    return (
                        <div key={page} className="flex items-center">
                            {showEllipsis && <span className="px-2 text-muted-foreground">...</span>}
                            <Button
                                variant={currentPage === page ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => onPageChange(page)}
                            >
                                {page}
                            </Button>
                        </div>
                    );
                })}
                <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                >
                    {t('pagination.nextPage')}
                </Button>
            </div>
        </div>
    );
}
