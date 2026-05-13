const valorAptoInput = document.getElementById("bt-valor-apto");
const horizonteInput = document.getElementById("bt-horizonte");
const anioInicioInput = document.getElementById("bt-anio-inicio");
const anioFinInput = document.getElementById("bt-anio-fin");
const timelineStartInput = document.getElementById("bt-timeline-start");
const timelineEndInput = document.getElementById("bt-timeline-end");
const timelineStartLabel = document.getElementById("bt-timeline-start-label");
const timelineEndLabel = document.getElementById("bt-timeline-end-label");
const limitMinLabel = document.getElementById("bt-limit-min");
const limitMaxLabel = document.getElementById("bt-limit-max");
const cuotaInicialInput = document.getElementById("bt-cuota-inicial");
const tipoSaldoInput = document.getElementById("bt-tipo-saldo");
const tasaCreditoInput = document.getElementById("bt-tasa-credito");
const plazoCreditoInput = document.getElementById("bt-plazo-credito");
const valorizacionInput = document.getElementById("bt-valorizacion");
const costosVentaInput = document.getElementById("bt-costos-venta");
const benchmarkUsdInput = document.getElementById("bt-benchmark-usd");
const calcularBtn = document.getElementById("bt-calcular");
const descargarPdfBtn = document.getElementById("bt-descargar-pdf");

const warningEl = document.getElementById("bt-warning");
const valorizacionNoteEl = document.getElementById("bt-valorizacion-note");
const noteEl = document.getElementById("bt-note");
const resumenEjecutivoEl = document.getElementById("bt-resumen-ejecutivo");
const cohortesEl = document.getElementById("bt-cohortes");
const ganaUsdEl = document.getElementById("bt-gana-usd");
const ganaAptoEl = document.getElementById("bt-gana-apto");
const empateEl = document.getElementById("bt-empate");
const ventajaPromedioEl = document.getElementById("bt-ventaja-promedio");
const mejorCuentaEl = document.getElementById("bt-mejor-cuenta");
const mejorAptoEl = document.getElementById("bt-mejor-apto");
const tablaResumenEl = document.getElementById("bt-tabla-resumen");
const tablaBodyEl = document.getElementById("bt-tabla-body");

const DATOS_TRM_ANUALES_URL =
  "https://www.datos.gov.co/resource/32sa-8pi3.json?$select=date_extract_y(vigenciadesde)%20as%20anio,avg(valor)%20as%20trm_prom&$group=anio&$order=anio%20ASC";

const BENCHMARKS = {
  SPX: {
    label: "SPX / S&P 500",
  },
  NASDAQ: {
    label: "Nasdaq Composite",
  },
};

const APPRECIATION_SOURCE = {
  bogotaSoachaPct: 9.02,
  medellinAmPct: 8.77,
  caliAuPct: 14.1,
  sourceLabel:
    "Promedio simple de Bogotá+Soacha, Medellín AM y Cali AU (IPVN DANE, IV trim 2025).",
};
APPRECIATION_SOURCE.avgPct =
  (APPRECIATION_SOURCE.bogotaSoachaPct + APPRECIATION_SOURCE.medellinAmPct + APPRECIATION_SOURCE.caliAuPct) / 3;

const moneyFmt = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

let trmYears = [];
let benchmarkReturnsByCode = {};
let lastBacktest = null;

function formatCop(value) {
  return `$${moneyFmt.format(value)}`;
}

function formatPct(value) {
  return `${moneyFmt.format(value)}%`;
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
  });
}

function setWarning(message) {
  if (!message) {
    warningEl.hidden = true;
    warningEl.textContent = "";
    return;
  }
  warningEl.hidden = false;
  warningEl.textContent = message;
}

function computeAnnualRate(ratePct) {
  if (!Number.isFinite(ratePct) || ratePct <= 0) return 0;
  return ratePct / 100;
}

function annuityPayment(principal, annualRate, years) {
  if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(years) || years <= 0) return 0;
  if (!annualRate || annualRate <= 0) return principal / years;
  const f = Math.pow(1 + annualRate, years);
  return principal * ((annualRate * f) / (f - 1));
}

