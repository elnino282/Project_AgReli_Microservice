// Log download configuration dialog

import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";
import { Download } from "lucide-react";
import type { DateRange, DownloadConfig } from "../types";
import { useI18n } from "@/shared/lib/hooks/useI18n";

interface DownloadLogsDialogProps {
  downloadLogsOpen: boolean;
  setDownloadLogsOpen: (open: boolean) => void;
  downloadConfig: DownloadConfig;
  setDownloadConfig: (config: DownloadConfig) => void;
  handleDownloadLogs: () => void;
}

export function DownloadLogsDialog({
  downloadLogsOpen,
  setDownloadLogsOpen,
  downloadConfig,
  setDownloadConfig,
  handleDownloadLogs,
}: DownloadLogsDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={downloadLogsOpen} onOpenChange={setDownloadLogsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            {t('admin.systemMonitoring.download.title')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.systemMonitoring.download.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label>{t('admin.systemMonitoring.download.logTypes')}</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="error-logs"
                  checked={downloadConfig.types.error}
                  onCheckedChange={(checked: boolean | "indeterminate") =>
                    setDownloadConfig({
                      ...downloadConfig,
                      types: {
                        ...downloadConfig.types,
                        error: checked as boolean,
                      },
                    })
                  }
                />
                <Label htmlFor="error-logs" className="cursor-pointer">
                  {t('admin.systemMonitoring.download.types.error')}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="system-logs"
                  checked={downloadConfig.types.system}
                  onCheckedChange={(checked: boolean | "indeterminate") =>
                    setDownloadConfig({
                      ...downloadConfig,
                      types: {
                        ...downloadConfig.types,
                        system: checked as boolean,
                      },
                    })
                  }
                />
                <Label htmlFor="system-logs" className="cursor-pointer">
                  {t('admin.systemMonitoring.download.types.system')}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="auth-logs"
                  checked={downloadConfig.types.auth}
                  onCheckedChange={(checked: boolean | "indeterminate") =>
                    setDownloadConfig({
                      ...downloadConfig,
                      types: {
                        ...downloadConfig.types,
                        auth: checked as boolean,
                      },
                    })
                  }
                />
                <Label htmlFor="auth-logs" className="cursor-pointer">
                  {t('admin.systemMonitoring.download.types.auth')}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ai-logs"
                  checked={downloadConfig.types.ai}
                  onCheckedChange={(checked: boolean | "indeterminate") =>
                    setDownloadConfig({
                      ...downloadConfig,
                      types: {
                        ...downloadConfig.types,
                        ai: checked as boolean,
                      },
                    })
                  }
                />
                <Label htmlFor="ai-logs" className="cursor-pointer">
                  {t('admin.systemMonitoring.download.types.ai')}
                </Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('admin.systemMonitoring.download.dateRange')}</Label>
            <Select
              value={downloadConfig.dateRange}
              onValueChange={(v: string) =>
                setDownloadConfig({
                  ...downloadConfig,
                  dateRange: v as DateRange,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t('admin.systemMonitoring.dateRange.today')}</SelectItem>
                <SelectItem value="24h">{t('admin.systemMonitoring.dateRange.last24Hours')}</SelectItem>
                <SelectItem value="7d">{t('admin.systemMonitoring.dateRange.last7d')}</SelectItem>
                <SelectItem value="30d">{t('admin.systemMonitoring.dateRange.last30d')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('admin.systemMonitoring.download.sizeCap')}</Label>
            <Select
              value={downloadConfig.sizeCap}
              onValueChange={(v: string) =>
                setDownloadConfig({ ...downloadConfig, sizeCap: v })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50MB">50 MB</SelectItem>
                <SelectItem value="100MB">100 MB</SelectItem>
                <SelectItem value="500MB">500 MB</SelectItem>
                <SelectItem value="unlimited">{t('admin.systemMonitoring.download.unlimited')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setDownloadLogsOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleDownloadLogs}>
            <Download className="w-4 h-4 mr-2" />
            {t('admin.systemMonitoring.download.download')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
