const costoInput = document.getElementById("costo");
const costoLabel = document.getElementById("costo-label");
const duracionInput = document.getElementById("duracion");
const duracionUnidadSelect = document.getElementById("duracion-unidad");
const monedaSelect = document.getElementById("moneda");
const rentInput = document.getElementById("rentabilidad");
const inflacionInput = document.getElementById("inflacion");
const conservadorInput = document.getElementById("conservador");
const aniosAporteInput = document.getElementById("anios-aporte");
const aporteWarningEl = document.getElementById("aporte-warning");
const proyectarRetirosInput = document.getElementById("proyectar-retiros");
const addChildBtn = document.getElementById("add-child");
const childrenList = document.getElementById("children-list");
const btn = document.getElementById("calcular");

const ahorroMensualEl = document.getElementById("ahorro-mensual");
const ahorroMensualUsdEl = document.getElementById("ahorro-mensual-usd");
const ahorroAnualEl = document.getElementById("ahorro-anual");
const ahorroAnualUsdEl = document.getElementById("ahorro-anual-usd");
const aniosAporteResEl = document.getElementById("anios-aporte-res");
const totalAportadoEl = document.getElementById("total-aportado");
const totalAportadoUsdEl = document.getElementById("total-aportado-usd");
const montoTotalEl = document.getElementById("monto-total");
const montoLabelEl = document.getElementById("monto-label");
const montoTotalUsdEl = document.getElementById("monto-total-usd");
const montoLabelUsdEl = document.getElementById("monto-label-usd");
const trmValorEl = document.getElementById("trm-valor");
const trmNoteEl = document.getElementById("trm-note");
const tablaResumen = document.getElementById("tabla-resumen");
const tablasHijos = document.getElementById("tablas-hijos");
const tablaTotalResumen = document.getElementById("tabla-total-resumen");
const tablaTotalBody = document.getElementById("tabla-total-body");
const tablaVistaInput = document.getElementById("tabla-vista");
const tablaPeriodoHead = document.getElementById("tabla-periodo-head");

const BANREP_URL =
  "https://suameca.banrep.gov.co/estadisticas-economicas/informacionSerie/1/tasa_cambio_peso_colombiano_trm_dolar_usd/";
const DATOS_URL =
  "https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20DESC";

const moneyFmt = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

let trmData = null;
let childCounter = 0;

function formatMoney(value) {
  return `$${moneyFmt.format(value)}`;
}

function formatUsd(value) {
  return usdFmt.format(value);
}

function parseLocaleNumber(value) {
  if (!value) return null;
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
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
      if (formatted) {
        input.value = formatted;
      }
    });
  });
}

function formatDateLabel(value) {
  if (!value) return "";
  if (value.includes("T")) {
    return value.split("T")[0];
  }
  return value;
}

function computeMonthlyRate(annualRate) {
  if (!Number.isFinite(annualRate) || annualRate <= 0) return 0;
  return Math.pow(1 + annualRate / 100, 1 / 12) - 1;
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
    const dateLabel = trmData.date ? ` (${formatDateLabel(trmData.date)})` : "";
    trmNoteEl.textContent = `TRM obtenida desde ${trmData.source}${dateLabel}.`;
  } else {
    trmValorEl.textContent = "No disponible";
    trmNoteEl.textContent = "No se pudo obtener la TRM en este momento.";
  }
}

function clearTables() {
  tablasHijos.innerHTML = "";
  tablaTotalBody.innerHTML = "";
}

function updatePeriodHeader() {
  if (!tablaPeriodoHead || !tablaVistaInput) return;
  tablaPeriodoHead.textContent = tablaVistaInput.value === "anual" ? "Año" : "Mes";
}

function updateRemoveButtons() {
  const rows = childrenList.querySelectorAll(".child-row");
  rows.forEach((row) => {
    const btnRemove = row.querySelector(".remove-child");
    if (btnRemove) {
      btnRemove.disabled = rows.length <= 1;
    }
  });
}