async function fetchTrmAveragesByYear() {
  try {
    const response = await fetch(DATOS_TRM_ANUALES_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("TRM remote failed");
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error("TRM shape invalid");

    return rows
      .map((row) => ({ year: Number(row.anio), trm: Number(row.trm_prom) }))
      .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.trm) && row.trm > 0)
      .sort((a, b) => a.year - b.year);
  } catch (error) {
    const fallback = Array.isArray(window.TRM_ANNUAL_FALLBACK) ? window.TRM_ANNUAL_FALLBACK : [];
    return fallback
      .map((row) => ({ year: Number(row.anio), trm: Number(row.trm_prom) }))
      .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.trm) && row.trm > 0)
      .sort((a, b) => a.year - b.year);
  }
}

function loadBenchmarkAnnualReturns(code) {
  const all = window.BENCHMARK_ANNUAL_RETURNS || {};
  const raw = all[code];
  if (!raw || typeof raw !== "object") {
    return { returnsByYear: new Map(), minYear: null, maxYear: null };
  }

  const returnsByYear = new Map();
  Object.keys(raw).forEach((yearKey) => {
    const year = Number(yearKey);
    const value = Number(raw[yearKey]);
    if (Number.isFinite(year) && Number.isFinite(value)) {
      returnsByYear.set(year, value);
    }
  });

  const years = Array.from(returnsByYear.keys()).sort((a, b) => a - b);
  return {
    returnsByYear,
    minYear: years[0] || null,
    maxYear: years[years.length - 1] || null,
  };
}

function clearResults() {
  cohortesEl.textContent = "0";
  ganaUsdEl.textContent = "0%";
  ganaAptoEl.textContent = "0%";
  empateEl.textContent = "0%";
  ventajaPromedioEl.textContent = "$0,00";
  mejorCuentaEl.textContent = "-";
  mejorAptoEl.textContent = "-";
  resumenEjecutivoEl.textContent = "Calcula para ver conclusión histórica.";
  tablaResumenEl.textContent = "Calcula para ver la tabla histórica.";
  tablaBodyEl.innerHTML = "";
  lastBacktest = null;
}

function validateInputs(input) {
  if (!Number.isFinite(input.valorAptoCop) || input.valorAptoCop <= 0) return "Ingresa un valor de apartamento válido.";
  if (!Number.isFinite(input.horizonte) || input.horizonte <= 0) return "Ingresa un horizonte válido.";
  if (!Number.isFinite(input.anioInicio) || !Number.isFinite(input.anioFin)) return "Ingresa años válidos.";
  if (input.anioInicio > input.anioFin) return "El año inicial no puede ser mayor que el año final.";
  if (!Number.isFinite(input.cuotaInicialPct) || input.cuotaInicialPct < 0 || input.cuotaInicialPct > 100) {
    return "La cuota inicial debe estar entre 0% y 100%.";
  }
  if (input.tipoSaldo === "credito") {
    if (!Number.isFinite(input.tasaCreditoPct) || input.tasaCreditoPct < 0) return "Ingresa una tasa de crédito válida.";
    if (!Number.isFinite(input.plazoCredito) || input.plazoCredito <= 0) return "Ingresa un plazo de crédito válido.";
  }
  if (!Number.isFinite(input.valorizacionPct)) return "No se pudo cargar la valorización promedio de grandes ciudades.";
  if (!Number.isFinite(input.costosVentaPct) || input.costosVentaPct < 0 || input.costosVentaPct >= 100) {
    return "Los costos de venta deben estar entre 0% y 99.99%.";
  }
  if (!BENCHMARKS[input.benchmarkCode]) return "Selecciona benchmark SPX o Nasdaq.";
  return null;
}

