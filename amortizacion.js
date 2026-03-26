const montoInput = document.getElementById("monto-amort");
const tasaInput = document.getElementById("tasa-amort");
const plazoInput = document.getElementById("plazo-amort");
const plazoUnidadInput = document.getElementById("plazo-unidad");
const metodoInput = document.getElementById("metodo-amort");
const estrategiaInput = document.getElementById("estrategia-abono");
const abonoExtraInput = document.getElementById("abono-extra");
const abonoCadaInput = document.getElementById("abono-cada");
const abonoInicioInput = document.getElementById("abono-inicio");
const btnCalcular = document.getElementById("calcular-amort");

const cuotaBaseEl = document.getElementById("cuota-base");
const cuotaConEl = document.getElementById("cuota-con");
const interesBaseEl = document.getElementById("interes-base");
const interesConEl = document.getElementById("interes-con");
const ahorroInteresEl = document.getElementById("ahorro-interes");
const plazoBaseEl = document.getElementById("plazo-base");
const plazoConEl = document.getElementById("plazo-con");
const ahorroPlazoEl = document.getElementById("ahorro-plazo");
const totalBaseEl = document.getElementById("total-base");
const totalConEl = document.getElementById("total-con");
const tablaResumenEl = document.getElementById("tabla-amort-resumen");
const tablaBodyEl = document.getElementById("tabla-amort-body");
const noteEl = document.getElementById("amort-note");

const moneyFmt = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(value) {
  return `$${moneyFmt.format(value)}`;
}

function parseMoneyInput(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  let normalized = raw;

  if (hasComma && hasDot) {
    const lastComma = raw.lastIndexOf(",");
    const lastDot = raw.lastIndexOf(".");
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandsSep = decimalSep === "," ? "." : ",";
    normalized = raw.replace(new RegExp(`\\${thousandsSep}`, "g"), "");
    normalized = normalized.replace(decimalSep, ".");
  } else if (hasComma) {
    const parts = raw.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = raw.replace(",", ".");
    } else {
      normalized = raw.replace(/,/g, "");
    }
  } else if (hasDot) {
    const parts = raw.split(".");
    if (parts.length === 2 && parts[1].length <= 2) {
      normalized = raw;
    } else {
      normalized = raw.replace(/\./g, "");
    }
  }

  normalized = normalized.replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatMoneyInput(rawValue) {
  if (rawValue === null || rawValue === undefined) return "";
  const raw = String(rawValue);
  if (!raw.trim()) return "";
  if (!/[0-9]/.test(raw)) return raw;

  const cleaned = raw.replace(/[^0-9.,-]/g, "");
  const lastSep = Math.max(cleaned.lastIndexOf("."), cleaned.lastIndexOf(","));
  let integerPart = cleaned;
  let decimalPart = "";
  let hasDecimal = false;

  if (lastSep !== -1) {
    const after = cleaned.slice(lastSep + 1).replace(/\D/g, "");
    const before = cleaned.slice(0, lastSep).replace(/\D/g, "");
    if (after.length <= 2) {
      hasDecimal = true;
      integerPart = before;
      decimalPart = after;
    } else {
      integerPart = cleaned.replace(/\D/g, "");
    }
  } else {
    integerPart = cleaned.replace(/\D/g, "");
  }

  if (integerPart === "") integerPart = "0";
  const sign = cleaned.trim().startsWith("-") ? "-" : "";
  const formattedInt = Number(integerPart).toLocaleString("en-US");

  if (hasDecimal) {
    return decimalPart ? `${sign}${formattedInt}.${decimalPart}` : `${sign}${formattedInt}.`;
  }
  return `${sign}${formattedInt}`;
}

function setupMoneyInputs() {
  const inputs = document.querySelectorAll(".money-input");
  inputs.forEach((input) => {
    input.addEventListener("input", () => {
      const raw = input.value;
      if (!raw.trim()) return;
      const formatted = formatMoneyInput(raw);
      if (formatted) {
        input.value = formatted;
        input.setSelectionRange(formatted.length, formatted.length);
      }
    });

    input.addEventListener("blur", () => {
      const formatted = formatMoneyInput(input.value);
      if (formatted !== "") {
        input.value = formatted;
      }
    });
  });
}

