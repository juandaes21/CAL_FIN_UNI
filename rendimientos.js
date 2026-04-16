const montoInicialInput = document.getElementById("monto-inicial");
const aporteDiarioInput = document.getElementById("aporte-diario");
const tasaEaInput = document.getElementById("tasa-ea");
const plazoDiasInput = document.getElementById("plazo-dias");
const vistaTablaInput = document.getElementById("vista-tabla-rend");
const btnCalcular = document.getElementById("calcular-rend");
const btnDescargarPdf = document.getElementById("descargar-rend-pdf");

const saldoFinalEl = document.getElementById("saldo-final-rend");
const totalAportadoEl = document.getElementById("total-aportado-rend");
const interesEl = document.getElementById("interes-rend");
const tasaDiariaEl = document.getElementById("tasa-diaria-rend");
const noteEl = document.getElementById("rend-note");
const tablaResumenEl = document.getElementById("tabla-rend-resumen");
const tablaBodyEl = document.getElementById("tabla-rend-body");
const colPeriodoEl = document.getElementById("col-periodo-rend");

let lastReportData = null;

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
  lastReportData = null;
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

function buildMonthlyRows(rows) {
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

  return Array.from(monthly.values());
}

function renderRows(rows, periodLabel) {
  colPeriodoEl.textContent = periodLabel;
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

  const displayRows = tableView === "mensual" ? buildMonthlyRows(sim.rows) : sim.rows;
  const periodLabel = tableView === "mensual" ? "Mes" : "Dia";
  renderRows(displayRows, periodLabel);

  lastReportData = {
    generatedAt: new Date(),
    params: {
      initialAmount,
      dailyContribution,
      annualRate,
      days,
      tableView,
    },
    results: {
      finalBalance: sim.finalBalance,
      totalContrib: sim.totalContrib,
      totalInterest: sim.totalInterest,
      dailyRate,
    },
    displayRows,
    periodLabel,
  };
}

function downloadPdfReport() {
  if (!lastReportData) {
    noteEl.textContent = "Primero calcula el escenario para poder descargar el PDF.";
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    noteEl.textContent = "No se pudo cargar el generador de PDF. Revisa tu conexion e intenta de nuevo.";
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const { generatedAt, params, results, displayRows, periodLabel } = lastReportData;
  const dateLabel = generatedAt.toLocaleString("es-CO");

  doc.setFontSize(14);
  doc.text("Fides Financial - Reporte de Rendimientos", 14, 16);
  doc.setFontSize(10);
  doc.text(`Fecha de generacion: ${dateLabel}`, 14, 23);

  doc.text("Parametros:", 14, 32);
  doc.text("Objetivo: proyectar crecimiento de cuenta de alta rentabilidad.", 14, 38);
  doc.text(`Monto inicial: ${formatMoney(params.initialAmount)}`, 14, 44);
  doc.text(`Aporte diario: ${formatMoney(params.dailyContribution)}`, 14, 50);
  doc.text(`Tasa efectiva anual: ${formatPercent(params.annualRate)}`, 14, 56);
  doc.text(`Plazo: ${params.days} dias`, 14, 62);
  doc.text(`Vista tabla: ${params.tableView === "mensual" ? "Mensual (30 dias)" : "Diaria"}`, 14, 68);

  doc.text("Resultados:", 14, 78);
  doc.text(`Saldo final: ${formatMoney(results.finalBalance)}`, 14, 84);
  doc.text(`Total aportado: ${formatMoney(results.totalContrib)}`, 14, 90);
  doc.text(`Intereses generados: ${formatMoney(results.totalInterest)}`, 14, 96);
  doc.text(`Tasa efectiva diaria: ${formatPercent(results.dailyRate * 100)}`, 14, 102);

  const tableHead = [[periodLabel, "Aporte", "Interes del periodo", "Saldo"]];
  const tableBody = displayRows.map((rowData) => [
    String(rowData.period),
    formatMoney(rowData.contribution),
    formatMoney(rowData.periodInterest),
    formatMoney(rowData.balance),
  ]);

  doc.autoTable({
    startY: 110,
    head: tableHead,
    body: tableBody,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [60, 106, 157] },
  });

  const filename = `reporte-rendimientos-${generatedAt.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

btnCalcular.addEventListener("click", calculate);
if (btnDescargarPdf) {
  btnDescargarPdf.addEventListener("click", downloadPdfReport);
}

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
