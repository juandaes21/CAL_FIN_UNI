const valorAptoInput = document.getElementById("valor-apto");
const horizonteAniosInput = document.getElementById("horizonte-anios");
const mesesConstruccionInput = document.getElementById("meses-construccion");
const cuotaInicialPctInput = document.getElementById("cuota-inicial-pct");
const tipoSaldoInput = document.getElementById("tipo-saldo");
const tasaCreditoInput = document.getElementById("tasa-credito");
const plazoCreditoInput = document.getElementById("plazo-credito");
const valorizacionAptoInput = document.getElementById("valorizacion-apto");
const costosVentaInput = document.getElementById("costos-venta");
const canonPctInput = document.getElementById("canon-pct");
const gastosCanonPctInput = document.getElementById("gastos-canon-pct");
const perfilCostosInput = document.getElementById("perfil-costos-apto");
const adminFactorPctInput = document.getElementById("admin-factor-pct");
const adminMensualInput = document.getElementById("admin-mensual");
const impuestosAnualesPctInput = document.getElementById("impuestos-anuales-pct");
const otrosCostosAnualesInput = document.getElementById("otros-costos-anuales");
const tasaCuentaUsdInput = document.getElementById("tasa-cuenta-usd");
const aporteAdicionalCuentaInput = document.getElementById("aporte-adicional-cuenta");
const trmInicialInput = document.getElementById("trm-inicial-comp");
const devalAnualInput = document.getElementById("deval-anual-comp");
const monedaPresentacionInput = document.getElementById("moneda-presentacion");
const btnUsarTrmActual = document.getElementById("usar-trm-actual-comp");
const btnCalcular = document.getElementById("calcular-comparativo");
const btnDescargarPdf = document.getElementById("descargar-comparativo-pdf");

const labelVentaEntregaEl = document.getElementById("lbl-venta-entrega");
const labelCuentaEntregaEl = document.getElementById("lbl-cuenta-entrega");
const labelVentaReinvertidaEl = document.getElementById("lbl-venta-reinvertida");
const labelCuentaHorizonteEl = document.getElementById("lbl-cuenta-horizonte");
const labelRentaSinVenderEl = document.getElementById("lbl-renta-sin-vender");
const labelRentaVendiendoEl = document.getElementById("lbl-renta-vendiendo");

const resVentaEntregaEl = document.getElementById("res-venta-entrega");
const resCuentaEntregaEl = document.getElementById("res-cuenta-entrega");
const resVentaReinvertidaEl = document.getElementById("res-venta-reinvertida");
const resCuentaHorizonteEl = document.getElementById("res-cuenta-horizonte");
const resRentaSinVenderEl = document.getElementById("res-renta-sin-vender");
const resRentaVendiendoEl = document.getElementById("res-renta-vendiendo");
const resTrmFinalEl = document.getElementById("res-trm-final");
const resGanadorEl = document.getElementById("res-ganador");
const resMejorAptoHorizonteEl = document.getElementById("res-mejor-apto-horizonte");
const resMejorAptoEtiquetaEl = document.getElementById("res-mejor-apto-etiqueta");
const resDeltaHorizonteEl = document.getElementById("res-delta-horizonte");
const resDeltaHorizonteLabelEl = document.getElementById("res-delta-horizonte-label");
const resBreakValorAptoEl = document.getElementById("res-break-valor-apto");
const resBreakDeudaEl = document.getElementById("res-break-deuda");
const resBreakCajaEl = document.getElementById("res-break-caja");
const resBreakCostoVentaEl = document.getElementById("res-break-costo-venta");
const resBreakCanonEquilibrioEl = document.getElementById("res-break-canon-equilibrio");
const resBreakCanonEquilibrioCreditoEl = document.getElementById("res-break-canon-equilibrio-credito");
const resBreakCanonConAdminEl = document.getElementById("res-break-canon-con-admin");

const noteEl = document.getElementById("comparativo-note");
const trmNoteEl = document.getElementById("comparativo-trm-note");
const tablaResumenEl = document.getElementById("tabla-comparativo-resumen");
const tablaHeadEl = document.getElementById("tabla-comparativo-head");
const tablaBodyEl = document.getElementById("tabla-comparativo-body");
const tablaVistaInput = document.getElementById("tabla-vista-comp");

const BANREP_URL =
  "https://suameca.banrep.gov.co/estadisticas-economicas/informacionSerie/1/tasa_cambio_peso_colombiano_trm_dolar_usd/";
const DATOS_URL =
  "https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20DESC";
const DATOS_TRM_ANUALES_URL =
  "https://www.datos.gov.co/resource/32sa-8pi3.json?$select=date_extract_y(vigenciadesde)%20as%20anio,avg(valor)%20as%20trm_prom&$group=anio&$order=anio%20ASC";

const copNumberFmt = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const copCurrencyFmt = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const usdCurrencyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

let trmData = null;
let promedioDeval15Anios = null;
let lastReportData = null;
const COST_PROFILE_DEFAULTS = {
  bogota: { adminFactorPct: 0.09, impuestosAnualesPct: 1.1, otrosCostosAnualesCop: 300000 },
  medellin: { adminFactorPct: 0.08, impuestosAnualesPct: 0.9, otrosCostosAnualesCop: 250000 },
  cali: { adminFactorPct: 0.075, impuestosAnualesPct: 0.85, otrosCostosAnualesCop: 220000 },
};

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

function setMoneyInputValue(input, value) {
  input.value = formatMoneyInput(String(value));
}

function getEstimatedAdminMensualCop(valorAptoCop, adminFactorPct) {
  if (!Number.isFinite(valorAptoCop) || valorAptoCop <= 0) return 0;
  if (!Number.isFinite(adminFactorPct) || adminFactorPct < 0) return 0;
  return valorAptoCop * (adminFactorPct / 100);
}

