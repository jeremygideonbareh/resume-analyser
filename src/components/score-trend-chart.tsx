"use client";

import type * as React from "react";
import { Bar, BarChart, XAxis } from "recharts";
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

/** Placeholder: last 7 analyses'"'"' ATS scores (Todo 3.3 wires real history). */
const scoresLast7 = [
	{ day: "Mon", score: 61 },
	{ day: "Tue", score: 64 },
	{ day: "Wed", score: 58 },
	{ day: "Thu", score: 71 },
	{ day: "Fri", score: 69 },
	{ day: "Sat", score: 74 },
	{ day: "Sun", score: 78 },
] as const;

const chartRows = scoresLast7.map((row) => ({ ...row }));

const firstScore = scoresLast7[0].score;
const lastScore = scoresLast7.at(-1)?.score ?? firstScore;
const trendPct = (((lastScore - firstScore) / firstScore) * 100).toFixed(1);

const chartConfig = {
	score: {
		label: "Score",
		color: "var(--chart-1)",
	},
} satisfies ChartConfig;

function CustomGradientBar(
	props: React.SVGProps<SVGRectElement> & {
		index?: number;
		dataKey?: string | number;
	}
) {
	const {
		fill,
		x = 0,
		y = 0,
		width = 0,
		height = 0,
		dataKey = "score",
		index = 0,
	} = props;
	const gid = `gradient-bar-${String(dataKey)}-${index}`;

	return (
		<>
			<rect
				fill={`url(#${gid})`}
				height={height}
				stroke="none"
				width={width}
				x={x}
				y={y}
			/>
			<rect fill={fill} height={2} stroke="none" width={width} x={x} y={y} />
			<defs>
				<linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
					<stop offset="0%" stopColor={fill} stopOpacity={0.5} />
					<stop offset="100%" stopColor={fill} stopOpacity={0} />
				</linearGradient>
			</defs>
		</>
	);
}

export function ScoreTrendChart() {
	return (
		<DashboardCard className="gap-0 md:col-span-2">
			<CardHeader className="gap-2">
				<div className="flex flex-wrap items-center gap-2">
					<CardTitle>Score trend</CardTitle>
					<Delta value={Number(trendPct)} variant="badge">
						<DeltaIcon variant="trend" />
						<DeltaValue />
					</Delta>
				</div>
				<CardDescription>ATS scores, last 7 analyses.</CardDescription>
			</CardHeader>
			<CardContent>
				<ChartContainer
					className="aspect-auto h-60 w-full md:h-80"
					config={chartConfig}
				>
					<BarChart accessibilityLayer data={chartRows}>
						<XAxis
							axisLine={false}
							dataKey="day"
							interval={0}
							tickFormatter={(value) => String(value)}
							tickLine={false}
							tickMargin={10}
						/>
						<ChartTooltip
							content={<ChartTooltipContent hideLabel />}
							cursor={false}
						/>
						<Bar
							dataKey="score"
							fill="var(--color-online)"
							shape={<CustomGradientBar />}
						/>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</DashboardCard>
	);
}
