const costoInput = document.getElementById("costo");
const semestresInput = document.getElementById("semestres");
const aniosInput = document.getElementById("anios");
const rentInput = document.getElementById("rentabilidad");
const inflacionInput = document.getElementById("inflacion");
const btn = document.getElementById("calcular");

const ahorroMensualEl = document.getElementById("ahorro-mensual");
const montoTotalEl = document.getElementById("monto-total");
const mesesEl = document.getElementById("meses");
const tasaMensualEl = document.getElementById("tasa-mensual");
const tablaBody = document.getElementById("tabla-body");
const tablaResumen = document.getElementById("tabla-resumen");

const moneyFmt = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFmt = new Intl.NumberFormat("es-ES", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

function formatMoney(value) {
  return `$${moneyFmt.format(value)}`;
}

function clearTable() {
  tablaBody.innerHTML = "";
}

function computeMonthlyRate(annualRate) {
  if (!Number.isFinite(annualRate) || annualRate <= 0) return 0;
  return Math.pow(1 + annualRate / 100, 1 / 12) - 1;
}

function calculate() {
  const costo = Number(costoInput.value);
  const semestres = Number(semestresInput.value);
  const aniosRaw = aniosInput.value;
  const anios = Number(aniosRaw);
  const rentabilidad = Number(rentInput.value);
  const inflacion = Number(inflacionInput.value);

  if (!costo || !semestres || aniosRaw === "" || isNaN(anios)) {
    ahorroMensualEl.textContent = "$0,00";
    montoTotalEl.textContent = "$0,00";
    mesesEl.textContent = "0";
    tasaMensualEl.textContent = "0%";
    tablaResumen.textContent = "Ingresa los datos para ver la tabla.";
    clearTable();
    return;
  }

  const totalBase = costo * semestres;
  const meses = Math.max(1, Math.ceil(anios * 12));
  const tasaMensual = computeMonthlyRate(rentabilidad);
  const inflacionMensual = computeMonthlyRate(inflacion);
  const total = totalBase * Math.pow(1 + inflacionMensual, meses);

  let ahorroMensual = 0;
  if (tasaMensual === 0) {
    ahorroMensual = total / meses;
  } else {
    ahorroMensual = (total * tasaMensual) / (Math.pow(1 + tasaMensual, meses) - 1);
  }

  ahorroMensualEl.textContent = formatMoney(ahorroMensual);
  montoTotalEl.textContent = formatMoney(total);
  mesesEl.textContent = `${meses}`;
  tasaMensualEl.textContent = `${percentFmt.format(tasaMensual * 100)}%`;

  tablaResumen.textContent = `Si ahorras ${formatMoney(
    ahorroMensual
  )} al mes durante ${meses} meses, alcanzarás el objetivo ajustado por inflación.`;

  clearTable();
  const fragment = document.createDocumentFragment();

  let capitalSin = 0;
  let capitalCon = 0;

  for (let mes = 1; mes <= meses; mes += 1) {
    capitalSin += ahorroMensual;
    capitalCon = capitalCon * (1 + tasaMensual) + ahorroMensual;

    const row = document.createElement("tr");

    const mesCell = document.createElement("td");
    mesCell.textContent = mes;

    const ahorroCell = document.createElement("td");
    ahorroCell.textContent = formatMoney(ahorroMensual);

    const sinCell = document.createElement("td");
    sinCell.textContent = formatMoney(capitalSin);

    const conCell = document.createElement("td");
    conCell.textContent = formatMoney(capitalCon);

    row.append(mesCell, ahorroCell, sinCell, conCell);
    fragment.appendChild(row);
  }

  tablaBody.appendChild(fragment);
}

btn.addEventListener("click", calculate);
[costoInput, semestresInput, aniosInput, rentInput, inflacionInput].forEach((input) => {
  input.addEventListener("input", () => {
    if (tablaBody.children.length) {
      calculate();
    }
  });
});

calculate();