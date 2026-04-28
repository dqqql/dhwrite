# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

匕首之心 (Dagger Heart) 团前共创工具 — a multiplayer collaborative canvas + card system for tabletop RPG session preparation. Players draw cards (locations, characters, features) from a deck and place them onto a shared whiteboard to collaboratively build campaign maps, faction relationships, and story hooks.

Core mechanics: two-mode system (free mode ↔ co-creation mode, host toggles, supports multiple rounds), draw 3-pick-1 per turn, play any number of cards, create custom cards, skip, infinite canvas with Figma-style dot grid, location cards with resizable territory areas, semantic connection lines between cards, room-based multiplayer via invite codes.

## Current State

The project has not started development. The sole file `文档.md` contains the consolidated PRD. Read this document before making any architectural decisions.

## Key Architecture Decisions (from PRD)

- **Three-mode system:** Free mode (annotation only, default on room entry) → Co-creation mode (host starts, card dealing + turns begin) → Normal mode (host ends, hand cards recalled, export enabled). This mode state machine drives almost all permission and UI logic.
- **Card system and interaction logic are decoupled.** Build and stabilize the interaction layer first with test cards, then populate with real card data via JSON import.
- **Card packs are JSON-driven** (`.dhpack.json` format). Official content ships as 5 campaign framework packs; users can create custom packs. See `文档.md` section 4.5 for the JSON schema.
- **Room backup is a separate format** (`.dhroom.json`). Contains full room state — card positions, connections, annotations, player info — distinct from card pack format.
- **Turn-based multiplayer with soft locking.** When a player is editing/dragging a card, others cannot modify it.
- **Dual card display states:** minimized (title, type icon, player color) and expanded (full description text).
- **Player presence with online/offline tracking.** Floating player panel always visible; online players highlighted, offline dimmed; offline players auto-skipped during turns.
- **Card deal deduplication.** Cards dealt never duplicate cards already in any player's hand or on the map.
- **Hand recall on co-creation end.** Host ends co-creation → all unplayed hand cards returned to deck → transition to normal mode.
- **Room system with invite codes.** One site hosts multiple independent rooms. Room creation defaults to all card packs selected, adjustable afterward.

## Tech Stack (to be decided)

No technology choices have been made. When selecting the stack, key requirements to consider:
- Real-time multiplayer synchronization (WebSocket or similar)
- Infinite canvas with pan/zoom (canvas API, SVG, or WebGL)
- Card drag-and-drop, resizing, and connection lines
- JSON import/export for two distinct formats (`.dhpack.json` and `.dhroom.json`)
- Room-based access control with invite codes
- Player presence / online status tracking
