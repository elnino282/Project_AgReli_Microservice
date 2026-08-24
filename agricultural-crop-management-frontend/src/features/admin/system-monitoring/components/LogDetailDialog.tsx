// Detailed log entry viewer

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";
import { Copy, FileText } from "lucide-react";
import type { LogEntry, LogLevel } from "../types";
import { useI18n } from "@/shared/lib/hooks/useI18n";

interface LogDetailDialogProps {
  logDetailOpen: boolean;
  setLogDetailOpen: (open: boolean) => void;
  selectedLog: LogEntry | null;
  handleCopyLog: (log: LogEntry) => void;
  getLogLevelBadge: (level: LogLevel) => string;
}

export function LogDetailDialog({
  logDetailOpen,
  setLogDetailOpen,
  selectedLog,
  handleCopyLog,
  getLogLevelBadge,
}: LogDetailDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={logDetailOpen} onOpenChange={setLogDetailOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('admin.systemMonitoring.logDetail.title')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.systemMonitoring.logDetail.description')}
          </DialogDescription>
        </DialogHeader>

        {selectedLog && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">
                  {t('admin.systemMonitoring.logDetail.timestamp')}
                </Label>
                <p className="text-sm mt-1">{selectedLog.time}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('admin.systemMonitoring.filters.service')}</Label>
                <p className="text-sm mt-1">{selectedLog.service}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">{t('admin.systemMonitoring.filters.logLevel')}</Label>
                <div className="mt-1">
                  <Badge
                    variant="secondary"
                    className={getLogLevelBadge(selectedLog.level)}
                  >
                    {t(`admin.systemMonitoring.logLevel.${selectedLog.level}`, selectedLog.level)}
                  </Badge>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('admin.systemMonitoring.filters.user')}</Label>
                <p className="text-sm mt-1">{selectedLog.user}</p>
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">{t('admin.systemMonitoring.logDetail.message')}</Label>
              <p className="text-sm mt-1 p-3 rounded-lg bg-muted">
                {selectedLog.message}
              </p>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">
                {t('admin.systemMonitoring.logDetail.stackTrace')}
              </Label>
              <pre className="text-xs mt-1 p-3 rounded-lg bg-muted overflow-x-auto">
                {`at Database.connect (database.js:142)
at async processRequest (server.js:89)
at async handleHTTPRequest (router.js:45)`}
              </pre>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => selectedLog && handleCopyLog(selectedLog)}
          >
            <Copy className="w-4 h-4 mr-2" />
            {t('admin.systemMonitoring.logs.copyLog')}
          </Button>
          <Button variant="outline" onClick={() => setLogDetailOpen(false)}>
            {t('common.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
