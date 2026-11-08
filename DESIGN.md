---
name: SIGEDA
description: Aula virtual del Aeroclub Sudamericano de los Andes, ordenada por el programa PDI EA-510.
colors:
  marino: "#101A3C"
  dorado: "#D8B858"
  dorado-claro: "#FBF3DA"
  dorado-tinta: "#4D3F12"
  azul-foco: "#2540A1"
  lienzo: "#F8F8F8"
  papel: "#FFFFFF"
  bruma: "#EEF0F6"
  texto-cuerpo: "#5B6072"
  texto-tenue: "#A6ACBE"
  linea: "#D9DCE5"
  linea-control: "#C9CEDB"
  riel-activo: "#1E2A55"
  riel-texto: "#DDE1EC"
  riel-grupo: "#9AA3C0"
  exito: "#1E7A4C"
  aviso: "#8A5A00"
  error: "#B42318"
  noche-lienzo: "#0B1230"
  noche-panel: "#131C40"
  noche-riel: "#070D24"
typography:
  display:
    fontFamily: "Barlow Semi Condensed, Source Sans 3 Variable, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.025em"
  headline:
    fontFamily: "Barlow Semi Condensed, Source Sans 3 Variable, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.025em"
  title:
    fontFamily: "Barlow Semi Condensed, Source Sans 3 Variable, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.025em"
  body:
    fontFamily: "Source Sans 3 Variable, Inter Variable, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Barlow Semi Condensed, Source Sans 3 Variable, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.14em"
rounded:
  sm: "6.4px"
  md: "8px"
  lg: "11.2px"
  xl: "14.4px"
  full: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.marino}"
    textColor: "{colors.papel}"
    rounded: "{rounded.md}"
    height: "32px"
    padding: "0 10px"
  button-oro:
    backgroundColor: "{colors.dorado}"
    textColor: "{colors.marino}"
    typography: "{typography.title}"
    rounded: "{rounded.full}"
    padding: "14px 28px"
  control:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.marino}"
    rounded: "{rounded.md}"
    height: "44px"
    padding: "0 14px"
  panel:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.marino}"
    rounded: "{rounded.xl}"
    padding: "20px"
  pase:
    backgroundColor: "{colors.marino}"
    textColor: "{colors.papel}"
    rounded: "{rounded.xl}"
  pase-talon:
    backgroundColor: "{colors.dorado}"
    textColor: "{colors.marino}"
    padding: "16px 20px"
  celda-completa:
    backgroundColor: "{colors.marino}"
    textColor: "{colors.papel}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  celda-en-curso:
    backgroundColor: "{colors.dorado-claro}"
    textColor: "{colors.marino}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  celda-pendiente:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.marino}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  riel:
    backgroundColor: "{colors.marino}"
    textColor: "{colors.riel-texto}"
  riel-item-activo:
    backgroundColor: "{colors.riel-activo}"
    textColor: "{colors.papel}"
    height: "36px"
---

# Design System: SIGEDA

## Overview

**Creative North Star: "La Sala de Embarque"**

SIGEDA se ve como la sala de operaciones de una escuela de vuelo: un riel marino con la señalética de un aeropuerto, un lienzo claro donde el programa PDI EA-510 se lee de una vez como un tablero de puertas, y el próximo turno impreso como un pase de abordar. El marino es la estructura; el dorado marca una sola cosa por zona: lo actual, lo activo, lo que toca ahora. Lo público (landing, postulación, Mi postulación, login) y lo autenticado comparten paleta, tipografía y titulares en mayúsculas: es la misma escuela de punta a punta.

La densidad es de herramienta diaria, no de folleto: paneles blancos de 14.4px de radio sobre lienzo gris muy claro, filas con cifras tabulares, celdas de estado compactas. La profundidad es una sola sombra marina difusa; no hay degradados ni vidrio. El tema claro de marca es el predeterminado; el oscuro se deriva de la misma paleta y cambia el acento primario a dorado.

**Key Characteristics:**
- Riel lateral marino con filete dorado en el ítem activo.
- Titulares en Barlow Semi Condensed 700, siempre en mayúsculas con tracking amplio.
- Texto en Source Sans 3 sobre gris pizarra; cifras siempre tabulares.
- Tres estados de progreso legibles sin color de semáforo: marino lleno, dorado claro con borde dorado, contorno gris.
- Una sola sombra marina suave para todo lo que flota.

