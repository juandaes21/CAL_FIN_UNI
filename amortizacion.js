const montoInput = document.getElementById("monto-amort");
const tasaInput = document.getElementById("tasa-amort");
const plazoInput = document.getElementById("plazo-amort");
const plazoUnidadInput = document.getElementById("plazo-unidad");
const metodoInput = document.getElementById("metodo-amort");
const estrategiaInput = document.getElementById("estrategia-abono");
const mantenerPagoTotalInput = document.getElementById("mantener-pago-total");
const abonoExtraInput = document.getElementById("abono-extra");
const abonoCadaInput = document.getElementById("abono-cada");
const abonoInicioInput = document.getElementById("abono-inicio");
const btnCalcular = document.getElementById("calcular-amort");
const resetAbonosTablaBtn = document.getElementById("reset-abonos-tabla");
const btnDescargarPdf = document.getElementById("descargar-amort-pdf");

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

const inlineInputFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

let customExtrasByPeriod = new Map();

function formatMoney(value) {
  return `$${moneyFmt.format(value)}`;
}

function formatInlineNumber(value) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return inlineInputFmt.format(value);
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

function shouldApplyScheduledExtra(period, config) {
  if (config.amount <= 0) return false;
  if (period < config.start) return false;
  return (period - config.start) % config.every === 0;
}

