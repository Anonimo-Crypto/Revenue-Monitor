// ======================
// Calculadora de Ganancias - PWA
// Copyright © 2026 · Todos los derechos reservados
// ======================

const STORAGE_KEY = "calculadora_ganancias_v1";

// Estado
let datos = {
  lotes: [],      // compras
  ventas: []      // ventas realizadas
};

let chartGanancias = null; // instancia de Chart.js

// Cargar datos
function cargar() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      datos = JSON.parse(raw);
    } catch (e) {
      console.error("Error cargando datos", e);
    }
  }
}

// Guardar
function guardar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(datos));
}

// Generar ID simple
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// Formatear fecha
function formatearFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Formatear dinero
function dinero(n) {
  return "$" + Number(n).toFixed(2);
}

// ======================
// Cálculos globales
// ======================
function calcularResumen() {
  let invertido = 0;
  let vendido = 0;
  let ganancia = 0;
  let stockActual = 0;

  datos.lotes.forEach(lote => {
    invertido += lote.costoTotal;
    stockActual += lote.cantidadRestante;
  });

  datos.ventas.forEach(v => {
    vendido += v.ingreso;
    ganancia += v.ganancia;
  });

  return { invertido, vendido, ganancia, stockActual };
}

// ======================
// Render
// ======================
function renderResumen() {
  const r = calcularResumen();
  document.getElementById("res-invertido").textContent = dinero(r.invertido);
  document.getElementById("res-vendido").textContent = dinero(r.vendido);
  document.getElementById("res-ganancia").textContent = dinero(r.ganancia);
  document.getElementById("res-ganancia").className = "value " + (r.ganancia >= 0 ? "" : "negativo");
  document.getElementById("res-stock").textContent = r.stockActual + " uds";
}

function renderInventario() {
  const cont = document.getElementById("lista-inventario");
  if (datos.lotes.length === 0) {
    cont.innerHTML = `<div class="empty">No hay lotes todavía.<br>Agrega tu primera compra.</div>`;
    return;
  }

  // Agrupar por nombre de producto
  const productos = {};
  datos.lotes.forEach(lote => {
    if (!productos[lote.nombre]) {
      productos[lote.nombre] = {
        nombre: lote.nombre,
        lotes: [],
        totalRestante: 0,
        costoPromedio: 0
      };
    }
    productos[lote.nombre].lotes.push(lote);
    productos[lote.nombre].totalRestante += lote.cantidadRestante;
  });

  let html = `<ul class="lista">`;
  Object.values(productos).forEach(p => {
    const totalCosto = p.lotes.reduce((s, l) => s + (l.costoUnitario * l.cantidadRestante), 0);
    const costoProm = p.totalRestante > 0 ? totalCosto / p.totalRestante : 0;

    html += `
      <li class="${p.totalRestante === 0 ? 'agotado' : ''}">
        <div class="item-header">
          <span class="item-nombre">${p.nombre}</span>
          <span class="badge ${p.totalRestante > 0 ? 'stock' : 'agotado'}">
            ${p.totalRestante > 0 ? p.totalRestante + ' en stock' : 'Agotado'}
          </span>
        </div>
        <div class="item-detalle">
          Costo promedio: ${dinero(costoProm)}<br>
          Lotes: ${p.lotes.length}
        </div>
      </li>
    `;
  });
  html += `</ul>`;
  cont.innerHTML = html;
}

