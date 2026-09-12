import type React from "react";
import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useForkData } from "./data-provider";
import { getForkRecord } from "./derive-fork-lifecycle";
import { getWinningRepSupply, getWinningRepToken } from "./rep-supply";
import type { ForkOutcome, ForkRecordData } from "./types";

const shortenAddress = (address: string | null | undefined): string => {
	if (!address) return "Not available";
	return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatRep = (value: number): string =>
	value.toLocaleString("en-US", { maximumFractionDigits: 2 });

const formatDate = (timestamp: number): string => {
	const date = new Date(timestamp * 1000);
	if (Number.isNaN(date.getTime())) return "Not available";
	return `${date.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC`;
};

const formatSnapshotDate = (timestamp: number): string => {
	const date = new Date(timestamp * 1000);
	if (Number.isNaN(date.getTime())) return "date unavailable";
	return date.toLocaleDateString("en-US", {
		dateStyle: "medium",
		timeZone: "UTC",
	});
};

const formatShortDate = (timestamp: number): string => {
	const date = new Date(timestamp * 1000);
	if (Number.isNaN(date.getTime())) return "date unavailable";
	return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
};

const etherscanAddress = (address: string): string =>
	`https://etherscan.io/address/${address}`;

const FORKWATCH_URL = "https://v3.augur.net/";
const FAQ_URL = "/faq/";
const MOON_FORK_URL = "/learn/fork/moon-fork/";

const AddressValue = ({
	address,
	label,
}: {
	address: string | null | undefined;
	label: string;
}) => {
	if (!address) {
		return (
			<div className="flex items-center justify-between gap-4">
				<span className="text-muted-foreground">{label}</span>
				<span>Not available</span>
			</div>
		);
	}

	return (
		<div className="flex items-center justify-between gap-4">
			<span className="text-muted-foreground">{label}</span>
			<a
				href={etherscanAddress(address)}
				target="_blank"
				rel="noopener noreferrer"
				className="text-primary hover:text-loud-foreground hover:underline focus:underline"
				title={address}
			>
				{shortenAddress(address)}
			</a>
		</div>
	);
};

const OutcomeRow = ({
	outcome,
	isWinner,
}: {
	outcome: ForkOutcome;
	isWinner: boolean;
}) => (
	<div
		className={cn(
			"grid grid-cols-[1fr_auto] gap-3 border-t border-foreground/15 py-3",
			isWinner && "text-primary",
		)}
	>
		<div>
			<div className="uppercase tracking-wider">
				{outcome.label}
				{isWinner && (
					<span className="ml-2 inline-flex items-center bg-primary px-1.5 py-0.5 align-middle text-[9px] leading-none tracking-widest text-background">
						WINNER
					</span>
				)}
			</div>
			{outcome.childUniverse && (
				<a
					href={etherscanAddress(outcome.childUniverse)}
					target="_blank"
					rel="noopener noreferrer"
					className="text-xs text-muted-foreground hover:text-foreground hover:underline focus:underline"
					title={outcome.childUniverse}
				>
					{shortenAddress(outcome.childUniverse)}
				</a>
			)}
		</div>
		<div className="text-right tabular-nums">
			<div>{formatRep(outcome.migratedRep)} REP</div>
			<div className="text-[10px] text-muted-foreground">MIGRATED</div>
		</div>
	</div>
);

const ForkResolutionDialog = ({ record }: { record: ForkRecordData }) => {
	const token = getWinningRepToken(record);
	const [snapshot, setSnapshot] = useState<unknown>(null);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		const controller = new AbortController();
		const base = import.meta.env.BASE_URL.replace(/\/$/u, "");
		fetch(`${base}/api/supply/meta.json`, { signal: controller.signal })
			.then((response) => (response.ok ? response.json() : null))
			.then((data) => {
				if (!controller.signal.aborted) setSnapshot(data);
			})
			.catch(() => {
				/* Keep unavailable supply distinct from a zero balance. */
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});
		return () => controller.abort();
	}, []);
	const supply = getWinningRepSupply(record, snapshot);
	return (
		<DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto bg-background border border-foreground/20 backdrop-blur-sm p-5 sm:p-6 [--color-muted-foreground:#86b5a2] [--color-foreground:#a5d4bf] [scrollbar-color:#355f4d_#111]">
			<DialogTitle className="pr-20 font-display uppercase tracking-widest text-primary">
				Fork resolution
			</DialogTitle>
			<DialogDescription>
				Migration closed on August 3, 2026. Yes is the winning outcome; its REP
				token is REPv2_Yes_1 on Ethereum.
			</DialogDescription>

			<section
				aria-label="Winning REP token supply"
				className="border border-primary/40 bg-primary/5 p-4"
			>
				<p className="font-mono text-xs uppercase tracking-widest text-primary">
					Post-fork REP total supply
				</p>
				{supply ? (
					<>
						<p className="my-2 font-display text-3xl text-loud-foreground tabular-nums sm:text-4xl">
							{formatRep(Number(supply.token.totalSupply))}{" "}
							<span className="text-base">REP</span>
						</p>
						<p className="text-xs leading-relaxed text-muted-foreground">
							REPv2_Yes_1 · Supply snapshot generated{" "}
							{formatSnapshotDate(Date.parse(supply.generatedAt) / 1000)} at block{" "}
							<a
								className="underline underline-offset-2 hover:text-foreground"
								href={`https://etherscan.io/block/${supply.blockNumber}`}
								target="_blank"
								rel="noopener noreferrer"
							>
								{supply.blockNumber.toLocaleString("en-US")}
							</a>
							.
						</p>
						<p className="mt-2 text-xs leading-relaxed text-muted-foreground">
							Total supply includes protocol mint and burn effects. It differs
							from migrated REP and can change after migration closes.
						</p>
					</>
				) : (
					<p className="mt-2 text-sm text-muted-foreground">
						{loading
							? "Loading supply snapshot…"
							: "Supply snapshot unavailable for this token. Check the token contract on Etherscan."}
					</p>
				)}
				{token && (
					<a
						href={`https://etherscan.io/token/${token}`}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-3 block break-all font-mono text-xs text-primary underline underline-offset-2"
					>
						{token}
					</a>
				)}
			</section>

			<div className="space-y-2 border-y border-foreground/20 py-4 text-sm font-mono">
				<AddressValue label="Parent universe" address={record.parentUniverse} />
				<AddressValue label="Forking market" address={record.forkingMarket} />
				<AddressValue
					label="Canonical universe"
					address={record.winningChildUniverse}
				/>
				<div className="flex items-center justify-between gap-4">
					<span className="text-muted-foreground">Migration closed</span>
					<span className="text-right">
						{formatDate(record.migrationDeadline)}
					</span>
				</div>
				{record.observedBlock && (
					<div className="flex items-center justify-between gap-4">
						<span className="text-muted-foreground">Observed block</span>
						<span>{record.observedBlock.toLocaleString()}</span>
					</div>
				)}
			</div>

			<div>
				<div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">
					Final migrated REP by outcome
				</div>
				{record.outcomes.map((outcome) => (
					<OutcomeRow
						key={`${outcome.index}-${outcome.childUniverse ?? "invalid"}`}
						outcome={outcome}
						isWinner={
							outcome.childUniverse?.toLowerCase() ===
							record.winningChildUniverse?.toLowerCase()
						}
					/>
				))}
			</div>

			<div className="space-y-2">
				{token && (
					<Button
						variant="outline"
						href={`https://etherscan.io/token/${token}`}
						target="_blank"
						rel="noopener noreferrer"
						className="w-full uppercase"
					>
						Verify REP on Etherscan
					</Button>
				)}
				<Button
					variant="outline"
					href={FORKWATCH_URL}
					target="_blank"
					rel="noopener noreferrer"
					className="w-full uppercase"
				>
					Open ForkWatch
				</Button>
				<Button variant="outline" href={FAQ_URL} className="w-full uppercase">
					Read the FAQ
				</Button>
				<Button
					variant="outline"
					href={MOON_FORK_URL}
					className="w-full uppercase"
				>
					Read the Moon Fork case study
				</Button>
			</div>
		</DialogContent>
	);
};

