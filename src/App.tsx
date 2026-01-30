import { useEffect, useMemo, useState } from "react";
import {
  assetExtraExpensesMonthly,
  assetLiability,
  assetMonthlyCashflow,
  assetValue,
  baseExpensesMonthly,
  liabilitiesMonthlyPayments,
  monthlyCashflow,
  passiveIncomeMonthly,
  shouldEnterFastTrack,
  totalExpensesMonthly,
  totalIncomeMonthly,
} from "./core/calc";
import type {
  Asset,
  AssetType,
  Liability,
  LiabilityType,
  Player,
  Profession,
} from "./core/types";
import "./App.css";

const STORAGE_KEY = "cashflow_pwa_v1";
const PRESETS_KEY = "cashflow_pwa_presets_v1";
const PLAYER_PRESETS_KEY = "cashflow_pwa_player_presets_v1";

type Screen = "dashboard" | "assets" | "liabilities" | "in_out" | "ledger" | "profession";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function num(v: string): number {
  const normalized = v.replace(/\s+/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clampNonNegative(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatMoney(value: number): string {
  return `${Math.round(value).toLocaleString("sv-SE")} kr`;
}

function defaultProfession(): Profession {
  return {
    professionName: "Custom",
    savings: 0,
    salary: 0,
    taxes: 0,
    otherExpenses: 0,
    perChildExpense: 0,
    mortgageBalance: 0,
    mortgagePayment: 0,
    rentBalance: 0,
    rentPayment: 0,
    studentLoanBalance: 0,
    studentLoanPayment: 0,
    carLoanBalance: 0,
    carLoanPayment: 0,
    retailDebtBalance: 0,
    retailDebtPayment: 0,
  };
}

function newPlayer(): Player {
  return {
    id: uid(),
    name: "Player",
    phase: "rat_race",
    cash: 0,
    children: 0,
    profession: defaultProfession(),
    assets: [],
    liabilities: [],
    ledger: [],
    announcedFastTrack: false,
  };
}

function loadPlayer(): Player {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Player;
      return {
        ...parsed,
        profession: { ...defaultProfession(), ...parsed.profession },
        assets: parsed.assets ?? [],
        liabilities: parsed.liabilities ?? [],
        ledger: parsed.ledger ?? [],
      };
    }
  } catch {
    // ignore
  }
  return newPlayer();
}

function savePlayer(player: Player) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(player));
}

type ProfessionPreset = {
  id: string;
  name: string;
  profession: Profession;
};

type PlayerPreset = {
  id: string;
  name: string;
};

function loadProfessionPresets(): ProfessionPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (raw) return JSON.parse(raw) as ProfessionPreset[];
  } catch {
    // ignore
  }
  return [];
}