function renderHistorial() {
  const cont = document.getElementById("lista-historial");
  const items = [];

  // Combinar lotes y ventas
  datos.lotes.forEach(l => {
    items.push({
      tipo: "compra",
      id: l.id,
      fecha: l.fecha,
      nombre: l.nombre,
      texto: `Compraste ${l.cantidadInicial} uds por ${dinero(l.costoTotal)} (unit: ${dinero(l.costoUnitario)}) · Quedan ${l.cantidadRestante}`
    });
  });

  datos.ventas.forEach(v => {
    items.push({
      tipo: "venta",
      id: v.id,
      fecha: v.fecha,
      nombre: v.nombre,
      texto: `Vendiste ${v.cantidad} uds a ${dinero(v.precioUnitario)} → Ganancia: ${dinero(v.ganancia)}`
    });
  });

  // Ordenar por fecha desc
  items.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  if (items.length === 0) {
    cont.innerHTML = `<div class="empty">Aún no hay movimientos.</div>`;
    return;
  }

  let html = `<ul class="lista">`;
  items.forEach(item => {
    html += `
      <li class="${item.tipo === 'venta' ? 'venta' : ''}">
        <div class="item-header">
          <span class="item-nombre">${item.nombre}</span>
          <span class="item-fecha">${formatearFecha(item.fecha)}</span>
        </div>
        <div class="item-detalle">${item.texto}</div>
        <button class="btn-eliminar" onclick="eliminarMovimiento('${item.id}', '${item.tipo}')" title="Eliminar este movimiento">
          ✕ Eliminar
        </button>
      </li>
    `;
  });
  html += `</ul>`;
  cont.innerHTML = html;
}

function actualizarSelectProductos() {
  const select = document.getElementById("venta-producto");
  // Solo productos con stock
  const conStock = datos.lotes.filter(l => l.cantidadRestante > 0);

  // Agrupar por nombre
  const nombres = [...new Set(conStock.map(l => l.nombre))];

  select.innerHTML = `<option value="">-- Selecciona producto --</option>`;
  nombres.forEach(n => {
    const total = conStock.filter(l => l.nombre === n).reduce((s, l) => s + l.cantidadRestante, 0);
    select.innerHTML += `<option value="${n}">${n} (${total} uds)</option>`;
  });
}

// ======================
// Acciones
// ======================
function agregarLote() {
  const nombre = document.getElementById("lote-nombre").value.trim();
  const costo = parseFloat(document.getElementById("lote-costo").value);
  const cantidad = parseInt(document.getElementById("lote-cantidad").value);

  if (!nombre) return mostrarMensaje("lote-msg", "Escribe el nombre del producto.", "error");
  if (isNaN(costo) || costo < 0) return mostrarMensaje("lote-msg", "Costo inválido.", "error");
  if (isNaN(cantidad) || cantidad <= 0) return mostrarMensaje("lote-msg", "Cantidad debe ser mayor a 0.", "error");

  const lote = {
    id: uid(),
    nombre,
    cantidadInicial: cantidad,
    cantidadRestante: cantidad,
    costoTotal: costo,
    costoUnitario: costo / cantidad,
    fecha: new Date().toISOString()
  };

  datos.lotes.push(lote);
  guardar();
  limpiarFormulario("lote");
  mostrarMensaje("lote-msg", `Lote de ${nombre} agregado correctamente.`, "exito");
  actualizarTodo();
}

function registrarVenta() {
  const nombre = document.getElementById("venta-producto").value;
  const cantidad = parseInt(document.getElementById("venta-cantidad").value);
  const precio = parseFloat(document.getElementById("venta-precio").value);

  if (!nombre) return mostrarMensaje("venta-msg", "Selecciona un producto.", "error");
  if (isNaN(cantidad) || cantidad <= 0) return mostrarMensaje("venta-msg", "Cantidad inválida.", "error");
  if (isNaN(precio) || precio < 0) return mostrarMensaje("venta-msg", "Precio inválido.", "error");

  // Buscar lotes con stock de ese producto (FIFO)
  const lotesDisponibles = datos.lotes
    .filter(l => l.nombre === nombre && l.cantidadRestante > 0)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  let pendiente = cantidad;
  let costoTotalVenta = 0;
  const detalles = [];

  for (const lote of lotesDisponibles) {
    if (pendiente <= 0) break;
    const tomar = Math.min(pendiente, lote.cantidadRestante);
    costoTotalVenta += tomar * lote.costoUnitario;
    lote.cantidadRestante -= tomar;
    pendiente -= tomar;
    detalles.push({ loteId: lote.id, cantidad: tomar });
  }

  if (pendiente > 0) {
    return mostrarMensaje("venta-msg", `No hay suficiente stock. Faltan ${pendiente} unidades.`, "error");
  }

  const ingreso = precio * cantidad;
  const ganancia = ingreso - costoTotalVenta;

  const venta = {
    id: uid(),
    nombre,
    cantidad,
    precioUnitario: precio,
    ingreso,
    costo: costoTotalVenta,
    ganancia,
    fecha: new Date().toISOString(),
    detalles
  };

  datos.ventas.push(venta);
  guardar();
  limpiarFormulario("venta");
  mostrarMensaje("venta-msg", `Venta registrada. Ganancia: ${dinero(ganancia)}`, "exito");
  actualizarTodo();
}

