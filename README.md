# Calculadora de Ganancias

Aplicación web progresiva (PWA) para controlar **lotes de compra**, **inventario**, **ventas** y **ganancias**, con soporte de **múltiples sesiones** (negocios independientes).

**Autor:** Oscar Antonio Alvarez Collado  
**Copyright © 2026**

---

## Características

- **Sesiones múltiples** — separa negocios (ej: "Tienda de Dulces", "Tienda de Ropa")
- **Agregar lotes** (compras) con nombre, costo total y cantidad
- **Registrar ventas** con cálculo automático de ganancia (FIFO)
- **Precios predeterminados** por producto (se cargan solos al vender)
- **Inventario** detallado: stock, lotes, costo promedio, precio de venta, eliminar producto
- **Historial** completo con eliminación individual de movimientos
- **Gráfico de ganancias** (barras + línea acumulada + estadísticas)
- **Exportar e Importar CSV** (respaldo y restauración)
- **PWA** instalable y funciona offline
- Datos persistentes en `localStorage`

---

## Navegación

| Pestaña      | Contenido                                      |
|--------------|------------------------------------------------|
| 🏠 Inicio    | Agregar lotes de compra                        |
| 💰 Venta     | Registrar ventas + precios predeterminados     |
| 📦 Inventario| Stock, detalles y eliminar productos           |
| 📊 Gráfico   | Visualización de ganancias y estadísticas      |
| 📜 Historial | Todos los movimientos + eliminar individual    |
| ⚙️ Datos     | Exportar / Importar / Borrar datos             |

---

## Archivos

```
├── index.html
├── main.js
├── style.css
├── manifest.json
├── sw.js
├── 192.png
├── 512.png
└── README.md
```

---

## Cómo usar

1. Abre `index.html` o publica en GitHub Pages / Netlify
2. Instala como app desde el navegador del móvil
3. Crea sesiones con el botón **+** (arriba a la izquierda)
4. Agrega lotes → registra ventas → revisa ganancias

---

## Licencia

```
Copyright © 2026 Oscar Antonio Alvarez Collado
Todos los derechos reservados.

Este software se entrega "tal cual".
Puedes usarlo y modificarlo para uso personal o educativo.
Si lo redistribuyes, mantén este aviso de copyright.
```
