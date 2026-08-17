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

/** Placeholder rows — Todo 3.3 wires real saved analyses (metrics + filename only). */
const analyses = [
	{
		id: "1",
		filename: "senior-frontend-2026.pdf",
		format: "PDF",
		score: 78,
		date: "2026-08-14",
	},
	{
		id: "2",
		filename: "backend-engineer.docx",
		format: "DOCX",
		score: 64,
		date: "2026-08-11",
	},
	{
		id: "3",
		filename: "product-manager.txt",
		format: "TXT",
		score: 71,
		date: "2026-08-09",
	},
	{
		id: "4",
		filename: "data-scientist.pdf",
		format: "PDF",
		score: 82,
		date: "2026-08-06",
	},
] as const;

export function RecentAnalyses() {
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
				<Button asChild className="relative" variant="ghost">
					<a href="/#">
						View All
						<ArrowRightIcon aria-hidden="true" />
					</a>
				</Button>
			</div>
		</DashboardCard>
	);
}
