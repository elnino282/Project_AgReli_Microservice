import React, { useState, useEffect } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Plus, Users, Edit, Trash2 } from "lucide-react";
import { CreateWorkTeamDialog } from "./CreateWorkTeamDialog";
import { EditWorkTeamDialog } from "./EditWorkTeamDialog";
import { ConfirmDialog } from "@/shared/ui";
import httpClient from "@/shared/api/http";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface WorkTeam {
  id: number;
  seasonId: number;
  teamName: string;
  teamLeaderUserId: number;
  leaderName?: string;
  memberCount?: number;
  members?: any[];
}

interface WorkTeamPanelProps {
  seasonId: number;
}

export function WorkTeamPanel({ seasonId }: WorkTeamPanelProps) {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<WorkTeam[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<WorkTeam | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTeams = async () => {
    if (!seasonId) return;
    setIsLoading(true);
    try {
      // Gọi API lấy danh sách team theo seasonId
      const response = await httpClient.get(`/api/v1/farmer/seasons/${seasonId}/teams`);
      if (response.data) {
        // Backend trả về mảng trực tiếp
        setTeams(response.data);
      }
    } catch (error) {
      toast.error(t("workTeams.fetchError", "Lỗi tải danh sách đội nhóm"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [seasonId]);

  const handleEditClick = (team: WorkTeam) => {
    setSelectedTeam(team);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (team: WorkTeam) => {
    setSelectedTeam(team);
    setIsDeleteDialogOpen(true);
  };

  const executeDelete = async () => {
    if (!selectedTeam) return;
    setIsDeleting(true);
    try {
      await httpClient.delete(`/api/v1/farmer/seasons/${seasonId}/teams/${selectedTeam.id}`);
      toast.success(t("workTeams.deleteSuccess", "Đã xóa đội nhóm thành công."));
      setIsDeleteDialogOpen(false);
      setSelectedTeam(null);
      fetchTeams();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || t("workTeams.deleteError", "Lỗi khi xóa đội nhóm");
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="shadow-sm border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          {t("workTeams.panelTitle", "Quản lý Đội nhóm")}
        </CardTitle>
        <Button size="sm" onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-1">
          <Plus className="w-4 h-4" />
          {t("workTeams.createTeam", "Tạo Đội")}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">{t("common.loading", "Đang tải...")}</div>
        ) : teams.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground bg-muted/20 rounded-md border border-dashed">
            {t("workTeams.emptyState", "Chưa có đội nhóm nào được phân công cho mùa vụ này.")}
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-muted/30 transition-colors"
              >
                <div>
                  <h4 className="font-medium text-foreground">{team.teamName}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("workTeams.leader", "Đội trưởng")}: {team.leaderName || (team.teamLeaderUserId ? `User #${team.teamLeaderUserId}` : t("workTeams.noLeader", "Chưa có"))}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{(team.members && team.members.length) || team.memberCount || 0} {t("workTeams.members", "Thành viên")}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEditClick(team)} className="h-8 px-2 text-muted-foreground hover:text-primary">
                      <Edit className="w-4 h-4 mr-1" />
                      {t("common.edit", "Sửa")}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(team)} className="h-8 px-2 text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t("common.delete", "Xóa")}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CreateWorkTeamDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
        seasonId={seasonId}
        onSuccess={fetchTeams}
      />
      
      {selectedTeam && (
        <EditWorkTeamDialog 
          open={isEditDialogOpen} 
          onOpenChange={setIsEditDialogOpen} 
          seasonId={seasonId}
          team={selectedTeam}
          onSuccess={fetchTeams}
        />
      )}

      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title={t("workTeams.dialog.deleteTitle", "Xóa đội nhóm?")}
        description={t("workTeams.dialog.deleteDesc", "Bạn có chắc chắn muốn xóa đội nhóm này không? Hành động này không thể hoàn tác.")}
        confirmText={t("common.delete", "Xóa")}
        cancelText={t("common.cancel", "Hủy")}
        onConfirm={executeDelete}
        isLoading={isDeleting}
      />
    </Card>
  );
}
