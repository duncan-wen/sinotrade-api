# Tasks: Intelligent Trading Website

**Input**: Design documents from `/specs/001-k/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/openapi.json

## Phase 3.1: Setup
- [x] T001 [P] Initialize Next.js project with TypeScript using `pnpm create next-app`.
- [x] T002 [P] Install all dependencies listed in `plan.md`: Gluestack UI, Lightweight Charts, Zustand, TanStack Query, TanStack Virtual, TanStack Table, Socket.io.
- [x] T003 [P] Configure ESLint and Prettier for code quality and consistent formatting.
- [x] T004 [P] Set up the frontend project structure according to the following plan:
  ```
  /src
  ├── /app                # Next.js 13+ App Router
  │   ├── /api
  │   ├── /trading/[symbol]
  │   │   └── page.tsx
  │   ├── /portfolio
  │   │   └── page.tsx
  │   ├── /backtesting
  │   │   └── page.tsx
  │   └── layout.tsx
  ├── /components
  │   ├── /ui         # Gluestack UI components
  │   ├── /common
  │   ├── /chart
  │   ├── /trading
  │   └── /layout
  ├── /lib
  │   └── /utils.ts
  ├── /hooks
  │   └── /useSocket.ts
  ├── /services
  │   ├── /api.ts
  │   └── /socket.ts
  ├── /store
  │   └── /tradingStore.ts
  ├── /types
  │   ├── /index.ts
  │   └── /api.ts
  └── /styles
      └── /globals.css
  ```

## Phase 3.2: API Layer & State Management
- [x] T005 [P] Create type definitions in `types/api.ts` based on the schemas in `openapi.json` (Quote, SimulatedOrder).
- [x] T006 [P] Implement an API client service in `services/api.ts` to fetch data from the backend endpoints defined in `openapi.json`. Use TanStack Query for server state management.
- [x] T007 [P] Set up a Zustand store in `store/` for managing global UI state and client-side data.
- [ ] T008 [P] Implement a WebSocket service in `services/socket.ts` using Socket.io to handle real-time data streams from the backend.

## Phase 3.3: Core UI Components
- [ ] T009 [P] Create a reusable Chart component in `components/Chart.tsx` using Lightweight Charts. It should be able to display K-line data and technical indicators.
- [ ] T010 [P] Create a reusable OrderBook component in `components/OrderBook.tsx` to display the five-level bid/ask prices.
- [ ] T011 [P] Create a reusable Quote component in `components/Quote.tsx` to display real-time quote data.
- [ ] T012 [P] Create a reusable OrderForm component in `components/OrderForm.tsx` for placing simulated orders.
- [ ] T013 [P] Create a reusable PortfolioTable component in `components/PortfolioTable.tsx` using TanStack Table to display the user's virtual portfolio.

## Phase 3.4: Page Implementation
- [ ] T014 Create the main trading page in `pages/trading/[symbol].tsx`. This page will integrate the Chart, OrderBook, Quote, and OrderForm components.
- [ ] T015 Implement the logic to fetch and display historical K-line data on the trading page using the API client and TanStack Query.
- [ ] T016 Implement the logic to display real-time quote and order book updates using the WebSocket service and Zustand store.
- [ ] T017 Create a virtual portfolio page in `pages/portfolio.tsx` that uses the PortfolioTable component to display the user's holdings.
- [ ] T018 Create a backtesting page in `pages/backtesting.tsx` to allow users to define and test their strategies.

## Phase 3.5: Testing & Polish
- [ ] T019 [P] Write unit tests for the API client, Zustand store, and utility functions using Jest.
- [ ] T020 [P] Write integration tests for the main trading page and portfolio page to ensure all components work together correctly.
- [ ] T021 [P] Write end-to-end tests for the core user flows (viewing charts, placing orders) using Playwright.
- [ ] T022 [P] Review and optimize the performance of the application, especially the real-time data rendering.
- [ ] T023 [P] Ensure the application is responsive and works well on different screen sizes.

## Dependencies
- T001-T004 must be completed before other phases.
- T005-T008 (API Layer) should be completed before T014-T018 (Page Implementation).
- T009-T013 (Core UI Components) can be developed in parallel with the API Layer.
- T019-T023 (Testing & Polish) should be done after the implementation of the features.