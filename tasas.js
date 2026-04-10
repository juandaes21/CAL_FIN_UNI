const tasaValorInput = document.getElementById("tasa-valor");
const tasaOrigenInput = document.getElementById("tasa-origen");
const tasaDestinoInput = document.getElementById("tasa-destino");
const btnConvertir = document.getElementById("convertir-tasa");

const tasaResultadoEl = document.getElementById("tasa-resultado");
const tasaEaEl = document.getElementById("tasa-ea");
const tablaBodyEl = document.getElementById("tabla-tasas-body");
const tablaResumenEl = document.getElementById("tabla-tasas-resumen");
const noteEl = document.getElementById("tasas-note");

const rateTypes = [
  { code: "ea", label: "Efectiva anual (E.A.)", kind: "effective", m: 1 },
  { code: "em", label: "Efectiva mensual (E.M.)", kind: "effective", m: 12 },
  { code: "etv", label: "Efectiva trimestral (E.T.V.)", kind: "effective", m: 4 },
  { code: "esv", label: "Efectiva semestral (E.S.V.)", kind: "effective", m: 2 },
  { code: "nmv", label: "Nominal mensual vencida (N.M.V.)", kind: "effective", m: 12 },
  { code: "namv", label: "Nominal anual mes vencido (N.A.M.V.)", kind: "nominal", m: 12 },
  { code: "natv", label: "Nominal anual trimestre vencido (N.A.T.V.)", kind: "nominal", m: 4 },
  { code: "nasv", label: "Nominal anual semestre vencido (N.A.S.V.)", kind: "nominal", m: 2 },
];

const rateMap = new Map(rateTypes.map((item) => [item.code, item]));

const percentFmt = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 4,
  maximumFractionDigits: 6,
});

function formatPercent(decimalRate) {
  return `${percentFmt.format(decimalRate * 100)}%`;
}

function clearResults() {
  tasaResultadoEl.textContent = "0,0000%";
  tasaEaEl.textContent = "0,0000%";
  noteEl.textContent = "Ingresa una tasa para convertir.";
  tablaResumenEl.textContent = "Se muestran las equivalencias de la tasa ingresada.";
  tablaBodyEl.innerHTML = "";
}

function fillRateSelects() {
  const options = rateTypes
    .map((item) => `<option value="${item.code}">${item.label}</option>`)
    .join("");
  tasaOrigenInput.innerHTML = options;
  tasaDestinoInput.innerHTML = options;

  tasaOrigenInput.value = "ea";
  tasaDestinoInput.value = "em";
}

function toEffectiveAnnual(valuePct, type) {
  const rate = valuePct / 100;
  if (type.kind === "effective") {
    return Math.pow(1 + rate, type.m) - 1;
  }

  const periodic = rate / type.m;
  return Math.pow(1 + periodic, type.m) - 1;
}

function fromEffectiveAnnual(eaRate, type) {
  const periodic = Math.pow(1 + eaRate, 1 / type.m) - 1;

  if (type.kind === "effective") {
    return periodic;
  }
  return periodic * type.m;
}

function renderEquivalences(eaRate) {
  tablaBodyEl.innerHTML = "";

  rateTypes.forEach((type) => {
    const eq = fromEffectiveAnnual(eaRate, type);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${type.label}</td>
      <td>${formatPercent(eq)}</td>
    `;
    tablaBodyEl.appendChild(row);
  });
}

function convertRate() {
  const value = Number(tasaValorInput.value);
  const origin = rateMap.get(tasaOrigenInput.value);
  const target = rateMap.get(tasaDestinoInput.value);

  if (!Number.isFinite(value) || value < 0 || !origin || !target) {
    clearResults();
    return;
  }

  const eaRate = toEffectiveAnnual(value, origin);
  const targetRate = fromEffectiveAnnual(eaRate, target);

  tasaResultadoEl.textContent = formatPercent(targetRate);
  tasaEaEl.textContent = formatPercent(eaRate);
  noteEl.textContent = `${origin.label} convertida a ${target.label}.`;
  tablaResumenEl.textContent = `Equivalencias para ${formatPercent(eaRate)} E.A.`;

  renderEquivalences(eaRate);
}

btnConvertir.addEventListener("click", convertRate);

[tasaValorInput, tasaOrigenInput, tasaDestinoInput].forEach((input) => {
  input.addEventListener("input", () => {
    if (tablaBodyEl.children.length) {
      convertRate();
    }
  });
  input.addEventListener("change", () => {
    if (tablaBodyEl.children.length) {
      convertRate();
    }
  });
});

fillRateSelects();
clearResults();
