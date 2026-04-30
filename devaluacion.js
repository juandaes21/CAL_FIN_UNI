const montoBaseInput = document.getElementById("monto-base");
const monedaBaseInput = document.getElementById("moneda-base");
const trmInicialInput = document.getElementById("trm-inicial");
const devalAnualProyectadaInput = document.getElementById("deval-anual-proyectada");
const plazoAniosInput = document.getElementById("plazo-anios");
const btnUsarTrmActual = document.getElementById("usar-trm-actual");
const btnCalcular = document.getElementById("calcular-devaluacion");

const devalAcumuladaEl = document.getElementById("deval-acumulada");
const devalAnualizadaEl = document.getElementById("deval-anualizada");
const trmFinalProyectadaEl = document.getElementById("trm-final-proyectada");
const montoInicialLabelEl = document.getElementById("monto-inicial-label");
const montoInicialResEl = document.getElementById("monto-inicial-res");
const montoAjustadoLabelEl = document.getElementById("monto-ajustado-label");
const montoAjustadoResEl = document.getElementById("monto-ajustado-res");
const equivalenteInicialLabelEl = document.getElementById("equivalente-inicial-label");
const equivalenteInicialResEl = document.getElementById("equivalente-inicial-res");
const equivalenteFinalLabelEl = document.getElementById("equivalente-final-label");
const equivalenteFinalResEl = document.getElementById("equivalente-final-res");
const trmNoteEl = document.getElementById("devaluacion-trm-note");
const noteEl = document.getElementById("devaluacion-note");

const BANREP_URL =
  "https://suameca.banrep.gov.co/estadisticas-economicas/informacionSerie/1/tasa_cambio_peso_colombiano_trm_dolar_usd/";
const DATOS_URL =
  "https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20DESC";

const copFmt = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const pctFmt = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
});

let trmData = null;
let promedioDevaluacion15Anios = null;

function formatCOP(value) {
  return `$${copFmt.format(value)}`;
}

function formatUSD(value) {
  return usdFmt.format(value);
}

function formatPercent(decimalValue) {
  return `${pctFmt.format(decimalValue * 100)}%`;
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

function parseLocaleNumber(value) {
  if (!value) return null;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBanrepTRM(html) {
  const valueMatch = html.match(/(\d{1,3}(?:\.\d{3})*,\d{2})\s*COP\/USD/);
  const dateMatch = html.match(/(\d{2}\/\d{2}\/\d{4})/);
  if (!valueMatch) return null;
  const value = parseLocaleNumber(valueMatch[1]);
  if (!value) return null;
  return {
    value,
    date: dateMatch ? dateMatch[1] : "",
    source: "Banrep",
  };
}

async function fetchTRM() {
  try {
    const response = await fetch(BANREP_URL, { cache: "no-store" });
    if (response.ok) {
      const html = await response.text();
      const parsed = parseBanrepTRM(html);
      if (parsed) return parsed;
    }
  } catch (err) {
    // fallback
  }

  try {
    const response = await fetch(DATOS_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("TRM fetch failed");
    const data = await response.json();
    if (data && data[0]) {
      return {
        value: Number(data[0].valor),
        date: data[0].vigenciadesde || "",
        source: "Banrep / datos.gov.co",
      };
    }
  } catch (err) {
    return null;
  }

  return null;
}

async function fetchAverageDevaluation15Years() {
  const url =
    "https://www.datos.gov.co/resource/32sa-8pi3.json?$select=date_extract_y(vigenciadesde)%20as%20anio,avg(valor)%20as%20trm_prom&$group=anio&$order=anio%20ASC";

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length < 3) return null;

    const ordered = rows
      .map((row) => ({
        year: Number(row.anio),
        trm: Number(row.trm_prom),
      }))
      .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.trm) && row.trm > 0)
      .sort((a, b) => a.year - b.year);

    if (ordered.length < 3) return null;

    const changes = [];
    for (let i = 1; i < ordered.length; i += 1) {
      const prev = ordered[i - 1];
      const curr = ordered[i];
      const rate = curr.trm / prev.trm - 1;
      if (Number.isFinite(rate)) {
        changes.push({
          fromYear: prev.year,
          toYear: curr.year,
          rate,
        });
      }
    }

    if (!changes.length) return null;

    const last15 = changes.slice(-15);
    const avgRate = last15.reduce((acc, item) => acc + item.rate, 0) / last15.length;

    return {
      avgRate,
      periods: last15.length,
      fromYear: last15[0].fromYear,
      toYear: last15[last15.length - 1].toYear,
    };
  } catch (err) {
    return null;
  }
}

function updateTrmNote() {
  let baseMessage = "";
  if (trmData && trmData.value) {
    const dateLabel = trmData.date ? ` (${trmData.date})` : "";
    baseMessage = `TRM actual: ${copFmt.format(trmData.value)} COP/USD - ${trmData.source}${dateLabel}.`;
  } else {
    baseMessage = "TRM actual no disponible.";
  }

  if (promedioDevaluacion15Anios) {
    const avgLabel = (promedioDevaluacion15Anios.avgRate * 100).toFixed(2);
    trmNoteEl.textContent =
      `${baseMessage} ` +
      `Valor default de devaluacion anual: ${avgLabel}% (promedio ${promedioDevaluacion15Anios.periods} años, ` +
      `${promedioDevaluacion15Anios.fromYear}-${promedioDevaluacion15Anios.toYear}).`;
  } else {
    trmNoteEl.textContent = baseMessage;
  }
}

