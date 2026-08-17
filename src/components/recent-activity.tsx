import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DashboardCard } from "@/components/dashboard-card";
import {
	FileTextIcon,
	TrendingUpIcon,
	BadgeCheckIcon,
	SparklesIcon,
} from "lucide-react";

const items = [
	{
		title: "Analysed senior-frontend-2026.pdf",
		time: "About 2 hours ago",
		icon: (
			<FileTextIcon
			/>
		),
	},
	{
		title: "Score improved to 78",
		time: "This morning",
		icon: (
			<TrendingUpIcon
			/>
		),
	},
	{
		title: "Skills detected: 184",
		time: "Yesterday",
		icon: (
			<BadgeCheckIcon
			/>
		),
	},
	{
		title: "Formatting tips applied",
		time: "2 days ago",
		icon: (
			<SparklesIcon
			/>
		),
	},
] as const;

export function RecentActivity() {
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
								{item.icon}
							</span>
							<div className="min-w-0 flex-1 space-y-1">
								<p className="line-clamp-1 text-pretty text-foreground text-sm leading-snug">
									{item.title}
								</p>
								<p className="text-muted-foreground text-xs">{item.time}</p>
							</div>
						</li>
					))}
				</ul>
			</CardContent>
		</DashboardCard>
	);
}