function saveProfessionPresets(presets: ProfessionPreset[]) {
  localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

function loadPlayerPresets(): PlayerPreset[] {
  try {
    const raw = localStorage.getItem(PLAYER_PRESETS_KEY);
    if (raw) return JSON.parse(raw) as PlayerPreset[];
  } catch {
    // ignore
  }
  return [];
}

function savePlayerPresets(presets: PlayerPreset[]) {
  localStorage.setItem(PLAYER_PRESETS_KEY, JSON.stringify(presets));
}

export default function App() {
  const [player, setPlayer] = useState<Player>(() => loadPlayer());
  const [toast, setToast] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("dashboard");
  const [professionPresets, setProfessionPresets] = useState<ProfessionPreset[]>(() => loadProfessionPresets());
  const [playerPresets, setPlayerPresets] = useState<PlayerPreset[]>(() => loadPlayerPresets());
  const [newPresetName, setNewPresetName] = useState("");
  const [newPlayerPresetName, setNewPlayerPresetName] = useState("");

  const [professionForm, setProfessionForm] = useState<Profession>(player.profession);
  const [applySavingsToCash, setApplySavingsToCash] = useState(true);

  const [assetType, setAssetType] = useState<AssetType>("stocks");
  const [stockForm, setStockForm] = useState({
    name: "",
    sharePrice: "",
    numShares: "",
    dividendPerShare: "",
    autoUpdateCash: true,
  });
  const [businessForm, setBusinessForm] = useState({
    name: "",
    cost: "",
    downPayment: "",
    liability: "",
    cashFlowMonthly: "",
    autoUpdateCash: true,
  });
  const [propertyForm, setPropertyForm] = useState({
    name: "",
    cost: "",
    autoUpdateCash: true,
  });

  const [liabilityForm, setLiabilityForm] = useState({
    name: "",
    type: "bank_loan" as LiabilityType,
    principal: "",
    paymentMonthly: "",
    autoUpdateCash: true,
  });

  const [inOutAmount, setInOutAmount] = useState("");
  const [sellInputs, setSellInputs] = useState<Record<string, { price: string; shares: string }>>({});

  const derived = useMemo(() => {
    const passiveIncome = passiveIncomeMonthly(player);
    const assetExpenses = assetExtraExpensesMonthly(player);
    const baseExpenses = baseExpensesMonthly(player);
    const liabilitiesPayments = liabilitiesMonthlyPayments(player);
    const totalExpenses = totalExpensesMonthly(player);
    const totalIncome = totalIncomeMonthly(player);
    const cashflow = monthlyCashflow(player);

    return {
      passiveIncome,
      assetExpenses,
      baseExpenses,
      liabilitiesPayments,
      totalExpenses,
      totalIncome,
      cashflow,
    };
  }, [player]);

  useEffect(() => {
    savePlayer(player);
  }, [player]);

  useEffect(() => {
    saveProfessionPresets(professionPresets);
  }, [professionPresets]);

  useEffect(() => {
    savePlayerPresets(playerPresets);
  }, [playerPresets]);

  function commitPlayer(next: Player) {
    if (next.phase === "rat_race" && !next.announcedFastTrack && shouldEnterFastTrack(next)) {
      next.phase = "fast_track";
      next.announcedFastTrack = true;
      setToast("Passive income now covers expenses. You are on the Fast Track!");
    }
    setPlayer(next);
  }

  function updatePlayer(mutator: (draft: Player) => void) {
    const draft = structuredClone(player);
    mutator(draft);
    commitPlayer(draft);
  }

  function addLedger(amount: number, type: Player["ledger"][number]["type"], note?: string) {
    return { id: uid(), ts: Date.now(), type, amount, note };
  }

  function borrowIfNeeded(draft: Player, amount: number, note: string) {
    if (amount <= 0) return;
    if (draft.cash >= amount) return;
    const shortfall = amount - draft.cash;
    const principal = Math.ceil(shortfall / 1000) * 1000;
    const liability: Liability = {
      id: uid(),
      name: "Auto Loan",
      type: "bank_loan",
      principal,
      paymentMonthly: 0,
      autoUpdateCash: true,
      createdAt: Date.now(),
    };
    draft.liabilities.unshift(liability);
    draft.cash += principal;
    draft.ledger.unshift(addLedger(principal, "add_liability", `Auto Loan for ${note}`));
  }

  function handleSetProfession() {
    updatePlayer((draft) => {
      draft.profession = { ...professionForm };
      if (applySavingsToCash) {
        draft.cash = professionForm.savings || 0;
      }
      draft.ledger.unshift(addLedger(0, "set_profession", professionForm.professionName));
    });
    const presetName = professionForm.professionName.trim();
    if (presetName) {
      setProfessionPresets((prev) => {
        const existing = prev.find((item) => item.name.toLowerCase() === presetName.toLowerCase());
        if (existing) {
          return prev.map((item) =>
            item.id === existing.id ? { ...item, profession: { ...professionForm } } : item
          );
        }
        return [{ id: uid(), name: presetName, profession: { ...professionForm } }, ...prev];
      });
    }
  }

  function handleSetChildren(value: string) {
    const parsed = Math.max(0, Math.floor(num(value)));
    updatePlayer((draft) => {
      draft.children = parsed;
      draft.ledger.unshift(addLedger(0, "set_children", String(parsed)));
    });
  }

  function handleAddAsset() {
    if (assetType === "stocks") {
      const sharePrice = clampNonNegative(num(stockForm.sharePrice));
      const numShares = clampNonNegative(num(stockForm.numShares));
      if (!stockForm.name || sharePrice <= 0 || numShares <= 0) {
        setToast("Add stock: name, share price, and shares are required.");
        return;
      }
      const dividendPerShare = clampNonNegative(num(stockForm.dividendPerShare));
      const cost = sharePrice * numShares;
      const asset: Asset = {
        id: uid(),
        type: "stocks",
        name: stockForm.name,
        autoUpdateCash: stockForm.autoUpdateCash,
        createdAt: Date.now(),
        details: { sharePrice, numShares, dividendPerShare },
      };
      updatePlayer((draft) => {
        draft.assets.unshift(asset);
        if (asset.autoUpdateCash) {
          borrowIfNeeded(draft, cost, `Stock: ${asset.name}`);
          draft.cash -= cost;
        }
        draft.ledger.unshift(addLedger(-cost, "buy_asset", `Stock: ${asset.name}`));
      });
      setStockForm({ name: "", sharePrice: "", numShares: "", dividendPerShare: "", autoUpdateCash: true });
      return;
    }

    if (assetType === "business") {
      const cost = clampNonNegative(num(businessForm.cost));
      const downPayment = clampNonNegative(num(businessForm.downPayment));
      const liabilityInput = clampNonNegative(num(businessForm.liability));
      const cashFlowMonthly = num(businessForm.cashFlowMonthly);
      if (!businessForm.name || cost <= 0 || downPayment <= 0) {
        setToast("Add business: name, cost, and down payment are required.");
        return;
      }
      const liability = liabilityInput > 0 ? liabilityInput : Math.max(0, cost - downPayment);
      const asset: Asset = {
        id: uid(),
        type: "business",
        name: businessForm.name,
        autoUpdateCash: businessForm.autoUpdateCash,
        createdAt: Date.now(),
        details: { cost, downPayment, liability, cashFlowMonthly },
      };
      updatePlayer((draft) => {
        draft.assets.unshift(asset);
        if (asset.autoUpdateCash) {
          borrowIfNeeded(draft, downPayment, `Business: ${asset.name}`);
          draft.cash -= downPayment;
        }
        draft.ledger.unshift(addLedger(-downPayment, "buy_asset", `Business: ${asset.name}`));
      });
      setBusinessForm({
        name: "",
        cost: "",
        downPayment: "",
        liability: "",
        cashFlowMonthly: "",
        autoUpdateCash: true,
      });
      return;
    }

    if (assetType === "personal_property") {
      const cost = clampNonNegative(num(propertyForm.cost));
      if (!propertyForm.name || cost <= 0) {
        setToast("Add personal property: name and cost are required.");
        return;
      }
      const asset: Asset = {
        id: uid(),
        type: "personal_property",
        name: propertyForm.name,
        autoUpdateCash: propertyForm.autoUpdateCash,
        createdAt: Date.now(),
        details: { cost },
      };
      updatePlayer((draft) => {
        draft.assets.unshift(asset);
        if (asset.autoUpdateCash) {
          borrowIfNeeded(draft, cost, `Property: ${asset.name}`);
          draft.cash -= cost;
        }
        draft.ledger.unshift(addLedger(-cost, "buy_asset", `Property: ${asset.name}`));
      });
      setPropertyForm({ name: "", cost: "", autoUpdateCash: true });
    }
  }

  function handleRemoveAsset(assetId: string) {
    updatePlayer((draft) => {
      const asset = draft.assets.find((item) => item.id === assetId);
      draft.assets = draft.assets.filter((item) => item.id !== assetId);
      draft.ledger.unshift(addLedger(0, "remove_asset", asset ? asset.name : "Asset removed"));
    });
  }

  function updateSellInput(assetId: string, next: Partial<{ price: string; shares: string }>) {
    setSellInputs((prev) => ({
      ...prev,
      [assetId]: { price: prev[assetId]?.price ?? "", shares: prev[assetId]?.shares ?? "", ...next },
    }));
  }

  function handleSellAsset(assetId: string) {
    const asset = player.assets.find((item) => item.id === assetId);
    if (!asset) return;

    const input = sellInputs[assetId] ?? { price: "", shares: "" };
    const sellPrice = clampNonNegative(num(input.price));

    if (asset.type === "stocks") {
      const details = asset.details as { sharePrice: number; numShares: number; dividendPerShare: number };
      const sharesToSell = clampNonNegative(num(input.shares));
      if (sellPrice <= 0 || sharesToSell <= 0) {
        setToast("Sell stock: enter price and shares.");
        return;
      }
      if (sharesToSell > details.numShares) {
        setToast("Sell stock: shares exceed holdings.");
        return;
      }
      const proceeds = sellPrice * sharesToSell;
      updatePlayer((draft) => {
        const draftAsset = draft.assets.find((item) => item.id === assetId);
        if (!draftAsset) return;
        const draftDetails = draftAsset.details as { sharePrice: number; numShares: number; dividendPerShare: number };
        draftDetails.numShares = Math.max(0, draftDetails.numShares - sharesToSell);
        draft.cash += proceeds;
        draft.ledger.unshift(addLedger(proceeds, "sell_asset", `Stock: ${draftAsset.name}`));
        if (draftDetails.numShares === 0) {
          draft.assets = draft.assets.filter((item) => item.id !== assetId);
        }
      });
      setSellInputs((prev) => ({ ...prev, [assetId]: { price: "", shares: "" } }));
      return;
    }

    if (sellPrice <= 0) {
      setToast("Sell asset: enter a sell price.");
      return;
    }

    updatePlayer((draft) => {
      const draftAsset = draft.assets.find((item) => item.id === assetId);
      if (!draftAsset) return;
      draft.cash += sellPrice;
      draft.ledger.unshift(addLedger(sellPrice, "sell_asset", `${draftAsset.type.replace("_", " ")}: ${draftAsset.name}`));
      draft.assets = draft.assets.filter((item) => item.id !== assetId);
    });
    setSellInputs((prev) => ({ ...prev, [assetId]: { price: "", shares: "" } }));
  }

  function handleAddLiability() {
    const principal = clampNonNegative(num(liabilityForm.principal));
    const paymentMonthly = clampNonNegative(num(liabilityForm.paymentMonthly));
    if (!liabilityForm.name || principal <= 0) {
      setToast("Add liability: name and principal are required.");
      return;
    }
    const liability: Liability = {
      id: uid(),
      name: liabilityForm.name,
      type: liabilityForm.type,
      principal,
      paymentMonthly,
      autoUpdateCash: liabilityForm.autoUpdateCash,
      createdAt: Date.now(),
    };
    updatePlayer((draft) => {
      draft.liabilities.unshift(liability);
      if (liability.autoUpdateCash) {
        draft.cash += principal;
      }
      draft.ledger.unshift(addLedger(principal, "add_liability", `Borrow: ${liability.name}`));
    });
    setLiabilityForm({ name: "", type: "bank_loan", principal: "", paymentMonthly: "", autoUpdateCash: true });
  }

  function handleRemoveLiability(liabilityId: string) {
    updatePlayer((draft) => {
      const liability = draft.liabilities.find((item) => item.id === liabilityId);
      draft.liabilities = draft.liabilities.filter((item) => item.id !== liabilityId);
      draft.ledger.unshift(addLedger(0, "remove_liability", liability ? liability.name : "Liability removed"));
    });
  }

  function handleCollectPaycheck() {
    updatePlayer((draft) => {
      const amount = monthlyCashflow(draft);
      draft.cash += amount;
      draft.ledger.unshift(addLedger(amount, "paycheck", "Collect paycheck"));
    });
  }

  function handleReceiveMoney(amount: number) {
    if (amount <= 0) {
      setToast("Receive money: amount must be greater than 0.");
      return;
    }
    updatePlayer((draft) => {
      draft.cash += amount;
      draft.ledger.unshift(addLedger(amount, "receive", "Receive money"));
    });
  }

  function handlePayMoney(amount: number) {
    if (amount <= 0) {
      setToast("Pay money: amount must be greater than 0.");
      return;
    }
    updatePlayer((draft) => {
      borrowIfNeeded(draft, amount, "Pay money");
      draft.cash -= amount;
      draft.ledger.unshift(addLedger(-amount, "pay", "Pay money"));
    });
  }

  function handleReset() {
    setToast(null);
    const fresh = newPlayer();
    setProfessionForm(fresh.profession);
    commitPlayer(fresh);
  }

  function handleSaveProfessionPreset() {
    const trimmed = newPresetName.trim() || professionForm.professionName.trim();
    if (!trimmed) {
      setToast("Preset name is required.");
      return;
    }
    const preset: ProfessionPreset = {
      id: uid(),
      name: trimmed,
      profession: { ...professionForm },
    };
    setProfessionPresets((prev) => [preset, ...prev]);
    setNewPresetName("");
    setToast("Profession preset saved.");
  }

  function handleApplyProfessionPreset(presetId: string) {
    const preset = professionPresets.find((item) => item.id === presetId);
    if (!preset) return;
    setProfessionForm({ ...defaultProfession(), ...preset.profession });
    updatePlayer((draft) => {
      draft.profession = { ...defaultProfession(), ...preset.profession };
      if (applySavingsToCash) {
        draft.cash = preset.profession.savings || 0;
      }
      draft.ledger.unshift(addLedger(0, "set_profession", preset.name));
    });
    setToast(`Loaded profession preset: ${preset.name}`);
  }

  function handleDeleteProfessionPreset(presetId: string) {
    setProfessionPresets((prev) => prev.filter((item) => item.id !== presetId));
  }

  function handleSavePlayerPreset() {
    const trimmed = newPlayerPresetName.trim() || player.name.trim();
    if (!trimmed) {
      setToast("Player name is required.");
      return;
    }
    const exists = playerPresets.some((preset) => preset.name.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      setToast("Player already saved.");
      return;
    }
    const preset: PlayerPreset = { id: uid(), name: trimmed };
    setPlayerPresets((prev) => [preset, ...prev]);
    setNewPlayerPresetName("");
    setToast("Player saved.");
  }

  function handleApplyPlayerPreset(presetId: string) {
    const preset = playerPresets.find((item) => item.id === presetId);
    if (!preset) return;
    updatePlayer((draft) => {
      draft.name = preset.name;
    });
    setToast(`Loaded player: ${preset.name}`);
  }

  function handleDeletePlayerPreset(presetId: string) {
    setPlayerPresets((prev) => prev.filter((item) => item.id !== presetId));
  }

  const navItems: Array<{ id: Screen; label: string }> = [
    { id: "dashboard", label: "Dashboard" },
    { id: "assets", label: "Assets" },
    { id: "liabilities", label: "Liabilities" },
    { id: "in_out", label: "In/Out" },
    { id: "ledger", label: "Ledger" },
    { id: "profession", label: "Profession" },
  ];

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">Cashflow Helper</p>
          <h1>{navItems.find((item) => item.id === screen)?.label}</h1>
          <p className="muted">
            Phase: <strong>{player.phase.replace("_", " ")}</strong>
          </p>
        </div>
        <div className="header-actions">
          <div className="cash-chip">
            <span>Cash on Hand</span>
            <strong>{formatMoney(player.cash)}</strong>
          </div>
          <button className="ghost" onClick={handleReset}>Reset Game</button>
        </div>
      </header>

      <nav className="top-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={screen === item.id ? "active" : ""}
            onClick={() => setScreen(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {toast ? (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button onClick={() => setToast(null)}>OK</button>
        </div>
      ) : null}

      {screen === "dashboard" && (
        <section className="grid">
          <div className="panel">
            <h2>Player</h2>
            <label>
              Name
              <input value={player.name} onChange={(event) => updatePlayer((draft) => { draft.name = event.target.value; })} />
            </label>
            <label>
              Children
              <input
                inputMode="numeric"
                value={String(player.children)}
                onChange={(event) => handleSetChildren(event.target.value)}
              />
            </label>
            <div className="summary">
              <div>
                <span>Passive Income</span>
                <strong>{formatMoney(derived.passiveIncome)}</strong>
              </div>
              <div>
                <span>Total Income</span>
                <strong>{formatMoney(derived.totalIncome)}</strong>
              </div>
              <div>
                <span>Total Expenses</span>
                <strong>{formatMoney(derived.totalExpenses)}</strong>
              </div>
              <div>
                <span>Monthly Cash Flow</span>
                <strong>{formatMoney(derived.cashflow)}</strong>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>Monthly Breakdown</h2>
            <div className="summary">
              <div>
                <span>Salary</span>
                <strong>{formatMoney(player.profession.salary)}</strong>
              </div>
              <div>
                <span>Passive Income</span>
                <strong>{formatMoney(derived.passiveIncome)}</strong>
              </div>
              <div>
                <span>Base Expenses</span>
                <strong>{formatMoney(derived.baseExpenses)}</strong>
              </div>
              <div>
                <span>Asset Expenses</span>
                <strong>{formatMoney(derived.assetExpenses)}</strong>
              </div>
              <div>
                <span>Liability Payments</span>
                <strong>{formatMoney(derived.liabilitiesPayments)}</strong>
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === "assets" && (
        <section className="grid">
          <div className="panel">
            <h2>Add Asset</h2>
            <div className="tabs">
              {(["stocks", "business", "personal_property"] as AssetType[]).map((type) => (
                <button
                  key={type}
                  className={assetType === type ? "active" : ""}
                  onClick={() => setAssetType(type)}
                >
                  {type.replace("_", " ")}
                </button>
              ))}
            </div>

            {assetType === "stocks" && (
              <div className="form-block">
                <label>
                  Stock / Ticker Name
                  <input value={stockForm.name} onChange={(event) => setStockForm((prev) => ({ ...prev, name: event.target.value }))} />
                </label>
                <div className="split">
                  <label>
                    Share Price
                    <input
                      inputMode="numeric"
                      value={stockForm.sharePrice}
                      onChange={(event) => setStockForm((prev) => ({ ...prev, sharePrice: event.target.value }))}
                    />
                  </label>
                  <label>
                    Number of Shares
                    <input
                      inputMode="numeric"
                      value={stockForm.numShares}
                      onChange={(event) => setStockForm((prev) => ({ ...prev, numShares: event.target.value }))}
                    />
                  </label>
                </div>
                <label>
                  Dividend per Share (monthly)
                  <input
                    inputMode="numeric"
                    value={stockForm.dividendPerShare}
                    onChange={(event) => setStockForm((prev) => ({ ...prev, dividendPerShare: event.target.value }))}
                  />
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={stockForm.autoUpdateCash}
                    onChange={(event) => setStockForm((prev) => ({ ...prev, autoUpdateCash: event.target.checked }))}
                  />
                  Auto update cash on purchase
                </label>
                <button className="primary" onClick={handleAddAsset}>Add Stock</button>
              </div>
            )}

            {assetType === "business" && (
              <div className="form-block">
                <label>
                  Business Name
                  <input value={businessForm.name} onChange={(event) => setBusinessForm((prev) => ({ ...prev, name: event.target.value }))} />
                </label>
                <div className="split">
                  <label>
                    Cost
                    <input
                      inputMode="numeric"
                      value={businessForm.cost}
                      onChange={(event) => setBusinessForm((prev) => ({ ...prev, cost: event.target.value }))}
                    />
                  </label>
                  <label>
                    Down Payment
                    <input
                      inputMode="numeric"
                      value={businessForm.downPayment}
                      onChange={(event) => setBusinessForm((prev) => ({ ...prev, downPayment: event.target.value }))}
                    />
                  </label>
                </div>
                <div className="split">
                  <label>
                    Liability (optional)
                    <input
                      inputMode="numeric"
                      value={businessForm.liability}
                      onChange={(event) => setBusinessForm((prev) => ({ ...prev, liability: event.target.value }))}
                    />
                  </label>
                  <label>
                    Monthly Cashflow
                    <input
                      inputMode="numeric"
                      value={businessForm.cashFlowMonthly}
                      onChange={(event) => setBusinessForm((prev) => ({ ...prev, cashFlowMonthly: event.target.value }))}
                    />
                  </label>
                </div>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={businessForm.autoUpdateCash}
                    onChange={(event) => setBusinessForm((prev) => ({ ...prev, autoUpdateCash: event.target.checked }))}
                  />
                  Auto update cash on purchase
                </label>
                <button className="primary" onClick={handleAddAsset}>Add Business</button>
              </div>
            )}

            {assetType === "personal_property" && (
              <div className="form-block">
                <label>
                  Property Name
                  <input value={propertyForm.name} onChange={(event) => setPropertyForm((prev) => ({ ...prev, name: event.target.value }))} />
                </label>
                <label>
                  Cost
                  <input
                    inputMode="numeric"
                    value={propertyForm.cost}
                    onChange={(event) => setPropertyForm((prev) => ({ ...prev, cost: event.target.value }))}
                  />
                </label>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={propertyForm.autoUpdateCash}
                    onChange={(event) => setPropertyForm((prev) => ({ ...prev, autoUpdateCash: event.target.checked }))}
                  />
                  Auto update cash on purchase
                </label>
                <button className="primary" onClick={handleAddAsset}>Add Property</button>
              </div>
            )}
          </div>

          <div className="panel">
            <h2>Assets List</h2>
            <div className="list">
              {player.assets.length === 0 && <p className="muted">No assets yet.</p>}
              {player.assets.map((asset) => (
                <div key={asset.id} className="list-item">
                  <div>
                    <strong>{asset.name}</strong>
                    <p className="muted">{asset.type.replace("_", " ")}</p>
                    <p className="muted">Value: {formatMoney(assetValue(asset))}</p>
                    {asset.type !== "personal_property" && (
                      <p className="muted">Cashflow: {formatMoney(assetMonthlyCashflow(asset))}</p>
                    )}
                    {assetLiability(asset) > 0 && (
                      <p className="muted">Liability: {formatMoney(assetLiability(asset))}</p>
                    )}
                    <div className="sell-row">
                      {asset.type === "stocks" ? (
                        <>
                          <input
                            inputMode="numeric"
                            placeholder="Sell price"
                            value={sellInputs[asset.id]?.price ?? ""}
                            onChange={(event) => updateSellInput(asset.id, { price: event.target.value })}
                          />
                          <input
                            inputMode="numeric"
                            placeholder="Shares"
                            value={sellInputs[asset.id]?.shares ?? ""}
                            onChange={(event) => updateSellInput(asset.id, { shares: event.target.value })}
                          />
                        </>
                      ) : (
                        <input
                          inputMode="numeric"
                          placeholder="Sell price"
                          value={sellInputs[asset.id]?.price ?? ""}
                          onChange={(event) => updateSellInput(asset.id, { price: event.target.value })}
                        />
                      )}
                      <button className="ghost" onClick={() => handleSellAsset(asset.id)}>Sell</button>
                    </div>
                  </div>
                  <button className="ghost" onClick={() => handleRemoveAsset(asset.id)}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {screen === "liabilities" && (
        <section className="grid">
          <div className="panel">
            <h2>Add Liability</h2>
            <div className="form-block">
              <label>
                Liability Name
                <input value={liabilityForm.name} onChange={(event) => setLiabilityForm((prev) => ({ ...prev, name: event.target.value }))} />
              </label>
              <div className="split">
                <label>
                  Type
                  <select
                    value={liabilityForm.type}
                    onChange={(event) => setLiabilityForm((prev) => ({ ...prev, type: event.target.value as LiabilityType }))}
                  >
                    <option value="bank_loan">Bank Loan</option>
                    <option value="other">Other Liability</option>
                  </select>
                </label>
                <label>
                  Principal
                  <input
                    inputMode="numeric"
                    value={liabilityForm.principal}
                    onChange={(event) => setLiabilityForm((prev) => ({ ...prev, principal: event.target.value }))}
                  />
                </label>
              </div>
              <label>
                Monthly Payment
                <input
                  inputMode="numeric"
                  value={liabilityForm.paymentMonthly}
                  onChange={(event) => setLiabilityForm((prev) => ({ ...prev, paymentMonthly: event.target.value }))}
                />
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={liabilityForm.autoUpdateCash}
                  onChange={(event) => setLiabilityForm((prev) => ({ ...prev, autoUpdateCash: event.target.checked }))}
                />
                Auto update cash when borrowing
              </label>
              <button className="primary" onClick={handleAddLiability}>Add Liability</button>
            </div>
          </div>

          <div className="panel">
            <h2>Liabilities List</h2>
            <div className="list">
              {player.liabilities.length === 0 && <p className="muted">No liabilities yet.</p>}
              {player.liabilities.map((liability) => (
                <div key={liability.id} className="list-item">
                  <div>
                    <strong>{liability.name}</strong>
                    <p className="muted">{liability.type.replace("_", " ")}</p>
                    <p className="muted">Principal: {formatMoney(liability.principal)}</p>
                    <p className="muted">Payment: {formatMoney(liability.paymentMonthly)}</p>
                  </div>
                  <button className="ghost" onClick={() => handleRemoveLiability(liability.id)}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {screen === "in_out" && (
        <section className="grid">
          <div className="panel">
            <h2>Paycheck & One-time</h2>
            <button className="primary" onClick={handleCollectPaycheck}>
              Collect Paycheck ({formatMoney(derived.cashflow)})
            </button>
            <div className="form-block">
              <label>
                Amount
                <input
                  inputMode="numeric"
                  value={inOutAmount}
                  onChange={(event) => setInOutAmount(event.target.value)}
                />
              </label>
              <div className="split">
                <button
                  className="ghost"
                  onClick={() => {
                    const amount = clampNonNegative(num(inOutAmount));
                    handleReceiveMoney(amount);
                    setInOutAmount("");
                  }}
                >
                  Receive Money
                </button>
                <button
                  className="ghost"
                  onClick={() => {
                    const amount = clampNonNegative(num(inOutAmount));
                    handlePayMoney(amount);
                    setInOutAmount("");
                  }}
                >
                  Pay Money
                </button>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>Totals</h2>
            <div className="summary">
              <div>
                <span>Cash on Hand</span>
                <strong>{formatMoney(player.cash)}</strong>
              </div>
              <div>
                <span>Monthly Cash Flow</span>
                <strong>{formatMoney(derived.cashflow)}</strong>
              </div>
              <div>
                <span>Total Income</span>
                <strong>{formatMoney(derived.totalIncome)}</strong>
              </div>
              <div>
                <span>Total Expenses</span>
                <strong>{formatMoney(derived.totalExpenses)}</strong>
              </div>
            </div>
          </div>
        </section>
      )}

      {screen === "ledger" && (
        <section className="panel ledger">
          <h2>Ledger (latest 50)</h2>
          {player.ledger.length === 0 && <p className="muted">No transactions yet.</p>}
          {player.ledger.slice(0, 50).map((entry) => (
            <div key={entry.id} className="ledger-row">
              <span className="muted">{new Date(entry.ts).toLocaleString()}</span>
              <span>{entry.type.replace("_", " ")}</span>
              <span>{entry.note || ""}</span>
              <span className={entry.amount < 0 ? "negative" : "positive"}>{formatMoney(entry.amount)}</span>
            </div>
          ))}
        </section>
      )}

      {screen === "profession" && (
        <section className="grid">
          <div className="panel">
            <h2>Profession Setup</h2>
            <div className="form-block">
              <h3>Player Presets</h3>
              <label>
                Save Player Name
                <input
                  value={newPlayerPresetName}
                  onChange={(event) => setNewPlayerPresetName(event.target.value)}
                  placeholder="Player name"
                />
              </label>
              <button className="ghost" onClick={handleSavePlayerPreset}>Save Player</button>
              <div className="list compact">
                {playerPresets.length === 0 && <p className="muted">No players saved.</p>}
                {playerPresets.map((preset) => (
                  <div key={preset.id} className="list-item compact">
                    <span>{preset.name}</span>
                    <div className="row-actions">
                      <button className="ghost" onClick={() => handleApplyPlayerPreset(preset.id)}>Use</button>
                      <button className="ghost" onClick={() => handleDeletePlayerPreset(preset.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-block">
              <h3>Choose Profession Preset</h3>
              <label>
                Saved Professions
                <select
                  value=""
                  onChange={(event) => {
                    const presetId = event.target.value;
                    if (presetId) handleApplyProfessionPreset(presetId);
                  }}
                >
                  <option value="">Select a preset...</option>
                  {professionPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>{preset.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Profession Name
              <input
                value={professionForm.professionName}
                onChange={(event) => setProfessionForm((prev) => ({ ...prev, professionName: event.target.value }))}
              />
            </label>
            <div className="split">
              <label>
                Savings (start cash)
                <input
                  inputMode="numeric"
                  value={String(professionForm.savings)}
                  onChange={(event) => setProfessionForm((prev) => ({ ...prev, savings: num(event.target.value) }))}
                />
              </label>
              <label>
                Salary (monthly)
                <input
                  inputMode="numeric"
                  value={String(professionForm.salary)}
                  onChange={(event) => setProfessionForm((prev) => ({ ...prev, salary: num(event.target.value) }))}
                />
              </label>
            </div>
            <div className="split">
              <label>
                Taxes (monthly)
                <input
                  inputMode="numeric"
                  value={String(professionForm.taxes)}
                  onChange={(event) => setProfessionForm((prev) => ({ ...prev, taxes: num(event.target.value) }))}
                />
              </label>
              <label>
                Other Expenses
                <input
                  inputMode="numeric"
                  value={String(professionForm.otherExpenses)}
                  onChange={(event) => setProfessionForm((prev) => ({ ...prev, otherExpenses: num(event.target.value) }))}
                />
              </label>
            </div>
            <label>
              Per Child Expense
              <input
                inputMode="numeric"
                value={String(professionForm.perChildExpense)}
                onChange={(event) => setProfessionForm((prev) => ({ ...prev, perChildExpense: num(event.target.value) }))}
              />
            </label>
            <details>
              <summary>Loans & Fixed Payments</summary>
              <div className="loan-grid">
                <div className="loan-card">
                  <h3>Mortgage</h3>
                  <label>
                    Amount
                    <input
                      inputMode="numeric"
                      value={String(professionForm.mortgageBalance)}
                      onChange={(event) => setProfessionForm((prev) => ({ ...prev, mortgageBalance: num(event.target.value) }))}
                    />
                  </label>
                  <label>
                    Monthly Payment
                    <input
                      inputMode="numeric"
                      value={String(professionForm.mortgagePayment)}
                      onChange={(event) => setProfessionForm((prev) => ({ ...prev, mortgagePayment: num(event.target.value) }))}
                    />
                  </label>
                </div>
                <div className="loan-card">
                  <h3>Rent</h3>
                  <label>
                    Amount
                    <input
                      inputMode="numeric"
                      value={String(professionForm.rentBalance)}
                      onChange={(event) => setProfessionForm((prev) => ({ ...prev, rentBalance: num(event.target.value) }))}
                    />
                  </label>
                  <label>
                    Monthly Payment
                    <input
                      inputMode="numeric"
                      value={String(professionForm.rentPayment)}
                      onChange={(event) => setProfessionForm((prev) => ({ ...prev, rentPayment: num(event.target.value) }))}
                    />
                  </label>
                </div>
                <div className="loan-card">
                  <h3>Student Loan</h3>
                  <label>
                    Amount
                    <input
                      inputMode="numeric"
                      value={String(professionForm.studentLoanBalance)}
                      onChange={(event) => setProfessionForm((prev) => ({ ...prev, studentLoanBalance: num(event.target.value) }))}
                    />
                  </label>
                  <label>
                    Monthly Payment
                    <input
                      inputMode="numeric"
                      value={String(professionForm.studentLoanPayment)}
                      onChange={(event) => setProfessionForm((prev) => ({ ...prev, studentLoanPayment: num(event.target.value) }))}
                    />
                  </label>
                </div>
                <div className="loan-card">
                  <h3>Car Loan</h3>
                  <label>
                    Amount
                    <input
                      inputMode="numeric"
                      value={String(professionForm.carLoanBalance)}
                      onChange={(event) => setProfessionForm((prev) => ({ ...prev, carLoanBalance: num(event.target.value) }))}
                    />
                  </label>
                  <label>
                    Monthly Payment
                    <input
                      inputMode="numeric"
                      value={String(professionForm.carLoanPayment)}
                      onChange={(event) => setProfessionForm((prev) => ({ ...prev, carLoanPayment: num(event.target.value) }))}
                    />
                  </label>
                </div>
                <div className="loan-card">
                  <h3>Retail Debt</h3>
                  <label>
                    Amount
                    <input
                      inputMode="numeric"
                      value={String(professionForm.retailDebtBalance)}
                      onChange={(event) => setProfessionForm((prev) => ({ ...prev, retailDebtBalance: num(event.target.value) }))}
                    />
                  </label>
                  <label>
                    Monthly Payment
                    <input
                      inputMode="numeric"
                      value={String(professionForm.retailDebtPayment)}
                      onChange={(event) => setProfessionForm((prev) => ({ ...prev, retailDebtPayment: num(event.target.value) }))}
                    />
                  </label>
                </div>
              </div>
            </details>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={applySavingsToCash}
                onChange={(event) => setApplySavingsToCash(event.target.checked)}
              />
              Set cash to savings when saving profession
            </label>
            <button className="primary" onClick={handleSetProfession}>Save Profession</button>
            <div className="form-block">
              <h3>Profession Presets</h3>
              <label>
                Save Profession Preset
                <input
                  value={newPresetName}
                  onChange={(event) => setNewPresetName(event.target.value)}
                  placeholder="Preset name"
                />
              </label>
              <button className="ghost" onClick={handleSaveProfessionPreset}>Save Preset</button>
              <div className="list compact">
                {professionPresets.length === 0 && <p className="muted">No presets saved.</p>}
                {professionPresets.map((preset) => (
                  <div key={preset.id} className="list-item compact">
                    <span>{preset.name}</span>
                    <div className="row-actions">
                      <button className="ghost" onClick={() => handleApplyProfessionPreset(preset.id)}>Load</button>
                      <button className="ghost" onClick={() => handleDeleteProfessionPreset(preset.id)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={screen === item.id ? "active" : ""}
            onClick={() => setScreen(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
