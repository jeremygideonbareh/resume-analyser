import { useEffect, useState } from "react";
import { Plus, ShieldCheck, Target, TrendingUp, X } from "lucide-react";
import { DashboardEmpty } from "@/components/dashboard-empty";
import { SectionBreakdownChart } from "@/components/section-breakdown-chart";
import { RecentActivity } from "@/components/recent-activity";
import { RecentAnalyses } from "@/components/recent-analyses";
import { ScoreTrendChart } from "@/components/score-trend-chart";
import { DashboardStats } from "@/components/stats";
import { DashboardCard } from "@/components/dashboard-card";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { loadHistory, type AnalysisHistoryRow } from "@/lib/history";
import { getSupabase } from "@/lib/supabase";
import {
	applicationStats,
	eligibleCompanies,
	readinessStats,
} from "@/lib/dashboard-data";
import type {
	Application,
	ApplicationStatus,
	Company,
	StudentProfile,
} from "@/lib/placement-types";

type AppView = "landing" | "dashboard" | "profile" | "chat";

const STATUS_OPTIONS: ApplicationStatus[] = [
	"draft",
	"applied",
	"shortlisted",
	"interview",
	"offer",
	"rejected",
];

/**
 * Dashboard — the signed-in user's personal analysis history (Todo 3.4) plus
 * the placement module (T5.2): readiness KPI, eligible companies, applications
 * tracker, skill progress, and Phase-2 placeholders.
 *
 * Data always comes from `loadHistory` (3.3), which is scoped to the user id
 * via RLS. `getSupabase()` throws when the anon-key env vars are missing
 * (Todo 2.3 lesson), so it is wrapped in try/catch — an unconfigured client
 * degrades to the empty state rather than crashing the view. Placement tables
 * that are missing (migration not run) degrade to empty data the same way.
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
	const [profile, setProfile] = useState<StudentProfile | null>(null);
	const [companies, setCompanies] = useState<Company[]>([]);
	const [applications, setApplications] = useState<Application[]>([]);
	const [adding, setAdding] = useState(false);
	const [newCompany, setNewCompany] = useState("");
	const [newCompanyName, setNewCompanyName] = useState("");
	const [newStatus, setNewStatus] = useState<ApplicationStatus>("applied");

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			setError(false);
			setRows(null);
			try {
				const client = getSupabase();
				const history = await loadHistory(client, userId);
				if (cancelled) return;
				setRows(history);

				// Placement data — each query degrades to empty on failure so a
				// missing table or RLS hiccup never takes down the whole view.
				const [profileRes, companiesRes, applicationsRes] =
					await Promise.allSettled([
						client
							.from("student_profiles")
							.select("*")
							.eq("user_id", userId)
							.maybeSingle(),
						client.from("companies").select("*").order("name"),
						client
							.from("applications")
							.select("*")
							.eq("user_id", userId)
							.order("created_at", { ascending: false }),
					]);

				if (cancelled) return;
				if (profileRes.status === "fulfilled" && profileRes.value.data) {
					const row = profileRes.value.data as unknown as StudentProfile;
					setProfile({
						...row,
						cgpa: row.cgpa != null ? Number(row.cgpa) : null,
						semester: row.semester != null ? Number(row.semester) : null,
					});
				}
				if (companiesRes.status === "fulfilled") {
					setCompanies((companiesRes.value.data ?? []) as Company[]);
				}
				if (applicationsRes.status === "fulfilled") {
					setApplications(
						(applicationsRes.value.data ?? []) as Application[],
					);
				}
			} catch {
				if (!cancelled) setError(true);
			}
		};

		void load();
		return () => {
			cancelled = true;
		};
	}, [userId]);

	const addApplication = async () => {
		const client = getSupabase();
		const companyId =
			newCompany && newCompany !== "__other__" ? newCompany : null;
		const companyName =
			newCompany === "__other__" ? newCompanyName.trim() : null;
		if (!companyId && !companyName) return;
		const { error } = await client.from("applications").insert({
			user_id: userId,
			company_id: companyId,
			company_name: companyName,
			status: newStatus,
			applied_at: new Date().toISOString(),
		});
		if (error) return;
		setNewCompany("");
		setNewCompanyName("");
		setNewStatus("applied");
		setAdding(false);
		// Refresh the list.
		const { data } = await client
			.from("applications")
			.select("*")
			.eq("user_id", userId)
			.order("created_at", { ascending: false });
		if (data) setApplications(data as Application[]);
	};

	if (error) {
		return (
			<div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
				<p className="text-[13px] font-semibold text-link">
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
					className="mt-6 rounded-full border border-hairline px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink/25 hover:bg-surface"
				>
					Back to analyser
				</button>
			</div>
		);
	}

	if (rows === null) {
		return (
			<div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
				<p className="text-[13px] font-semibold text-link">
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

	const readiness = readinessStats(profile, rows);
	const eligibility = eligibleCompanies(profile, companies);
	const stats = applicationStats(applications);
	const skillCount = profile?.skills.length ?? 0;

	return (
		<div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
			<div className="grid grid-cols-1 gap-px bg-border p-px md:grid-cols-2 lg:grid-cols-4">
				<DashboardStats rows={rows} />
				<PlacementReadinessCard readiness={readiness} />
				<ScoreTrendChart rows={rows} />
				<SectionBreakdownChart rows={rows} />
				<RecentAnalyses rows={rows} onNavigate={onNavigate} />
				<RecentActivity rows={rows} />
			</div>

			<div className="mt-px grid grid-cols-1 gap-px bg-border p-px md:grid-cols-2 lg:grid-cols-3">
				<EligibleCompaniesCard
					eligibility={eligibility}
					hasProfile={profile !== null}
					onNavigate={onNavigate}
				/>
				<ApplicationsCard
					applications={applications}
					stats={stats}
					companies={companies}
					adding={adding}
					setAdding={setAdding}
					newCompany={newCompany}
					setNewCompany={setNewCompany}
					newCompanyName={newCompanyName}
					setNewCompanyName={setNewCompanyName}
					newStatus={newStatus}
					setNewStatus={setNewStatus}
					onAdd={() => void addApplication()}
				/>
				<SkillProgressCard skillCount={skillCount} />
			</div>

			<div className="mt-px grid grid-cols-1 gap-px bg-border p-px md:grid-cols-3">
				<PhaseTwoCard title="Mock interview" />
				<PhaseTwoCard title="Aptitude practice" />
				<PhaseTwoCard title="Coding practice" />
			</div>
		</div>
	);
}

function PlacementReadinessCard({
	readiness,
}: {
	readiness: ReturnType<typeof readinessStats>;
}) {
	return (
		<DashboardCard className="">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="font-mono font-normal text-xs tracking-wide">
					Placement readiness
				</CardTitle>
				<TrendingUp className="h-4 w-4 text-accent" aria-hidden="true" />
			</CardHeader>
			<CardContent className="flex flex-row items-center gap-2">
				<p className="font-semibold text-2xl tabular-nums">{readiness.score}</p>
				<span className="rounded-full bg-accent/10 px-2 py-0.5 text-[12px] font-medium text-ink">
					{readiness.band.label}
				</span>
			</CardContent>
			<CardDescription className="px-6 pb-4 text-xs text-muted-foreground">
				Resume {readiness.resumeScore} · Skills {readiness.skillCoverage}% ·
				Profile {readiness.profileCompleteness}%
			</CardDescription>
		</DashboardCard>
	);
}

function EligibleCompaniesCard({
	eligibility,
	hasProfile,
	onNavigate,
}: {
	eligibility: ReturnType<typeof eligibleCompanies>;
	hasProfile: boolean;
	onNavigate: (view: AppView) => void;
}) {
	return (
		<DashboardCard className="">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="font-mono font-normal text-xs tracking-wide">
					Eligible companies
				</CardTitle>
				<ShieldCheck className="h-4 w-4 text-accent" aria-hidden="true" />
			</CardHeader>
			<CardContent className="px-6 pb-4">
				{!hasProfile ? (
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">
							Complete your profile to see which companies you’re eligible for.
						</p>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => onNavigate("profile")}
						>
							Complete profile
						</Button>
					</div>
				) : eligibility.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No companies seeded yet — run the placement migration.
					</p>
				) : (
					<ul className="space-y-2">
						{eligibility.map((e) => (
							<li
								key={e.company}
								className="flex items-start justify-between gap-2 text-sm"
							>
								<span className="font-medium text-ink">{e.company}</span>
								<span
									className={
										e.eligible
											? "text-success"
											: "text-muted-foreground"
									}
								>
									{e.eligible ? "✔ Eligible" : "Not eligible"}
								</span>
							</li>
						))}
					</ul>
				)}
			</CardContent>
		</DashboardCard>
	);
}

function ApplicationsCard({
	applications,
	stats,
	companies,
	adding,
	setAdding,
	newCompany,
	setNewCompany,
	newCompanyName,
	setNewCompanyName,
	newStatus,
	setNewStatus,
	onAdd,
}: {
	applications: Application[];
	stats: Record<ApplicationStatus, number>;
	companies: Company[];
	adding: boolean;
	setAdding: (v: boolean) => void;
	newCompany: string;
	setNewCompany: (v: string) => void;
	newCompanyName: string;
	setNewCompanyName: (v: string) => void;
	newStatus: ApplicationStatus;
	setNewStatus: (v: ApplicationStatus) => void;
	onAdd: () => void;
}) {
	return (
		<DashboardCard className="">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="font-mono font-normal text-xs tracking-wide">
					Applications
				</CardTitle>
				<button
					type="button"
					onClick={() => setAdding(!adding)}
					className="flex items-center gap-1 rounded-full border border-hairline px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:border-ink/25"
				>
					{adding ? (
						<X className="h-3 w-3" aria-hidden="true" />
					) : (
						<Plus className="h-3 w-3" aria-hidden="true" />
					)}
					{adding ? "Cancel" : "Add"}
				</button>
			</CardHeader>
			<CardContent className="px-6 pb-4">
				{adding && (
					<form
						className="mb-3 space-y-2 rounded-xl border border-hairline bg-surface/60 p-3"
						onSubmit={(e) => {
							e.preventDefault()
							onAdd()
						}}
					>
						<select
							aria-label="Company"
							value={newCompany}
							onChange={(e) => setNewCompany(e.target.value)}
							className="h-9 w-full rounded-md border border-hairline bg-surface px-2 text-sm text-ink outline-none"
						>
							<option value="">Select company…</option>
							{companies.map((c) => (
								<option key={c.id} value={c.id}>
									{c.name}
								</option>
							))}
							<option value="__other__">Other…</option>
						</select>
						{newCompany === "__other__" && (
							<input
								aria-label="Company name"
								value={newCompanyName}
								onChange={(e) => setNewCompanyName(e.target.value)}
								placeholder="Company name"
								className="h-9 w-full rounded-md border border-hairline bg-surface px-2 text-sm text-ink outline-none"
							/>
						)}
						<select
							aria-label="Status"
							value={newStatus}
							onChange={(e) => setNewStatus(e.target.value as ApplicationStatus)}
							className="h-9 w-full rounded-md border border-hairline bg-surface px-2 text-sm text-ink outline-none"
						>
							{STATUS_OPTIONS.map((s) => (
								<option key={s} value={s}>
									{s}
								</option>
							))}
						</select>
						<Button type="submit" size="sm" className="w-full">
							Add application
						</Button>
					</form>
				)}
				{applications.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No applications tracked yet — add your first one.
					</p>
				) : (
					<>
						<div className="mb-3 flex flex-wrap gap-1.5">
							{STATUS_OPTIONS.map((s) => (
								<span
									key={s}
									className="rounded-full bg-surface px-2 py-0.5 text-[12px] text-ink-soft"
								>
									{s} {stats[s]}
								</span>
							))}
						</div>
						<ul className="space-y-1.5">
							{applications.slice(0, 5).map((a) => (
								<li
									key={a.id}
									className="flex items-center justify-between gap-2 text-sm"
								>
									<span className="font-medium text-ink">
										{a.company_name ?? companies.find((c) => c.id === a.company_id)?.name ?? "Unknown"}
									</span>
									<span className="text-[12px] text-ink-soft">
										{a.status}
									</span>
								</li>
							))}
						</ul>
					</>
				)}
			</CardContent>
		</DashboardCard>
	);
}

function SkillProgressCard({ skillCount }: { skillCount: number }) {
	const pct = Math.min(Math.round((skillCount / 10) * 100), 100)
	return (
		<DashboardCard className="">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="font-mono font-normal text-xs tracking-wide">
					Skill progress
				</CardTitle>
				<Target className="h-4 w-4 text-accent" aria-hidden="true" />
			</CardHeader>
			<CardContent className="px-6 pb-4">
				<p className="text-sm text-muted-foreground">
					{skillCount} of 10 skills listed
				</p>
				<div
					role="progressbar"
					aria-valuenow={pct}
					aria-valuemin={0}
					aria-valuemax={100}
					className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface"
				>
					<div
						className="h-full rounded-full bg-accent transition-all duration-300"
						style={{ width: `${pct}%` }}
					/>
				</div>
			</CardContent>
		</DashboardCard>
	);
}

function PhaseTwoCard({ title }: { title: string }) {
	return (
		<DashboardCard className="">
			<CardHeader>
				<CardTitle className="text-balance text-base">{title}</CardTitle>
				<CardDescription className="text-pretty">
					Coming in Phase 2
				</CardDescription>
			</CardHeader>
		</DashboardCard>
	);
}