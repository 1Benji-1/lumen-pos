---
name: Lumen POS Design System
description: Sistema visual para punto de venta — Tema Claro (Soft Linen & Carbon)
colors:
  linen: "#E8EDDF"
  alabaster: "#E5E5E5"
  alabaster-green: "#CFDBD5"
  carbon: "#242423"
  carbon-dark: "#1A1A19"
  graphite: "#333533"
  graphite-light: "#424542"
  tuscan: "#F5CB5C"
  tuscan-hover: "#E5B946"
  danger: "#BC4749"
  danger-dark: "#9E3B3D"
  danger-surface: "#FDF0ED"
  success: "#588157"
  success-vibrant: "#6A8532"
  success-surface: "#EFF5EE"
typography:
  family: "Inter, system-ui, -apple-system, sans-serif"
  headline:
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.3
  numeric:
    fontVariantNumeric: "tabular-nums"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.tuscan}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  button-primary-hover:
    backgroundColor: "{colors.tuscan-hover}"
  button-secondary:
    backgroundColor: "{colors.alabaster}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.md}"
    padding: "10px 18px"
  card-surface:
    backgroundColor: "#FFFFFF"
    textColor: "{colors.carbon}"
    rounded: "{rounded.lg}"
---

# Design System — Lumen POS (Tema Claro)

<!-- impeccable:design-schema 1 -->

## Overview

Este documento establece la arquitectura de fundamentos visuales oficiales de **Lumen POS** para la aplicación web (`apps/web`).

El sistema adopta de manera estricta y exclusiva un **TEMA CLARO**, limpio, luminoso y descansado:
- El lienzo estructural de la aplicación se asienta sobre **Soft Linen (`#E8EDDF`)**, complementado con **Blanco Puro (`#FFFFFF`)**, **Alabaster Grey (`#E5E5E5`)** y **Alabaster Grey Verdoso (`#CFDBD5`)** para la delimitación de tarjetas, paneles y divisores.
- La lectura se garantiza con **Carbon Black (`#242423`)** como texto principal sobre esos fondos claros, ofreciendo un contraste superior a **12.9:1** (cumplimiento total de WCAG AAA).
- El color **Amarillo Gold (`#FFD60A`) ha sido completamente eliminado del sistema**.
- El color **Tuscan Sun (`#F5CB5C`)** actúa como el único acento cálido, reservado **estrictamente para acentos, elementos especiales puntuales y botones primarios de acción**, nunca como color de fondo general de pantallas o paneles.
- Los tonos oscuros **Graphite (`#333533`)** y **Carbon (`#242423`)** quedan confinados a elementos puntuales de contraste (por ejemplo, un sidebar lateral contrastante si se requiere), sin actuar jamás como base de toda la interfaz.

---

## Colors

### 1. Fondos y Superficies Claras (Canvas & Surfaces)
- **Soft Linen (`#E8EDDF`)**: Fondo principal del viewport y de la aplicación completa. Proporciona una base clara y cálida para trabajar horas continuas en el mostrador sin el deslumbramiento de un blanco puro.
- **Blanco Puro (`#FFFFFF`)**: Superficie para el cuerpo de tarjetas de catálogo, formularios, modales y panel del carrito.
- **Alabaster Grey (`#E5E5E5`)**: Superficie secundaria para fondos de inputs, filas alternadas de tablas y fondos de botones secundarios.
- **Alabaster Grey Verdoso (`#CFDBD5`)**: Bordes perimetrales sutiles (1px), líneas divisorias y separadores de secciones.

### 2. Texto y Tipografía (Text & Reading)
- **Carbon Black (`#242423`)**: Color de texto principal para toda la aplicación (títulos, descripciones, importes numéricos y tablas). Ofrece **12.97:1** de contraste sobre Soft Linen y **15.69:1** sobre blanco (ambos superan con creces el umbral máximo WCAG AAA de 7:1).
- **Graphite (`#333533`)**: Texto secundario, cabeceras de columnas en tablas y etiquetas de formulario.
- **Grafito Medio (`#5A5D5A`)**: Metadatos auxiliares, códigos SKU, fechas y textos de ayuda (placeholder).

### 3. Acentos Especiales Puntuales (Accent & Primary Action)
- **Tuscan Sun (`#F5CB5C`)**: Único acento cálido del sistema. Se utiliza exclusivamente para:
  - Botón primario de cobro / acción principal (CTA) con texto en `Carbon Black (#242423)`.
  - Pestañas activas o indicadores de foco interactivo.
  - Insignias especiales y llamadas de atención puntuales.
  - *Regla estricta:* Nunca utilizar como fondo de páginas completas ni de contenedores grandes.

