# Phase 0: Research & Decisions

This document outlines the research conducted to resolve ambiguities from the feature specification and technical context.

## 1. Backtesting Data Range

-   **Question**: What is the range of historical data available for backtesting?
-   **Decision**: The frontend will fetch the required backtesting data through the date range parameters provided by the backend API.
-   **Rationale**: The user has confirmed that the backend will provide parameters to get the required data range, which simplifies the frontend logic.
-   **Alternatives considered**: Initially, we considered fetching data in chunks using a `limit` parameter, but the date-range approach is more efficient.

## 2. Supported Exchanges

-   **Question**: Which exchanges are supported?
-   **Decision**: We will support Taiwan's listed (TWSE) and OTC (TPEx) stocks, as well as the Taiwan Futures Exchange (TAIFEX).
-   **Rationale**: The user has specified that the scope is for the Taiwanese market.
-   **Alternatives considered**: NASDAQ/NYSE were initially considered but corrected by the user.

## 3. Supported Technical Indicators

-   **Question**: What is the full list of supported indicators?
-   **Decision**: We will support the following indicators: Moving Average (MA), Stochastic Oscillator (KD), MACD, and Bollinger Bands (BBands).
-   **Rationale**: This list was provided by the user.
-   **Alternatives considered**: A different list was initially proposed but corrected by the user.

## 4. Strategy Analysis Metrics

-   **Question**: What kind of analysis is required?
-   **Decision**: The strategy analysis will provide the following metrics: Total Return, Annualized Return, Sharpe Ratio, and Max Drawdown.
-   **Rationale**: These are standard metrics for evaluating the performance of a trading strategy.
-   **Alternatives considered**: More advanced metrics can be added later.

## 5. Testing Framework

-   **Question**: Which testing framework should be used?
-   **Decision**: We will use Jest for unit and integration testing, and Playwright for end-to-end testing.
-   **Rationale**: Jest is the standard for React/Next.js applications. Playwright provides reliable end-to-end testing across different browsers.
-   **Alternatives considered**: Cypress (another popular E2E testing framework).

## 6. Performance Goals

-   **Question**: What are the performance goals?
-   **Decision**:
    -   API p95 response time < 200ms.
    -   Page load time (LCP) < 3 seconds.
-   **Rationale**: These are common performance targets for a responsive web application.

## 7. Real-time Data Constraints

-   **Question**: What are the constraints for real-time data updates?
-   **Decision**: Real-time data updates on the frontend (e.g., quotes, charts) must be reflected in under 500ms from the time the data is received by the backend.
-   **Rationale**: This ensures a near real-time experience for the user.

## 8. Scale and Scope

-   **Question**: What is the expected scale and scope?
-   **Decision**:
    -   The system should support up to 1,000 concurrent users.
    -   Historical data storage will be optimized for the 5-year range mentioned above.
-   **Rationale**: This provides a clear target for infrastructure and architecture planning.