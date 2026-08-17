import {
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";
import { DashboardCard } from "@/components/dashboard-card";
import { kpiStats } from "@/lib/dashboard-data";
import type { AnalysisHistoryRow } from "@/lib/history";

/**
 * KPI cards (real data): Analyses run, Average ATS score, Skills detected
 * (union across history), Best score. Deltas are meaningful only for the
 * average score (first→last trend); the others are lifetime counts and read
 * as a flat minus. Footer copy comes from the data layer so it always
 * describes what the number actually compares against.
 */
export function DashboardStats({
	rows,
}: {
	rows: readonly AnalysisHistoryRow[];
}) {
	const stats = kpiStats(rows);

	return (
		<>
			{stats.map((s) => (
				<DashboardCard className="" key={s.label}>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle className="font-mono font-normal text-xs tracking-wide">
							{s.label}
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-row items-center gap-2">
						<p className="font-semibold text-2xl tabular-nums">{s.value}</p>
					</CardContent>
					<CardFooter className="gap-1 rounded-none bg-background text-xs">
						<Delta value={s.delta}>
							<DeltaIcon />
							<DeltaValue />
						</Delta>
						<span className="text-muted-foreground">{s.footer}</span>{" "}
					</CardFooter>
				</DashboardCard>
			))}
		</>
	);
}
