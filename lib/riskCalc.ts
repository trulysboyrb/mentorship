// Position size calculator. Everything is in the account's own currency.

export type RiskInput = {
  balance: number;
  riskPercent: number;
  stopPips: number;
  pipValuePerLot: number; // value of 1 pip for 1 standard lot, in account currency
  rewardRatio?: number; // optional, e.g. 2 means 1:2
};

export type RiskResult = {
  riskAmount: number;
  lots: number;
  units: number;
  actualRisk: number;
  potentialProfit: number | null;
  tooSmall: boolean;
};

export function positionSize(input: RiskInput): RiskResult | null {
  const { balance, riskPercent, stopPips, pipValuePerLot, rewardRatio } = input;
  const ok = [balance, riskPercent, stopPips, pipValuePerLot].every(
    (n) => Number.isFinite(n) && n > 0
  );
  if (!ok) return null;

  const riskAmount = (balance * riskPercent) / 100;
  const rawLots = riskAmount / (stopPips * pipValuePerLot);
  // Round DOWN to 0.01 lot so you never risk more than planned.
  const lots = Math.floor(rawLots * 100 + 1e-9) / 100;
  const actualRisk = lots * stopPips * pipValuePerLot;
  const potentialProfit =
    rewardRatio && Number.isFinite(rewardRatio) && rewardRatio > 0
      ? actualRisk * rewardRatio
      : null;

  return {
    riskAmount,
    lots,
    units: Math.round(lots * 100000),
    actualRisk,
    potentialProfit,
    tooSmall: lots < 0.01,
  };
}
