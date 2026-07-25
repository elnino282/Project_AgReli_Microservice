import { useProfileMe } from "@/entities/user";
import { useAuth } from "@/features/auth";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useEmployeeBreadcrumbs } from "./useEmployeeBreadcrumbs";
import type { EmployeePortalShellState, EmployeeView } from "../types";

const EMPLOYEE_VIEWS: EmployeeView[] = ["tasks", "progress", "payroll", "workspace", "profile", "settings", "user-guide"];

const resolveViewFromPath = (pathname: string): EmployeeView => {
  const pathParts = pathname.split("/").filter(Boolean);
  if (pathParts[0] !== "employee") return "tasks";
  if (pathParts[1] === "seasons") return "workspace";
  const view = pathParts[1] as EmployeeView | undefined;
  if (view && EMPLOYEE_VIEWS.includes(view)) return view;
  return "tasks";
};

export function useEmployeePortalShell(): EmployeePortalShellState {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { data: profile } = useProfileMe();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState<EmployeeView>("tasks");
  const [aiChatOpen, setAiChatOpen] = useState(false);

  useEffect(() => {
    setCurrentView(resolveViewFromPath(location.pathname));
  }, [location.pathname]);

  const profileFullName = profile?.fullName?.trim();
  const sessionFullName = user?.profile?.fullName?.trim();
  const emailUsername = user?.email?.split("@")[0];
  const userName = profileFullName || sessionFullName || emailUsername || t("employee.common.defaultUserName");
  const userEmail = profile?.email || user?.email || "employee@acm-platform.com";

  const breadcrumbs = useEmployeeBreadcrumbs(currentView);

  const handleViewChange = (view: string) => {
    if (view.startsWith("/")) {
      navigate(view);
      return;
    }

    if (view === "chat") {
      navigate("/chat");
      return;
    }

    const target = view === "dashboard" ? "tasks" : (view as EmployeeView);
    if (!EMPLOYEE_VIEWS.includes(target)) {
      navigate("/employee/tasks");
      return;
    }
    setCurrentView(target);
    navigate(`/employee/${target}`);
  };

  const handleLogout = async () => {
    await logout();
    toast.success(t("common.signedOut"));
    navigate("/sign-in", { replace: true });
  };

  return {
    currentView,
    setCurrentView: handleViewChange,
    aiChatOpen,
    setAiChatOpen,
    userName,
    userEmail,
    breadcrumbs,
    handleLogout,
  };
}
