import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/shared/ui/select";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";
import type { YieldViewMode, YieldBySeason, YieldByCrop, YieldByPlot } from "../types";
import { usePreferences } from "@/shared/contexts";
import { convertWeight, getWeightUnitLabel } from "@/shared/lib";
import { useI18n } from "@/shared/lib/hooks/useI18n";

interface YieldTabProps {
    yieldViewMode: YieldViewMode;
    onViewModeChange: (mode: YieldViewMode) => void;
    chartData: YieldBySeason[] | YieldByCrop[] | YieldByPlot[];
}

export function YieldTab({ yieldViewMode, onViewModeChange, chartData }: YieldTabProps) {
    const { preferences } = usePreferences();
    const { t } = useI18n();
    const unitLabel = getWeightUnitLabel(preferences.weightUnit);
    const fmt = (value: number) => {
        const d = preferences.weightUnit === "G" ? 0 : 2;
        return new Intl.NumberFormat(preferences.locale, { maximumFractionDigits: d }).format(value);
    };

    const viewOptions = ([
        { value: "season" as YieldViewMode, key: "reports.yield.viewOptions.season" },
        { value: "crop" as YieldViewMode, key: "reports.yield.viewOptions.crop" },
        { value: "plot" as YieldViewMode, key: "reports.yield.viewOptions.plot" },
    ]).map((o) => ({ value: o.value, label: t(o.key) }));

    const displayData = useMemo(() => {
        return chartData.map((item) => {
            const e = { ...item } as YieldBySeason & YieldByCrop & YieldByPlot;
            if (typeof e.yield === "number") e.yield = convertWeight(e.yield, preferences.weightUnit);
            if (typeof e.avgYield === "number") e.avgYield = convertWeight(e.avgYield, preferences.weightUnit);
            if (typeof e.target === "number") e.target = convertWeight(e.target, preferences.weightUnit);
            return e;
        });
    }, [chartData, preferences.weightUnit]);

    const dataKey = yieldViewMode === "crop" ? "crop" : yieldViewMode === "plot" ? "plot" : "season";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg text-foreground">{t("reports.yield.title")}</h3>
                    <p className="text-sm text-muted-foreground">{t("reports.yield.subtitle")}</p>
                </div>
                <Select value={yieldViewMode} onValueChange={onViewModeChange}>
                    <SelectTrigger className="w-[160px] rounded-[14px] border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        {viewOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={displayData}>
                    <defs>
                        <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey={dataKey} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickFormatter={(v) => fmt(v as number)} />
                    <RechartsTooltip
                        formatter={(v: number) => `${fmt(v)} ${unitLabel}`}
                        contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "12px", padding: "12px" }}
                    />
                    <Area type="monotone" dataKey="yield" stroke="var(--primary)" strokeWidth={3} fill="url(#yieldGradient)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
