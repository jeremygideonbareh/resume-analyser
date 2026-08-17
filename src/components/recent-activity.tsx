import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DashboardCard } from "@/components/dashboard-card";
import { FileTextIcon } from "lucide-react";
import { activityItems } from "@/lib/dashboard-data";
import { formatDate } from "@/components/formater";
import type { AnalysisHistoryRow } from "@/lib/history";

/** Activity feed — derived from real analysis rows, newest first. */
export function RecentActivity({
	rows,
}: {
	rows: readonly AnalysisHistoryRow[];
}) {
	const items = activityItems(rows, 4);

	return (
		<DashboardCard className="gap-0">
			<CardHeader className="border-b">
				<CardTitle>Activity</CardTitle>
				<CardDescription>Latest analysis activity.</CardDescription>
			</CardHeader>
			<CardContent className="px-0">
				<ul className="flex flex-col divide-y divide-border">
					{items.map((item) => (
						<li className="flex h-16 items-center gap-3 px-6" key={item.title}>
							<span
								aria-hidden="true"
								className="flex size-10 shrink-0 items-center justify-center [&_svg]:size-4"
							>
								<FileTextIcon />
							</span>
							<div className="min-w-0 flex-1 space-y-1">
								<p className="line-clamp-1 text-pretty text-foreground text-sm leading-snug">
									{item.title}
								</p>
								<p className="text-muted-foreground text-xs">
									{formatDate(item.created_at, "full")}
								</p>
							</div>
						</li>
					))}
				</ul>
			</CardContent>
		</DashboardCard>
	);
}