function updateCostLabel() {
  const isYears = duracionUnidadSelect.value === "anios";
  costoLabel.textContent = isYears ? "Costo del año" : "Costo del semestre";
  costoInput.placeholder = isYears ? "Ej: 7,000,000" : "Ej: 3,500,000";
}

function addChildRow() {
  childCounter += 1;
  const row = document.createElement("div");
  row.className = "child-row";
  row.innerHTML = `
    <label>
      Nombre (opcional)
      <input class="child-name" type="text" placeholder="Hijo ${childCounter}" />
    </label>
    <label>
      Edad actual
      <input class="child-age" type="number" min="0" step="0.1" placeholder="Ej: 12" />
    </label>
    <label>
      Edad de ingreso
      <input class="child-age-start" type="number" min="0" step="0.1" placeholder="Ej: 18" />
    </label>
    <label>
      Años para entrar (opcional)
      <input class="child-time" type="number" min="0" step="0.1" placeholder="Ej: 3" />
    </label>
    <button class="remove-child" type="button">Eliminar</button>
  `;
  childrenList.appendChild(row);
  updateRemoveButtons();
}

function getChildrenData() {
  const rows = Array.from(childrenList.querySelectorAll(".child-row"));
  return rows
    .map((row, index) => {
      const nameRaw = row.querySelector(".child-name").value.trim();
      const ageRaw = row.querySelector(".child-age").value;
      const ageStartRaw = row.querySelector(".child-age-start").value;
      const timeRaw = row.querySelector(".child-time").value;

      const age = Number(ageRaw);
      const ageStart = Number(ageStartRaw);

      let timeYears = null;
      if (timeRaw !== "") {
        const parsed = Number(timeRaw);
        if (Number.isFinite(parsed)) timeYears = parsed;
      } else if (Number.isFinite(age) && Number.isFinite(ageStart)) {
        timeYears = ageStart - age;
      }

      if (!Number.isFinite(timeYears) || timeYears < 0) {
        return null;
      }

      return {
        name: nameRaw || `Hijo ${index + 1}`,
        age: Number.isFinite(age) ? age : null,
        ageStart: Number.isFinite(ageStart) ? ageStart : null,
        timeYears,
      };
    })
    .filter((child) => child !== null);
}

function buildWithdrawalSchedule(children, semestres, costo, inflationRate) {
  const map = new Map();
  let firstMonth = null;
  let lastMonth = 0;
  let totalWithdrawals = 0;

  const programYears = Math.ceil(semestres / 2);

  const childSummaries = children.map((child) => {
    const monthsToStart = Math.max(1, Math.ceil(child.timeYears * 12));
    const yearly = [];

    for (let year = 1; year <= programYears; year += 1) {
      const semestersThisYear = year < programYears ? 2 : semestres - 2 * (programYears - 1);
      const monthForYear = monthsToStart + (year - 1) * 12;
      const inflationFactor = Math.pow(1 + inflationRate, monthForYear);
      const retiro = costo * inflationFactor * semestersThisYear;

      yearly.push({
        year,
        semesters: semestersThisYear,
        retiro,
        month: monthForYear,
      });
    }

    for (let s = 0; s < semestres; s += 1) {
      const month = monthsToStart + s * 6;
      const inflationFactor = Math.pow(1 + inflationRate, month);
      const retiro = costo * inflationFactor;

      map.set(month, (map.get(month) || 0) + retiro);
      totalWithdrawals += retiro;

      if (!firstMonth || month < firstMonth) firstMonth = month;
      if (month > lastMonth) lastMonth = month;
    }

    return {
      name: child.name,
      timeYears: child.timeYears,
      monthsToStart,
      yearly,
    };
  });

  return {
    withdrawalsByMonth: map,
    firstMonth: firstMonth || 1,
    lastMonth,
    totalWithdrawals,
    childSummaries,
    programYears,
  };
}

function computeGoalAtFirstStart(withdrawalsByMonth, firstMonth, rateAfter) {
  let goal = 0;
  withdrawalsByMonth.forEach((value, month) => {
    if (month >= firstMonth) {
      const discount = Math.pow(1 + rateAfter, month - firstMonth);
      goal += value / (discount || 1);
    }
  });
  return goal;
}