### 4. Elementos Oscuros Puntuales (Contrasting Elements)
- **Graphite (`#333533`)** y **Carbon Black (`#242423`)**:
  - Reservados exclusivamente si se decide implementar un elemento puntual de alto contraste (por ejemplo, una barra lateral izquierda o terminal de comandos que contraste con el cuerpo claro).
  - Nunca son la base del contenedor principal ni del fondo de las páginas de la aplicación.

### 5. Semántica de Estado (Feedback & Alerts)
- **Error / Peligro**: `#BC4749` (Terracota apagado) para texto e iconos; `#9E3B3D` (Terracota oscuro) para estados alternativos; `#FDF0ED` para fondos suaves de alerta con borde `#F0B2B4`.
- **Éxito / Confirmación**: `#588157` (Verde salvia oscuro) para texto e iconos; `#6A8532` (Verde salvia vibrante) como alternativa; `#EFF5EE` para fondos suaves de éxito con borde `#BBD2B8`.

### Matriz de Contraste WCAG (Tema Claro)
| Combinación | Ratio Calculado | Nivel WCAG | Regla de Uso |
| :--- | :---: | :---: | :--- |
| **Carbon `#242423` sobre Soft Linen `#E8EDDF`** | **12.97:1** | ✅ **AAA (Máximo)** | **ESTÁNDAR GENERAL:** Texto principal de toda la app sobre el fondo. |
| **Carbon `#242423` sobre Blanco `#FFFFFF`** | **15.69:1** | ✅ **AAA (Máximo)** | Texto en tarjetas, tablas, modales y formularios. |
| **Carbon `#242423` sobre Tuscan Sun `#F5CB5C`** | **10.05:1** | ✅ **AAA (Máximo)** | **BOTÓN PRIMARIO / CTA:** Botón Tuscan Sun con texto Carbon Black. |
| **Graphite `#333533` sobre Soft Linen `#E8EDDF`** | **6.67:1** | ✅ **AA+** | Texto secundario y metadatos. |
| **Terracota `#BC4749` sobre Blanco `#FFFFFF`** | **5.74:1** | ✅ **AA** | Texto de error, stock crítico y alertas. |
| **Salvia `#588157` sobre Blanco `#FFFFFF`** | **4.26:1** | ✅ **AA (Grande/UI)** | Confirmaciones de cobro y arqueos de caja. |
| **Tuscan Sun `#F5CB5C` sobre Soft Linen `#E8EDDF`** | **1.28:1** | ❌ **PROHIBIDO** | **NUNCA usar texto Tuscan Sun sobre fondos claros.** |

---

## Typography

### Fuente: `Inter`
Se mantiene **Inter** como estándar sin alteraciones:
- `font-variant-numeric: tabular-nums`: Alineación vertical milimétrica de precios, importes, arqueos y existencias.
- Distinción clara de caracteres ambiguos (`0` vs `O`, `1` vs `l`).
- Legibilidad instantánea para el cajero y encargado en terminales táctiles y de mostrador.

### Jerarquía
- **Display (Total en POS):** `2rem` (32px), `font-bold`, tabular-nums, color `#242423`.
- **Headline (H1 / Título de Página):** `1.25rem` (20px), `font-bold`, color `#242423`.
- **Title (H2 / Encabezados):** `1rem` (16px), `font-semibold`, color `#242423`.
- **Body (Contenido / Tablas):** `0.875rem` (14px), `font-normal`, color `#242423`.
- **Label / Meta (Subtítulos, SKU, Fechas):** `0.75rem` (12px), `font-medium`, color `#5A5D5A`.

---

## Layout

- **Fondo Global del Canvas:** `bg-[#E8EDDF]` (`Soft Linen`).
- **Superficie de Trabajo:** Paneles de contenido y tablas asentados sobre `bg-white` o `bg-[#E5E5E5]` con bordes perimetrales limpios de 1px en `border-[#CFDBD5]`.
- **Navegación / Header:**
  - Superficie clara (`bg-white` con borde `border-[#CFDBD5]`) o barra superior en contraste sobrio (`bg-[#333533]` con texto `text-[#E8EDDF]`), mientras todo el cuerpo de la página se mantiene claro.
