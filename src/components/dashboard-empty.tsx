import { Button } from "@/components/ui/button";
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { DashboardCard } from "@/components/dashboard-card";
import { FileTextIcon, ArrowRightIcon } from "lucide-react";

type AppView = "landing" | "dashboard";

/**
 * Empty state for a user with no saved analyses yet. The "Analyse a resume"
 * CTA jumps back to the landing view (the analyser is the hub — plan 3.4.4).
 */
export function DashboardEmpty({
	onNavigate,
}: {
	onNavigate: (view: AppView) => void;
}) {
	return (
		<DashboardCard className="gap-0">
			<CardHeader className="border-b">
				<CardTitle className="text-balance text-base">Your dashboard</CardTitle>
				<CardDescription className="text-pretty">
					No analyses yet — start with your first resume.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex h-full items-center px-0">
				<Empty>
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<FileTextIcon aria-hidden="true" />
						</EmptyMedia>
						<EmptyTitle>No analyses yet.</EmptyTitle>
						<EmptyDescription className="text-xs">
							Upload your first resume to see your ATS score and category
							breakdown here.
						</EmptyDescription>
					</EmptyHeader>
					<EmptyContent>
						<Button variant="ghost" onClick={() => onNavigate("landing")}>
							Analyse a resume
							<ArrowRightIcon aria-hidden="true" />
						</Button>
					</EmptyContent>
				</Empty>
			</CardContent>
		</DashboardCard>
	);
}
