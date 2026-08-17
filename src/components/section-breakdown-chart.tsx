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
import { sectionBreakdown } from "@/lib/dashboard-data";
import type { AnalysisHistoryRow } from "@/lib/history";

const VISIBLE_DAYS = 7;

/**
 * Section breakdown — real per-user category scores, normalized to 0–100
 * (raw earned points have different maxima, so the data layer scales them).
 * Most recent VISIBLE_DAYS analyses, oldest→newest (chart order).
 */
export function SectionBreakdownChart({
	rows,
}: {
	rows: readonly AnalysisHistoryRow[];
}) {
	const chartUid = useId().replace(/:/g, "");
	const idLineGlow = `section-breakdown-line-glow-${chartUid}`;
	const chartRows = sectionBreakdown(rows, VISIBLE_DAYS);

	const growthPctNum = (() => {
		const first = chartRows[0];
		const last = chartRows.at(-1);
		if (!first || !last) {
			return 0;
		}
		const a = first.keywords + first.structure;
		const b = last.keywords + last.structure;
		if (!a) {
			return 0;
		}
		return ((b - a) / a) * 100;
	})();

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
						Keywords vs structure scores, last {VISIBLE_DAYS} analyses.
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