## Colors

Un marino profundo y un dorado de ala, sobre neutros fríos de tinte azulado; la semántica (éxito, aviso, error) queda aparte y nunca hace de acento.

### Primary
- **Marino de Escuadrón** (#101A3C): tinta de titulares y texto fuerte, fondo del riel lateral, del pase de abordar, de la celda COMPLETA y de la materia aprobada; botón primario en tema claro.

### Secondary
- **Dorado de Ala** (#D8B858): lo actual y lo activo. Filete del ítem activo del riel, talón del pase, borde de la celda EN_CURSO, subrayado de enlaces de acción, anillo de foco en lo público y en el tema oscuro, selección de texto al 40%. En tema oscuro es el `primary`.
- **Dorado Claro** (#FBF3DA): relleno de la celda EN_CURSO en tema claro.
- **Tinta Dorada** (#4D3F12): etiquetas sobre el talón dorado del pase; el dorado nunca lleva texto dorado encima.

### Tertiary
- **Azul de Foco** (#2540A1): `ring` del tema claro y borde de control enfocado. No es un acento de superficie.

### Neutral
- **Lienzo** (#F8F8F8): fondo de página, público y autenticado.
- **Papel** (#FFFFFF): paneles, tarjetas, controles, celdas pendientes.
- **Bruma** (#EEF0F6): `muted`/`secondary`; fondo de columnas de fase y del bloque de tierra (al 70%).
- **Pizarra** (#5B6072): texto de cuerpo y `muted-foreground`.
- **Gris Altímetro** (#A6ACBE): texto terciario público y scrollbar.
- **Línea** (#D9DCE5) y **Línea de Control** (#C9CEDB): bordes, divisores de filas, contorno de celda PENDIENTE; borde de input.
- **Riel** (#1E2A55 `sidebar-accent`, tono del velo blanco al 8% del ítem activo sobre marino; #DDE1EC texto; #9AA3C0 etiquetas de grupo).
- **Noche** (#0B1230 lienzo, #131C40 panel, #070D24 riel): tema oscuro.

### Semánticos
- **Éxito** (#1E7A4C), **Aviso** (#8A5A00), **Error** (#B42318): mensajes y validación en lo público; `destructive` en la app. Los badges de estado de la app usan la familia `tono-*` en OKLCH de `src/theme.css`.

### Named Rules
**The Una Cosa Dorada Rule.** El dorado señala lo actual o lo activo: la sub fase en curso, el ítem del riel, el talón del próximo turno, el examen por rendir. Si dos cosas vecinas son doradas, una de ellas no es "ahora".

**The Dorado No Es Tinta Rule.** Sobre fondo claro el dorado es borde, relleno o subrayado, nunca color de texto; el texto dorado solo aparece sobre marino (acción "Ver briefing") o en tema oscuro (#E8C66A).

## Typography

**Display Font:** Barlow Semi Condensed 600/700 (con Source Sans 3 Variable)
**Body Font:** Source Sans 3 Variable (con Inter Variable)

**Character:** Un condensado de señalética aeroportuaria, siempre en mayúsculas, contra un humanista sobrio y legible a 15px. El condensado manda; el humanista informa.

### Hierarchy
- **Display** (700, 48px en md / 36px en móvil, line-height 1, mayúsculas): título del aula ("MI CURSO", "MI COHORTE"). Las páginas heredadas usan `PageHeader` a 36px/30px. En la landing pública sube a 72px (lg) con line-height 0.95.
- **Headline** (700, 20px, mayúsculas, tracking 0.025em): título de la banda del programa y de paneles públicos.
- **Title** (700, 16px, mayúsculas): títulos de `Panel` y `CardTitle` (18px); columnas de fase a 14px.
- **Body** (400, 15px, 1.5): párrafos y descripciones; filas y celdas a 13–14px.
- **Label** (700, 11px, tracking 0.14em, mayúsculas): etiquetas de campo del pase y de grupos del riel. Es el rótulo de un dato, siempre encima de su valor.
- **Cifras**: `tabular-nums` en todo número (día del plan, horas, notas, fechas del pase); el "Día N" va en display 30px.

### Named Rules
**The Mayúscula Condensada Rule.** Todo titular (h1–h3, títulos de panel y de columna) va en Barlow Semi Condensed 700, mayúsculas, con tracking amplio. Ningún titular en Source Sans.

**The Cifra Alineada Rule.** Todo número que se compara (notas, horas, días, conteos) es tabular y se alinea a la derecha en su fila.

## Layout

Shell autenticado: riel lateral colapsable a íconos, cabecera fija de 56px con migas y fondo `background/90` con desenfoque, y columna de contenido centrada de máximo 1320px con padding 16px (móvil) / 32px (md) y separación vertical de 24px entre bloques. Las páginas públicas usan contenedor de 1170px y cabecera marina de 80px.

El aula se compone de arriba abajo: cabecera (título a la izquierda, "Día N de M" a la derecha, alineados por la base), pase del próximo turno a lo ancho, banda del programa, y una fila de tres paneles de resumen (md: 3 columnas). La banda del programa reparte las fases en tantas columnas como fases haya (`--fases`) en lg, 2 en sm y 1 en móvil; en móvil las fases pueden plegarse en `details`.

Ritmo: múltiplos de 4px; huecos internos de 8px entre celdas, 12px entre columnas, 16–24px entre paneles; paneles con padding 20px (24px en md), paneles públicos 24/32px.

## Elevation & Depth

Híbrido sobrio: superficies planas sobre el lienzo, separadas por una única sombra marina difusa más un anillo de 1px casi invisible. En tema oscuro la sombra desaparece y queda solo el anillo (foreground al 10%). El pase de abordar es el único elemento con sombra más fuerte, porque es lo único "en la mano".

### Shadow Vocabulary
- **Sombra de panel** (`box-shadow: 0 10px 40px rgb(16 26 60 / 0.07)` + `ring 1px foreground/5%`): Panel, Card, banda del programa, paneles públicos.
- **Sombra de pase** (`box-shadow: 0 14px 40px rgb(16 26 60 / 0.18)`): solo el pase del próximo turno.
- **Filete activo** (`box-shadow: inset 3px 0 0 #D8B858`): ítem activo del riel.
- **Halo de control** (`box-shadow: 0 0 0 3px rgba(216,184,88,0.45)`): foco de inputs públicos.

### Named Rules
**The Una Sombra Rule.** Hay una sombra de superficie, marina y difusa. No se inventan otras; nada de sombras grises neutras, desplazadas ni duras.

## Shapes

Esquinas generosas y consistentes, derivadas de `--radius` (0.5rem): paneles, tarjetas y pase a 14.4px; celdas, columnas de fase y bloques internos a 11.2px; controles y botones de la app a 8px; logo en pastilla de 6.4px. (El contrato de dirección pedía 16px; el build escala el radio desde `--radius` y queda en 14.4px, que es lo normativo.) Las píldoras (radio completo) son para acciones de marca (botones dorados y de línea públicos, enlaces de acción del aula) y para chips de materia. Los puntos de misión son círculos de 8px.

La forma propia del sistema es la perforación: el pase separa talón y segmentos con borde punteado de 2px y los segmentos entre sí con trazo discontinuo de 1px; el pase vacío es un contorno discontinuo de 2px. El trazo discontinuo significa "boleto"; no se usa como borde decorativo en otra parte.

## Components

### Buttons
- **Shape:** 8px en la app; píldora en lo público y en acciones de marca.
- **Primario (app):** marino con texto blanco, 32px de alto (36px `lg`), hover al 88%; en tema oscuro dorado con texto marino.
- **Oro (público):** dorado con texto marino, Barlow 700 14px mayúsculas tracking amplio, padding 14px 28px, hover `brightness(0.95)`.
- **Línea (público):** contorno sobre marino, mismo tipo, hover blanco al 10%.
- **Foco:** anillo de 3px `ring`/50% en la app (azul en claro, dorado en oscuro); anillo dorado de 2px con offset en lo público.
- **Enlace de acción:** Barlow 700 14px mayúsculas con flecha, texto marino y subrayado dorado de 2px (offset 4px) que pasa a marino en hover; sobre marino, texto dorado que pasa a blanco.

### Chips
- **Materia de tierra:** píldora con borde, 13px, ícono de estado a la izquierda. Aprobada = marino lleno con check dorado; Desaprobada = rojo tenue (#FDECEA, texto #7A1A10); Pendiente = papel con contorno; con examen próximo, borde dorado de 2px y fecha en tinta dorada (#6B5414).

### Cards / Containers
- **Corner Style:** 14.4px.
- **Background:** papel (claro), #131C40 (oscuro).
- **Shadow Strategy:** sombra de panel (ver Elevation).
- **Internal Padding:** 20px (Card `sm`: 12px).
- **Panel:** título Title en mayúsculas con 12px bajo él; contenido en `Filas` (divisores de línea, valor a la derecha en 600 tabular).

### Inputs / Fields
- **Style:** 44px de alto, papel, borde de línea, radio 8px, texto 15px, placeholder #6B7185.
- **Focus:** borde azul de foco + halo dorado de 3px.
- **Error:** borde #B42318 y mensaje de 13px en error debajo.

### Navigation
- **Riel:** fondo marino, logo en pastilla blanca + "SIGEDA" en Barlow 18px y "Aula virtual". Grupos con etiqueta Label (#9AA3C0); ítems de 36px a 15px. Hover y activo: blanco al 8%; activo además en 600, texto blanco, ícono dorado y filete dorado de 3px a la izquierda. Pie con nombre y rol. Colapsa a íconos con tooltip.
- **Cabecera pública:** marino 80px, enlaces Barlow 14px mayúsculas; el actual subrayado dorado a 8px de offset.

### Pase de abordar (signature)
El próximo turno como boleto: talón dorado a la izquierda (etiqueta Label en tinta dorada + fecha en display 24px mayúsculas) separado por perforación punteada; a la derecha segmentos marinos (Hora, Aeronave, Misión, Instructor), cada uno Label #B9C1DB sobre valor Barlow 20px tabular, divididos por trazo discontinuo; la acción al final. En móvil los segmentos van en 2 columnas. Sin turno: **Pase vacío**, contorno discontinuo, talón dorado al 25% con "SIN TURNO" y el mensaje en cuerpo.

### Banda del programa (signature)
Tierra + fases en una banda. Cada fase es una columna en bruma con título (14px mayúsculas) y detalle; dentro, celdas de sub fase:
- **COMPLETA:** marino lleno, texto blanco, puntos blancos.
- **EN_CURSO:** dorado claro con borde dorado de 2px, texto marino; puntos marinos para lo hecho, anillo marino para la misión siguiente, marino al 25% para lo restante. En oscuro, dorado lleno.
- **PENDIENTE:** papel con contorno de línea.
- **Puntos:** una misión = un círculo de 8px; el promedio de la sub fase en Barlow 14px tabular a la derecha.

## Do's and Don'ts

### Do:
- **Do** usar marino (#101A3C) como estructura (riel, pase, lo completo) y dorado (#D8B858) solo para lo actual o activo.
- **Do** escribir todo titular en Barlow Semi Condensed 700 mayúsculas con tracking amplio, y todo número con cifras tabulares.
- **Do** expresar el progreso con los tres estados de celda (marino lleno / dorado claro con borde dorado / contorno) antes que con barras o porcentajes.
- **Do** usar la sombra de panel `0 10px 40px rgb(16 26 60 / 0.07)` con anillo de 1px para toda superficie elevada, y quitarla en tema oscuro.
- **Do** derivar el tema oscuro de la misma paleta: lienzo #0B1230, panel #131C40, primario dorado.

### Don't:
- **Don't** poner texto dorado sobre fondo claro; usar subrayado, borde o relleno dorado.
- **Don't** usar colores de semáforo (verde/ámbar) para el avance del programa; los semánticos son para mensajes y validación.
- **Don't** armar el aula como grilla de accesos o tablero de tarjetas KPI; el programa es la columna.
- **Don't** introducir sombras grises, duras o desplazadas, ni degradados o vidrio en superficies.
- **Don't** usar el trazo discontinuo fuera del pase de abordar.
