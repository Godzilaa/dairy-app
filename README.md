# Dairy Management App

Monorepo for a dairy farm management application supporting offline-first mobile usage with trilingual support (English, Hindi, Kannada).

## Structure

```
dairy-app/
├── apps/
│   ├── api/          # NestJS backend
│   └── mobile/       # React Native (Expo) mobile app
├── packages/
│   └── shared/       # Shared types, DTOs, i18n, enums
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

## Prerequisites

- Node.js >= 18
- pnpm >= 9
- PostgreSQL (for backend)
- Expo Go (for mobile testing)

## Setup

```bash
# Install dependencies
pnpm install

# Start backend
cd apps/api
cp .env .env.local  # Edit DB credentials
pnpm dev

# Seed initial cow data
npx ts-node src/seed.ts

# Start mobile app
cd apps/mobile
pnpm dev
```

## Default Users (dev)

| Username  | Password   | Role    |
|-----------|-----------|---------|
| owner     | owner123  | Owner   |
| manager   | manager123| Manager |
| worker    | worker123 | Worker  |

## Tech Stack

- **Monorepo**: Turborepo + pnpm workspaces
- **Backend**: NestJS + TypeORM + PostgreSQL
- **Mobile**: React Native (Expo) + SQLite
- **Shared**: TypeScript types, DTOs, i18n
- **Languages**: English, Hindi, Kannada