function borrarTodo() {
  if (!confirm("¿Seguro que quieres borrar TODOS los datos? Esta acción no se puede deshacer.")) return;
  datos = { lotes: [], ventas: [] };
  guardar();
  actualizarTodo();
  alert("Datos borrados.");
}

// Eliminar un movimiento individual (venta o compra)
function eliminarMovimiento(id, tipo) {
  if (tipo === "venta") {
    const venta = datos.ventas.find(v => v.id === id);
    if (!venta) return alert("No se encontró la venta.");

    if (!confirm(`¿Eliminar esta venta de "${venta.nombre}"?\n\nSe devolverán ${venta.cantidad} unidades al stock y se restará la ganancia.`)) {
      return;
    }

    // Devolver unidades a los lotes originales (usando los detalles FIFO)
    if (venta.detalles && venta.detalles.length > 0) {
      venta.detalles.forEach(d => {
        const lote = datos.lotes.find(l => l.id === d.loteId);
        if (lote) {
          lote.cantidadRestante += d.cantidad;
        }
      });
    } else {
      // Fallback por si no hay detalles (datos antiguos): devolver al primer lote del mismo producto
      let pendiente = venta.cantidad;
      const lotesProducto = datos.lotes
        .filter(l => l.nombre === venta.nombre)
        .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

      for (const lote of lotesProducto) {
        if (pendiente <= 0) break;
        const espacio = lote.cantidadInicial - lote.cantidadRestante;
        const devolver = Math.min(pendiente, espacio);
        lote.cantidadRestante += devolver;
        pendiente -= devolver;
      }
    }

    // Quitar la venta
    datos.ventas = datos.ventas.filter(v => v.id !== id);
    guardar();
    actualizarTodo();
    alert("Venta eliminada. Stock y ganancias actualizados.");

  } else if (tipo === "compra") {
    const lote = datos.lotes.find(l => l.id === id);
    if (!lote) return alert("No se encontró el lote.");

    // Solo permitir borrar si no se ha vendido nada de ese lote
    if (lote.cantidadRestante !== lote.cantidadInicial) {
      alert(`No se puede eliminar este lote porque ya se vendieron unidades de él.\n\nQuedan ${lote.cantidadRestante} de ${lote.cantidadInicial}.\nPrimero elimina las ventas relacionadas.`);
      return;
    }

    if (!confirm(`¿Eliminar este lote de compra de "${lote.nombre}"?\n\nSe restará del invertido.`)) {
      return;
    }

    datos.lotes = datos.lotes.filter(l => l.id !== id);
    guardar();
    actualizarTodo();
    alert("Lote eliminado.");
  }
}

