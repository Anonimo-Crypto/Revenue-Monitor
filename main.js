// ======================
// Calculadora de Ganancias - PWA
// Copyright © 2026
// Oscar Antonio Alvarez Collado
// ======================

const STORAGE_KEY = "calculadora_ganancias_v2";

let store = {
  sesiones: [],
  sesionActivaId: null
};

let chartGanancias = null;
let modalSesionModo = "crear"; // crear | editar
let modalPrecioProducto = null;

// ---------- Helpers ----------
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function dinero(n) {
  return "$" + Number(n || 0).toFixed(2);
}

function formatearFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", {
    day: "2-digit", month: "2-digit", year: "2-digit",
    hour: "2-digit", minute: "2-digit"
  });
}

function sesionActiva() {
  return store.sesiones.find(s => s.id === store.sesionActivaId) || store.sesiones[0];
}

// ---------- Persistencia ----------
function cargar() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      store = JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
  }

  // Migración desde v1 (sin sesiones)
  if (!store.sesiones || store.sesiones.length === 0) {
    const old = localStorage.getItem("calculadora_ganancias_v1");
    if (old) {
      try {
        const oldData = JSON.parse(old);
        const s = {
          id: uid(),
          nombre: "Principal",
          lotes: oldData.lotes || [],
          ventas: oldData.ventas || [],
          precios: {}
        };
        store = { sesiones: [s], sesionActivaId: s.id };
        guardar();
      } catch (e) { /* ignore */ }
    }
  }

  if (!store.sesiones || store.sesiones.length === 0) {
    const s = { id: uid(), nombre: "Principal", lotes: [], ventas: [], precios: {} };
    store = { sesiones: [s], sesionActivaId: s.id };
    guardar();
  }

  if (!store.sesionActivaId || !store.sesiones.find(s => s.id === store.sesionActivaId)) {
    store.sesionActivaId = store.sesiones[0].id;
  }

  // Asegurar campo precios
  store.sesiones.forEach(s => {
    if (!s.precios) s.precios = {};
  });
}

function guardar() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// ---------- Navegación ----------
function irA(nombre) {
  document.querySelectorAll(".pantalla").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  const pant = document.getElementById("pantalla-" + nombre);
  if (pant) pant.classList.add("active");

  const nav = document.querySelector(`.nav-item[data-pantalla="${nombre}"]`);
  if (nav) nav.classList.add("active");

  if (nombre === "grafico") setTimeout(renderGrafico, 60);
  if (nombre === "venta") {
    actualizarSelectProductos();
    actualizarSelectPrecios();
  }
}

// ---------- Sesiones ----------
function renderSesionesSelect() {
  const sel = document.getElementById("sesion-select");
  sel.innerHTML = "";
  store.sesiones.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.id;
    opt.textContent = s.nombre;
    if (s.id === store.sesionActivaId) opt.selected = true;
    sel.appendChild(opt);
  });
}

function cambiarSesion(id) {
  store.sesionActivaId = id;
  guardar();
  actualizarTodo();
}

function abrirModalSesion() {
  modalSesionModo = "crear";
  document.getElementById("modal-sesion-titulo").textContent = "Nueva sesión";
  document.getElementById("modal-sesion-nombre").value = "";
  document.getElementById("modal-sesion-ok").textContent = "Crear";
  document.getElementById("modal-sesion").classList.remove("oculto");
  setTimeout(() => document.getElementById("modal-sesion-nombre").focus(), 100);
}

function editarSesionActual() {
  const s = sesionActiva();
  if (!s) return;
  modalSesionModo = "editar";
  document.getElementById("modal-sesion-titulo").textContent = "Renombrar sesión";
  document.getElementById("modal-sesion-nombre").value = s.nombre;
  document.getElementById("modal-sesion-ok").textContent = "Guardar";
  document.getElementById("modal-sesion").classList.remove("oculto");
  setTimeout(() => document.getElementById("modal-sesion-nombre").focus(), 100);
}

function cerrarModalSesion() {
  document.getElementById("modal-sesion").classList.add("oculto");
}

function guardarSesionModal() {
  const nombre = document.getElementById("modal-sesion-nombre").value.trim();
  if (!nombre) return alert("Escribe un nombre para la sesión.");

  if (modalSesionModo === "crear") {
    const s = { id: uid(), nombre, lotes: [], ventas: [], precios: {} };
    store.sesiones.push(s);
    store.sesionActivaId = s.id;
  } else {
    const s = sesionActiva();
    if (s) s.nombre = nombre;
  }
  guardar();
  cerrarModalSesion();
  actualizarTodo();
}

