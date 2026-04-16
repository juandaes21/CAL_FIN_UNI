const montoInicialInput = document.getElementById("monto-inicial");
const aporteDiarioInput = document.getElementById("aporte-diario");
const tasaEaInput = document.getElementById("tasa-ea");
const plazoDiasInput = document.getElementById("plazo-dias");
const vistaTablaInput = document.getElementById("vista-tabla-rend");
const btnCalcular = document.getElementById("calcular-rend");

const saldoFinalEl = document.getElementById("saldo-final-rend");
const totalAportadoEl = document.getElementById("total-aportado-rend");
const interesEl = document.getElementById("interes-rend");
const tasaDiariaEl = document.getElementById("tasa-diaria-rend");
const noteEl = document.getElementById("rend-note");
const tablaResumenEl = document.getElementById("tabla-rend-resumen");
const tablaBodyEl = document.getElementById("tabla-rend-body");
const colPeriodoEl = document.getElementById("col-periodo-rend");

const moneyFmt = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFmt = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
});

function formatMoney(value) {
  return `$${moneyFmt.format(value)}`;
}

function formatPercent(value) {
  return `${percentFmt.format(value)}%`;
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
    normalized = parts.length === 2 && parts[1].length <= 2 ? raw.replace(",", ".") : raw.replace(/,/g, "");
  } else if (hasDot) {
    const parts = raw.split(".");
    normalized = parts.length === 2 && parts[1].length <= 2 ? raw : raw.replace(/\./g, "");
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
      const formatted = formatMoneyInput(input.value);
      if (formatted) {
        input.value = formatted;
        input.setSelectionRange(formatted.length, formatted.length);
      }
    });
    input.addEventListener("blur", () => {
      const formatted = formatMoneyInput(input.value);
      if (formatted !== "") input.value = formatted;
    });
  });
}

function computeDailyRate(annualPct) {
  if (!Number.isFinite(annualPct) || annualPct <= 0) return 0;
  return Math.pow(1 + annualPct / 100, 1 / 365) - 1;
}

function clearResults() {
  saldoFinalEl.textContent = "$0,00";
  totalAportadoEl.textContent = "$0,00";
  interesEl.textContent = "$0,00";
  tasaDiariaEl.textContent = "0,0000%";
  noteEl.textContent = "Ingresa datos para calcular.";
  tablaResumenEl.textContent = "Ingresa los datos para ver la tabla.";
  tablaBodyEl.innerHTML = "";
  colPeriodoEl.textContent = vistaTablaInput.value === "mensual" ? "Mes" : "Dia";
}

function buildTimeline(days, initialAmount, dailyContribution, dailyRate) {
  const rows = [];
  let balance = initialAmount;
  let totalContrib = initialAmount;
  let totalInterest = 0;

  for (let day = 1; day <= days; day += 1) {
    const contribution = dailyContribution;
    balance += contribution;

    const periodInterest = balance * dailyRate;
    balance += periodInterest;

    totalContrib += contribution;
    totalInterest += periodInterest;

    rows.push({
      period: day,
      contribution,
      periodInterest,
      balance,
    });
  }

  return { rows, totalContrib, totalInterest, finalBalance: balance };
}

function renderDailyRows(rows) {
  colPeriodoEl.textContent = "Dia";
  tablaBodyEl.innerHTML = "";

  rows.forEach((rowData) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${rowData.period}</td>
      <td>${formatMoney(rowData.contribution)}</td>
      <td>${formatMoney(rowData.periodInterest)}</td>
      <td>${formatMoney(rowData.balance)}</td>
    `;
    tablaBodyEl.appendChild(tr);
  });
}

function renderMonthlyRows(rows) {
  colPeriodoEl.textContent = "Mes";
  tablaBodyEl.innerHTML = "";

  const monthly = new Map();
  rows.forEach((rowData) => {
    const month = Math.ceil(rowData.period / 30);
    const acc = monthly.get(month) || {
      period: month,
      contribution: 0,
      periodInterest: 0,
      balance: 0,
    };
    acc.contribution += rowData.contribution;
    acc.periodInterest += rowData.periodInterest;
    acc.balance = rowData.balance;
    monthly.set(month, acc);
  });

  Array.from(monthly.values()).forEach((rowData) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${rowData.period}</td>
      <td>${formatMoney(rowData.contribution)}</td>
      <td>${formatMoney(rowData.periodInterest)}</td>
      <td>${formatMoney(rowData.balance)}</td>
    `;
    tablaBodyEl.appendChild(tr);
  });
}

function calculate() {
  const initialAmount = parseMoneyInput(montoInicialInput.value) || 0;
  const dailyContribution = parseMoneyInput(aporteDiarioInput.value) || 0;
  const annualRate = Number(tasaEaInput.value);
  const days = Math.ceil(Number(plazoDiasInput.value));
  const tableView = vistaTablaInput.value;

  if (
    initialAmount < 0 ||
    dailyContribution < 0 ||
    !Number.isFinite(annualRate) ||
    annualRate < 0 ||
    !Number.isFinite(days) ||
    days <= 0
  ) {
    clearResults();
    return;
  }

  const dailyRate = computeDailyRate(annualRate);
  const sim = buildTimeline(days, initialAmount, dailyContribution, dailyRate);

  saldoFinalEl.textContent = formatMoney(sim.finalBalance);
  totalAportadoEl.textContent = formatMoney(sim.totalContrib);
  interesEl.textContent = formatMoney(sim.totalInterest);
  tasaDiariaEl.textContent = formatPercent(dailyRate * 100);

  tablaResumenEl.textContent =
    tableView === "mensual"
      ? `Vista mensual aproximada en bloques de 30 dias (${Math.ceil(days / 30)} mes(es)).`
      : `Vista diaria de ${days} dia(s).`;
  noteEl.textContent = "Calculo sin inflacion y sin retenciones.";

  if (tableView === "mensual") {
    renderMonthlyRows(sim.rows);
  } else {
    renderDailyRows(sim.rows);
  }
}

btnCalcular.addEventListener("click", calculate);

[
  montoInicialInput,
  aporteDiarioInput,
  tasaEaInput,
  plazoDiasInput,
  vistaTablaInput,
].forEach((input) => {
  input.addEventListener("input", () => {
    if (tablaBodyEl.children.length) calculate();
  });
  input.addEventListener("change", () => {
    if (tablaBodyEl.children.length) calculate();
  });
});

setupMoneyInputs();
clearResults();
