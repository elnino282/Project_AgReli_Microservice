// Create incident ticket dialog

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";
import { AlertTriangle } from "lucide-react";
import type { AlertSeverity, IncidentForm } from "../types";
import { useI18n } from "@/shared/lib/hooks/useI18n";

interface IncidentTicketDialogProps {
  incidentModalOpen: boolean;
  setIncidentModalOpen: (open: boolean) => void;
  incidentForm: IncidentForm;
  setIncidentForm: (form: IncidentForm) => void;
  handleCreateIncident: () => void;
}

export function IncidentTicketDialog({
  incidentModalOpen,
  setIncidentModalOpen,
  incidentForm,
  setIncidentForm,
  handleCreateIncident,
}: IncidentTicketDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog open={incidentModalOpen} onOpenChange={setIncidentModalOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {t('admin.systemMonitoring.incident.title')}
          </DialogTitle>
          <DialogDescription>
            {t('admin.systemMonitoring.incident.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="incident-title">{t('admin.systemMonitoring.incident.titleLabel')} *</Label>
            <Input
              id="incident-title"
              placeholder={t('admin.systemMonitoring.incident.titlePlaceholder')}
              value={incidentForm.title}
              onChange={(e) =>
                setIncidentForm({ ...incidentForm, title: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="incident-description">{t('common.description')} *</Label>
            <Textarea
              id="incident-description"
              placeholder={t('admin.systemMonitoring.incident.descriptionPlaceholder')}
              value={incidentForm.description}
              onChange={(e) =>
                setIncidentForm({
                  ...incidentForm,
                  description: e.target.value,
                })
              }
              rows={5}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="severity">{t('admin.systemMonitoring.incident.severity')} *</Label>
              <Select
                value={incidentForm.severity}
                onValueChange={(v: string) =>
                  setIncidentForm({
                    ...incidentForm,
                    severity: v as AlertSeverity,
                  })
                }
              >
                <SelectTrigger id="severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">{t('admin.systemMonitoring.severity.critical')}</SelectItem>
                  <SelectItem value="high">{t('admin.systemMonitoring.severity.high')}</SelectItem>
                  <SelectItem value="medium">{t('admin.systemMonitoring.severity.medium')}</SelectItem>
                  <SelectItem value="low">{t('admin.systemMonitoring.severity.low')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">{t('common.status')} *</Label>
              <Select
                value={incidentForm.status}
                onValueChange={(v: string) =>
                  setIncidentForm({
                    ...incidentForm,
                    status: v as IncidentForm["status"],
                  })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">{t('admin.systemMonitoring.status.open')}</SelectItem>
                  <SelectItem value="in-progress">{t('admin.systemMonitoring.status.inProgress')}</SelectItem>
                  <SelectItem value="resolved">{t('admin.systemMonitoring.status.resolved')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned-to">{t('admin.systemMonitoring.incident.assignedTo')}</Label>
            <Select
              value={incidentForm.assignedTo}
              onValueChange={(v: string) =>
                setIncidentForm({ ...incidentForm, assignedTo: v })
              }
            >
              <SelectTrigger id="assigned-to">
                <SelectValue placeholder={t('admin.systemMonitoring.incident.selectTeamMember')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin-user">{t('admin.systemMonitoring.teams.adminUser')}</SelectItem>
                <SelectItem value="dev-team">{t('admin.systemMonitoring.teams.devTeam')}</SelectItem>
                <SelectItem value="ops-team">{t('admin.systemMonitoring.teams.opsTeam')}</SelectItem>
                <SelectItem value="security-team">{t('admin.systemMonitoring.teams.securityTeam')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIncidentModalOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleCreateIncident}>
            {t('admin.systemMonitoring.incident.createTicket')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