function eliminarSesionActual() {
  if (store.sesiones.length <= 1) {
    return alert("No puedes eliminar la única sesión. Crea otra primero.");
  }
  const s = sesionActiva();
  if (!confirm(`¿Eliminar la sesión "${s.nombre}" y TODOS sus datos?\nEsta acción no se puede deshacer.`)) return;

  store.sesiones = store.sesiones.filter(x => x.id !== s.id);
  store.sesionActivaId = store.sesiones[0].id;
  guardar();
  actualizarTodo();
  alert("Sesión eliminada.");
}

// ---------- Cálculos ----------
function calcularResumen() {
  const s = sesionActiva();
  let invertido = 0, vendido = 0, ganancia = 0, stockActual = 0;
  s.lotes.forEach(l => {
    invertido += l.costoTotal;
    stockActual += l.cantidadRestante;
  });
  s.ventas.forEach(v => {
    vendido += v.ingreso;
    ganancia += v.ganancia;
  });
  return { invertido, vendido, ganancia, stockActual };
}

// ---------- Render ----------
function renderResumen() {
  const r = calcularResumen();
  document.getElementById("res-invertido").textContent = dinero(r.invertido);
  document.getElementById("res-vendido").textContent = dinero(r.vendido);
  const gEl = document.getElementById("res-ganancia");
  gEl.textContent = dinero(r.ganancia);
  gEl.className = "value" + (r.ganancia < 0 ? " negativo" : "");
  document.getElementById("res-stock").textContent = r.stockActual + " uds";
}

function renderInventario() {
  const cont = document.getElementById("lista-inventario");
  const s = sesionActiva();

  if (s.lotes.length === 0) {
    cont.innerHTML = `<div class="empty">No hay productos todavía.<br>Agrega un lote desde Inicio.</div>`;
    return;
  }

  const productos = {};
  s.lotes.forEach(lote => {
    if (!productos[lote.nombre]) {
      productos[lote.nombre] = {
        nombre: lote.nombre,
        lotes: [],
        totalRestante: 0,
        costoTotalRestante: 0
      };
    }
    productos[lote.nombre].lotes.push(lote);
    productos[lote.nombre].totalRestante += lote.cantidadRestante;
    productos[lote.nombre].costoTotalRestante += lote.costoUnitario * lote.cantidadRestante;
  });

  let html = "";
  Object.values(productos).forEach(p => {
    const costoProm = p.totalRestante > 0 ? p.costoTotalRestante / p.totalRestante : 0;
    const precioDef = s.precios[p.nombre];
    const agotado = p.totalRestante === 0;

    html += `
      <div class="prod-card ${agotado ? 'agotado' : ''}">
        <div class="prod-nombre">${p.nombre}</div>
        <div class="prod-grid">
          <div><span>Stock</span><br><strong>${p.totalRestante} uds</strong></div>
          <div><span>Lotes</span><br><strong>${p.lotes.length}</strong></div>
          <div><span>Costo prom.</span><br><strong>${dinero(costoProm)}</strong></div>
          <div><span>P. venta</span><br><strong>${precioDef != null ? dinero(precioDef) : "—"}</strong></div>
        </div>
        <div class="prod-actions">
          <button class="btn btn-secondary btn-small" onclick="abrirModalPrecio('${p.nombre.replace(/'/g, "\\'")}')">
            ${precioDef != null ? "Cambiar precio" : "Poner precio"}
          </button>
          <button class="btn-eliminar" onclick="eliminarProducto('${p.nombre.replace(/'/g, "\\'")}')">
            ✕ Eliminar producto
          </button>
        </div>
      </div>
    `;
  });
  cont.innerHTML = html;
}