function refreshAdminEstimate() {
  const valorAptoCop = parseMoneyInput(valorAptoInput.value);
  const adminFactorPct = Number(adminFactorPctInput.value);
  const estimated = getEstimatedAdminMensualCop(valorAptoCop, adminFactorPct);
  setMoneyInputValue(adminMensualInput, estimated);
}

function applyCostProfile() {
  const profile = perfilCostosInput.value;
  if (profile === "personalizado") return;
  const defaults = COST_PROFILE_DEFAULTS[profile];
  if (!defaults) return;
  adminFactorPctInput.value = defaults.adminFactorPct.toFixed(3);
  impuestosAnualesPctInput.value = defaults.impuestosAnualesPct.toFixed(2);
  setMoneyInputValue(otrosCostosAnualesInput, defaults.otrosCostosAnualesCop);
  refreshAdminEstimate();
}

function formatByCurrency(value, currency) {
  if (currency === "USD") return usdCurrencyFmt.format(value);
  return copCurrencyFmt.format(value);
}

function toMonthlyRate(effectiveAnnualPct) {
  if (!Number.isFinite(effectiveAnnualPct) || effectiveAnnualPct <= -100) return 0;
  return Math.pow(1 + effectiveAnnualPct / 100, 1 / 12) - 1;
}

function annuityPayment(principal, monthlyRate, months) {
  if (!Number.isFinite(principal) || principal <= 0 || !Number.isFinite(months) || months <= 0) return 0;
  if (!Number.isFinite(monthlyRate) || monthlyRate <= 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return principal * ((monthlyRate * factor) / (factor - 1));
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
  } catch (error) {
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
  } catch (error) {
    return null;
  }

  return null;
}