- **Sidebars / Drawers:**
  - Puede mantenerse en fondo claro (`bg-white` / `bg-[#E5E5E5]`) o adoptar un fondo oscuro puntual contrastante (`bg-[#333533]`), según se decida para jerarquía lateral.

---

## Elevation & Depth

La profundidad se logra con estratificación tonal y sombras difusas cálidas:
- **Nivel 0 (Fondo base):** Soft Linen `#E8EDDF`.
- **Nivel 1 (Tarjetas, Paneles, Tablas):** Blanco `#FFFFFF`, borde 1px en `#CFDBD5`, sombra leve `shadow-xs`.
- **Nivel 2 (Modales, Drawers, Dropdowns):** Blanco `#FFFFFF`, borde 1px en `#CFDBD5`, sombra flotante `shadow-xl`.
- **Nivel 3 (Tooltips flotantes):** Carbon Black `#242423` con texto `#E8EDDF`.

---

## Shapes

- **Radio de Bordes:**
  - `rounded-md` (8px): Botones, inputs y selectores.
  - `rounded-xl` (12px - 14px): Tarjetas de catálogo y contenedores.
  - `rounded-2xl` (16px): Modales y paneles principales.
  - `rounded-full`: Badges de estado, píldoras de rubro y tags de stock.
- **Áreas Táctiles:** Mínimo 44px de altura para botones principales de interacción de mostrador.

---

## Components

### 1. Botón Primario (Cobro / Guardar)
- Fondo: Tuscan Sun `#F5CB5C`.
- Hover: `#E5B946`.
- Texto: Carbon Black `#242423`, `font-semibold`, tamaño `0.875rem` (14px).
- Sombra: `shadow-xs`.
- Contraste: **10.05:1 (AAA)**.

### 2. Botón Secundario (Cancelar / Filtros)
- Fondo: Alabaster `#E5E5E5` o blanco `bg-white`.
- Borde: 1px en `#CFDBD5`.
- Hover: `#DDE2D5`.
- Texto: Carbon Black `#242423`, `font-medium`.

### 3. Inputs de Búsqueda y Códigos de Barras
- Fondo: Blanco `#FFFFFF`.
- Borde: 1px en `#CFDBD5`.
- Focus: Borde `#F5CB5C`, anillo `ring-2 ring-[#F5CB5C]/40` sin desfasaje.
- Texto: Carbon Black `#242423`, placeholder `#8A8E8A`.

### 4. Tarjetas de Catálogo / Inventario
- Fondo: Blanco `#FFFFFF`.
- Borde: 1px en `#CFDBD5`.
- Hover: Borde `#F5CB5C`, sombra sutil `shadow-md`.
- Nombre de producto: Carbon Black `#242423`, `font-semibold`.
- Precio: `font-bold`, tabular-nums, color `#242423`.

### 5. Badges de Estado
- **Éxito (Pagado, Sincronizado):** Fondo `#EFF5EE`, borde `#BBD2B8`, texto `#3B6B3A`.
- **Alerta / Acento (Stock bajo, Plan Pro):** Fondo `#FEF9E7`, borde `#F5CB5C`, texto `#8A6D14`.
- **Peligro (Faltante, Error, Sin conexión):** Fondo `#FDF0ED`, borde `#F0B2B4`, texto `#BC4749`.

---

## Do's and Don'ts

### ✅ Qué hacer siempre:
- **USAR** `Soft Linen (#E8EDDF)` como fondo base general del sistema y `Blanco (#FFFFFF)` o `Alabaster (#E5E5E5)` para las tarjetas y paneles de contenido.
- **USAR** `Carbon Black (#242423)` para el texto sobre cualquier fondo claro para mantener legibilidad AAA (12.9:1).
- **APLICAR** `font-variant-numeric: tabular-nums` a todo número de importe, ticket, stock y arqueo.
- **USAR** `Tuscan Sun (#F5CB5C)` únicamente para acentos especiales y el botón principal de acción/cobro con texto `#242423`.

### ❌ Qué NO hacer nunca:
- **NUNCA** usar `#FFD60A` (queda 100% descartado del sistema).
- **NUNCA** volver a transformar toda la interfaz en un tema negro/oscuro usando Carbon o Graphite como fondo principal.
- **NUNCA** usar texto en color Tuscan Sun sobre fondos claros (1.28:1 es completamente ilegible).
- **NUNCA** pintar contenedores o fondos de página enteros de Tuscan Sun.