function renderHistorial() {
  const cont = document.getElementById("lista-historial");
  const s = sesionActiva();
  const items = [];

  s.lotes.forEach(l => {
    items.push({
      tipo: "compra",
      id: l.id,
      fecha: l.fecha,
      nombre: l.nombre,
      texto: `Compraste ${l.cantidadInicial} uds por ${dinero(l.costoTotal)} (unit: ${dinero(l.costoUnitario)}) · Quedan ${l.cantidadRestante}`
    });
  });

  s.ventas.forEach(v => {
    items.push({
      tipo: "venta",
      id: v.id,
      fecha: v.fecha,
      nombre: v.nombre,
      texto: `Vendiste ${v.cantidad} uds a ${dinero(v.precioUnitario)} → Ganancia: ${dinero(v.ganancia)}`
    });
  });

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
        <button class="btn-eliminar" onclick="eliminarMovimiento('${item.id}', '${item.tipo}')">
          ✕ Eliminar
        </button>
      </li>
    `;
  });
  html += `</ul>`;
  cont.innerHTML = html;
}

function renderGrafico() {
  const canvas = document.getElementById("chartGanancias");
  const vacio = document.getElementById("grafico-vacio");
  const s = sesionActiva();
  if (!canvas) return;

  if (s.ventas.length === 0) {
    vacio.classList.remove("oculto");
    canvas.style.display = "none";
    document.getElementById("stats-grafico").style.display = "none";
    if (chartGanancias) { chartGanancias.destroy(); chartGanancias = null; }
    return;
  }

  vacio.classList.add("oculto");
  canvas.style.display = "block";
  document.getElementById("stats-grafico").style.display = "grid";

  const ventasOrd = [...s.ventas].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const labels = [], ganancias = [], acumulado = [];
  let suma = 0;

  ventasOrd.forEach(v => {
    const d = new Date(v.fecha);
    labels.push(
      d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) +
      " " + d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
    );
    ganancias.push(Number(v.ganancia.toFixed(2)));
    suma += v.ganancia;
    acumulado.push(Number(suma.toFixed(2)));
  });

  // Stats
  const nums = ventasOrd.map(v => v.ganancia);
  const promedio = nums.reduce((a, b) => a + b, 0) / nums.length;
  const mejor = Math.max(...nums);
  const peor = Math.min(...nums);

  document.getElementById("stat-num-ventas").textContent = nums.length;
  document.getElementById("stat-promedio").textContent = dinero(promedio);
  document.getElementById("stat-mejor").textContent = dinero(mejor);
  const peorEl = document.getElementById("stat-peor");
  peorEl.textContent = dinero(peor);
  peorEl.className = "stat-value" + (peor < 0 ? " neg" : "");

  if (chartGanancias) chartGanancias.destroy();

  const ctx = canvas.getContext("2d");
  chartGanancias = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Ganancia por venta",
          data: ganancias,
          backgroundColor: ganancias.map(g => g >= 0 ? "rgba(0,230,118,0.55)" : "rgba(255,82,82,0.55)"),
          borderColor: ganancias.map(g => g >= 0 ? "#00e676" : "#ff5252"),
          borderWidth: 1,
          borderRadius: 4,
          order: 2
        },
        {
          label: "Ganancia acumulada",
          data: acumulado,
          type: "line",
          borderColor: "#40c4ff",
          backgroundColor: "rgba(64,196,255,0.1)",
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: "#40c4ff",
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
        legend: { labels: { color: "#ccc", font: { size: 11 } } },
        tooltip: {
          callbacks: {
            label: ctx => ctx.dataset.label + ": $" + ctx.raw.toFixed(2)
          }
        }
      },
      scales: {
        x: {
          ticks: { color: "#888", maxRotation: 45, minRotation: 30, font: { size: 9 } },
          grid: { color: "#2a2a2a" }
        },
        y: {
          ticks: { color: "#888", callback: v => "$" + v },
          grid: { color: "#2a2a2a" }
        }
      }
    }
  });
}

function actualizarSelectProductos() {
  const select = document.getElementById("venta-producto");
  const s = sesionActiva();
  const conStock = s.lotes.filter(l => l.cantidadRestante > 0);
  const nombres = [...new Set(conStock.map(l => l.nombre))];

  select.innerHTML = `<option value="">-- Selecciona producto --</option>`;
  nombres.forEach(n => {
    const total = conStock.filter(l => l.nombre === n).reduce((sum, l) => sum + l.cantidadRestante, 0);
    select.innerHTML += `<option value="${n}">${n} (${total} uds)</option>`;
  });
}

function actualizarSelectPrecios() {
  const select = document.getElementById("precio-producto");
  const s = sesionActiva();
  const nombres = [...new Set(s.lotes.map(l => l.nombre))];
  select.innerHTML = `<option value="">-- Selecciona --</option>`;
  nombres.forEach(n => {
    const p = s.precios[n];
    select.innerHTML += `<option value="${n}">${n}${p != null ? " (" + dinero(p) + ")" : ""}</option>`;
  });
}

function onProductoVentaChange() {
  const nombre = document.getElementById("venta-producto").value;
  const box = document.getElementById("precio-auto-info");
  const inputPrecio = document.getElementById("venta-precio");
  const s = sesionActiva();

  if (nombre && s.precios[nombre] != null) {
    inputPrecio.value = s.precios[nombre];
    box.textContent = `Precio predeterminado cargado: ${dinero(s.precios[nombre])}`;
    box.classList.add("visible");
  } else {
    box.classList.remove("visible");
  }
}

// ---------- Acciones: Lotes / Ventas ----------
function agregarLote() {
  const nombre = document.getElementById("lote-nombre").value.trim();
  const costo = parseFloat(document.getElementById("lote-costo").value);
  const cantidad = parseInt(document.getElementById("lote-cantidad").value);

  if (!nombre) return mostrarMensaje("lote-msg", "Escribe el nombre del producto.", "error");
  if (isNaN(costo) || costo < 0) return mostrarMensaje("lote-msg", "Costo inválido.", "error");
  if (isNaN(cantidad) || cantidad <= 0) return mostrarMensaje("lote-msg", "Cantidad debe ser mayor a 0.", "error");

  const s = sesionActiva();
  s.lotes.push({
    id: uid(),
    nombre,
    cantidadInicial: cantidad,
    cantidadRestante: cantidad,
    costoTotal: costo,
    costoUnitario: costo / cantidad,
    fecha: new Date().toISOString()
  });
  guardar();
  document.getElementById("lote-nombre").value = "";
  document.getElementById("lote-costo").value = "";
  document.getElementById("lote-cantidad").value = "";
  mostrarMensaje("lote-msg", `Lote de ${nombre} agregado.`, "exito");
  actualizarTodo();
}

function registrarVenta() {
  const nombre = document.getElementById("venta-producto").value;
  const cantidad = parseInt(document.getElementById("venta-cantidad").value);
  const precio = parseFloat(document.getElementById("venta-precio").value);

  if (!nombre) return mostrarMensaje("venta-msg", "Selecciona un producto.", "error");
  if (isNaN(cantidad) || cantidad <= 0) return mostrarMensaje("venta-msg", "Cantidad inválida.", "error");
  if (isNaN(precio) || precio < 0) return mostrarMensaje("venta-msg", "Precio inválido.", "error");

  const s = sesionActiva();
  const lotesDisp = s.lotes
    .filter(l => l.nombre === nombre && l.cantidadRestante > 0)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

  let pendiente = cantidad;
  let costoTotalVenta = 0;
  const detalles = [];

  for (const lote of lotesDisp) {
    if (pendiente <= 0) break;
    const tomar = Math.min(pendiente, lote.cantidadRestante);
    costoTotalVenta += tomar * lote.costoUnitario;
    lote.cantidadRestante -= tomar;
    pendiente -= tomar;
    detalles.push({ loteId: lote.id, cantidad: tomar });
  }

  if (pendiente > 0) {
    return mostrarMensaje("venta-msg", `No hay suficiente stock. Faltan ${pendiente} uds.`, "error");
  }

  const ingreso = precio * cantidad;
  const ganancia = ingreso - costoTotalVenta;

  s.ventas.push({
    id: uid(),
    nombre,
    cantidad,
    precioUnitario: precio,
    ingreso,
    costo: costoTotalVenta,
    ganancia,
    fecha: new Date().toISOString(),
    detalles
  });

  guardar();
  document.getElementById("venta-cantidad").value = "";
  document.getElementById("venta-precio").value = "";
  document.getElementById("precio-auto-info").classList.remove("visible");
  mostrarMensaje("venta-msg", `Venta registrada. Ganancia: ${dinero(ganancia)}`, "exito");
  actualizarTodo();
}

// ---------- Precios predeterminados ----------
function guardarPrecioDefault() {
  const nombre = document.getElementById("precio-producto").value;
  const valor = parseFloat(document.getElementById("precio-valor").value);
  if (!nombre) return mostrarMensaje("precio-msg", "Selecciona un producto.", "error");
  if (isNaN(valor) || valor < 0) return mostrarMensaje("precio-msg", "Precio inválido.", "error");

  const s = sesionActiva();
  s.precios[nombre] = valor;
  guardar();
  document.getElementById("precio-valor").value = "";
  mostrarMensaje("precio-msg", `Precio de ${nombre} guardado: ${dinero(valor)}`, "exito");
  actualizarSelectPrecios();
  renderInventario();
}

function abrirModalPrecio(nombre) {
  modalPrecioProducto = nombre;
  const s = sesionActiva();
  document.getElementById("modal-precio-producto").textContent = nombre;
  document.getElementById("modal-precio-valor").value = s.precios[nombre] != null ? s.precios[nombre] : "";
  document.getElementById("modal-precio").classList.remove("oculto");
}

function cerrarModalPrecio() {
  document.getElementById("modal-precio").classList.add("oculto");
  modalPrecioProducto = null;
}

function confirmarPrecioModal() {
  if (!modalPrecioProducto) return;
  const valor = parseFloat(document.getElementById("modal-precio-valor").value);
  if (isNaN(valor) || valor < 0) return alert("Precio inválido.");
  const s = sesionActiva();
  s.precios[modalPrecioProducto] = valor;
  guardar();
  cerrarModalPrecio();
  renderInventario();
  actualizarSelectPrecios();
}

// ---------- Eliminar ----------
function eliminarProducto(nombre) {
  const s = sesionActiva();
  const lotesProd = s.lotes.filter(l => l.nombre === nombre);
  const tieneVentas = s.ventas.some(v => v.nombre === nombre);

  if (!confirm(`¿Eliminar el producto "${nombre}"?\n\nSe borrarán ${lotesProd.length} lote(s)${tieneVentas ? " y todas sus ventas" : ""}.`)) return;

  s.lotes = s.lotes.filter(l => l.nombre !== nombre);
  s.ventas = s.ventas.filter(v => v.nombre !== nombre);
  delete s.precios[nombre];
  guardar();
  actualizarTodo();
}

function eliminarMovimiento(id, tipo) {
  const s = sesionActiva();

  if (tipo === "venta") {
    const venta = s.ventas.find(v => v.id === id);
    if (!venta) return alert("No se encontró la venta.");
    if (!confirm(`¿Eliminar esta venta de "${venta.nombre}"?\nSe devolverán ${venta.cantidad} uds al stock.`)) return;

    if (venta.detalles && venta.detalles.length > 0) {
      venta.detalles.forEach(d => {
        const lote = s.lotes.find(l => l.id === d.loteId);
        if (lote) lote.cantidadRestante += d.cantidad;
      });
    } else {
      let pendiente = venta.cantidad;
      const lotesP = s.lotes.filter(l => l.nombre === venta.nombre).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
      for (const lote of lotesP) {
        if (pendiente <= 0) break;
        const espacio = lote.cantidadInicial - lote.cantidadRestante;
        const dev = Math.min(pendiente, espacio);
        lote.cantidadRestante += dev;
        pendiente -= dev;
      }
    }
    s.ventas = s.ventas.filter(v => v.id !== id);
    guardar();
    actualizarTodo();
    alert("Venta eliminada. Stock y ganancias actualizados.");

  } else if (tipo === "compra") {
    const lote = s.lotes.find(l => l.id === id);
    if (!lote) return alert("No se encontró el lote.");
    if (lote.cantidadRestante !== lote.cantidadInicial) {
      return alert(`No se puede eliminar: ya se vendieron unidades de este lote.\nQuedan ${lote.cantidadRestante} de ${lote.cantidadInicial}.`);
    }
    if (!confirm(`¿Eliminar este lote de "${lote.nombre}"?`)) return;
    s.lotes = s.lotes.filter(l => l.id !== id);
    guardar();
    actualizarTodo();
    alert("Lote eliminado.");
  }
}

function borrarTodo() {
  if (!confirm("¿Borrar TODOS los datos de esta sesión?\nNo se puede deshacer.")) return;
  const s = sesionActiva();
  s.lotes = [];
  s.ventas = [];
  s.precios = {};
  guardar();
  actualizarTodo();
  alert("Datos de la sesión borrados.");
}

// ---------- CSV ----------
function exportarCSV() {
  const s = sesionActiva();
  if (s.lotes.length === 0 && s.ventas.length === 0) return alert("No hay datos para exportar.");

  const filas = [];
  filas.push(["TIPO", "FECHA", "PRODUCTO", "CANTIDAD", "COSTO_UNITARIO", "COSTO_TOTAL", "PRECIO_VENTA_UNIT", "INGRESO", "GANANCIA", "STOCK_RESTANTE", "ID"]);

  s.lotes.forEach(l => {
    filas.push(["COMPRA", l.fecha, l.nombre, l.cantidadInicial, l.costoUnitario.toFixed(4), l.costoTotal.toFixed(2), "", "", "", l.cantidadRestante, l.id]);
  });
  s.ventas.forEach(v => {
    filas.push(["VENTA", v.fecha, v.nombre, v.cantidad, (v.costo / v.cantidad).toFixed(4), v.costo.toFixed(2), v.precioUnitario.toFixed(2), v.ingreso.toFixed(2), v.ganancia.toFixed(2), "", v.id]);
  });

  filas.push([]);
  filas.push(["=== RESUMEN ==="]);
  const r = calcularResumen();
  filas.push(["Total Invertido", r.invertido.toFixed(2)]);
  filas.push(["Total Vendido", r.vendido.toFixed(2)]);
  filas.push(["Ganancia Neta", r.ganancia.toFixed(2)]);
  filas.push(["Stock Actual", r.stockActual]);
  filas.push(["Sesion", s.nombre]);
  filas.push(["Exportado", new Date().toISOString()]);

  const csv = filas.map(f => f.map(c => {
    const str = String(c ?? "");
    return (str.includes(",") || str.includes('"') || str.includes("\n")) ? `"${str.replace(/"/g, '""')}"` : str;
  }).join(",")).join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ganancias_${s.nombre.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function parseCSVLine(line) {
  const result = [];
  let current = "", inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current); current = "";
    } else current += char;
  }
  result.push(current);
  return result;
}

