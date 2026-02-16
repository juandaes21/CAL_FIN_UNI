const ingresoInput = document.getElementById("ingreso");
const monedaSelect = document.getElementById("moneda-pension");
const frecuenciaIngresoInput = document.getElementById("frecuencia-ingreso");
const tipoRetiroInput = document.getElementById("tipo-retiro");
const duracionRetiroInput = document.getElementById("duracion-retiro");
const aniosRetiroInput = document.getElementById("anios-retiro");
const aniosAhorroInput = document.getElementById("anios-ahorro");
const rentInput = document.getElementById("rentabilidad-pension");
const inflacionInput = document.getElementById("inflacion-pension");
const conservadorInput = document.getElementById("conservador-pension");
const frecuenciaInput = document.getElementById("frecuencia");
const btn = document.getElementById("calcular-pension");

const aporteLabelEl = document.getElementById("aporte-label");
const aporteEl = document.getElementById("aporte-requerido");
const aporteUsdEl = document.getElementById("aporte-requerido-usd");
const ingresoAjustadoEl = document.getElementById("ingreso-ajustado");
const ingresoAjustadoUsdEl = document.getElementById("ingreso-ajustado-usd");
const capitalRequeridoEl = document.getElementById("capital-requerido");
const capitalRequeridoUsdEl = document.getElementById("capital-requerido-usd");
const totalAportadoEl = document.getElementById("total-aportado");
const totalAportadoUsdEl = document.getElementById("total-aportado-usd");
const totalRetirosEl = document.getElementById("total-retiros");
const totalRetirosUsdEl = document.getElementById("total-retiros-usd");
const trmValorEl = document.getElementById("trm-valor-pension");
const tasaPeriodoEl = document.getElementById("tasa-periodo");
const tablaResumenEl = document.getElementById("tabla-pension-resumen");
const tablaBody = document.getElementById("tabla-pension-body");
const pensionNoteEl = document.getElementById("pension-note");

const BANREP_URL =
  "https://suameca.banrep.gov.co/estadisticas-economicas/informacionSerie/1/tasa_cambio_peso_colombiano_trm_dolar_usd/";
const DATOS_URL =
  "https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20DESC";

const moneyFmt = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFmt = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

let trmData = null;

function formatMoney(value) {
  return `$${moneyFmt.format(value)}`;
}