function computeMonthlyRate(annualRate) {
  if (!Number.isFinite(annualRate) || annualRate <= 0) return 0;
  return Math.pow(1 + annualRate / 100, 1 / 12) - 1;
}

function annuityPayment(balance, rate, periods) {
  if (periods <= 0) return 0;
  if (rate === 0) return balance / periods;
  return (balance * rate) / (1 - Math.pow(1 + rate, -periods));
}

function toMonthsLabel(periods) {
  if (!periods || periods <= 0) return "0 meses";
  const years = periods / 12;
  return `${periods} meses (~${years.toFixed(1)} años)`;
}

function shouldApplyExtra(period, config) {
  if (!config.enabled) return false;
  if (period < config.start) return false;
  return (period - config.start) % config.every === 0;
}

function simulateSchedule({
  amount,
  periodRate,
  periods,
  method,
  strategy,
  extraAmount,
  extraEvery,
  extraStart,
}) {
  const eps = 1e-8;
  const rows = [];

  let balance = amount;
  let totalInterest = 0;
  let totalPaid = 0;
  let firstInstallment = 0;

  const baselineFixedInstallment = annuityPayment(amount, periodRate, periods);
  const baselineConstantPrincipal = periods > 0 ? amount / periods : 0;

  const maxPeriods = strategy === "cuota" ? periods + 24 : periods + 240;

  for (let period = 1; period <= maxPeriods && balance > eps; period += 1) {
    const remainingPeriods = Math.max(1, periods - period + 1);
    const interest = balance * periodRate;
    const canApplyExtra = shouldApplyExtra(period, {
      enabled: extraAmount > 0,
      start: extraStart,
      every: extraEvery,
    });

    let installment = 0;
    let principalScheduled = 0;

    if (method === "fija") {
      if (strategy === "cuota" && extraAmount > 0) {
        installment = annuityPayment(balance, periodRate, remainingPeriods);
      } else {
        installment = baselineFixedInstallment;
      }
      principalScheduled = installment - interest;
    } else {
      if (strategy === "cuota" && extraAmount > 0) {
        principalScheduled = balance / remainingPeriods;
      } else {
        principalScheduled = baselineConstantPrincipal;
      }
      installment = principalScheduled + interest;
    }

    principalScheduled = Math.max(0, principalScheduled);
    if (principalScheduled > balance) {
      principalScheduled = balance;
      installment = principalScheduled + interest;
    }

    let extra = canApplyExtra ? extraAmount : 0;
    const roomForExtra = Math.max(0, balance - principalScheduled);
    if (extra > roomForExtra) {
      extra = roomForExtra;
    }

    const principalTotal = principalScheduled + extra;
    let nextBalance = balance - principalTotal;
    if (nextBalance < eps) nextBalance = 0;

    const paymentTotal = installment + extra;

    if (!firstInstallment) {
      firstInstallment = installment;
    }

    totalInterest += interest;
    totalPaid += paymentTotal;

    rows.push({
      period,
      installment,
      interest,
      principalScheduled,
      extra,
      paymentTotal,
      balance: nextBalance,
    });

    balance = nextBalance;
  }

  return {
    rows,
    firstInstallment,
    totalInterest,
    totalPaid,
    effectivePeriods: rows.length,
  };
}

function clearResults() {
  cuotaBaseEl.textContent = "$0,00";
  cuotaConEl.textContent = "$0,00";
  interesBaseEl.textContent = "$0,00";
  interesConEl.textContent = "$0,00";
  ahorroInteresEl.textContent = "$0,00";
  plazoBaseEl.textContent = "0 meses";
  plazoConEl.textContent = "0 meses";
  ahorroPlazoEl.textContent = "0 meses";
  totalBaseEl.textContent = "$0,00";
  totalConEl.textContent = "$0,00";
  tablaResumenEl.textContent = "Ingresa los datos para ver la tabla.";
  noteEl.textContent = "Ingresa los datos para calcular la tabla.";
  tablaBodyEl.innerHTML = "";
}

