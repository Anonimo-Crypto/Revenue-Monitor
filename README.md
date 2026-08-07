# Calculadora de Ganancias

Aplicación web progresiva (PWA) para controlar **lotes de compra**, **inventario** y **seguimiento de ventas**.  
Todo se guarda localmente en el navegador y funciona offline.

---

## Características

- **Agregar lotes** (compras) con nombre, costo total y cantidad
- **Registrar ventas** con cálculo automático de ganancia (método FIFO)
- **Inventario** en tiempo real agrupado por producto
- **Resumen** de: Invertido · Vendido · Ganancia · Stock actual
- **Historial** completo de todos los movimientos
- **Eliminar movimientos individuales** (borra una venta y devuelve el stock + corrige la ganancia)
- **Exportar a CSV** bien estructurado (compatible con Excel y Google Sheets)
- **Gráfico de ganancias** (barras por venta + línea de ganancia acumulada)
- **PWA**: se puede instalar en el celular y funciona sin internet
- Datos persistentes con `localStorage`

---

## Archivos del proyecto

```
├── index.html      → Estructura principal
├── main.js         → Lógica de la aplicación
├── style.css       → Estilos
├── manifest.json   → Configuración PWA
├── sw.js           → Service Worker (offline)
├── 192.png         → Icono 192×192
├── 512.png         → Icono 512×512
└── README.md       → Este archivo
```

---

## Cómo usar

1. Abre `index.html` en cualquier navegador moderno  
   **o** sube todos los archivos a un hosting estático (GitHub Pages, Netlify, etc.)
2. Para instalarla como app en el celular: abre el sitio → menú del navegador → "Agregar a la pantalla de inicio"

### Flujo recomendado
1. Ve a la pestaña **+ Lote** y registra tus compras
2. Cuando vendas, ve a **Venta** y registra la venta
3. Revisa el **Inventario** y el **Historial** cuando quieras
4. Usa **Exportar datos a CSV** para guardar un respaldo

---

## Estructura del CSV exportado

El archivo CSV contiene:

| Columna              | Descripción                              |
|----------------------|------------------------------------------|
| TIPO                 | `COMPRA` o `VENTA`                       |
| FECHA                | Fecha y hora en formato ISO              |
| PRODUCTO             | Nombre del producto                      |
| CANTIDAD             | Unidades compradas o vendidas            |
| COSTO_UNITARIO       | Costo por unidad                         |
| COSTO_TOTAL          | Costo total del movimiento               |
| PRECIO_VENTA_UNIT    | Precio de venta por unidad (solo ventas) |
| INGRESO              | Ingreso total de la venta                |
| GANANCIA             | Ganancia neta de la venta                |
| STOCK_RESTANTE       | Unidades que quedan del lote (compras)   |
| ID                   | Identificador único del registro         |

Al final del archivo se incluye un **resumen** con totales.

---

## Tecnologías

- HTML5 · CSS3 · JavaScript (vanilla)
- Progressive Web App (manifest + Service Worker)
- localStorage para persistencia

---

## Licencia y Copyright

```
Copyright © 2026
Todos los derechos reservados.

Este software se entrega "tal cual", sin garantías de ningún tipo.
Puedes usarlo, modificarlo y distribuirlo libremente para uso personal
o educativo. Si lo redistribuyes, mantén este aviso de copyright.
```

---

Hecho con ❤️ para control simple de ganancias.