function updateCurrencyLabels(currency) {
  if (currency === "USD") {
    montoInicialLabelEl.textContent = "Monto base (USD)";
    montoAjustadoLabelEl.textContent = "Monto ajustado por devaluacion (USD)";
    equivalenteInicialLabelEl.textContent = "Equivalente inicial (COP)";
    equivalenteFinalLabelEl.textContent = "Equivalente final (COP)";
  } else {
    montoInicialLabelEl.textContent = "Monto base (COP)";
    montoAjustadoLabelEl.textContent = "Monto ajustado por devaluacion (COP)";
    equivalenteInicialLabelEl.textContent = "Equivalente inicial (USD)";
    equivalenteFinalLabelEl.textContent = "Equivalente final (USD)";
  }
}

function clearResults() {
  updateCurrencyLabels(monedaBaseInput.value);
  devalAcumuladaEl.textContent = "0,0000%";
  devalAnualizadaEl.textContent = "0,0000%";
  trmFinalProyectadaEl.textContent = "0,00";
  montoInicialResEl.textContent = monedaBaseInput.value === "USD" ? "US$0.00" : "$0,00";
  montoAjustadoResEl.textContent = monedaBaseInput.value === "USD" ? "US$0.00" : "$0,00";
  equivalenteInicialResEl.textContent = monedaBaseInput.value === "USD" ? "$0,00" : "US$0.00";
  equivalenteFinalResEl.textContent = monedaBaseInput.value === "USD" ? "$0,00" : "US$0.00";
  noteEl.textContent = "Ingresa los datos para calcular.";
}

function applyDefaultDevaluationInput() {
  if (!promedioDevaluacion15Anios) return;
  if (devalAnualProyectadaInput.value !== "") return;
  devalAnualProyectadaInput.value = (promedioDevaluacion15Anios.avgRate * 100).toFixed(2);
}

function calculate() {
  const amount = parseMoneyInput(montoBaseInput.value);
  const currency = monedaBaseInput.value;
  const trmInitial = Number(trmInicialInput.value);
  const devalAnnualPct = Number(devalAnualProyectadaInput.value);
  const years = Number(plazoAniosInput.value);

  updateCurrencyLabels(currency);

  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isFinite(trmInitial) ||
    trmInitial <= 0 ||
    !Number.isFinite(devalAnnualPct) ||
    devalAnnualPct <= -100 ||
    !Number.isFinite(years) ||
    years <= 0
  ) {
    clearResults();
    return;
  }

  const devalAnnual = devalAnnualPct / 100;
  const ratio = Math.pow(1 + devalAnnual, years);
  const trmFinal = trmInitial * ratio;
  const devalAccum = ratio - 1;
  const devalAnnualized = Math.pow(ratio, 1 / years) - 1;

  devalAcumuladaEl.textContent = formatPercent(devalAccum);
  devalAnualizadaEl.textContent = formatPercent(devalAnnualized);
  trmFinalProyectadaEl.textContent = copFmt.format(trmFinal);

  if (currency === "USD") {
    const adjustedUSD = amount / ratio;
    const equivalentCOPInitial = amount * trmInitial;
    const equivalentCOPFinal = amount * trmFinal;

    montoInicialResEl.textContent = formatUSD(amount);
    montoAjustadoResEl.textContent = formatUSD(adjustedUSD);
    equivalenteInicialResEl.textContent = formatCOP(equivalentCOPInitial);
    equivalenteFinalResEl.textContent = formatCOP(equivalentCOPFinal);
  } else {
    const adjustedCOP = amount * ratio;
    const equivalentUSDInitial = amount / trmInitial;
    const equivalentUSDFinal = amount / trmFinal;

    montoInicialResEl.textContent = formatCOP(amount);
    montoAjustadoResEl.textContent = formatCOP(adjustedCOP);
    equivalenteInicialResEl.textContent = formatUSD(equivalentUSDInitial);
    equivalenteFinalResEl.textContent = formatUSD(equivalentUSDFinal);
  }

  noteEl.textContent =
    currency === "USD"
      ? "Resultados principales mostrados en USD."
      : "Resultados principales mostrados en COP.";

  if (promedioDevaluacion15Anios) {
    const avgLabel = (promedioDevaluacion15Anios.avgRate * 100).toFixed(2);
    noteEl.textContent += ` Referencia: promedio ${promedioDevaluacion15Anios.periods} años (${promedioDevaluacion15Anios.fromYear}-${promedioDevaluacion15Anios.toYear}) = ${avgLabel}% anual.`;
  }
}

btnCalcular.addEventListener("click", calculate);

if (btnUsarTrmActual) {
  btnUsarTrmActual.addEventListener("click", () => {
    if (trmData && trmData.value) {
      trmInicialInput.value = trmData.value.toFixed(2);
      calculate();
    } else {
      noteEl.textContent = "TRM actual no disponible para autocompletar.";
    }
  });
}

[
  montoBaseInput,
  monedaBaseInput,
  trmInicialInput,
  devalAnualProyectadaInput,
  plazoAniosInput,
].forEach((input) => {
  input.addEventListener("input", () => {
    if (devalAcumuladaEl.textContent !== "0,0000%") {
      calculate();
    }
  });
  input.addEventListener("change", () => {
    if (devalAcumuladaEl.textContent !== "0,0000%") {
      calculate();
    }
  });
});

async function init() {
  setupMoneyInputs();
  trmData = await fetchTRM();
  promedioDevaluacion15Anios = await fetchAverageDevaluation15Years();
  updateTrmNote();
  applyDefaultDevaluationInput();
  clearResults();
}

init();
