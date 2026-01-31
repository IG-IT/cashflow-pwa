export type Phase = "rat_race" | "fast_track";

export type AssetType = "stocks" | "business" | "personal_property" | "real_estate";

export type StockDetails = {
  sharePrice: number;
  numShares: number;
  dividendPerShare: number;
};

export type BusinessDetails = {
  cost: number;
  downPayment: number;
  liability: number;
  cashFlowMonthly: number;
};

export type PersonalPropertyDetails = {
  cost: number;
};

export type RealEstateDetails = BusinessDetails;

export type Asset = {
  id: string;
  type: AssetType;
  name: string;
  autoUpdateCash: boolean;
  createdAt: number;
  details: StockDetails | BusinessDetails | PersonalPropertyDetails | RealEstateDetails;
};

export type LiabilityType = "bank_loan" | "other";

export type Liability = {
  id: string;
  name: string;
  type: LiabilityType;
  principal: number;
  paymentMonthly: number;
  autoUpdateCash: boolean;
  createdAt: number;
  origin?: "fixed" | "manual" | "auto";
  fixedKey?: "mortgage" | "studentLoan" | "carLoan" | "retailDebt";
};

export type Profession = {
  professionName: string;
  savings: number;
  salary: number;
  taxes: number;
  otherExpenses: number;
  perChildExpense: number;
  mortgageBalance: number;
  mortgagePayment: number;
  rentBalance: number;
  rentPayment: number;
  studentLoanBalance: number;
  studentLoanPayment: number;
  carLoanBalance: number;
  carLoanPayment: number;
  retailDebtBalance: number;
  retailDebtPayment: number;
};

export type LedgerEntry = {
  id: string;
  ts: number;
  type:
    | "set_profession"
    | "set_children"
    | "buy_asset"
    | "sell_asset"
    | "remove_asset"
    | "add_liability"
    | "remove_liability"
    | "pay_off_liability"
    | "paycheck"
    | "receive"
    | "pay";
  amount: number;
  note?: string;
};

export type Player = {
  id: string;
  name: string;
  phase: Phase;
  cash: number;
  children: number;
  profession: Profession;
  assets: Asset[];
  liabilities: Liability[];
  ledger: LedgerEntry[];
  announcedFastTrack: boolean;
};
