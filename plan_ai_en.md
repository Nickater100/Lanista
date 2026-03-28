# Technical Implementation Plan: Lanista Simulator (MVP)

This document provides a structured specification for an AI coder to implement the Lanista Simulator MVP.

## 1. Technical Stack
- **Frontend:** HTML5, CSS3 (Modern/Premium UI), JavaScript (ES6+).
- **3D Engine:** Three.js.
- **Assets:** GLTF/GLB models (Humanoid), Mixamo animations (Idle, Attack, Hit, Death).
- **Monetization:** AdMob (Rewarded Video), In-App Purchase placeholders.

## 2. Core State Schema (JSON)
```json
{
  "player": {
    "gold": 1000,
    "reputation": 0,
    "ludusName": "My Ludus"
  },
  "gladiators": [
    {
      "id": "uuid",
      "name": "Spartacus",
      "level": 1,
      "stats": { "str": 10, "agi": 10, "def": 10 },
      "rebellion": 80,
      "health": 100,
      "status": "idle"
    }
  ],
  "staff": {
    "guards": 2,
    "trainers": 1
  }
}
```

## 3. Module Breakdown

### A. Game Controller (`Game.js`)
- Handle state transitions (Menu -> Ludus -> Market -> Arena).
- Manage local persistence (LocalStorage).

### B. Ludus & Market Logic (`Management.js`)
- **Market:** `buyGladiator(id)` (Cost: 500 gold).
- **Rebellion Logic:** `calculateRebellionTick()`. Decrement by guards, increment by events.
- **Actions:** `rewardGladiator(id)` (-Gold, -Rebellion), `punishGladiator(id)` (-Rebellion, +ChanceOfInjury).

### C. Combat Engine (`Arena.js` using Three.js)
- **Renderer:** Setup `WebGLRenderer`, `PerspectiveCamera`, `Scene`.
- **Character Loader:** `GLTFLoader` for models.
- **Animation Controller:** `AnimationMixer` to switch between Mixamo clips.
- **Combat Logic:** 
    - Deterministic or RNG based on stats.
    - Result calculation: `win` or `loss`.
    - `deathCheck()`: If loss, 60% chance to remove gladiator from state.

### D. Monetization (`Monetization.js`)
- `showRewardedVideo()`: Mock or integrate AdMob. Reward: +100 gold.
- `triggerIAP(productId)`: Mock for MVP.

## 4. UI/UX Requirements
- **Dashboard:** Display Gold, Reputation, and Gladiator list.
- **Arena View:** 3D canvas overlay with HUD (Health bars, Action buttons).
- **Transitions:** Smooth fade-in/out between scenes.

## 5. Implementation Steps (AI Priority)
1. Initialize project structure.
2. Implement `State` management (Redux-pattern or simple Object).
3. Create Ludus/Market UI components.
4. Integrate Three.js boilerplate with a placeholder cube (then replace with models).
5. Implement Combat Logic (Stats vs Stats).
6. Implement Rebellion/Loyalty loop.
7. Add AdMob/IAP interface.