function renderTable(rows) {
  tablaBodyEl.innerHTML = "";
  rows.forEach((rowData) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${rowData.period}</td>
      <td>${formatMoney(rowData.installment)}</td>
      <td>${formatMoney(rowData.interest)}</td>
      <td>${formatMoney(rowData.principalScheduled)}</td>
      <td>${formatMoney(rowData.extra)}</td>
      <td>${formatMoney(rowData.paymentTotal)}</td>
      <td>${formatMoney(rowData.balance)}</td>
    `;
    tablaBodyEl.appendChild(row);
  });
}

function calculate() {
  const amount = parseMoneyInput(montoInput.value);
  const annualRate = Number(tasaInput.value);
  const termValue = Number(plazoInput.value);
  const termUnit = plazoUnidadInput.value;
  const method = metodoInput.value;
  const strategy = estrategiaInput.value;
  const extraAmount = parseMoneyInput(abonoExtraInput.value) || 0;
  const extraEvery = Math.max(1, Math.ceil(Number(abonoCadaInput.value) || 1));
  const extraStart = Math.max(1, Math.ceil(Number(abonoInicioInput.value) || 1));

  if (!amount || amount <= 0 || !termValue || termValue <= 0 || !Number.isFinite(annualRate)) {
    clearResults();
    return;
  }

  const periods = termUnit === "anios" ? Math.ceil(termValue * 12) : Math.ceil(termValue);
  const periodRate = computeMonthlyRate(annualRate);
  const extraEnabled = extraAmount > 0;

  const base = simulateSchedule({
    amount,
    periodRate,
    periods,
    method,
    strategy: "plazo",
    extraAmount: 0,
    extraEvery,
    extraStart,
  });

  const withExtra = simulateSchedule({
    amount,
    periodRate,
    periods,
    method,
    strategy,
    extraAmount: extraEnabled ? extraAmount : 0,
    extraEvery,
    extraStart,
  });

  const savedInterest = Math.max(0, base.totalInterest - withExtra.totalInterest);
  const savedPeriods = Math.max(0, base.effectivePeriods - withExtra.effectivePeriods);

  cuotaBaseEl.textContent = formatMoney(base.firstInstallment);
  cuotaConEl.textContent = formatMoney(withExtra.firstInstallment);
  interesBaseEl.textContent = formatMoney(base.totalInterest);
  interesConEl.textContent = formatMoney(withExtra.totalInterest);
  ahorroInteresEl.textContent = formatMoney(savedInterest);
  plazoBaseEl.textContent = toMonthsLabel(base.effectivePeriods);
  plazoConEl.textContent = toMonthsLabel(withExtra.effectivePeriods);
  ahorroPlazoEl.textContent = toMonthsLabel(savedPeriods);
  totalBaseEl.textContent = formatMoney(base.totalPaid);
  totalConEl.textContent = formatMoney(withExtra.totalPaid);

  const methodLabel = method === "fija" ? "cuotas fijas" : "amortización constante";
  const strategyLabel = strategy === "plazo" ? "disminución de plazo" : "disminución de cuota";

  tablaResumenEl.textContent =
    `Método ${methodLabel}. Tabla con ${withExtra.effectivePeriods} meses.` +
    (extraEnabled ? ` Se aplican abonos con ${strategyLabel}.` : " Sin abonos extraordinarios.");

  noteEl.textContent = extraEnabled
    ? `Ahorro estimado en intereses: ${formatMoney(savedInterest)}.`
    : "Define un abono extraordinario para estimar ahorro por prepago.";

  renderTable(withExtra.rows);
}

btnCalcular.addEventListener("click", calculate);

[
  montoInput,
  tasaInput,
  plazoInput,
  plazoUnidadInput,
  metodoInput,
  estrategiaInput,
  abonoExtraInput,
  abonoCadaInput,
  abonoInicioInput,
].forEach((input) => {
  input.addEventListener("input", () => {
    if (tablaBodyEl.children.length) {
      calculate();
    }
  });
});

setupMoneyInputs();
clearResults();
