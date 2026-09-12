import { isNonZeroEthereumAddress } from "./derive-fork-lifecycle.ts";
import type { ForkRecordData } from "./types.ts";

export interface RepSupplySnapshot {
	generatedAt: string;
	blockNumber: number;
	token: {
		address: string;
		symbol: string;
		totalSupply: string;
		totalSupplyWei: string;
	};
}

export const getWinningRepToken = (record: ForkRecordData): string | null => {
	const token = record.outcomes.find(
		(outcome) =>
			isNonZeroEthereumAddress(record.winningChildUniverse) &&
			outcome.childUniverse?.toLowerCase() ===
				record.winningChildUniverse.toLowerCase(),
	)?.reputationToken;
	return isNonZeroEthereumAddress(token) ? token : null;
};

// Supply is an independent, block-specific observation, never a migration tally.
export const getWinningRepSupply = (
	record: ForkRecordData,
	snapshot: unknown,
): RepSupplySnapshot | null => {
	if (
		!snapshot ||
		typeof snapshot !== "object" ||
		!("token" in snapshot) ||
		!snapshot.token ||
		typeof snapshot.token !== "object"
	)
		return null;
	const candidate = snapshot as RepSupplySnapshot;
	if (
		typeof candidate.token.address !== "string" ||
		typeof candidate.token.totalSupply !== "string" ||
		typeof candidate.token.totalSupplyWei !== "string" ||
		typeof candidate.generatedAt !== "string"
	)
		return null;
	const token = getWinningRepToken(record);
	if (
		!token ||
		token.toLowerCase() !== candidate.token.address.toLowerCase() ||
		candidate.token.symbol !== "REPv2_Yes_1" ||
		!Number.isSafeInteger(candidate.blockNumber) ||
		candidate.blockNumber <= 0 ||
		!Number.isFinite(Date.parse(candidate.generatedAt)) ||
		!/^\d+(?:\.\d{1,18})?$/u.test(candidate.token.totalSupply) ||
		!/^\d+$/u.test(candidate.token.totalSupplyWei)
	)
		return null;
	const [whole, fraction = ""] = candidate.token.totalSupply.split(".");
	const wei = BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
	return wei > 0n && wei === BigInt(candidate.token.totalSupplyWei)
		? candidate
		: null;
};