function simulateCohort({ startYear, horizon, trmByYear, benchmarkReturns, params }) {
  const {
    valorAptoCop,
    cuotaInicialPct,
    tipoSaldo,
    tasaCreditoPct,
    plazoCredito,
    valorizacionPct,
    costosVentaPct,
  } = params;

  const trmStart = trmByYear.get(startYear);
  const trmEnd = trmByYear.get(startYear + horizon);
  if (!Number.isFinite(trmStart) || !Number.isFinite(trmEnd)) return null;

  const down = valorAptoCop * (cuotaInicialPct / 100);
  const rem = Math.max(0, valorAptoCop - down);

  const valorizacion = computeAnnualRate(valorizacionPct);
  const creditRate = computeAnnualRate(tasaCreditoPct);

  const creditYears = tipoSaldo === "credito" ? plazoCredito : 0;
  const annualPayment = tipoSaldo === "credito" ? annuityPayment(rem, creditRate, creditYears) : 0;

  let debt = tipoSaldo === "credito" ? rem : 0;
  let aptoValue = valorAptoCop;
  let cuentaUsd = 0;

  for (let i = 0; i < horizon; i += 1) {
    const year = startYear + i;
    const trmYear = trmByYear.get(year);
    const usdReturn = benchmarkReturns.get(year);
    if (!Number.isFinite(trmYear) || !Number.isFinite(usdReturn)) return null;

    let outflow = 0;
    if (i === 0) {
      outflow += down;
      if (tipoSaldo === "contado") outflow += rem;
    }

    if (tipoSaldo === "credito" && i < creditYears && debt > 0) {
      const interest = debt * creditRate;
      const principal = Math.min(debt, Math.max(0, annualPayment - interest));
      debt -= principal;
      if (debt < 1e-6) debt = 0;
      outflow += interest + principal;
    }

    cuentaUsd = (cuentaUsd + outflow / trmYear) * (1 + usdReturn);
    aptoValue *= 1 + valorizacion;
  }

  const aptoNetoFinal = aptoValue * (1 - costosVentaPct / 100) - debt;
  const cuentaCopFinal = cuentaUsd * trmEnd;
  const diff = cuentaCopFinal - aptoNetoFinal;
  const winner = diff > 1 ? "Cuenta USD" : diff < -1 ? "Apartamento" : "Empate";

  return {
    startYear,
    endYear: startYear + horizon,
    trmStart,
    trmEnd,
    aptoNetoFinal,
    cuentaCopFinal,
    diff,
    winner,
  };
}

function renderRows(rows) {
  tablaBodyEl.innerHTML = "";
  rows.forEach((rowData) => {
    const tr = document.createElement("tr");
    const diffClass = rowData.diff >= 0 ? "value-positive" : "value-negative";
    tr.innerHTML = `
      <td>${rowData.startYear}</td>
      <td>${rowData.endYear}</td>
      <td>${moneyFmt.format(rowData.trmStart)}</td>
      <td>${moneyFmt.format(rowData.trmEnd)}</td>
      <td>${formatCop(rowData.aptoNetoFinal)}</td>
      <td>${formatCop(rowData.cuentaCopFinal)}</td>
      <td class="${diffClass}">${formatCop(rowData.diff)}</td>
      <td>${rowData.winner}</td>
    `;
    tablaBodyEl.appendChild(tr);
  });
}

function readInputs() {
  return {
    valorAptoCop: parseMoneyInput(valorAptoInput.value),
    horizonte: Number(horizonteInput.value),
    anioInicio: Number(anioInicioInput.value),
    anioFin: Number(anioFinInput.value),
    cuotaInicialPct: Number(cuotaInicialInput.value),
    tipoSaldo: tipoSaldoInput.value,
    tasaCreditoPct: Number(tasaCreditoInput.value),
    plazoCredito: Number(plazoCreditoInput.value),
    valorizacionPct: Number(valorizacionInput.value),
    costosVentaPct: Number(costosVentaInput.value),
    benchmarkCode: benchmarkUsdInput.value,
  };
}

function getBacktestYearLimits(input, trmMin, trmMax, benchMin, benchMax) {
  const minStart = Math.max(trmMin, benchMin);
  const maxStart = Math.min(trmMax - input.horizonte, benchMax - input.horizonte + 1);
  return { minStart, maxStart };
}

function updateTimelineLabels() {
  timelineStartLabel.textContent = `Inicio: ${timelineStartInput.value}`;
  timelineEndLabel.textContent = `Fin: ${timelineEndInput.value}`;
}

function syncTimelineFromYearInputs() {
  timelineStartInput.value = anioInicioInput.value || timelineStartInput.min;
  timelineEndInput.value = anioFinInput.value || timelineEndInput.max;
  updateTimelineLabels();
}

