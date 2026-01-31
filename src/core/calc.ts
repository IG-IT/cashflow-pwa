import type { Asset, Player } from "./types";

export function assetMonthlyCashflow(asset: Asset): number {
  if (asset.type === "stocks") {
    const details = asset.details as { dividendPerShare: number; numShares: number };
    return (details.dividendPerShare || 0) * (details.numShares || 0);
  }
  if (asset.type === "business" || asset.type === "real_estate") {
    const details = asset.details as { cashFlowMonthly: number };
    return details.cashFlowMonthly || 0;
  }
  return 0;
}

export function assetValue(asset: Asset): number {
  if (asset.type === "stocks") {
    const details = asset.details as { sharePrice: number; numShares: number };
    return (details.sharePrice || 0) * (details.numShares || 0);
  }
  if (asset.type === "business" || asset.type === "real_estate") {
    const details = asset.details as { cost: number };
    return details.cost || 0;
  }
  if (asset.type === "personal_property") {
    const details = asset.details as { cost: number };
    return details.cost || 0;
  }
  return 0;
}

export function assetLiability(asset: Asset): number {
  if (asset.type === "business" || asset.type === "real_estate") {
    const details = asset.details as { liability: number };
    return details.liability || 0;
  }
  return 0;
}

export function passiveIncomeMonthly(p: Player): number {
  return p.assets.reduce((sum, asset) => sum + Math.max(0, assetMonthlyCashflow(asset)), 0);
}

export function assetExtraExpensesMonthly(p: Player): number {
  return p.assets.reduce((sum, asset) => sum + Math.max(0, -assetMonthlyCashflow(asset)), 0);
}

export function baseExpensesMonthly(p: Player): number {
  const pr = p.profession;
  const childTotal = p.children * (pr.perChildExpense || 0);

  return (
    (pr.taxes || 0) +
    (pr.otherExpenses || 0) +
    childTotal +
    (pr.rentPayment || 0) +
    0
  );
}

export function liabilitiesMonthlyPayments(p: Player): number {
  return p.liabilities.reduce((sum, l) => sum + (l.paymentMonthly || 0), 0);
}

export function totalExpensesMonthly(p: Player): number {
  return baseExpensesMonthly(p) + assetExtraExpensesMonthly(p) + liabilitiesMonthlyPayments(p);
}

export function totalIncomeMonthly(p: Player): number {
  return (p.profession.salary || 0) + passiveIncomeMonthly(p);
}

export function monthlyCashflow(p: Player): number {
  return totalIncomeMonthly(p) - totalExpensesMonthly(p);
}

export function shouldEnterFastTrack(p: Player): boolean {
  return passiveIncomeMonthly(p) >= totalExpensesMonthly(p);
}