function cleanupCustomExtras(maxPeriod) {
  const keysToDelete = [];
  customExtrasByPeriod.forEach((_, key) => {
    if (!Number.isFinite(key) || key < 1 || key > maxPeriod) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => customExtrasByPeriod.delete(key));
}

function updateKeepTotalAvailability() {
  const enabled = estrategiaInput.value === "cuota";
  mantenerPagoTotalInput.disabled = !enabled;
  if (!enabled) {
    mantenerPagoTotalInput.checked = false;
  }
}

function simulateSchedule({
  amount,
  periodRate,
  periods,
  method,
  strategy,
  scheduledExtraAmount,
  scheduledExtraEvery,
  scheduledExtraStart,
  keepTotalPayment,
  targetTotalPayment,
  customExtras,
}) {
  const eps = 1e-8;
  const rows = [];

  let balance = amount;
  let totalInterest = 0;
  let totalPaid = 0;
  let firstInstallment = 0;

  const baselineFixedInstallment = annuityPayment(amount, periodRate, periods);
  const baselineConstantPrincipal = periods > 0 ? amount / periods : 0;
  const maxPeriods = periods + 360;

  for (let period = 1; period <= maxPeriods && balance > eps; period += 1) {
    const remainingPeriods = Math.max(1, periods - period + 1);
    const interest = balance * periodRate;

    let installment = 0;
    let principalScheduled = 0;

    if (method === "fija") {
      installment =
        strategy === "cuota"
          ? annuityPayment(balance, periodRate, remainingPeriods)
          : baselineFixedInstallment;
      principalScheduled = installment - interest;
    } else {
      principalScheduled =
        strategy === "cuota" ? balance / remainingPeriods : baselineConstantPrincipal;
      installment = principalScheduled + interest;
    }

    principalScheduled = Math.max(0, principalScheduled);
    if (principalScheduled > balance) {
      principalScheduled = balance;
      installment = principalScheduled + interest;
    }

    let extra = 0;
    const manualExtra = customExtras.get(period);

    if (Number.isFinite(manualExtra)) {
      extra = Math.max(0, manualExtra);
    } else {
      const scheduledExtra = shouldApplyScheduledExtra(period, {
        amount: scheduledExtraAmount,
        every: scheduledExtraEvery,
        start: scheduledExtraStart,
      })
        ? scheduledExtraAmount
        : 0;

      if (strategy === "cuota" && keepTotalPayment) {
        const requiredExtra = Math.max(0, targetTotalPayment - installment);
        extra = Math.max(scheduledExtra, requiredExtra);
      } else {
        extra = scheduledExtra;
      }
    }

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

function renderTable(rows, initialAmount) {
  tablaBodyEl.innerHTML = "";

  const startRow = document.createElement("tr");
  startRow.innerHTML = `
    <td>0</td>
    <td>${formatMoney(0)}</td>
    <td>${formatMoney(0)}</td>
    <td>${formatMoney(0)}</td>
    <td>—</td>
    <td>${formatMoney(0)}</td>
    <td>${formatMoney(initialAmount)}</td>
  `;
  tablaBodyEl.appendChild(startRow);

  rows.forEach((rowData) => {
    const period = rowData.period;
    const customExtra = customExtrasByPeriod.has(period)
      ? customExtrasByPeriod.get(period)
      : rowData.extra;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${period}</td>
      <td>${formatMoney(rowData.installment)}</td>
      <td>${formatMoney(rowData.interest)}</td>
      <td>${formatMoney(rowData.principalScheduled)}</td>
      <td>
        <input
          class="inline-money-input row-extra-input"
          type="text"
          inputmode="decimal"
          data-period="${period}"
          value="${formatInlineNumber(customExtra)}"
          placeholder="0"
        />
      </td>
      <td>${formatMoney(rowData.paymentTotal)}</td>
      <td>${formatMoney(rowData.balance)}</td>
    `;
    tablaBodyEl.appendChild(row);
  });
}

function getInputs() {
  const amount = parseMoneyInput(montoInput.value);
  const annualRate = Number(tasaInput.value);
  const termValue = Number(plazoInput.value);
  const termUnit = plazoUnidadInput.value;
  const method = metodoInput.value;
  const strategy = estrategiaInput.value;
  const keepTotalPayment = Boolean(mantenerPagoTotalInput.checked);
  const scheduledExtraAmount = parseMoneyInput(abonoExtraInput.value) || 0;
  const scheduledExtraEvery = Math.max(1, Math.ceil(Number(abonoCadaInput.value) || 1));
  const scheduledExtraStart = Math.max(1, Math.ceil(Number(abonoInicioInput.value) || 1));

  if (
    !amount ||
    amount <= 0 ||
    !termValue ||
    termValue <= 0 ||
    !Number.isFinite(annualRate)
  ) {
    return null;
  }

  const periods = termUnit === "anios" ? Math.ceil(termValue * 12) : Math.ceil(termValue);

  return {
    amount,
    annualRate,
    periods,
    method,
    strategy,
    keepTotalPayment,
    scheduledExtraAmount,
    scheduledExtraEvery,
    scheduledExtraStart,
  };
}

function calculate() {
  const input = getInputs();

  if (!input) {
    clearResults();
    return;
  }

  const periodRate = computeMonthlyRate(input.annualRate);

  const base = simulateSchedule({
    amount: input.amount,
    periodRate,
    periods: input.periods,
    method: input.method,
    strategy: "plazo",
    scheduledExtraAmount: 0,
    scheduledExtraEvery: input.scheduledExtraEvery,
    scheduledExtraStart: input.scheduledExtraStart,
    keepTotalPayment: false,
    targetTotalPayment: 0,
    customExtras: new Map(),
  });

  cleanupCustomExtras(input.periods + 360);

  const targetTotalPayment = base.firstInstallment + Math.max(0, input.scheduledExtraAmount);
  const applyKeepTotal = input.strategy === "cuota" && input.keepTotalPayment;

  const withExtra = simulateSchedule({
    amount: input.amount,
    periodRate,
    periods: input.periods,
    method: input.method,
    strategy: input.strategy,
    scheduledExtraAmount: input.scheduledExtraAmount,
    scheduledExtraEvery: input.scheduledExtraEvery,
    scheduledExtraStart: input.scheduledExtraStart,
    keepTotalPayment: applyKeepTotal,
    targetTotalPayment,
    customExtras: customExtrasByPeriod,
  });

  cleanupCustomExtras(withExtra.effectivePeriods);

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

  const methodLabel = input.method === "fija" ? "cuotas fijas" : "amortización constante";
  const strategyLabel = input.strategy === "plazo" ? "disminución de plazo" : "disminución de cuota";

  const keepTotalLabel = applyKeepTotal
    ? " Se mantiene el pago total mensual objetivo constante."
    : "";

  tablaResumenEl.textContent =
    `Método ${methodLabel}. Tabla con ${withExtra.effectivePeriods} meses.` +
    ` Estrategia: ${strategyLabel}.` +
    " El mes 0 muestra el saldo inicial igual al monto del crédito." +
    keepTotalLabel;

  noteEl.textContent =
    `Ahorro estimado en intereses: ${formatMoney(savedInterest)}.` +
    " Puedes editar el abono extra directamente en la tabla y se recalcula automáticamente.";

  renderTable(withExtra.rows, input.amount);
}

function handleTableExtraInput(event) {
  const target = event.target;
  if (!target.classList.contains("row-extra-input")) return;

  const formatted = formatMoneyInput(target.value);
  if (formatted) {
    target.value = formatted;
    target.setSelectionRange(formatted.length, formatted.length);
  }
}

function handleTableExtraChange(event) {
  const target = event.target;
  if (!target.classList.contains("row-extra-input")) return;

  const period = Number(target.dataset.period);
  if (!Number.isFinite(period) || period < 1) return;

  const parsed = parseMoneyInput(target.value);
  if (Number.isFinite(parsed) && parsed > 0) {
    customExtrasByPeriod.set(period, parsed);
    target.value = formatInlineNumber(parsed);
  } else {
    customExtrasByPeriod.delete(period);
    target.value = "";
  }

  calculate();
}

function buildTableRowsFromTbody(tbody) {
  return Array.from(tbody.querySelectorAll("tr")).map((tr) =>
    Array.from(tr.querySelectorAll("td")).map((td) => {
      const input = td.querySelector("input");
      return input ? (input.value.trim() || "0") : td.textContent.trim();
    })
  );
}

function downloadAmortizacionPdf() {
  if (!tablaBodyEl.children.length) {
    noteEl.textContent = "Primero calcula el escenario para descargar el PDF.";
    return;
  }

  if (!window.jspdf || !window.jspdf.jsPDF) {
    noteEl.textContent =
      "No se pudo cargar el generador de PDF. Revisa tu conexion e intenta de nuevo.";
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const generatedAt = new Date().toLocaleString("es-CO");

  doc.setFontSize(14);
  doc.text("Fides Financial - Reporte Amortizacion", 14, 16);
  doc.setFontSize(10);
  doc.text(`Fecha de generacion: ${generatedAt}`, 14, 23);

  const summaryRows = [
    ["Cuota inicial sin abonos", cuotaBaseEl.textContent.trim()],
    ["Cuota inicial con abonos", cuotaConEl.textContent.trim()],
    ["Intereses totales sin abonos", interesBaseEl.textContent.trim()],
    ["Intereses totales con abonos", interesConEl.textContent.trim()],
    ["Ahorro en intereses", ahorroInteresEl.textContent.trim()],
    ["Plazo sin abonos", plazoBaseEl.textContent.trim()],
    ["Plazo con abonos", plazoConEl.textContent.trim()],
    ["Reduccion de plazo", ahorroPlazoEl.textContent.trim()],
    ["Total pagado sin abonos", totalBaseEl.textContent.trim()],
    ["Total pagado con abonos", totalConEl.textContent.trim()],
  ];

  doc.autoTable({
    startY: 30,
    head: [["Indicador", "Valor"]],
    body: summaryRows,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [60, 106, 157] },
  });

  const tableHead = Array.from(
    document.querySelectorAll("section.card.table-card thead th")
  ).map((th) => th.textContent.trim());
  const tableRows = buildTableRowsFromTbody(tablaBodyEl);

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 8,
    head: [tableHead],
    body: tableRows,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [60, 106, 157] },
  });

  const fileDate = new Date().toISOString().slice(0, 10);
  doc.save(`reporte-amortizacion-${fileDate}.pdf`);
}

btnCalcular.addEventListener("click", () => {
  calculate();
});
if (btnDescargarPdf) {
  btnDescargarPdf.addEventListener("click", downloadAmortizacionPdf);
}

if (resetAbonosTablaBtn) {
  resetAbonosTablaBtn.addEventListener("click", () => {
    customExtrasByPeriod = new Map();
    calculate();
  });
}

[
  montoInput,
  tasaInput,
  plazoInput,
  plazoUnidadInput,
  metodoInput,
  estrategiaInput,
  mantenerPagoTotalInput,
  abonoExtraInput,
  abonoCadaInput,
  abonoInicioInput,
].forEach((input) => {
  input.addEventListener("input", () => {
    if (tablaBodyEl.children.length) {
      calculate();
    }
  });

  input.addEventListener("change", () => {
    if (tablaBodyEl.children.length) {
      calculate();
    }
  });
});

tablaBodyEl.addEventListener("input", handleTableExtraInput);
tablaBodyEl.addEventListener("change", handleTableExtraChange);

estrategiaInput.addEventListener("change", () => {
  updateKeepTotalAvailability();
  if (tablaBodyEl.children.length) {
    calculate();
  }
});

setupMoneyInputs();
updateKeepTotalAvailability();
clearResults();
