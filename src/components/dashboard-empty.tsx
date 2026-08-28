import { Button } from "@/components/ui/button";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { DashboardCard } from "@/components/dashboard-card";
import { MediaBackdrop } from "@/components/media/MediaBackdrop";
import { ArrowRightIcon } from "lucide-react";

type AppView = "landing" | "dashboard";

/**
 * Empty state for a user with no saved analyses yet.
 *
 * Rewritten to teach rather than report absence. The previous version led with
 * a grey document glyph and the line "No analyses yet." — which states the one
 * thing the reader can already see, and states it twice. What a first-time
 * user actually needs is what will appear here and what it costs to get it, so
 * that is what this says.
 *
 * The photograph is a blank sheet waiting, not an error state. Tone matters on
 * an empty screen: patient reads as an invitation, an icon in a grey circle
 * reads as a failure.
 */
export function DashboardEmpty({
	onNavigate,
}: {
	onNavigate: (view: AppView) => void;
}) {
	return (
		<DashboardCard className="gap-0 overflow-hidden">
			<CardHeader className="border-b border-hairline">
				<CardTitle className="text-balance text-base">Your dashboard</CardTitle>
				<CardDescription className="text-pretty">
					Every analysis you run while signed in is saved here.
				</CardDescription>
			</CardHeader>
			<CardContent className="px-0 pb-0">
				<div className="grid items-center gap-6 sm:grid-cols-[1fr_1.1fr]">
					<div className="px-6 py-8 sm:py-10">
						<p className="text-title text-ink">Nothing scored yet</p>
						<p className="measure mt-2 text-body-sm text-ink-soft">
							Run your first resume and this fills with your score over time,
							the category breakdown behind it, and the skills each version
							surfaced — so you can see whether an edit actually helped.
						</p>
						<p className="mt-4 text-[13px] text-muted">
							Takes about thirty seconds. Your resume text is never stored.
						</p>
						<Button
							className="mt-6"
							variant="default"
							onClick={() => onNavigate("landing")}
						>
							Analyse a resume
							<ArrowRightIcon aria-hidden="true" />
						</Button>
					</div>

					<div className="relative hidden h-full min-h-[220px] sm:block">
						<MediaBackdrop src="empty-page" scrim={0.1} />
					</div>
				</div>
			</CardContent>
		</DashboardCard>
	);
}