function importarCSV(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!confirm("¿Importar este CSV?\nSe REEMPLAZARÁN los datos de la sesión actual.")) {
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      let text = e.target.result;
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
      const lineas = text.split(/\r?\n/).filter(l => l.trim());
      if (lineas.length < 2) throw new Error("Archivo vacío");

      const nuevosLotes = [], nuevasVentas = [];

      for (let i = 1; i < lineas.length; i++) {
        const linea = lineas[i].trim();
        if (!linea || linea.startsWith("===") || linea.startsWith("Total") || linea.startsWith("Exportado") || linea.startsWith("Sesion") || linea.startsWith("Ganancia") || linea.startsWith("Stock") || linea.startsWith("Calculadora")) continue;

        const cols = parseCSVLine(linea);
        if (cols.length < 3) continue;
        const tipo = (cols[0] || "").toUpperCase().trim();

        if (tipo === "COMPRA") {
          const cantidad = parseInt(cols[3]) || 0;
          nuevosLotes.push({
            id: cols[10] || uid(),
            nombre: cols[2] || "Sin nombre",
            cantidadInicial: cantidad,
            cantidadRestante: parseInt(cols[9]) || cantidad,
            costoTotal: parseFloat(cols[5]) || 0,
            costoUnitario: parseFloat(cols[4]) || 0,
            fecha: cols[1] || new Date().toISOString()
          });
        } else if (tipo === "VENTA") {
          const cantidad = parseInt(cols[3]) || 0;
          const costoTotal = parseFloat(cols[5]) || 0;
          const precioUnitario = parseFloat(cols[6]) || 0;
          const ingreso = parseFloat(cols[7]) || precioUnitario * cantidad;
          nuevasVentas.push({
            id: cols[10] || uid(),
            nombre: cols[2] || "Sin nombre",
            cantidad,
            precioUnitario,
            ingreso,
            costo: costoTotal,
            ganancia: parseFloat(cols[8]) || (ingreso - costoTotal),
            fecha: cols[1] || new Date().toISOString(),
            detalles: []
          });
        }
      }

      const s = sesionActiva();
      s.lotes = nuevosLotes;
      s.ventas = nuevasVentas;
      guardar();
      actualizarTodo();
      alert(`Importado.\nLotes: ${nuevosLotes.length}\nVentas: ${nuevasVentas.length}`);
    } catch (err) {
      console.error(err);
      alert("Error al importar. Usa un CSV exportado desde esta app.");
    }
    event.target.value = "";
  };
  reader.readAsText(file, "UTF-8");
}

// ---------- UI helpers ----------
function mostrarMensaje(id, texto, tipo) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = texto;
  el.className = "mensaje " + tipo;
  el.classList.remove("oculto");
  setTimeout(() => el.classList.add("oculto"), 4000);
}

function actualizarTodo() {
  renderSesionesSelect();
  renderResumen();
  renderInventario();
  renderHistorial();
  actualizarSelectProductos();
  actualizarSelectPrecios();
  renderGrafico();
}

// ---------- Init ----------
document.addEventListener("DOMContentLoaded", () => {
  cargar();
  actualizarTodo();
});
