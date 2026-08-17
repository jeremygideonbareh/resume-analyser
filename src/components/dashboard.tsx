import { useEffect, useState } from "react";
import { DashboardEmpty } from "@/components/dashboard-empty";
import { SectionBreakdownChart } from "@/components/section-breakdown-chart";
import { RecentActivity } from "@/components/recent-activity";
import { RecentAnalyses } from "@/components/recent-analyses";
import { ScoreTrendChart } from "@/components/score-trend-chart";
import { DashboardStats } from "@/components/stats";
import { loadHistory, type AnalysisHistoryRow } from "@/lib/history";
import { getSupabase } from "@/lib/supabase";

type AppView = "landing" | "dashboard";

/**
 * Dashboard — the signed-in user's personal analysis history (Todo 3.4).
 *
 * Data always comes from `loadHistory` (3.3), which is scoped to the user id
 * via RLS. `getSupabase()` throws when the anon-key env vars are missing
 * (Todo 2.3 lesson), so it is wrapped in try/catch — an unconfigured client
 * degrades to the empty state rather than crashing the view.
 */
export function Dashboard({
	userId,
	onNavigate,
}: {
	userId: string;
	onNavigate: (view: AppView) => void;
}) {
	const [rows, setRows] = useState<AnalysisHistoryRow[] | null>(null);
	const [error, setError] = useState(false);

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			setError(false);
			setRows(null);
			try {
				const client = getSupabase();
				const history = await loadHistory(client, userId);
				if (!cancelled) setRows(history);
			} catch {
				if (!cancelled) setError(true);
			}
		};

		void load();
		return () => {
			cancelled = true;
		};
	}, [userId]);

	if (error) {
		return (
			<div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
				<p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
					Dashboard
				</p>
				<h2 className="mt-2 max-w-md text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
					Couldn’t load your analyses.
				</h2>
				<p className="mt-4 max-w-md text-ink-soft">
					Something went wrong reading your history. Try again in a moment —
					or head back to the analyser.
				</p>
				<button
					type="button"
					onClick={() => onNavigate("landing")}
					className="mt-6 rounded-full border border-ink/15 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/30 hover:bg-surface"
				>
					Back to analyser
				</button>
			</div>
		);
	}

	if (rows === null) {
		return (
			<div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
				<p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
					Dashboard
				</p>
				<h2 className="mt-2 max-w-md text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
					Loading your analyses…
				</h2>
			</div>
		);
	}

	if (rows.length === 0) {
		return (
			<div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
				<div className="grid grid-cols-1 gap-px bg-border p-px md:grid-cols-2 lg:grid-cols-4">
					<div className="md:col-span-2 lg:col-span-4">
						<DashboardEmpty onNavigate={onNavigate} />
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
			<div className="grid grid-cols-1 gap-px bg-border p-px md:grid-cols-2 lg:grid-cols-4">
				<DashboardStats rows={rows} />
				<ScoreTrendChart rows={rows} />
				<SectionBreakdownChart rows={rows} />
				<RecentAnalyses rows={rows} onNavigate={onNavigate} />
				<RecentActivity rows={rows} />
			</div>
		</div>
	);
}