function simulateCapital(contribution, schedule, rates, contributionMonths) {
  const { withdrawalsByMonth, firstMonth, lastMonth } = schedule;
  const { rateBefore, rateAfter } = rates;

  let capital = 0;

  for (let month = 1; month <= lastMonth; month += 1) {
    const rate = month < firstMonth ? rateBefore : rateAfter;
    const withdrawal = withdrawalsByMonth.get(month) || 0;
    const aporte = month <= contributionMonths ? contribution : 0;

    capital = (capital + aporte) * (1 + rate) - withdrawal;
  }

  return capital;
}

function solveContribution(schedule, rates, contributionMonths) {
  const { lastMonth } = schedule;
  if (lastMonth <= 0) return 0;

  const baseline = simulateCapital(0, schedule, rates, contributionMonths);
  if (baseline >= 0) return 0;

  let low = 0;
  let high = 1;
  let safety = 0;

  while (simulateCapital(high, schedule, rates, contributionMonths) < 0 && safety < 60) {
    high *= 2;
    safety += 1;
  }

  for (let i = 0; i < 70; i += 1) {
    const mid = (low + high) / 2;
    const finalCap = simulateCapital(mid, schedule, rates, contributionMonths);
    if (finalCap >= 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return high;
}

function computeContributionForGoal(goal, rate, contributionMonths, monthsWithoutContribution) {
  if (goal <= 0) return 0;
  if (contributionMonths <= 0) return 0;

  if (rate === 0) {
    return goal / contributionMonths;
  }

  const accumulated = (Math.pow(1 + rate, contributionMonths) - 1) / rate;
  const growth = Math.pow(1 + rate, monthsWithoutContribution);
  const factor = accumulated * growth * (1 + rate);

  return factor > 0 ? goal / factor : 0;
}

function buildTotalTimeline(contribution, schedule, rates, contributionMonths, mode) {
  const rows = [];

  if (mode === "projection") {
    const { withdrawalsByMonth, firstMonth, lastMonth } = schedule;
    const { rateBefore, rateAfter } = rates;

    let capitalSin = 0;
    let capitalCon = 0;

    for (let month = 1; month <= lastMonth; month += 1) {
      const rate = month < firstMonth ? rateBefore : rateAfter;
      const withdrawal = withdrawalsByMonth.get(month) || 0;
      const aporte = month <= contributionMonths ? contribution : 0;

      capitalSin = capitalSin + aporte - withdrawal;
      capitalCon = (capitalCon + aporte) * (1 + rate) - withdrawal;

      rows.push({
        period: month,
        aporte,
        withdrawal,
        capitalSin,
        capitalCon,
      });
    }

    return rows;
  }

  const totalMonths = Math.max(0, schedule.firstMonth - 1);
  const rate = rates.rateBefore;

  let capitalSin = 0;
  let capitalCon = 0;

  for (let month = 1; month <= totalMonths; month += 1) {
    const aporte = month <= contributionMonths ? contribution : 0;
    capitalSin = capitalSin + aporte;
    capitalCon = (capitalCon + aporte) * (1 + rate);

    rows.push({
      period: month,
      aporte,
      withdrawal: 0,
      capitalSin,
      capitalCon,
    });
  }

  return rows;
}

function renderMonthlyTotalRows(rows) {
  rows.forEach((rowData) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${rowData.period}</td>
      <td>${formatMoney(rowData.aporte)}</td>
      <td>${formatMoney(rowData.withdrawal)}</td>
      <td>${formatMoney(rowData.capitalSin)}</td>
      <td>${formatMoney(rowData.capitalCon)}</td>
    `;
    tablaTotalBody.appendChild(row);
  });
}

function renderAnnualTotalRows(rows) {
  const annualRows = new Map();

  rows.forEach((rowData) => {
    const year = Math.ceil(rowData.period / 12);
    const current = annualRows.get(year) || {
      period: year,
      aporte: 0,
      withdrawal: 0,
      capitalSin: 0,
      capitalCon: 0,
    };

    current.aporte += rowData.aporte;
    current.withdrawal += rowData.withdrawal;
    current.capitalSin = rowData.capitalSin;
    current.capitalCon = rowData.capitalCon;

    annualRows.set(year, current);
  });

  Array.from(annualRows.values()).forEach((rowData) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${rowData.period}</td>
      <td>${formatMoney(rowData.aporte)}</td>
      <td>${formatMoney(rowData.withdrawal)}</td>
      <td>${formatMoney(rowData.capitalSin)}</td>
      <td>${formatMoney(rowData.capitalCon)}</td>
    `;
    tablaTotalBody.appendChild(row);
  });
}

function renderChildTables(childSummaries, options) {
  tablasHijos.innerHTML = "";

  childSummaries.forEach((child) => {
    const block = document.createElement("div");
    block.className = "table-block";

    const summary = `Inicio en ${child.timeYears} años (${child.monthsToStart} meses).`;

    const title = document.createElement("h3");
    title.textContent = child.name;

    const summaryEl = document.createElement("p");
    summaryEl.textContent = summary;

    block.appendChild(title);
    block.appendChild(summaryEl);

    if (options.showWithdrawals) {
      const tableWrap = document.createElement("div");
      tableWrap.className = "table-wrap";

      const table = document.createElement("table");
      table.innerHTML = `
        <thead>
          <tr>
            <th>Año</th>
            <th>Semestres</th>
            <th>Retiro anual estimado</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = table.querySelector("tbody");
      child.yearly.forEach((row) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${row.year}</td>
          <td>${row.semesters}</td>
          <td>${formatMoney(row.retiro)}</td>
        `;
        tbody.appendChild(tr);
      });

      tableWrap.appendChild(table);
      block.appendChild(tableWrap);
    }

    tablasHijos.appendChild(block);
  });
}