async function fetchAverageDevaluation15Years() {
  try {
    const response = await fetch(DATOS_TRM_ANUALES_URL, { cache: "no-store" });
    if (!response.ok) return null;
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.length < 3) return null;

    const ordered = rows
      .map((row) => ({ year: Number(row.anio), trm: Number(row.trm_prom) }))
      .filter((row) => Number.isFinite(row.year) && Number.isFinite(row.trm) && row.trm > 0)
      .sort((a, b) => a.year - b.year);

    const changes = [];
    for (let i = 1; i < ordered.length; i += 1) {
      const prev = ordered[i - 1];
      const curr = ordered[i];
      const rate = curr.trm / prev.trm - 1;
      if (Number.isFinite(rate)) {
        changes.push({ fromYear: prev.year, toYear: curr.year, rate });
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
  } catch (error) {
    return null;
  }
}

function updateTrmNote() {
  let message = trmData?.value
    ? `TRM actual: ${copNumberFmt.format(trmData.value)} COP/USD.`
    : "TRM actual no disponible.";

  if (promedioDeval15Anios) {
    message += ` Referencia 15 años de devaluación: ${(promedioDeval15Anios.avgRate * 100).toFixed(2)}% `;
    message += `(promedio ${promedioDeval15Anios.periods} años, ${promedioDeval15Anios.fromYear}-${promedioDeval15Anios.toYear}).`;
  }

  trmNoteEl.textContent = message;
}

function toggleCreditInputs() {
  const isCredit = tipoSaldoInput.value === "credito";
  tasaCreditoInput.disabled = !isCredit;
  plazoCreditoInput.disabled = !isCredit;
}

function clearResults() {
  const present = monedaPresentacionInput.value;
  const zero = present === "USD" ? usdCurrencyFmt.format(0) : copCurrencyFmt.format(0);

  labelVentaEntregaEl.textContent = `Venta al entregar neta (${present})`;
  labelCuentaEntregaEl.textContent = `Cuenta USD con flujos espejo al entregar (${present})`;
  labelVentaReinvertidaEl.textContent = `Venta al entregar reinvertida al horizonte (${present})`;
  labelCuentaHorizonteEl.textContent = `Cuenta USD con flujos espejo al horizonte (${present})`;
  labelRentaSinVenderEl.textContent = `Apartamento rentando sin vender (${present})`;
  labelRentaVendiendoEl.textContent = `Apartamento rentando y vendiendo al horizonte (${present})`;

  resVentaEntregaEl.textContent = zero;
  resCuentaEntregaEl.textContent = zero;
  resVentaReinvertidaEl.textContent = zero;
  resCuentaHorizonteEl.textContent = zero;
  resRentaSinVenderEl.textContent = zero;
  resRentaVendiendoEl.textContent = zero;
  resMejorAptoHorizonteEl.textContent = zero;
  resMejorAptoEtiquetaEl.textContent = "-";
  resDeltaHorizonteEl.textContent = zero;
  resDeltaHorizonteEl.classList.remove("value-positive", "value-negative");
  resDeltaHorizonteLabelEl.textContent = "Si es positivo, gana la cuenta USD.";
  resBreakValorAptoEl.textContent = zero;
  resBreakDeudaEl.textContent = zero;
  resBreakCajaEl.textContent = zero;
  resBreakCostoVentaEl.textContent = zero;
  resBreakCanonEquilibrioEl.textContent = zero;
  resBreakCanonEquilibrioCreditoEl.textContent = zero;
  resBreakCanonConAdminEl.textContent = zero;
  resTrmFinalEl.textContent = "0.00";
  resGanadorEl.textContent = "-";

  noteEl.textContent = "Ingresa los datos para calcular.";
  tablaResumenEl.textContent = "Ingresa los datos para ver la tabla.";
  tablaHeadEl.innerHTML = "";
  tablaBodyEl.innerHTML = "";
  lastReportData = null;
}

function simulateComparative(params) {
  const {
    valorAptoCop,
    horizonteAnios,
    mesesConstruccion,
    cuotaInicialPct,
    tipoSaldo,
    tasaCreditoEA,
    plazoCreditoAnios,
    valorizacionAptoEA,
    costosVentaPct,
    canonMensualPct,
    gastosCanonPct,
    adminMensualCop,
    impuestosAnualesPct,
    otrosCostosAnualesCop,
    tasaCuentaUsdEA,
    aporteAdicionalMensualCop,
    trmInicial,
    devalAnualPct,
  } = params;

  const horizonMonths = horizonteAnios * 12;
  const deliveryMonth = mesesConstruccion;
  const maxMonths = Math.max(horizonMonths, deliveryMonth);

  const downPaymentCop = valorAptoCop * (cuotaInicialPct / 100);
  const remainingCop = Math.max(0, valorAptoCop - downPaymentCop);
  const downMonthlyCop = deliveryMonth > 0 ? downPaymentCop / deliveryMonth : downPaymentCop;

  const valorizacionMonthly = toMonthlyRate(valorizacionAptoEA);
  const creditoMonthly = toMonthlyRate(tasaCreditoEA);
  const usdMonthly = toMonthlyRate(tasaCuentaUsdEA);
  const devalMonthly = toMonthlyRate(devalAnualPct);

  const creditMonths = tipoSaldo === "credito" ? plazoCreditoAnios * 12 : 0;
  const mortgagePaymentCop =
    tipoSaldo === "credito" ? annuityPayment(remainingCop, creditoMonthly, creditMonths) : 0;

  let propertyValueCop = valorAptoCop;
  let debtCop = 0;
  let accountUsd = 0;
  let operatingCashCop = 0;
  let paidDownPaymentCop = 0;

  let yearPaymentCop = 0;
  let yearNetRentCop = 0;
  let yearPropertyCostsCop = 0;

  let deliverySnapshot = null;
  let horizonSnapshot = null;

  const rows = [];

  for (let month = 1; month <= maxMonths; month += 1) {
    propertyValueCop *= 1 + valorizacionMonthly;

    let aptoOutflowCop = 0;
    let paymentOnlyMonthCop = 0;
    if (month <= deliveryMonth) {
      aptoOutflowCop += downMonthlyCop;
      paymentOnlyMonthCop += downMonthlyCop;
      paidDownPaymentCop += downMonthlyCop;
    }

    if (month === deliveryMonth) {
      if (tipoSaldo === "contado") {
        aptoOutflowCop += remainingCop;
        paymentOnlyMonthCop += remainingCop;
      } else if (tipoSaldo === "credito") {
        debtCop += remainingCop;
      }
    }

    let mortgageThisMonthCop = 0;
    if (tipoSaldo === "credito" && month > deliveryMonth && month <= deliveryMonth + creditMonths && debtCop > 0) {
      const interestCop = debtCop * creditoMonthly;
      const principalCop = Math.min(debtCop, Math.max(0, mortgagePaymentCop - interestCop));
      mortgageThisMonthCop = interestCop + principalCop;
      debtCop -= principalCop;
      if (debtCop < 1e-6) debtCop = 0;
      aptoOutflowCop += mortgageThisMonthCop;
      paymentOnlyMonthCop += mortgageThisMonthCop;
    }

    let rentNetCop = 0;
    let propertyCostsMonthCop = 0;
    if (month > deliveryMonth) {
      const grossRentCop = propertyValueCop * (canonMensualPct / 100);
      rentNetCop = grossRentCop * (1 - gastosCanonPct / 100);
      const taxMonthCop = (propertyValueCop * (impuestosAnualesPct / 100)) / 12;
      const otherMonthCop = otrosCostosAnualesCop / 12;
      // La administración se muestra como referencia comercial (la asume el arrendatario).
      // El inversionista solo asume predial/impuestos y otros costos del inmueble.
      propertyCostsMonthCop = taxMonthCop + otherMonthCop;
      aptoOutflowCop += propertyCostsMonthCop;
      operatingCashCop += rentNetCop - mortgageThisMonthCop - propertyCostsMonthCop;
    }

    const trmMonth = trmInicial * Math.pow(1 + devalMonthly, month);
    const mirrorContributionCop = aptoOutflowCop + aporteAdicionalMensualCop;
    const mirrorContributionUsd = mirrorContributionCop > 0 ? mirrorContributionCop / trmMonth : 0;
    accountUsd = (accountUsd + mirrorContributionUsd) * (1 + usdMonthly);

    if (month <= horizonMonths) {
      yearPaymentCop += paymentOnlyMonthCop;
      yearNetRentCop += rentNetCop;
      yearPropertyCostsCop += propertyCostsMonthCop;
    }

    if (month === deliveryMonth) {
      deliverySnapshot = {
        month,
        trm: trmMonth,
        propertyValueCop,
        debtCop,
        accountUsd,
      };
    }

    if (month === horizonMonths) {
      horizonSnapshot = {
        month,
        trm: trmMonth,
        propertyValueCop,
        debtCop,
        accountUsd,
        operatingCashCop,
      };
    }

    if (month <= horizonMonths && month % 12 === 0) {
      const year = month / 12;
      const aptoCapitalCop =
        month < deliveryMonth
          ? paidDownPaymentCop + (propertyValueCop - valorAptoCop)
          : propertyValueCop - debtCop;
      const saleCostEstimateCop = propertyValueCop * (costosVentaPct / 100);
      const aptoTotalNoSellCop = aptoCapitalCop + operatingCashCop;
      const aptoTotalSellCop = aptoTotalNoSellCop - saleCostEstimateCop;

      rows.push({
        year,
        trm: trmMonth,
        propertyValueCop,
        debtCop,
        aptoCapitalCop,
        operatingCashCop,
        saleCostEstimateCop,
        aptoTotalNoSellCop,
        aptoTotalSellCop,
        annualPaymentCop: yearPaymentCop,
        annualNetRentCop: yearNetRentCop,
        annualPropertyCostsCop: yearPropertyCostsCop,
        accountUsd,
        accountCop: accountUsd * trmMonth,
      });
      yearPaymentCop = 0;
      yearNetRentCop = 0;
      yearPropertyCostsCop = 0;
    }
  }

  if (!deliverySnapshot) {
    const trmAtDelivery = trmInicial * Math.pow(1 + devalMonthly, deliveryMonth);
    const valueAtDelivery = valorAptoCop * Math.pow(1 + valorizacionMonthly, deliveryMonth);
    const debtAtDelivery = tipoSaldo === "credito" ? remainingCop : 0;
    deliverySnapshot = {
      month: deliveryMonth,
      trm: trmAtDelivery,
      propertyValueCop: valueAtDelivery,
      debtCop: debtAtDelivery,
      accountUsd: 0,
    };
  }

  if (!horizonSnapshot) {
    const trmAtHorizon = trmInicial * Math.pow(1 + devalMonthly, horizonMonths);
    const valueAtHorizon = valorAptoCop * Math.pow(1 + valorizacionMonthly, horizonMonths);
    horizonSnapshot = {
      month: horizonMonths,
      trm: trmAtHorizon,
      propertyValueCop: valueAtHorizon,
      debtCop: 0,
      accountUsd: 0,
      operatingCashCop: 0,
    };
  }

  const saleDeliveryNetCop =
    deliverySnapshot.propertyValueCop * (1 - costosVentaPct / 100) - deliverySnapshot.debtCop;
  const saleDeliveryNetUsd = saleDeliveryNetCop / deliverySnapshot.trm;

  const accountDeliveryUsd = deliverySnapshot.accountUsd;
  const accountDeliveryCop = accountDeliveryUsd * deliverySnapshot.trm;

  const remainingMonthsAfterDelivery = Math.max(0, horizonMonths - deliveryMonth);
  const saleReinvestedUsd = saleDeliveryNetUsd * Math.pow(1 + usdMonthly, remainingMonthsAfterDelivery);
  const saleReinvestedCop = saleReinvestedUsd * horizonSnapshot.trm;

  const accountHorizonUsd = horizonSnapshot.accountUsd;
  const accountHorizonCop = accountHorizonUsd * horizonSnapshot.trm;

  const rentNoSellCop =
    horizonSnapshot.propertyValueCop - horizonSnapshot.debtCop + horizonSnapshot.operatingCashCop;
  const rentNoSellUsd = rentNoSellCop / horizonSnapshot.trm;

  const rentSellCop =
    horizonSnapshot.propertyValueCop * (1 - costosVentaPct / 100) -
    horizonSnapshot.debtCop +
    horizonSnapshot.operatingCashCop;
  const rentSellUsd = rentSellCop / horizonSnapshot.trm;
  const saleCostAtHorizonCop = horizonSnapshot.propertyValueCop * (costosVentaPct / 100);
  const saleCostAtHorizonUsd = saleCostAtHorizonCop / horizonSnapshot.trm;

  const bestApartmentHorizonCop = Math.max(saleReinvestedCop, rentNoSellCop, rentSellCop);
  let bestApartmentScenarioLabel = "Vender al entregar y reinvertir";
  if (bestApartmentHorizonCop === rentNoSellCop) {
    bestApartmentScenarioLabel = "Conservar y arrendar";
  } else if (bestApartmentHorizonCop === rentSellCop) {
    bestApartmentScenarioLabel = "Arrendar y vender al horizonte";
  }
  const winner = accountHorizonCop > bestApartmentHorizonCop ? "Cuenta USD (flujos espejo)" : "Apartamento";

  return {
    rows,
    trmFinal: horizonSnapshot.trm,
    downPaymentCop,
    remainingCop,
    mortgagePaymentCop,
    deliveryMonth,
    horizonMonths,
    deliverySnapshot,
    horizonSnapshot,
    saleDeliveryNetCop,
    saleDeliveryNetUsd,
    accountDeliveryCop,
    accountDeliveryUsd,
    saleReinvestedCop,
    saleReinvestedUsd,
    accountHorizonCop,
    accountHorizonUsd,
    rentNoSellCop,
    rentNoSellUsd,
    rentSellCop,
    rentSellUsd,
    saleCostAtHorizonCop,
    saleCostAtHorizonUsd,
    bestApartmentHorizonCop,
    bestApartmentHorizonUsd: bestApartmentHorizonCop / horizonSnapshot.trm,
    bestApartmentScenarioLabel,
    winner,
  };
}

function renderTableHeader(view) {
  if (view === "detallado") {
    tablaHeadEl.innerHTML = `
      <th>Año</th>
      <th>TRM</th>
      <th>Valor apto</th>
      <th>Deuda</th>
      <th>Capital apto (valor - deuda)</th>
      <th>Caja acumulada arriendo</th>
      <th>Total apto sin vender</th>
      <th>Total apto vendiendo</th>
      <th>Pago apto anual</th>
      <th>Renta neta anual</th>
      <th>Predial+otros anual (inversionista)</th>
      <th>Flujo neto apto anual</th>
      <th>Cuenta espejo (USD)</th>
      <th>Cuenta espejo (COP)</th>
      <th>Ventaja cuenta vs apto sin vender (COP)</th>
      <th>Ventaja cuenta vs apto vendiendo (COP)</th>
    `;
    return;
  }

  tablaHeadEl.innerHTML = `
    <th>Año</th>
    <th>Total apto sin vender</th>
    <th>Flujo neto apto anual</th>
    <th>Cuenta espejo (COP)</th>
    <th>Ventaja cuenta vs apto sin vender (COP)</th>
  `;
}

function renderTable(rows, view) {
  renderTableHeader(view);
  tablaBodyEl.innerHTML = "";
  rows.forEach((row) => {
    const aptoCapitalCop = row.aptoCapitalCop;
    const flujoNetoAptoCop = row.annualNetRentCop - row.annualPaymentCop - row.annualPropertyCostsCop;
    const diffCuentaVsAptoNoSellCop = row.accountCop - row.aptoTotalNoSellCop;
    const diffCuentaVsAptoSellCop = row.accountCop - row.aptoTotalSellCop;
    const tr = document.createElement("tr");
    const diffNoSellClass = diffCuentaVsAptoNoSellCop >= 0 ? "value-positive" : "value-negative";
    const diffSellClass = diffCuentaVsAptoSellCop >= 0 ? "value-positive" : "value-negative";
    if (view === "detallado") {
      tr.innerHTML = `
        <td>${row.year}</td>
        <td>${copNumberFmt.format(row.trm)}</td>
        <td>${copCurrencyFmt.format(row.propertyValueCop)}</td>
        <td>${copCurrencyFmt.format(row.debtCop)}</td>
        <td>${copCurrencyFmt.format(aptoCapitalCop)}</td>
        <td>${copCurrencyFmt.format(row.operatingCashCop)}</td>
        <td>${copCurrencyFmt.format(row.aptoTotalNoSellCop)}</td>
        <td>${copCurrencyFmt.format(row.aptoTotalSellCop)}</td>
        <td>${copCurrencyFmt.format(row.annualPaymentCop)}</td>
        <td>${copCurrencyFmt.format(row.annualNetRentCop)}</td>
        <td>${copCurrencyFmt.format(row.annualPropertyCostsCop)}</td>
        <td>${copCurrencyFmt.format(flujoNetoAptoCop)}</td>
        <td>${usdCurrencyFmt.format(row.accountUsd)}</td>
        <td>${copCurrencyFmt.format(row.accountCop)}</td>
        <td class="${diffNoSellClass}">${copCurrencyFmt.format(diffCuentaVsAptoNoSellCop)}</td>
        <td class="${diffSellClass}">${copCurrencyFmt.format(diffCuentaVsAptoSellCop)}</td>
      `;
    } else {
      tr.innerHTML = `
        <td>${row.year}</td>
        <td>${copCurrencyFmt.format(row.aptoTotalNoSellCop)}</td>
        <td>${copCurrencyFmt.format(flujoNetoAptoCop)}</td>
        <td>${copCurrencyFmt.format(row.accountCop)}</td>
        <td class="${diffNoSellClass}">${copCurrencyFmt.format(diffCuentaVsAptoNoSellCop)}</td>
      `;
    }
    tablaBodyEl.appendChild(tr);
  });
}

function readInputs() {
  const valorAptoCop = parseMoneyInput(valorAptoInput.value);
  const adminFactorPct = Number(adminFactorPctInput.value);
  const adminMensualEstimatedCop = getEstimatedAdminMensualCop(valorAptoCop, adminFactorPct);
  return {
    valorAptoCop,
    horizonteAnios: Number(horizonteAniosInput.value),
    mesesConstruccion: Number(mesesConstruccionInput.value),
    cuotaInicialPct: Number(cuotaInicialPctInput.value),
    tipoSaldo: tipoSaldoInput.value,
    tasaCreditoEA: Number(tasaCreditoInput.value),
    plazoCreditoAnios: Number(plazoCreditoInput.value),
    valorizacionAptoEA: Number(valorizacionAptoInput.value),
    costosVentaPct: Number(costosVentaInput.value),
    canonMensualPct: Number(canonPctInput.value),
    gastosCanonPct: Number(gastosCanonPctInput.value),
    adminFactorPct,
    adminMensualCop: adminMensualEstimatedCop,
    impuestosAnualesPct: Number(impuestosAnualesPctInput.value),
    otrosCostosAnualesCop: parseMoneyInput(otrosCostosAnualesInput.value) || 0,
    tasaCuentaUsdEA: Number(tasaCuentaUsdInput.value),
    aporteAdicionalMensualCop: parseMoneyInput(aporteAdicionalCuentaInput.value) || 0,
    trmInicial: Number(trmInicialInput.value),
    devalAnualPct: Number(devalAnualInput.value),
    presentCurrency: monedaPresentacionInput.value,
  };
}

function validateInputs(input) {
  if (!Number.isFinite(input.valorAptoCop) || input.valorAptoCop <= 0) {
    return "Ingresa un valor de apartamento válido.";
  }
  if (!Number.isFinite(input.horizonteAnios) || input.horizonteAnios <= 0) {
    return "Ingresa un horizonte en años válido.";
  }
  if (!Number.isFinite(input.mesesConstruccion) || input.mesesConstruccion <= 0) {
    return "Ingresa los meses de construcción (mínimo 1).";
  }
  if (!Number.isFinite(input.cuotaInicialPct) || input.cuotaInicialPct < 0 || input.cuotaInicialPct > 100) {
    return "La cuota inicial debe estar entre 0% y 100%.";
  }
  if (input.tipoSaldo === "credito") {
    if (!Number.isFinite(input.tasaCreditoEA) || input.tasaCreditoEA < 0) {
      return "Ingresa una tasa de crédito válida.";
    }
    if (!Number.isFinite(input.plazoCreditoAnios) || input.plazoCreditoAnios <= 0) {
      return "Ingresa un plazo de crédito válido.";
    }
  }
  if (!Number.isFinite(input.valorizacionAptoEA)) {
    return "Ingresa una valorización anual válida.";
  }
  if (!Number.isFinite(input.costosVentaPct) || input.costosVentaPct < 0 || input.costosVentaPct >= 100) {
    return "Los costos de venta deben estar entre 0% y 99.99%.";
  }
  if (!Number.isFinite(input.canonMensualPct) || input.canonMensualPct < 0) {
    return "Ingresa un canon mensual válido.";
  }
  if (!Number.isFinite(input.gastosCanonPct) || input.gastosCanonPct < 0 || input.gastosCanonPct >= 100) {
    return "Gastos/vacancia debe estar entre 0% y 99.99%.";
  }
  if (!Number.isFinite(input.adminFactorPct) || input.adminFactorPct < 0) {
    return "El factor de administración mensual debe ser mayor o igual a cero.";
  }
  if (!Number.isFinite(input.adminMensualCop) || input.adminMensualCop < 0) {
    return "La administración mensual debe ser mayor o igual a cero.";
  }
  if (!Number.isFinite(input.impuestosAnualesPct) || input.impuestosAnualesPct < 0) {
    return "Predial + impuestos anuales debe ser mayor o igual a cero.";
  }
  if (!Number.isFinite(input.otrosCostosAnualesCop) || input.otrosCostosAnualesCop < 0) {
    return "Otros costos anuales del apto deben ser mayores o iguales a cero.";
  }
  if (!Number.isFinite(input.tasaCuentaUsdEA) || input.tasaCuentaUsdEA < 0) {
    return "Ingresa una tasa anual de cuenta USD válida.";
  }
  if (!Number.isFinite(input.aporteAdicionalMensualCop) || input.aporteAdicionalMensualCop < 0) {
    return "El aporte adicional mensual debe ser mayor o igual a cero.";
  }
  if (!Number.isFinite(input.trmInicial) || input.trmInicial <= 0) {
    return "Ingresa una TRM inicial válida.";
  }
  if (!Number.isFinite(input.devalAnualPct) || input.devalAnualPct <= -100) {
    return "Ingresa una devaluación anual válida.";
  }
  return null;
}

function calculate() {
  const input = readInputs();
  const error = validateInputs(input);
  if (error) {
    clearResults();
    noteEl.textContent = error;
    return;
  }

  const scenario = simulateComparative(input);
  const isUsd = input.presentCurrency === "USD";

  labelVentaEntregaEl.textContent = `Venta al entregar neta (${input.presentCurrency})`;
  labelCuentaEntregaEl.textContent = `Cuenta USD con flujos espejo al entregar (${input.presentCurrency})`;
  labelVentaReinvertidaEl.textContent = `Venta al entregar reinvertida al horizonte (${input.presentCurrency})`;
  labelCuentaHorizonteEl.textContent = `Cuenta USD con flujos espejo al horizonte (${input.presentCurrency})`;
  labelRentaSinVenderEl.textContent = `Apartamento rentando sin vender (${input.presentCurrency})`;
  labelRentaVendiendoEl.textContent = `Apartamento rentando y vendiendo al horizonte (${input.presentCurrency})`;

  const ventaEntregaValue = isUsd ? scenario.saleDeliveryNetUsd : scenario.saleDeliveryNetCop;
  const cuentaEntregaValue = isUsd ? scenario.accountDeliveryUsd : scenario.accountDeliveryCop;
  const ventaReinvertidaValue = isUsd ? scenario.saleReinvestedUsd : scenario.saleReinvestedCop;
  const cuentaHorizonteValue = isUsd ? scenario.accountHorizonUsd : scenario.accountHorizonCop;
  const rentaSinVenderValue = isUsd ? scenario.rentNoSellUsd : scenario.rentNoSellCop;
  const rentaVendiendoValue = isUsd ? scenario.rentSellUsd : scenario.rentSellCop;
  const mejorAptoValue = isUsd ? scenario.bestApartmentHorizonUsd : scenario.bestApartmentHorizonCop;
  const deltaHorizonteValue = cuentaHorizonteValue - mejorAptoValue;
  const breakValorApto = isUsd
    ? scenario.horizonSnapshot.propertyValueCop / scenario.horizonSnapshot.trm
    : scenario.horizonSnapshot.propertyValueCop;
  const breakDeuda = isUsd
    ? scenario.horizonSnapshot.debtCop / scenario.horizonSnapshot.trm
    : scenario.horizonSnapshot.debtCop;
  const breakCaja = isUsd
    ? scenario.horizonSnapshot.operatingCashCop / scenario.horizonSnapshot.trm
    : scenario.horizonSnapshot.operatingCashCop;
  const breakCostoVenta = isUsd ? scenario.saleCostAtHorizonUsd : scenario.saleCostAtHorizonCop;
  const gastosCanonRate = input.gastosCanonPct / 100;
  const coberturaCanonDen = 1 - gastosCanonRate;
  const ownerCostsMonthAtHorizonCop =
    (scenario.horizonSnapshot.propertyValueCop * (input.impuestosAnualesPct / 100)) / 12 +
    input.otrosCostosAnualesCop / 12;
  const hasMortgageAtHorizon =
    input.tipoSaldo === "credito" &&
    scenario.horizonMonths > scenario.deliveryMonth &&
    scenario.horizonMonths <= scenario.deliveryMonth + input.plazoCreditoAnios * 12;
  const mortgageMonthAtHorizonCop = hasMortgageAtHorizon ? scenario.mortgagePaymentCop : 0;
  const canonEquilibrioCop =
    coberturaCanonDen > 0 ? ownerCostsMonthAtHorizonCop / coberturaCanonDen : Number.NaN;
  const canonEquilibrioCreditoCop =
    coberturaCanonDen > 0 ? (ownerCostsMonthAtHorizonCop + mortgageMonthAtHorizonCop) / coberturaCanonDen : Number.NaN;
  const canonConAdminCop = Number.isFinite(canonEquilibrioCop) ? canonEquilibrioCop + input.adminMensualCop : Number.NaN;
  const canonEquilibrioDisplay = isUsd
    ? canonEquilibrioCop / scenario.horizonSnapshot.trm
    : canonEquilibrioCop;
  const canonEquilibrioCreditoDisplay = isUsd
    ? canonEquilibrioCreditoCop / scenario.horizonSnapshot.trm
    : canonEquilibrioCreditoCop;
  const canonConAdminDisplay = isUsd
    ? canonConAdminCop / scenario.horizonSnapshot.trm
    : canonConAdminCop;

  resVentaEntregaEl.textContent = formatByCurrency(ventaEntregaValue, input.presentCurrency);
  resCuentaEntregaEl.textContent = formatByCurrency(cuentaEntregaValue, input.presentCurrency);
  resVentaReinvertidaEl.textContent = formatByCurrency(ventaReinvertidaValue, input.presentCurrency);
  resCuentaHorizonteEl.textContent = formatByCurrency(cuentaHorizonteValue, input.presentCurrency);
  resRentaSinVenderEl.textContent = formatByCurrency(rentaSinVenderValue, input.presentCurrency);
  resRentaVendiendoEl.textContent = formatByCurrency(rentaVendiendoValue, input.presentCurrency);
  resMejorAptoHorizonteEl.textContent = formatByCurrency(mejorAptoValue, input.presentCurrency);
  resMejorAptoEtiquetaEl.textContent = scenario.bestApartmentScenarioLabel;
  resDeltaHorizonteEl.textContent = formatByCurrency(deltaHorizonteValue, input.presentCurrency);
  resDeltaHorizonteEl.classList.remove("value-positive", "value-negative");
  resDeltaHorizonteEl.classList.add(deltaHorizonteValue >= 0 ? "value-positive" : "value-negative");
  resDeltaHorizonteLabelEl.textContent =
    deltaHorizonteValue >= 0 ? "Positivo: la cuenta USD queda por encima." : "Negativo: el apartamento queda por encima.";
  resBreakValorAptoEl.textContent = formatByCurrency(breakValorApto, input.presentCurrency);
  resBreakDeudaEl.textContent = formatByCurrency(breakDeuda, input.presentCurrency);
  resBreakCajaEl.textContent = formatByCurrency(breakCaja, input.presentCurrency);
  resBreakCostoVentaEl.textContent = formatByCurrency(breakCostoVenta, input.presentCurrency);
  resBreakCanonEquilibrioEl.textContent = Number.isFinite(canonEquilibrioDisplay)
    ? formatByCurrency(canonEquilibrioDisplay, input.presentCurrency)
    : "No aplica";
  resBreakCanonEquilibrioCreditoEl.textContent = Number.isFinite(canonEquilibrioCreditoDisplay)
    ? formatByCurrency(canonEquilibrioCreditoDisplay, input.presentCurrency)
    : "No aplica";
  resBreakCanonConAdminEl.textContent = Number.isFinite(canonConAdminDisplay)
    ? formatByCurrency(canonConAdminDisplay, input.presentCurrency)
    : "No aplica";

  resTrmFinalEl.textContent = copNumberFmt.format(scenario.trmFinal);
  resGanadorEl.textContent = scenario.winner;

  renderTable(scenario.rows, tablaVistaInput.value);

  const deliveryYear = (scenario.deliveryMonth / 12).toFixed(2);
  noteEl.textContent =
    `Cuota inicial: ${copCurrencyFmt.format(scenario.downPaymentCop)} en ${scenario.deliveryMonth} meses. ` +
    `Entrega estimada en ${deliveryYear} años. ` +
    `Antes de entrega, capital apto = cuota pagada acumulada + diferencia entre valor de mercado y precio de compra. ` +
    `El flujo neto del apto ya incluye predial/impuestos y otros costos anuales (administración referencial por fuera). ` +
    `Administración estimada mensual: ${copCurrencyFmt.format(input.adminMensualCop)}.`;

  if (input.horizonteAnios * 12 < input.mesesConstruccion) {
    noteEl.textContent += " Aviso: el horizonte termina antes de la entrega del inmueble.";
  }

  tablaResumenEl.textContent =
    `Cortes anuales hasta ${input.horizonteAnios} años (${tablaVistaInput.value}). ` +
    `Total apto sin vender = capital apto + caja acumulada. Flujo neto incluye predial/impuestos y otros costos del inversionista.`;

  lastReportData = {
    generatedAt: new Date(),
    input,
    scenario,
  };
}

function downloadPdf() {
  if (!lastReportData) {
    noteEl.textContent = "Primero calcula para poder descargar el PDF.";
    return;
  }
  if (!window.jspdf || !window.jspdf.jsPDF) {
    noteEl.textContent = "No se pudo cargar el generador de PDF.";
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const { generatedAt, input, scenario } = lastReportData;
  const isUsd = input.presentCurrency === "USD";

  const money = (copValue, usdValue) =>
    isUsd ? formatByCurrency(usdValue, "USD") : formatByCurrency(copValue, "COP");

  doc.setFontSize(14);
  doc.text("Fides Financial - Comparativo de Escenarios", 14, 16);
  doc.setFontSize(10);
  doc.text(`Fecha: ${generatedAt.toLocaleString("es-CO")}`, 14, 23);

  const paramsRows = [
    ["Valor apartamento", copCurrencyFmt.format(input.valorAptoCop)],
    ["Horizonte", `${input.horizonteAnios} años`],
    ["Meses construcción", String(input.mesesConstruccion)],
    ["Cuota inicial", `${input.cuotaInicialPct}%`],
    ["Saldo al entregar", input.tipoSaldo === "credito" ? "Crédito" : "Contado"],
    ["Tasa crédito E.A.", `${input.tasaCreditoEA}%`],
    ["Plazo crédito", `${input.plazoCreditoAnios} años`],
    ["Valorización apto E.A.", `${input.valorizacionAptoEA}%`],
    ["Costos de venta", `${input.costosVentaPct}%`],
    ["Canon mensual", `${input.canonMensualPct}%`],
    ["Gastos/vacancia", `${input.gastosCanonPct}%`],
    ["Factor administración mensual (% valor apto)", `${input.adminFactorPct}%`],
    ["Administración mensual estimada", copCurrencyFmt.format(input.adminMensualCop)],
    ["Predial + impuestos anuales (% valor apto)", `${input.impuestosAnualesPct}%`],
    ["Otros costos anuales apto", copCurrencyFmt.format(input.otrosCostosAnualesCop)],
    ["Tasa cuenta USD E.A.", `${input.tasaCuentaUsdEA}%`],
    ["Aporte adicional mensual", copCurrencyFmt.format(input.aporteAdicionalMensualCop)],
    ["TRM inicial", copNumberFmt.format(input.trmInicial)],
    ["Devaluación anual", `${input.devalAnualPct}%`],
    ["Moneda presentación", input.presentCurrency],
  ];

  doc.autoTable({
    startY: 30,
    head: [["Parámetro", "Valor"]],
    body: paramsRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [60, 106, 157] },
  });

  const summaryRows = [
    ["Mejor escenario apartamento al horizonte", scenario.bestApartmentScenarioLabel],
    ["Mejor escenario apartamento (valor)", money(scenario.bestApartmentHorizonCop, scenario.bestApartmentHorizonUsd)],
    ["Venta al entregar neta", money(scenario.saleDeliveryNetCop, scenario.saleDeliveryNetUsd)],
    ["Cuenta espejo al entregar", money(scenario.accountDeliveryCop, scenario.accountDeliveryUsd)],
    ["Venta al entregar reinvertida", money(scenario.saleReinvestedCop, scenario.saleReinvestedUsd)],
    ["Cuenta espejo al horizonte", money(scenario.accountHorizonCop, scenario.accountHorizonUsd)],
    ["Apartamento rentando sin vender", money(scenario.rentNoSellCop, scenario.rentNoSellUsd)],
    ["Apartamento rentando y vendiendo", money(scenario.rentSellCop, scenario.rentSellUsd)],
    ["TRM final proyectada", copNumberFmt.format(scenario.trmFinal)],
    ["Ganador horizonte", scenario.winner],
  ];

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [["Resultado", "Valor"]],
    body: summaryRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [60, 106, 157] },
  });

  const tableRows = scenario.rows.map((row) => [
    {
      year: String(row.year),
      trm: copNumberFmt.format(row.trm),
      totalAptoNoSell: copCurrencyFmt.format(row.aptoTotalNoSellCop),
      costosApto: copCurrencyFmt.format(row.annualPropertyCostsCop),
      flujoNetoApto: copCurrencyFmt.format(
        row.annualNetRentCop - row.annualPaymentCop - row.annualPropertyCostsCop
      ),
      cuentaUsd: usdCurrencyFmt.format(row.accountUsd),
      cuentaCop: copCurrencyFmt.format(row.accountCop),
      ventajaCuenta: copCurrencyFmt.format(row.accountCop - row.aptoTotalNoSellCop),
    },
  ]);

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [[
      "Año",
      "TRM",
      "Total apto sin vender",
      "Predial+otros",
      "Flujo neto apto",
      "Cuenta USD",
      "Cuenta COP",
      "Ventaja cuenta vs apto sin vender",
    ]],
    body: tableRows.map((row) => [
      row.year,
      row.trm,
      row.totalAptoNoSell,
      row.costosApto,
      row.flujoNetoApto,
      row.cuentaUsd,
      row.cuentaCop,
      row.ventajaCuenta,
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [60, 106, 157] },
  });

  const fileDate = generatedAt.toISOString().slice(0, 10);
  doc.save(`comparativo-escenarios-${fileDate}.pdf`);
}