function applyTimelineToYearInputs() {
  anioInicioInput.value = timelineStartInput.value;
  anioFinInput.value = timelineEndInput.value;
  updateTimelineLabels();
}

function setDefaultYearsFromData(resetRange = false) {
  const bench = benchmarkReturnsByCode[benchmarkUsdInput.value];
  if (!trmYears.length || !bench || !bench.minYear || !bench.maxYear) return;

  const trmSpan = trmYears[trmYears.length - 1].year - trmYears[0].year;
  const benchSpan = bench.maxYear - bench.minYear;
  const maxHorizon = Math.max(1, Math.min(trmSpan, benchSpan));
  horizonteInput.max = String(maxHorizon);
  const defaultHorizon = Math.min(10, maxHorizon);
  if (!horizonteInput.value || Number(horizonteInput.value) < 1) {
    horizonteInput.value = String(defaultHorizon);
  }
  if (Number(horizonteInput.value) > maxHorizon) {
    horizonteInput.value = String(maxHorizon);
  }

  const horizon = Number(horizonteInput.value) || defaultHorizon;
  const limits = getBacktestYearLimits(
    { horizonte: horizon },
    trmYears[0].year,
    trmYears[trmYears.length - 1].year,
    bench.minYear,
    bench.maxYear
  );

  if (limits.minStart > limits.maxStart) {
    noteEl.textContent = "No hay rango de años compatible con el horizonte actual.";
    return;
  }

  timelineStartInput.min = String(limits.minStart);
  timelineStartInput.max = String(limits.maxStart);
  timelineEndInput.min = String(limits.minStart);
  timelineEndInput.max = String(limits.maxStart);
  limitMinLabel.textContent = String(limits.minStart);
  limitMaxLabel.textContent = String(limits.maxStart);

  if (resetRange) {
    anioInicioInput.value = String(limits.minStart);
    anioFinInput.value = String(limits.maxStart);
  } else {
    const currentStart = Number(anioInicioInput.value) || limits.minStart;
    const currentEnd = Number(anioFinInput.value) || limits.maxStart;
    anioInicioInput.value = String(Math.min(Math.max(currentStart, limits.minStart), limits.maxStart));
    anioFinInput.value = String(Math.min(Math.max(currentEnd, limits.minStart), limits.maxStart));
    if (Number(anioInicioInput.value) > Number(anioFinInput.value)) {
      anioFinInput.value = anioInicioInput.value;
    }
  }
  syncTimelineFromYearInputs();

  noteEl.textContent =
    `Backtest listo. Rango máximo por cobertura histórica: ${limits.minStart}-${limits.maxStart}. ` +
    `(${BENCHMARKS[benchmarkUsdInput.value].label}). Horizonte máximo permitido: ${maxHorizon} años.`;
}

function toggleCreditInputs() {
  const isCredit = tipoSaldoInput.value === "credito";
  tasaCreditoInput.disabled = !isCredit;
  plazoCreditoInput.disabled = !isCredit;
}