function renderTotalTable(contribution, schedule, rates, contributionMonths, mode, tableView) {
  tablaTotalBody.innerHTML = "";
  const rows = buildTotalTimeline(contribution, schedule, rates, contributionMonths, mode);

  if (tableView === "anual") {
    tablaPeriodoHead.textContent = "Año";
    renderAnnualTotalRows(rows);
    return;
  }

  tablaPeriodoHead.textContent = "Mes";
  renderMonthlyTotalRows(rows);
}

function calculate() {
  updatePeriodHeader();

  const costoBase = parseMoneyInput(costoInput.value);
  const duracion = Number(duracionInput.value);
  const duracionUnidad = duracionUnidadSelect.value;
  const currency = monedaSelect.value;
  const rentabilidad = Number(rentInput.value);
  const inflacion = Number(inflacionInput.value);
  const conservador = Number(conservadorInput.value);
  const aniosAporte = Number(aniosAporteInput.value);
  const children = getChildrenData();

  if (!costoBase || !duracion || children.length === 0) {
    ahorroMensualEl.textContent = "$0,00";
    ahorroMensualUsdEl.textContent = "US$0.00";
    ahorroAnualEl.textContent = "$0,00";
    ahorroAnualUsdEl.textContent = "US$0.00";
    aniosAporteResEl.textContent = "0";
    totalAportadoEl.textContent = "$0,00";
    totalAportadoUsdEl.textContent = "US$0.00";
    montoTotalEl.textContent = "$0,00";
    montoTotalUsdEl.textContent = "US$0.00";
    montoLabelEl.textContent = "Total de retiros estimados";
    montoLabelUsdEl.textContent = "Total de retiros estimados (USD)";
    tablaResumen.textContent = "Ingresa los datos para ver las tablas.";
    tablaTotalResumen.textContent = "Ingresa los datos para ver la tabla total.";
    aporteWarningEl.hidden = true;
    clearTables();
    return;
  }

  if (currency === "USD" && (!trmData || !trmData.value)) {
    trmNoteEl.textContent = "TRM no disponible para calcular en dolares.";
    ahorroMensualEl.textContent = "$0,00";
    ahorroMensualUsdEl.textContent = "US$0.00";
    ahorroAnualEl.textContent = "$0,00";
    ahorroAnualUsdEl.textContent = "US$0.00";
    aniosAporteResEl.textContent = "0";
    totalAportadoEl.textContent = "$0,00";
    totalAportadoUsdEl.textContent = "US$0.00";
    montoTotalEl.textContent = "$0,00";
    montoTotalUsdEl.textContent = "US$0.00";
    tablaResumen.textContent = "Ingresa los datos para ver las tablas.";
    tablaTotalResumen.textContent = "Ingresa los datos para ver la tabla total.";
    aporteWarningEl.hidden = true;
    clearTables();
    return;
  }

  const costoCop = currency === "USD" ? costoBase * trmData.value : costoBase;

  const semestres =
    duracionUnidad === "anios" ? Math.ceil(duracion * 2) : Math.ceil(duracion);
  const costoSemestre = duracionUnidad === "anios" ? costoCop / 2 : costoCop;

  const inflationRate = computeMonthlyRate(inflacion);
  const aggressiveRate = computeMonthlyRate(rentabilidad);
  const conservativeAnnual = inflacion + (Number.isFinite(conservador) ? conservador : 0);
  const conservativeRate = computeMonthlyRate(conservativeAnnual);

  const schedule = buildWithdrawalSchedule(children, semestres, costoSemestre, inflationRate);

  if (schedule.lastMonth <= 0) {
    ahorroMensualEl.textContent = "$0,00";
    ahorroMensualUsdEl.textContent = "US$0.00";
    ahorroAnualEl.textContent = "$0,00";
    ahorroAnualUsdEl.textContent = "US$0.00";
    aniosAporteResEl.textContent = "0";
    totalAportadoEl.textContent = "$0,00";
    totalAportadoUsdEl.textContent = "US$0.00";
    montoTotalEl.textContent = "$0,00";
    montoTotalUsdEl.textContent = "US$0.00";
    montoLabelEl.textContent = "Total de retiros estimados";
    montoLabelUsdEl.textContent = "Total de retiros estimados (USD)";
    tablaResumen.textContent = "Ingresa los datos para ver las tablas.";
    tablaTotalResumen.textContent = "Ingresa los datos para ver la tabla total.";
    aporteWarningEl.hidden = true;
    clearTables();
    return;
  }

  const firstStartMonth = schedule.firstMonth;
  const defaultContributionMonths = Math.max(0, firstStartMonth - 1);
  const maxAporteYears = defaultContributionMonths / 12;
  const optionalMonths = Number.isFinite(aniosAporte) && aniosAporte > 0
    ? Math.ceil(aniosAporte * 12)
    : null;
  const contributionMonths = optionalMonths
    ? Math.min(defaultContributionMonths, optionalMonths)
    : defaultContributionMonths;
  const contributionYears = (contributionMonths / 12).toFixed(1);

  if (Number.isFinite(aniosAporte) && aniosAporte > 0 && aniosAporte > maxAporteYears) {
    aporteWarningEl.textContent =
      `Los años de aporte no pueden ser mayores que los años hasta el primer hijo (${maxAporteYears.toFixed(1)}).`;
    aporteWarningEl.hidden = false;
  } else {
    aporteWarningEl.hidden = true;
  }

  const rates = {
    rateBefore: aggressiveRate,
    rateAfter: conservativeRate,
  };
  const tableView = tablaVistaInput ? tablaVistaInput.value : "mensual";

  let contribution = 0;
  let totalAportado = 0;
  let totalMetric = 0;
  let tableMode = "projection";

  if (proyectarRetirosInput.checked) {
    contribution = solveContribution(schedule, rates, contributionMonths);
    totalAportado = contribution * contributionMonths;
    totalMetric = schedule.totalWithdrawals;
    montoLabelEl.textContent = "Total de retiros estimados";
    tableMode = "projection";
  } else {
    const goal = computeGoalAtFirstStart(
      schedule.withdrawalsByMonth,
      firstStartMonth,
      conservativeRate
    );
    const monthsWithoutContribution = Math.max(0, defaultContributionMonths - contributionMonths);
    contribution = computeContributionForGoal(
      goal,
      aggressiveRate,
      contributionMonths,
      monthsWithoutContribution
    );
    totalAportado = contribution * contributionMonths;
    totalMetric = goal;
    montoLabelEl.textContent = "Meta al inicio del primer hijo";
    tableMode = "accumulation";
  }

  montoLabelUsdEl.textContent = `${montoLabelEl.textContent} (USD)`;

  const annualContribution = contribution * 12;

  ahorroMensualEl.textContent = formatMoney(contribution);
  ahorroAnualEl.textContent = formatMoney(annualContribution);
  aniosAporteResEl.textContent = contributionMonths > 0 ? contributionYears : "0";
  totalAportadoEl.textContent = formatMoney(totalAportado);
  montoTotalEl.textContent = formatMoney(totalMetric);

  if (trmData && trmData.value) {
    const usd = contribution / trmData.value;
    ahorroMensualUsdEl.textContent = formatUsd(usd);
    ahorroAnualUsdEl.textContent = formatUsd(annualContribution / trmData.value);
    totalAportadoUsdEl.textContent = formatUsd(totalAportado / trmData.value);
    montoTotalUsdEl.textContent = formatUsd(totalMetric / trmData.value);
  } else {
    ahorroMensualUsdEl.textContent = "US$0.00";
    ahorroAnualUsdEl.textContent = "US$0.00";
    totalAportadoUsdEl.textContent = "US$0.00";
    montoTotalUsdEl.textContent = "US$0.00";
  }

  const switchMonth = schedule.firstMonth;
  const switchYears = (switchMonth / 12).toFixed(1);
  tablaResumen.textContent = `Se calcularon ${children.length} hijo(s).`;

  if (tableMode === "projection") {
    tablaTotalResumen.textContent =
      `Aporte constante hasta el primer retiro (mes ${switchMonth}, ~${switchYears} años). ` +
      `Luego se detienen aportes y se usa rentabilidad conservadora.`;
  } else {
    tablaTotalResumen.textContent =
      "Aporte hasta el inicio del primer hijo para alcanzar la meta acumulada.";
  }

  renderChildTables(schedule.childSummaries, {
    showWithdrawals: proyectarRetirosInput.checked,
  });
  renderTotalTable(contribution, schedule, rates, contributionMonths, tableMode, tableView);
}