btnCalcular.addEventListener("click", calculate);
if (btnDescargarPdf) {
  btnDescargarPdf.addEventListener("click", downloadPdf);
}

if (btnUsarTrmActual) {
  btnUsarTrmActual.addEventListener("click", () => {
    if (trmData?.value) {
      trmInicialInput.value = trmData.value.toFixed(2);
      calculate();
    } else {
      noteEl.textContent = "TRM actual no disponible para autocompletar.";
    }
  });
}

[
  valorAptoInput,
  horizonteAniosInput,
  mesesConstruccionInput,
  cuotaInicialPctInput,
  tipoSaldoInput,
  tasaCreditoInput,
  plazoCreditoInput,
  valorizacionAptoInput,
  costosVentaInput,
  canonPctInput,
  gastosCanonPctInput,
  perfilCostosInput,
  adminFactorPctInput,
  adminMensualInput,
  impuestosAnualesPctInput,
  otrosCostosAnualesInput,
  tasaCuentaUsdInput,
  aporteAdicionalCuentaInput,
  trmInicialInput,
  devalAnualInput,
  monedaPresentacionInput,
].forEach((input) => {
  input.addEventListener("input", () => {
    if (tablaBodyEl.children.length) calculate();
  });
  input.addEventListener("change", () => {
    if (tablaBodyEl.children.length) calculate();
  });
});