function formatUsd(value) {
  return usdFmt.format(value);
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

function parseLocaleNumber(value) {
  if (!value) return null;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDateLabel(value) {
  if (!value) return "";
  if (value.includes("T")) {
    return value.split("T")[0];
  }
  return value;
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
    // Ignore and fallback.
  }

  try {
    const response = await fetch(DATOS_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("TRM fetch failed");
    const data = await response.json();
    if (data && data[0]) {
      const value = Number(data[0].valor);
      return {
        value: Number.isFinite(value) ? value : null,
        date: data[0].vigenciadesde ? formatDateLabel(data[0].vigenciadesde) : "",
        source: "Banrep / datos.gov.co",
      };
    }
  } catch (err) {
    return null;
  }

  return null;
}

function updateTrmUI() {
  if (trmData && trmData.value) {
    trmValorEl.textContent = `${moneyFmt.format(trmData.value)} COP/USD`;
  } else {
    trmValorEl.textContent = "No disponible";
  }
}

function computeMonthlyRate(annualRate) {
  if (!Number.isFinite(annualRate) || annualRate <= 0) return 0;
  return Math.pow(1 + annualRate / 100, 1 / 12) - 1;
}

function computeAnnualRate(annualRate) {
  if (!Number.isFinite(annualRate) || annualRate <= 0) return 0;
  return annualRate / 100;
}

function computeCapitalRequiredTerm(periods, rate, withdrawalFn) {
  let capital = 0;
  for (let i = periods; i >= 1; i -= 1) {
    const retiro = withdrawalFn(i);
    capital = retiro + capital / (1 + rate);
  }
  return capital;
}

function sumWithdrawals(periods, withdrawalFn) {
  let total = 0;
  for (let i = 1; i <= periods; i += 1) {
    total += withdrawalFn(i);
  }
  return total;
}

function clearTable() {
  tablaBody.innerHTML = "";
}

function updateRetiroFields() {
  const isPerpetua = tipoRetiroInput.value === "perpetua";
  duracionRetiroInput.disabled = isPerpetua;
}

function calculate() {
  const ingresoBase = parseMoneyInput(ingresoInput.value);
  const currency = monedaSelect.value;
  const frecuenciaIngreso = frecuenciaIngresoInput.value;
  const tipoRetiro = tipoRetiroInput.value;
  const duracionRetiro = Number(duracionRetiroInput.value);
  const aniosRetiro = Number(aniosRetiroInput.value);
  const aniosAhorro = Number(aniosAhorroInput.value);
  const rentabilidad = Number(rentInput.value);
  const inflacion = Number(inflacionInput.value);
  const conservador = Number(conservadorInput.value);
  const frecuenciaAporte = frecuenciaInput.value;

  if (!ingresoBase || !aniosRetiro || !aniosAhorro) {
    aporteEl.textContent = "$0,00";
    aporteUsdEl.textContent = "US$0.00";
    ingresoAjustadoEl.textContent = "$0,00";
    ingresoAjustadoUsdEl.textContent = "US$0.00";
    capitalRequeridoEl.textContent = "$0,00";
    capitalRequeridoUsdEl.textContent = "US$0.00";
    totalAportadoEl.textContent = "$0,00";
    totalAportadoUsdEl.textContent = "US$0.00";
    totalRetirosEl.textContent = "$0,00";
    totalRetirosUsdEl.textContent = "US$0.00";
    tasaPeriodoEl.textContent = "0%";
    tablaResumenEl.textContent = "Ingresa los datos para ver la tabla.";
    pensionNoteEl.textContent = "Ingresa los datos para ver el resultado.";
    clearTable();
    return;
  }

  if (currency === "USD" && (!trmData || !trmData.value)) {
    pensionNoteEl.textContent = "TRM no disponible para calcular en dolares.";
    aporteEl.textContent = "$0,00";
    aporteUsdEl.textContent = "US$0.00";
    ingresoAjustadoEl.textContent = "$0,00";
    ingresoAjustadoUsdEl.textContent = "US$0.00";
    capitalRequeridoEl.textContent = "$0,00";
    capitalRequeridoUsdEl.textContent = "US$0.00";
    totalAportadoEl.textContent = "$0,00";
    totalAportadoUsdEl.textContent = "US$0.00";
    totalRetirosEl.textContent = "$0,00";
    totalRetirosUsdEl.textContent = "US$0.00";
    tasaPeriodoEl.textContent = "0%";
    tablaResumenEl.textContent = "Ingresa los datos para ver la tabla.";
    clearTable();
    return;
  }

  const ingresoCop = currency === "USD" ? ingresoBase * trmData.value : ingresoBase;

  const ingresoMensual = frecuenciaIngreso === "mensual";
  const aporteMensual = frecuenciaAporte === "mensual";

  const periodosRetiroIngreso = ingresoMensual ? Math.ceil(aniosRetiro * 12) : Math.ceil(aniosRetiro);
  const periodosRetiroAporte = aporteMensual ? Math.ceil(aniosRetiro * 12) : Math.ceil(aniosRetiro);
  const periodosAhorro = aporteMensual ? Math.ceil(aniosAhorro * 12) : Math.ceil(aniosAhorro);
  const periodosAporte = Math.min(periodosAhorro, periodosRetiroAporte);
  const periodosCrecimiento = Math.max(0, periodosRetiroAporte - periodosAporte);

  const tasaIngreso = ingresoMensual ? computeMonthlyRate(rentabilidad) : computeAnnualRate(rentabilidad);
  const tasaAporte = aporteMensual ? computeMonthlyRate(rentabilidad) : computeAnnualRate(rentabilidad);
  const conservadorAnnual = inflacion + (Number.isFinite(conservador) ? conservador : 0);
  const tasaRetiro = ingresoMensual
    ? computeMonthlyRate(conservadorAnnual)
    : computeAnnualRate(conservadorAnnual);
  const tasaInflacionIngreso = ingresoMensual
    ? computeMonthlyRate(inflacion)
    : computeAnnualRate(inflacion);
  const tasaRetiroTabla = aporteMensual
    ? computeMonthlyRate(conservadorAnnual)
    : computeAnnualRate(conservadorAnnual);

  const ingresoAjustado = ingresoCop * Math.pow(1 + tasaInflacionIngreso, periodosRetiroIngreso);
  const retiroEnPeriodo = (i) => {
    if (i <= 0) return 0;

    if (aporteMensual && ingresoMensual) {
      return ingresoAjustado * Math.pow(1 + tasaInflacionIngreso, i - 1);
    }

    if (aporteMensual && !ingresoMensual) {
      if ((i - 1) % 12 !== 0) return 0;
      const anioRetiro = Math.floor((i - 1) / 12) + 1;
      return ingresoAjustado * Math.pow(1 + tasaInflacionIngreso, anioRetiro - 1);
    }

    if (!aporteMensual && ingresoMensual) {
      let retiroAnual = 0;
      const inicioMes = (i - 1) * 12;
      for (let m = 0; m < 12; m += 1) {
        retiroAnual += ingresoAjustado * Math.pow(1 + tasaInflacionIngreso, inicioMes + m);
      }
      return retiroAnual;
    }

    return ingresoAjustado * Math.pow(1 + tasaInflacionIngreso, i - 1);
  };

  let capitalRequerido = 0;
  let nota = "";
  let totalRetiros = null;

  if (tipoRetiro === "perpetua") {
    // For inflation-indexed withdrawals, perpetuity must be discounted at the
    // net rate over inflation (real spread), not at the full nominal return.
    const tasaNetaSobreInflacion =
      (1 + tasaRetiro) / (1 + tasaInflacionIngreso) - 1;

    if (tasaNetaSobreInflacion <= 0) {
      capitalRequerido = 0;
      nota =
        "Para retiro perpetuo, el spread sobre inflacion debe ser mayor a 0.";
    } else {
      // First retirement withdrawal happens at the beginning of the period.
      capitalRequerido =
        (ingresoAjustado * (1 + tasaNetaSobreInflacion)) /
        tasaNetaSobreInflacion;
    }
  } else {
    const periodosRetiroTabla = aporteMensual
      ? Math.ceil(duracionRetiro * 12)
      : Math.ceil(duracionRetiro);

    if (!periodosRetiroTabla || periodosRetiroTabla <= 0) {
      capitalRequerido = 0;
      nota = "La duracion del retiro debe ser mayor a 0.";
    } else {
      capitalRequerido = computeCapitalRequiredTerm(
        periodosRetiroTabla,
        tasaRetiroTabla,
        retiroEnPeriodo
      );
    }

    totalRetiros = periodosRetiroTabla
      ? sumWithdrawals(periodosRetiroTabla, retiroEnPeriodo)
      : null;
  }

  let aporte = 0;
  if (capitalRequerido > 0) {
    if (tasaAporte === 0) {
      aporte = periodosAporte > 0 ? capitalRequerido / periodosAporte : 0;
    } else {
      const acumulado = (Math.pow(1 + tasaAporte, periodosAporte) - 1) / tasaAporte;
      const crecimiento = Math.pow(1 + tasaAporte, periodosCrecimiento);
      const factor = acumulado * crecimiento;
      aporte = factor > 0 ? capitalRequerido / factor : 0;
    }
  }

  const totalAportado = aporte * periodosAporte;

  aporteLabelEl.textContent = `Aporte requerido (${aporteMensual ? "mensual" : "anual"}) (COP)`;
  aporteEl.textContent = formatMoney(aporte);
  ingresoAjustadoEl.textContent = formatMoney(ingresoAjustado);
  capitalRequeridoEl.textContent = formatMoney(capitalRequerido);
  totalAportadoEl.textContent = formatMoney(totalAportado);
  totalRetirosEl.textContent = totalRetiros === null ? "No aplica" : formatMoney(totalRetiros);
  tasaPeriodoEl.textContent = `${percentFmt.format(tasaAporte * 100)}%`;

  if (trmData && trmData.value) {
    aporteUsdEl.textContent = formatUsd(aporte / trmData.value);
    ingresoAjustadoUsdEl.textContent = formatUsd(ingresoAjustado / trmData.value);
    capitalRequeridoUsdEl.textContent = formatUsd(capitalRequerido / trmData.value);
    totalAportadoUsdEl.textContent = formatUsd(totalAportado / trmData.value);
    totalRetirosUsdEl.textContent =
      totalRetiros === null ? "No aplica" : formatUsd(totalRetiros / trmData.value);
  } else {
    aporteUsdEl.textContent = "US$0.00";
    ingresoAjustadoUsdEl.textContent = "US$0.00";
    capitalRequeridoUsdEl.textContent = "US$0.00";
    totalAportadoUsdEl.textContent = "US$0.00";
    totalRetirosUsdEl.textContent = "US$0.00";
  }

  const retiroLabel =
    tipoRetiro === "perpetua"
      ? "Retiro perpetuo"
      : `Retiro por ${duracionRetiro || 0} anios`;

  pensionNoteEl.textContent =
    nota || `${retiroLabel}. Capital se proyecta con rentabilidad conservadora desde el retiro.`;
  const retiroDisplayPeriods =
    tipoRetiro === "perpetua"
      ? aporteMensual
        ? 120
        : 30
      : aporteMensual
        ? Math.ceil(duracionRetiro * 12)
        : Math.ceil(duracionRetiro);

  const tablaPeriodosAntesRetiro = periodosRetiroAporte;
  const tablaPeriodosRetiro = retiroDisplayPeriods || 0;
  const totalTablaPeriodos = tablaPeriodosAntesRetiro + tablaPeriodosRetiro;
  tablaResumenEl.textContent =
    tipoRetiro === "perpetua"
      ? `Aportes durante ${periodosAporte} periodos. Se muestran ${tablaPeriodosRetiro} periodos de retiro.`
      : `Aportes durante ${periodosAporte} periodos.`;

  clearTable();
  let capitalSin = 0;
  let capitalCon = 0;

  for (let i = 1; i <= totalTablaPeriodos; i += 1) {
    const beforeRetiro = i <= tablaPeriodosAntesRetiro;
    const aportePeriodo = i <= periodosAporte ? aporte : 0;
    const tasa = beforeRetiro ? tasaAporte : tasaRetiroTabla;
    let retiroPeriodo = 0;

    if (!beforeRetiro) {
      retiroPeriodo = retiroEnPeriodo(i - tablaPeriodosAntesRetiro);
    }

    capitalSin = capitalSin + aportePeriodo - retiroPeriodo;
    capitalCon = (capitalCon - retiroPeriodo) * (1 + tasa) + aportePeriodo;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i}</td>
      <td>${formatMoney(aportePeriodo)}</td>
      <td>${formatMoney(retiroPeriodo)}</td>
      <td>${formatMoney(capitalSin)}</td>
      <td>${formatMoney(capitalCon)}</td>
    `;
    tablaBody.appendChild(row);
  }
}

btn.addEventListener("click", calculate);
[
  ingresoInput,
  monedaSelect,
  frecuenciaIngresoInput,
  tipoRetiroInput,
  duracionRetiroInput,
  aniosRetiroInput,
  aniosAhorroInput,
  rentInput,
  inflacionInput,
  conservadorInput,
  frecuenciaInput,
].forEach((input) => {
  input.addEventListener("input", () => {
    if (tablaBody.children.length) {
      calculate();
    }
  });
});

tipoRetiroInput.addEventListener("change", () => {
  updateRetiroFields();
  calculate();
});

monedaSelect.addEventListener("change", () => {
  calculate();
});

async function init() {
  updateRetiroFields();
  setupMoneyInputs();
  trmData = await fetchTRM();
  updateTrmUI();
  calculate();
}

init();
