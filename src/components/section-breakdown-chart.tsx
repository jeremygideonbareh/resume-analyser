"use client";

import { useId } from "react";
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { formatDate } from "@/components/formater";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart";
import { Delta, DeltaIcon, DeltaValue } from "@/components/delta";
import { DashboardCard } from "@/components/dashboard-card";

const VISIBLE_DAYS = 7;

/** One row per day: ISO `date`, `keywords` / `structure` = category scores (0–100). */
type SectionScoreRow = {
	date: string;
	keywords: number;
	structure: number;
};

/**
 * Placeholder data — Todo 3.3 wires real per-user category scores.
 */
const chartData: SectionScoreRow[] = [
	{ date: "2026-03-15", keywords: 62, structure: 55 },
	{ date: "2026-03-16", keywords: 60, structure: 58 },
	{ date: "2026-03-17", keywords: 64, structure: 57 },
	{ date: "2026-03-18", keywords: 61, structure: 60 },
	{ date: "2026-03-19", keywords: 66, structure: 59 },
	{ date: "2026-03-20", keywords: 63, structure: 61 },
	{ date: "2026-03-21", keywords: 68, structure: 60 },
	{ date: "2026-03-22", keywords: 65, structure: 62 },
	{ date: "2026-03-23", keywords: 70, structure: 61 },
	{ date: "2026-03-24", keywords: 67, structure: 63 },
	{ date: "2026-03-25", keywords: 72, structure: 62 },
	{ date: "2026-03-26", keywords: 69, structure: 64 },
	{ date: "2026-03-27", keywords: 71, structure: 63 },
	{ date: "2026-03-28", keywords: 68, structure: 65 },
	{ date: "2026-03-29", keywords: 73, structure: 64 },
	{ date: "2026-03-30", keywords: 70, structure: 66 },
	{ date: "2026-03-31", keywords: 75, structure: 65 },
	{ date: "2026-04-01", keywords: 72, structure: 67 },
	{ date: "2026-04-02", keywords: 74, structure: 66 },
	{ date: "2026-04-03", keywords: 71, structure: 68 },
	{ date: "2026-04-04", keywords: 76, structure: 67 },
	{ date: "2026-04-05", keywords: 73, structure: 69 },
	{ date: "2026-04-06", keywords: 78, structure: 68 },
	{ date: "2026-04-07", keywords: 75, structure: 70 },
	{ date: "2026-04-08", keywords: 80, structure: 69 },
	{ date: "2026-04-09", keywords: 77, structure: 71 },
	{ date: "2026-04-10", keywords: 82, structure: 70 },
	{ date: "2026-04-11", keywords: 79, structure: 72 },
	{ date: "2026-04-12", keywords: 84, structure: 71 },
	{ date: "2026-04-13", keywords: 81, structure: 73 },
];

/** Most recent daily rows shown in the chart. */
const chartRows = chartData.slice(-VISIBLE_DAYS);

function rowTotal(row: SectionScoreRow) {
	return row.keywords + row.structure;
}

function growthPctForWindow(rows: readonly SectionScoreRow[]) {
	const first = rows[0];
	if (!first) {
		return 0;
	}
	const last = rows.at(-1);
	if (!last) {
		return 0;
	}
	const a = rowTotal(first);
	const b = rowTotal(last);
	if (!a) {
		return 0;
	}
	return ((b - a) / a) * 100;
}

const growthPctNum = growthPctForWindow(chartRows);

const chartConfig = {
	keywords: {
		label: "Keywords",
		color: "var(--chart-1)",
	},
	structure: {
		label: "Structure",
		color: "var(--chart-2)",
	},
} satisfies ChartConfig;

export function SectionBreakdownChart() {
	const chartUid = useId().replace(/:/g, "");
	const idLineGlow = `section-breakdown-line-glow-${chartUid}`;

	return (
		<DashboardCard className="gap-0 md:col-span-2">
			<CardHeader>
				<div className="min-w-0 space-y-2">
					<div className="flex flex-wrap items-center gap-2">
						<CardTitle>Section breakdown</CardTitle>
						<Delta value={growthPctNum} variant="badge">
							<DeltaIcon variant="trend" />
							<DeltaValue />
						</Delta>
					</div>
					<CardDescription>
						Keywords vs structure scores, last {VISIBLE_DAYS} days.
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent>
				<ChartContainer
					className="aspect-auto h-60 w-full p-0 md:h-80"
					config={chartConfig}
				>
					<LineChart
						accessibilityLayer
						data={chartRows}
						margin={{
							left: 12,
							right: 12,
							top: 8,
						}}
					>
						<CartesianGrid className="stroke-border" vertical={false} />
						<XAxis
							axisLine={false}
							dataKey="date"
							interval={0}
							tickFormatter={(value) => formatDate(String(value), "day-month")}
							tickLine={false}
							tickMargin={8}
						/>
						<ChartTooltip
							content={<ChartTooltipContent hideLabel />}
							cursor={false}
						/>
						<defs>
							<filter
								height="140%"
								id={idLineGlow}
								width="140%"
								x="-20%"
								y="-20%"
							>
								<feGaussianBlur result="blur" stdDeviation="10" />
								<feComposite in="SourceGraphic" in2="blur" operator="over" />
							</filter>
						</defs>
						<Line
							dataKey="keywords"
							dot={false}
							filter={`url(#${idLineGlow})`}
							stroke="var(--color-online)"
							strokeWidth={2}
							type="step"
						/>
						<Line
							dataKey="structure"
							dot={false}
							filter={`url(#${idLineGlow})`}
							stroke="var(--color-retail)"
							strokeWidth={2}
							type="step"
						/>
					</LineChart>
				</ChartContainer>
			</CardContent>
		</DashboardCard>
	);
}