function runBacktest() {
  const input = readInputs();
  const error = validateInputs(input);
  if (error) {
    setWarning(error);
    noteEl.textContent = "Corrige los parámetros para ejecutar el backtest.";
    clearResults();
    return;
  }

  if (!trmYears.length) {
    setWarning("No hay datos históricos de TRM disponibles.");
    clearResults();
    return;
  }

  const bench = benchmarkReturnsByCode[input.benchmarkCode];
  if (!bench || !bench.returnsByYear || !bench.returnsByYear.size) {
    setWarning("No hay datos del benchmark seleccionado en este momento.");
    clearResults();
    return;
  }

  const trmByYear = new Map(trmYears.map((x) => [x.year, x.trm]));
  const limits = getBacktestYearLimits(
    input,
    trmYears[0].year,
    trmYears[trmYears.length - 1].year,
    bench.minYear,
    bench.maxYear
  );

  if (limits.minStart > limits.maxStart) {
    setWarning("No hay solapamiento entre datos TRM, benchmark y horizonte.");
    clearResults();
    return;
  }

  const start = Math.max(input.anioInicio, limits.minStart);
  const end = Math.min(input.anioFin, limits.maxStart);

  if (start > end) {
    setWarning(
      `Fechas no backtesteables. Rango disponible con ${BENCHMARKS[input.benchmarkCode].label}: ` +
      `${limits.minStart}-${limits.maxStart}.`
    );
    clearResults();
    return;
  }

  if (start !== input.anioInicio || end !== input.anioFin) {
    setWarning(`Rango ajustado automáticamente a ${start}-${end} por cobertura histórica.`);
  } else {
    setWarning("");
  }

  const rows = [];
  for (let year = start; year <= end; year += 1) {
    const row = simulateCohort({
      startYear: year,
      horizon: input.horizonte,
      trmByYear,
      benchmarkReturns: bench.returnsByYear,
      params: input,
    });
    if (row) rows.push(row);
  }

  if (!rows.length) {
    setWarning("No fue posible construir cohortes válidas en ese rango.");
    clearResults();
    return;
  }

  const total = rows.length;
  const usdWins = rows.filter((r) => r.winner === "Cuenta USD").length;
  const aptoWins = rows.filter((r) => r.winner === "Apartamento").length;
  const tie = total - usdWins - aptoWins;
  const avgDiff = rows.reduce((acc, r) => acc + r.diff, 0) / total;

  const bestForUsd = rows.reduce((best, row) => (row.diff > best.diff ? row : best), rows[0]);
  const bestForApto = rows.reduce((best, row) => (row.diff < best.diff ? row : best), rows[0]);

  cohortesEl.textContent = String(total);
  ganaUsdEl.textContent = formatPct((usdWins / total) * 100);
  ganaAptoEl.textContent = formatPct((aptoWins / total) * 100);
  empateEl.textContent = formatPct((tie / total) * 100);
  ventajaPromedioEl.textContent = formatCop(avgDiff);
  mejorCuentaEl.textContent = `${bestForUsd.startYear} (${formatCop(bestForUsd.diff)})`;
  mejorAptoEl.textContent = `${bestForApto.startYear} (${formatCop(bestForApto.diff)})`;

  const winnerText = avgDiff >= 0 ? "cuenta USD" : "apartamento";
  resumenEjecutivoEl.textContent =
    `Entre ${start} y ${end}, usando ${BENCHMARKS[input.benchmarkCode].label}, en promedio ganó ${winnerText} ` +
    `por ${formatCop(Math.abs(avgDiff))} a ${input.horizonte} años.`;

  tablaResumenEl.textContent =
    `Cohortes evaluadas: ${total}. Cobertura TRM ${trmYears[0].year}-${trmYears[trmYears.length - 1].year}, ` +
    `${BENCHMARKS[input.benchmarkCode].label} ${bench.minYear}-${bench.maxYear}.`;

  noteEl.textContent =
    `Cuenta USD con retornos anuales históricos de ${BENCHMARKS[input.benchmarkCode].label}. ` +
    `Valorización fija: ${valorizacionInput.value}% (${APPRECIATION_SOURCE.sourceLabel})`;

  renderRows(rows);

  lastBacktest = {
    generatedAt: new Date(),
    input,
    start,
    end,
    total,
    usdWins,
    aptoWins,
    tie,
    avgDiff,
    rows,
  };
}

