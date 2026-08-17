"use client";

import { Button } from "@/components/ui/button";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { DashboardCard } from "@/components/dashboard-card";
import { ArrowRightIcon } from "lucide-react";
import { recentRows } from "@/lib/dashboard-data";
import type { AnalysisHistoryRow } from "@/lib/history";

type AppView = "landing" | "dashboard";

/** Recent analyses — real saved rows (metrics + filename only), newest first. */
export function RecentAnalyses({
	rows,
	onNavigate,
}: {
	rows: readonly AnalysisHistoryRow[];
	onNavigate: (view: AppView) => void;
}) {
	const analyses = recentRows(rows, 4);

	return (
		<DashboardCard className="relative gap-0 md:col-span-2">
			<CardHeader className="border-b">
				<CardTitle className="text-base">Recent analyses</CardTitle>
				<CardDescription>Your latest resume scores.</CardDescription>
			</CardHeader>
			<CardContent className="mask-b-from-50% mask-b-to-100% px-0">
				<Table>
					<TableCaption className="sr-only">
						Recent analyses with filename, format, score, and date.
					</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead className="ps-6">Filename</TableHead>
							<TableHead>Format</TableHead>
							<TableHead className="pe-6 text-right tabular-nums">
								Score
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{analyses.map((a) => (
							<TableRow className="h-12" key={a.id}>
								<TableCell className="max-w-40 truncate ps-6 font-medium">
									{a.filename}
								</TableCell>
								<TableCell className="text-muted-foreground tabular-nums">
									{a.format}
								</TableCell>
								<TableCell className="pe-6 text-right tabular-nums">
									{a.score}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
			<div className="mask-t-from-30% absolute inset-x-0 bottom-0 flex h-1/5 items-center justify-center bg-background">
				<Button
					className="relative"
					variant="ghost"
					onClick={() => onNavigate("landing")}
				>
					Back to analyser
					<ArrowRightIcon aria-hidden="true" />
				</Button>
			</div>
		</DashboardCard>
	);
}