tipoSaldoInput.addEventListener("change", () => {
  toggleCreditInputs();
  if (tablaBodyEl.children.length) calculate();
});

perfilCostosInput.addEventListener("change", () => {
  applyCostProfile();
  if (tablaBodyEl.children.length) calculate();
});

valorAptoInput.addEventListener("input", () => {
  refreshAdminEstimate();
});

adminFactorPctInput.addEventListener("input", () => {
  refreshAdminEstimate();
});

tablaVistaInput.addEventListener("change", () => {
  if (!lastReportData) return;
  renderTable(lastReportData.scenario.rows, tablaVistaInput.value);
  tablaResumenEl.textContent =
    `Cortes anuales hasta ${lastReportData.input.horizonteAnios} años (${tablaVistaInput.value}). ` +
    `Total apto sin vender = capital apto + caja acumulada. Flujo neto incluye predial/impuestos y otros costos del inversionista.`;
});

async function init() {
  setupMoneyInputs();
  toggleCreditInputs();
  applyCostProfile();
  refreshAdminEstimate();

  trmData = await fetchTRM();
  promedioDeval15Anios = await fetchAverageDevaluation15Years();

  if (trmData?.value) {
    trmInicialInput.value = trmData.value.toFixed(2);
  }
  if (promedioDeval15Anios && !devalAnualInput.value) {
    devalAnualInput.value = (promedioDeval15Anios.avgRate * 100).toFixed(2);
  }

  updateTrmNote();
  clearResults();
  renderTableHeader(tablaVistaInput.value);
}

init();
