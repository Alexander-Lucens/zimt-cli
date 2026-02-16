# ZIMT CLI
**The secret ingredient for production-ready NestJS applications.**

## ⚠️ Status: Alpha / MVP.
Recommended package manager: npm. Support for yarn and pnpm is experimental.

### Features:
- Improved test coverage.
- Fixed Prisma unique constraint error handling.
- Updated Docker setup for better reliability.


## 1. Project Overview
**Goal:** A CLI tool for developers to generate NestJS boilerplate with Auth, RBAC, and Prisma in seconds.
**Target Audience:** NestJS developers, Startups, Agencies.

## 2. Tech Stack
* **Language:** TypeScript
* **Runtime:** Node.js
* **Core:** `commander` (Command handling)
* **UI/Prompts:** `@clack/prompts`
* **Templating:** `ejs` (For project scaffolding)
* **AST Manipulation:** `ts-morph` (For safe injection into existing files, e.g., `app.module.ts`)
* **File System:** `fs-extra`

## 3. Architecture Levels

### Level 1: The Smart Scaffolder (MVP)
* **Focus:** `zimt new` & `zimt generate resource`.
* **Logic:**
    * Uses **Local Templates** (stored in `src/templates`).
    * **EJS** replaces variables (`<%= name %>`, `<%= dbType %>`).
    * **ts-morph** is used to register new modules in `app.module.ts` automatically.
    * **Strict Versions:** `package.json` templates have fixed versions to avoid peer-dependency hell.

### Level 2: The Code Surgeon (Future)
* **Focus:** `zimt add auth` (into existing legacy projects).
* **Logic:** Deep AST analysis to understand custom project structures and inject AuthGuard without breaking style.

## 4. Command Reference

| Command | Alias | Arguments | Description |
| :--- | :--- | :--- | :--- |
| `zimt new` | `n` | `<name>` | Scaffolds a complete "Golden Standard" project. |
| `zimt generate`| `g` | `<schematic> <name>` | Generates a specific resource. |
| `zimt info` | `i` | — | Displays environment info (OS, Node, CLI version). |
| `zimt help` | `h` | `[command]` | Displays help. |

### Schematics for `generate`
* `zimt g resource <name>` (or `res`)
    * Generates: Module, Service, Controller, DTOs, Entities.
    * Database: Creates Prisma Repository or In-Memory (based on choice).
    * **Action:** Automatically updates `app.module.ts` imports via `ts-morph`.

## 5. Interactive Prompts (`zimt new`)
If arguments are not provided, launch interactive mode:

1.  **Package Manager:** `npm` | `yarn` | `pnpm`
2.  **Database:** `Prisma (PostgreSQL)` (Default) | `Mongoose` (Future)
3.  **Auth Strategy:** `JWT` (Stateless) | `Session` (Redis) | `None`
4.  **Extras (Multi-select):**
    * [x] Docker Compose (DB setup)
    * [x] CI/CD (GitHub Actions)
    * [x] Swagger UI
    * [x] Mailer Setup
5.  **Git:** Initialize repo? `Yes` / `No`

_Please create .env file with names as in .env.example, and insure that you have active db or just run it in docker with *npm run docker:build*._

## 6. Implementation Plan (MVP)

1.  **Golden Standard:** Create a manual "perfect" reference project.
2.  **Templatization:** Move reference code to `src/templates` and insert EJS tags.
3.  **CLI Core:** Setup `commander` and `prompts`.
4.  **Generator Logic:** Implement `fs-extra` copying and `ts-morph` injection.
5.  **Polish:** Add ASCII art logo, spinners (`ora`), and colored logs (`chalk`).
6.  **Release:** Publish to NPM (`zimt-cli` / `create-zimt-app`).