// ======================
// Exportar a CSV (bien estructurado)
// ======================
function exportarCSV() {
  if (datos.lotes.length === 0 && datos.ventas.length === 0) {
    alert("No hay datos para exportar.");
    return;
  }

  const filas = [];

  // Encabezado principal
  filas.push(["TIPO", "FECHA", "PRODUCTO", "CANTIDAD", "COSTO_UNITARIO", "COSTO_TOTAL", "PRECIO_VENTA_UNIT", "INGRESO", "GANANCIA", "STOCK_RESTANTE", "ID"]);

  // Lotes (compras)
  datos.lotes.forEach(l => {
    filas.push([
      "COMPRA",
      l.fecha,
      l.nombre,
      l.cantidadInicial,
      l.costoUnitario.toFixed(4),
      l.costoTotal.toFixed(2),
      "",
      "",
      "",
      l.cantidadRestante,
      l.id
    ]);
  });

  // Ventas
  datos.ventas.forEach(v => {
    filas.push([
      "VENTA",
      v.fecha,
      v.nombre,
      v.cantidad,
      (v.costo / v.cantidad).toFixed(4),
      v.costo.toFixed(2),
      v.precioUnitario.toFixed(2),
      v.ingreso.toFixed(2),
      v.ganancia.toFixed(2),
      "",
      v.id
    ]);
  });

  // Separador + Resumen
  filas.push([]);
  filas.push(["=== RESUMEN ==="]);
  const r = calcularResumen();
  filas.push(["Total Invertido", r.invertido.toFixed(2)]);
  filas.push(["Total Vendido", r.vendido.toFixed(2)]);
  filas.push(["Ganancia Neta", r.ganancia.toFixed(2)]);
  filas.push(["Stock Actual (unidades)", r.stockActual]);
  filas.push([]);
  filas.push(["Exportado el", new Date().toISOString()]);
  filas.push(["Calculadora de Ganancias"]);

  // Convertir a CSV (escapando comillas y comas)
  const csvContent = filas.map(fila => {
    return fila.map(campo => {
      const str = String(campo ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(",");
  }).join("\n");

  // BOM para que Excel abra bien los acentos
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `ganancias_export_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ======================
// Importar desde CSV
// ======================
function importarCSV(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!confirm("¿Importar este archivo CSV?\n\nSe REEMPLAZARÁN todos los datos actuales por los del archivo.\nAsegúrate de haber exportado antes si quieres conservar una copia.")) {
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      let text = e.target.result;
      // Quitar BOM si existe
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

      const lineas = text.split(/\r?\n/).filter(l => l.trim() !== "");
      if (lineas.length < 2) throw new Error("Archivo vacío o inválido");

      const nuevosLotes = [];
      const nuevasVentas = [];

      // Saltar la cabecera (primera línea)
      for (let i = 1; i < lineas.length; i++) {
        const linea = lineas[i].trim();
        if (!linea || linea.startsWith("===") || linea.startsWith("Total ") || linea.startsWith("Exportado") || linea.startsWith("Calculadora") || linea.startsWith("Ganancia Neta") || linea.startsWith("Stock Actual")) {
          continue;
        }

        // Parsear CSV simple (respetando comillas)
        const cols = parseCSVLine(linea);
        if (cols.length < 3) continue;

        const tipo = (cols[0] || "").toUpperCase().trim();

        if (tipo === "COMPRA") {
          const cantidad = parseInt(cols[3]) || 0;
          const costoUnitario = parseFloat(cols[4]) || 0;
          const costoTotal = parseFloat(cols[5]) || 0;
          const stockRestante = parseInt(cols[9]) || cantidad;
          const id = cols[10] || uid();

          nuevosLotes.push({
            id: id,
            nombre: cols[2] || "Sin nombre",
            cantidadInicial: cantidad,
            cantidadRestante: stockRestante,
            costoTotal: costoTotal,
            costoUnitario: costoUnitario,
            fecha: cols[1] || new Date().toISOString()
          });
        } else if (tipo === "VENTA") {
          const cantidad = parseInt(cols[3]) || 0;
          const costoUnitario = parseFloat(cols[4]) || 0;
          const costoTotal = parseFloat(cols[5]) || 0;
          const precioUnitario = parseFloat(cols[6]) || 0;
          const ingreso = parseFloat(cols[7]) || (precioUnitario * cantidad);
          const ganancia = parseFloat(cols[8]) || (ingreso - costoTotal);
          const id = cols[10] || uid();

          nuevasVentas.push({
            id: id,
            nombre: cols[2] || "Sin nombre",
            cantidad: cantidad,
            precioUnitario: precioUnitario,
            ingreso: ingreso,
            costo: costoTotal,
            ganancia: ganancia,
            fecha: cols[1] || new Date().toISOString(),
            detalles: [] // no tenemos detalles en el CSV, se usará fallback al eliminar
          });
        }
      }

      // Reemplazar datos
      datos.lotes = nuevosLotes;
      datos.ventas = nuevasVentas;
      guardar();
      actualizarTodo();

      alert(`Importación exitosa.\n\nLotes restaurados: ${nuevosLotes.length}\nVentas restauradas: ${nuevasVentas.length}`);
    } catch (err) {
      console.error(err);
      alert("Error al importar el CSV.\nAsegúrate de que sea un archivo exportado desde esta misma aplicación.");
    }

    // Limpiar el input para poder volver a seleccionar el mismo archivo
    event.target.value = "";
  };

  reader.readAsText(file, "UTF-8");
}

// Parser simple de una línea CSV (soporta comillas)
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ======================
// Helpers UI
// ======================
function mostrarMensaje(id, texto, tipo) {
  const el = document.getElementById(id);
  el.textContent = texto;
  el.className = "mensaje " + tipo;
  el.classList.remove("oculto");
  setTimeout(() => el.classList.add("oculto"), 4000);
}

function limpiarFormulario(tipo) {
  if (tipo === "lote") {
    document.getElementById("lote-nombre").value = "";
    document.getElementById("lote-costo").value = "";
    document.getElementById("lote-cantidad").value = "";
  } else {
    document.getElementById("venta-cantidad").value = "";
    document.getElementById("venta-precio").value = "";
  }
}

function cambiarTab(tabId) {
  // Tabs
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  document.querySelector(`[data-tab="${tabId}"]`).classList.add("active");

  // Sections
  document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
  document.getElementById("sec-" + tabId).classList.add("active");

  // Re-render chart when opening the tab (fixes size issues)
  if (tabId === "grafico") {
    setTimeout(renderGrafico, 50);
  }
}

function renderGrafico() {
  const canvas = document.getElementById("chartGanancias");
  const vacio = document.getElementById("grafico-vacio");

  if (!canvas) return;

  // Si no hay ventas
  if (datos.ventas.length === 0) {
    vacio.classList.remove("oculto");
    canvas.style.display = "none";
    if (chartGanancias) {
      chartGanancias.destroy();
      chartGanancias = null;
    }
    return;
  }

  vacio.classList.add("oculto");
  canvas.style.display = "block";

  // Ordenar ventas por fecha ascendente
  const ventasOrdenadas = [...datos.ventas].sort(
    (a, b) => new Date(a.fecha) - new Date(b.fecha)
  );

  const labels = [];
  const ganancias = [];
  const acumulado = [];
  let suma = 0;

  ventasOrdenadas.forEach(v => {
    const d = new Date(v.fecha);
    labels.push(
      d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) +
      " " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
    );
    ganancias.push(Number(v.ganancia.toFixed(2)));
    suma += v.ganancia;
    acumulado.push(Number(suma.toFixed(2)));
  });

  // Destruir gráfico anterior si existe
  if (chartGanancias) {
    chartGanancias.destroy();
  }

  const ctx = canvas.getContext("2d");
  chartGanancias = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Ganancia por venta",
          data: ganancias,
          backgroundColor: ganancias.map(g => g >= 0 ? "rgba(0, 255, 0, 0.6)" : "rgba(255, 80, 80, 0.6)"),
          borderColor: ganancias.map(g => g >= 0 ? "#0f0" : "#f55"),
          borderWidth: 1,
          borderRadius: 4,
          order: 2
        },
        {
          label: "Ganancia acumulada",
          data: acumulado,
          type: "line",
          borderColor: "#0af",
          backgroundColor: "rgba(0, 170, 255, 0.1)",
          borderWidth: 2,
          pointRadius: 4,
          pointBackgroundColor: "#0af",
          tension: 0.3,
          fill: false,
          order: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          labels: { color: "#ccc", font: { size: 12 } }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return context.dataset.label + ": $" + context.raw.toFixed(2);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#888", maxRotation: 45, minRotation: 30, font: { size: 10 } },
          grid: { color: "#333" }
        },
        y: {
          ticks: {
            color: "#888",
            callback: function(value) { return "$" + value; }
          },
          grid: { color: "#333" }
        }
      }
    }
  });
}

function actualizarTodo() {
  renderResumen();
  renderInventario();
  renderHistorial();
  actualizarSelectProductos();
  renderGrafico();
}

// ======================
// Inicio
// ======================
document.addEventListener("DOMContentLoaded", () => {
  cargar();
  actualizarTodo();

  // Eventos tabs
  document.querySelectorAll(".tab").forEach(btn => {
    btn.addEventListener("click", () => cambiarTab(btn.dataset.tab));
  });
});