childrenList.addEventListener("click", (event) => {
  if (event.target.matches(".remove-child")) {
    event.target.closest(".child-row").remove();
    updateRemoveButtons();
    calculate();
  }
});

childrenList.addEventListener("input", () => {
  if (tablasHijos.children.length || tablaTotalBody.children.length) {
    calculate();
  }
});

btn.addEventListener("click", calculate);
addChildBtn.addEventListener("click", () => {
  addChildRow();
});

[
  duracionUnidadSelect,
  monedaSelect,
  costoInput,
  duracionInput,
  rentInput,
  inflacionInput,
  conservadorInput,
  aniosAporteInput,
  proyectarRetirosInput,
].forEach((input) => {
  input.addEventListener("input", () => {
    if (tablasHijos.children.length || tablaTotalBody.children.length) {
      calculate();
    }
  });
});

duracionUnidadSelect.addEventListener("change", () => {
  updateCostLabel();
  if (tablasHijos.children.length || tablaTotalBody.children.length) {
    calculate();
  }
});

monedaSelect.addEventListener("change", () => {
  if (tablasHijos.children.length || tablaTotalBody.children.length) {
    calculate();
  }
});

if (tablaVistaInput) {
  tablaVistaInput.addEventListener("change", () => {
    calculate();
  });
}

async function init() {
  addChildRow();
  updateCostLabel();
  updatePeriodHeader();
  setupMoneyInputs();
  trmData = await fetchTRM();
  updateTrmUI();
  calculate();
}

init();
