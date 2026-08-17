import {
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";
import { DashboardCard } from "@/components/dashboard-card";

type Stat = {
	label: string;
	value: string;
	delta: number;
};

// Placeholder values until Todo 3.3 wires real per-user history.
const stats: Stat[] = [
	{
		label: "Analyses run",
		value: "12",
		delta: 3.1,
	},
	{
		label: "Average ATS score",
		value: "71",
		delta: 4.2,
	},
	{
		label: "Skills detected",
		value: "184",
		delta: 12.4,
	},
	{
		label: "Best score",
		value: "78",
		delta: 8.7,
	},
] as const;

export function DashboardStats() {
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
						<span className="text-muted-foreground">vs last week</span>{" "}
					</CardFooter>
				</DashboardCard>
			))}
		</>
	);
}