export const ForkRecord = (): React.JSX.Element | null => {
	const { rawData } = useForkData();
	const record = getForkRecord(rawData);
	const [isOpen, setIsOpen] = useState(false);

	if (!record?.winningChildUniverse) return null;

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<div className="mx-auto w-full max-w-xl px-8 text-left font-mono text-sm">
				<DialogTrigger asChild>
					<button
						type="button"
						className="group block w-full cursor-pointer text-left focus:outline-none"
						aria-label="View fork resolution"
					>
						<div className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide">
							<span className="text-muted-foreground">fork resolution</span>
							<span className="text-muted-foreground group-hover:text-loud-foreground">
								what's this
								<span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-current leading-none tracking-tight group-hover:fx-glow-sm group-focus:fx-glow-sm">
									?
								</span>
							</span>

						</div>

						<div
							className="bg-muted-foreground/40 p-px transition-colors group-hover:bg-foreground/50 group-focus:bg-foreground/50"
							style={{
								clipPath:
									"polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)",
							}}
						>
							<div
								className="bg-background py-4 text-center"
								style={{
									clipPath:
										"polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)",
								}}
							>
								<div className="text-xs uppercase tracking-wide text-muted-foreground">
									Canonical universe
								</div>
								<div className="break-all font-display text-xl text-foreground sm:text-xl">
									<span className="sm:hidden">
										{shortenAddress(record.winningChildUniverse)}
									</span>
									<span className="hidden sm:inline">
										{record.winningChildUniverse}
									</span>
								</div>
								<div className="text-muted-foreground text-xs">
									Updated {formatShortDate(record.migrationDeadline)}
								</div>
								</div>
							</div>

            <div className={cn(
              "pt-2 text-center text-xs text-muted-foreground group-hover:text-loud-foreground group-focus:text-loud-foreground group-hover:fx-glow-sm group-focus:fx-glow-sm",
              "before:content-[''] before:border-b before:border-muted-foreground/60 before:w-8 before:inline-block before:align-middle before:mr-1",
              "after:content-[''] after:border-b after:border-muted-foreground/60 after:w-8 after:inline-block after:align-middle after:ml-1"
            )}>
								Click to view resolution details
						</div>
					</button>
				</DialogTrigger>
				<a
					href={MOON_FORK_URL}
					className="mt-3 block text-center text-xs uppercase tracking-wide text-primary hover:text-loud-foreground hover:underline focus:underline"
				>
					Read the Moon Fork case study →
				</a>
			</div>
			<ForkResolutionDialog record={record} />
		</Dialog>
	);
};

export const ForkResolutionPending = (): React.JSX.Element => (
	<div className="mx-auto w-full max-w-xl px-8 text-left font-mono text-sm">
		<div className="border border-orange-500/40 bg-orange-500/5 p-5">
			<div className="mb-2 text-xs uppercase tracking-wide text-orange-400">
				THE FORK RECORD
			</div>
			<div className="font-display text-2xl uppercase text-orange-300">
				Resolution pending
			</div>
			<p className="mt-3 font-prose text-sm text-muted-foreground">
				Migration has closed. The final winner is not verified in fork JSON data
				yet, so the site is withholding a canonical-universe claim.
			</p>
		</div>
	</div>
);
