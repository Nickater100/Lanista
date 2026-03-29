# Plan de Implementación: Lanista Simulator (MVP)

Este documento detalla los pasos necesarios para construir el Producto Mínimo Viable (MVP) de "Lanista Simulator", un juego de gestión y combate de gladiadores.

## 1. Concepto General
El jugador asume el rol de un Lanista (dueño de un Ludus) que debe gestionar sus recursos para entrenar gladiadores y alcanzar la gloria en la arena.

## 2. Fase de Gestión (Ludus)
*   **Inicio:** El jugador comienza con **1000 monedas de oro**.
*   **Mercado de Esclavos:** Compra de gladiadores novatos (Nivel 1) por aproximadamente **500 monedas**.
*   **Sistema de Rebeldía:** Cada esclavo tiene una barra de rebeldía inicial alta.
    *   **Acciones:** Premiar (baja rebeldía, gasta oro) o Castigar (baja rebeldía, puede herir o subir estrés).
*   **Entrenamiento:** Contratación de entrenadores o uso de gladiadores retirados (futuro). En el MVP, un sistema simple de mejora de stats (Fuerza, Agilidad, Defensa).
*   **Seguridad:** Contratación de guardias para evitar revueltas. El número de guardias debe ser proporcional al número de gladiadores y su nivel de rebeldía.

## 3. Fase de Combate (Arena)
*   **Motor:** Uso de `Three.js` (Modo 2.5D Sprite).
*   **Assets:** Sprites de Pixel Art (56x56px), 8 direcciones y animaciones por frames.
*   **Mecánica:** Combate por turnos o semi-tiempo real basado en stats.
*   **Riesgo:** Si un gladiador pierde, existe un **60% de probabilidad de muerte permanente**.
*   **Reputación:** Las victorias aumentan la reputación, permitiendo acceso a arenas "Premium" con mayores recompensas.

## 4. Monetización y Economía
*   **Videos Recompensados:** El jugador puede ver un anuncio para recibir un bono de oro instantáneo.
*   **In-App Purchases:** Venta de packs de oro o gladiadores "Legionarios" únicos.

## 5. Hoja de Ruta Ténica
1.  **Setup del Proyecto:** Estructura básica de archivos (HTML, CSS, JS).
2.  **Core de Gestión:** Implementación del estado global (Oro, Inventario de Gladiadores).
3.  **UI de Menús:** Mercado, Ludus y Arena.
4.  **Integración Three.js:** Visualización del combate usando Orthographic Camera y carga de sprites (`Personaje_base`).
5.  **Sistema de Eventos:** Rebeldía y consecuencias aleatorias.
6.  **Pulido:** Efectos visuales, sonidos y balanceo de economía.
