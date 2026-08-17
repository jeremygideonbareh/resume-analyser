import { DashboardEmpty } from "@/components/dashboard-empty";
import { SectionBreakdownChart } from "@/components/section-breakdown-chart";
import { RecentActivity } from "@/components/recent-activity";
import { RecentAnalyses } from "@/components/recent-analyses";
import { ScoreTrendChart } from "@/components/score-trend-chart";
import { DashboardStats } from "@/components/stats";

export function Dashboard() {
	return (
		<div className="grid grid-cols-1 gap-px bg-border p-px md:grid-cols-2 lg:grid-cols-4">
			<DashboardStats />
			<ScoreTrendChart />
			<SectionBreakdownChart />
			<RecentAnalyses />
			<DashboardEmpty />
			<RecentActivity />
		</div>
	);
}