function downloadPdf() {
  if (!lastBacktest) {
    noteEl.textContent = "Primero calcula el backtest para descargar el PDF.";
    return;
  }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    noteEl.textContent = "No se pudo cargar el generador de PDF.";
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text("Fides Financial - Backtest Comparativo", 14, 16);
  doc.setFontSize(10);
  doc.text(`Fecha de generación: ${lastBacktest.generatedAt.toLocaleString("es-CO")}`, 14, 23);

  const p = lastBacktest.input;
  const paramsRows = [
    ["Valor apto inicial", formatCop(p.valorAptoCop)],
    ["Horizonte", `${p.horizonte} años`],
    ["Rango año inicio", `${lastBacktest.start} - ${lastBacktest.end}`],
    ["Cuota inicial", `${p.cuotaInicialPct}%`],
    ["Saldo al comprar", p.tipoSaldo === "credito" ? "Crédito" : "Contado"],
    ["Tasa crédito E.A.", `${p.tasaCreditoPct}%`],
    ["Plazo crédito", `${p.plazoCredito} años`],
    ["Valorización apto", `${p.valorizacionPct}%`],
    ["Fuente valorización", APPRECIATION_SOURCE.sourceLabel],
    ["Costos de venta", `${p.costosVentaPct}%`],
    ["Benchmark cuenta USD", BENCHMARKS[p.benchmarkCode].label],
  ];

  doc.autoTable({
    startY: 30,
    head: [["Parámetro", "Valor"]],
    body: paramsRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [60, 106, 157] },
  });

  const summaryRows = [
    ["Resumen ejecutivo", resumenEjecutivoEl.textContent.trim()],
    ["Cohortes evaluadas", String(lastBacktest.total)],
    ["Cuenta USD gana", formatPct((lastBacktest.usdWins / lastBacktest.total) * 100)],
    ["Apartamento gana", formatPct((lastBacktest.aptoWins / lastBacktest.total) * 100)],
    ["Empate", formatPct((lastBacktest.tie / lastBacktest.total) * 100)],
    ["Ventaja promedio cuenta", formatCop(lastBacktest.avgDiff)],
  ];

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Resumen", "Valor"]],
    body: summaryRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [60, 106, 157] },
  });

  const rows = lastBacktest.rows.map((r) => [
    String(r.startYear),
    String(r.endYear),
    moneyFmt.format(r.trmStart),
    moneyFmt.format(r.trmEnd),
    formatCop(r.aptoNetoFinal),
    formatCop(r.cuentaCopFinal),
    formatCop(r.diff),
    r.winner,
  ]);

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Año inicio", "Año fin", "TRM inicio", "TRM fin", "Apto final", "Cuenta final", "Diferencia", "Ganador"]],
    body: rows,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [60, 106, 157] },
  });

  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`backtest-comparativo-${fileDate}.pdf`);
}

horizonteInput.addEventListener("change", () => {
  const max = Number(horizonteInput.max);
  if (Number(horizonteInput.value) > max) horizonteInput.value = String(max);
  setDefaultYearsFromData(false);
  applyTimelineToYearInputs();
});

benchmarkUsdInput.addEventListener("change", () => {
  setDefaultYearsFromData(false);
  applyTimelineToYearInputs();
});

anioInicioInput.addEventListener("change", syncTimelineFromYearInputs);
anioFinInput.addEventListener("change", syncTimelineFromYearInputs);

timelineStartInput.addEventListener("input", () => {
  if (Number(timelineStartInput.value) > Number(timelineEndInput.value)) {
    timelineEndInput.value = timelineStartInput.value;
  }
  applyTimelineToYearInputs();
});

timelineEndInput.addEventListener("input", () => {
  if (Number(timelineEndInput.value) < Number(timelineStartInput.value)) {
    timelineStartInput.value = timelineEndInput.value;
  }
  applyTimelineToYearInputs();
});

tipoSaldoInput.addEventListener("change", toggleCreditInputs);
calcularBtn.addEventListener("click", runBacktest);
if (descargarPdfBtn) {
  descargarPdfBtn.addEventListener("click", downloadPdf);
}

async function init() {
  setupMoneyInputs();
  toggleCreditInputs();

  valorizacionInput.value = APPRECIATION_SOURCE.avgPct.toFixed(2);
  valorizacionNoteEl.textContent =
    `Valorización fija usada: ${APPRECIATION_SOURCE.avgPct.toFixed(2)}% ` +
    `(${APPRECIATION_SOURCE.sourceLabel})`;

  noteEl.textContent = "Cargando TRM histórica y benchmarks...";

  const trm = await fetchTrmAveragesByYear();
  const spx = loadBenchmarkAnnualReturns("SPX");
  const nasdaq = loadBenchmarkAnnualReturns("NASDAQ");

  trmYears = trm;
  benchmarkReturnsByCode = {
    SPX: spx,
    NASDAQ: nasdaq,
  };

  setDefaultYearsFromData(true);
  applyTimelineToYearInputs();
  clearResults();
  setWarning("");
}

init();
