# RetailHub E-Commerce & FraudGuard Telemetry Engine Platform

[![Apache Kafka](https://img.shields.io/badge/Apache_Kafka-v2.0-231F20?logo=apachekafka)](https://kafka.apache.org/)
[![MySQL](https://img.shields.io/badge/MySQL-v8.0-4479A1?logo=mysql)](https://www.mysql.com/)
[![Docker Hub](https://img.shields.io/badge/Docker_Hub-naveen9200/website__app-2496ED?logo=docker)](https://hub.docker.com/r/naveen9200/website_app)

---

## 📌 Executive Summary

**RetailHub** is a full-stack, enterprise-grade e-commerce platform integrated with **FraudGuard**, a real-time event-driven telemetry and behavioral risk engine. 

The platform captures live customer clickstream telemetry asynchronously using **Apache Kafka**, evaluates complex behavioral fraud vectors (brute-force logins, credential stuffing, card testing, account takeover, coupon abuse, and scraper bots), and enforces dynamic security workflows (OTP step-up authentication, 24-hour restrictions, admin review queues, and permanent account bans).

---

## 🔗 Related Repositories

### 📊 ETL Data Pipeline Repository
The batch and streaming ETL pipeline for processing historical clickstream telemetry, data warehouse transformations, and analytics modeling is hosted in a separate dedicated repository:

👉 **[RetailHub ETL Data Pipeline Repository](https://github.com/naveenkumark2830-spec/Retailhub-ETL)**  
*URL*: `https://github.com/naveenkumark2830-spec/Retailhub-ETL`

---

## 🐳 Docker Deployment & Container Image

The complete application (React Frontend SPA + Node.js/Express Backend API) is packaged into a unified multi-stage Docker image published on **Docker Hub**.

### Official Image Repository
`naveen9200/website_app:latest`

### 1. Pull Image from Docker Hub
```bash
docker pull naveen9200/website_app:latest
```

### 2. Run with Docker Compose (Recommended)
Save the following configuration as `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    image: naveen9200/website_app:latest
    container_name: nexday-platform
    restart: unless-stopped
    ports:
      - "5000:5000"
    env_file:
      - .env
    volumes:
      - nexday-event-logs:/app/backend/event_logs
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

volumes:
  nexday-event-logs:
    driver: local
```

Start the application container:
```bash
docker compose up -d
```

### 3. Build & Run Image Locally from Source
```bash
# Build multi-stage Docker image
docker build -t naveen9200/website_app:latest -f Dockerfile .

# Run container standalone
docker run -d -p 5000:5000 --name nexday-platform naveen9200/website_app:latest
```

---

## 🌟 Key Platform Capabilities

### 🛒 Omnichannel E-Commerce Portal
- **Catalog Browsing & Search**: Search across categories with multi-parameter filtering (price, brand, rating, discount).
- **Cart & Checkout Engine**: Subtotal calculation, promo code application, shipping address management, and order placement.
- **Order Lifecycle & Invoicing**: Real-time order status tracking, automated text/PDF invoice generation, and return/refund processing.
- **Resilient Dual-Storage**: Primary persistence in **MySQL** with an automatic, zero-downtime **In-Memory Repository Fallback** (`Map` cache) during database outages.

### 🛡️ FraudGuard Real-Time Security Operations (`/admin/fraud`)
- **Real-Time KPI Dashboard**: 5 dynamic KPI cards (Total Incidents, Admin Reviews Required, Banned Accounts, Currently Restricted, Step-Up Verifications Pending), interactive 7-day trend chart with hover tooltips, horizontal security workflow breakdown, and fraud type distribution.
- **15+ Automated Fraud Scenarios**:
  - `BRUTE_FORCE_LOGIN`: Rapid failed login bursts (Score: 85–90).
  - `MULTI_IP_LOGIN_ATTACK`: Login attempts from multiple distinct IPs (Score: 75–85).
  - `PAYMENT_FAILURE_VELOCITY`: Card testing & rapid declination velocity (Score: 70–80).
  - `ACCOUNT_TAKEOVER_SEQUENCE`: New device login $\rightarrow$ credential change $\rightarrow$ order placement (Score: 90–98).
  - `COUPON_ABUSE`: Device/IP sharing with high-value discount code claims (Score: 70–92).
  - `REFUND_ABUSE`: High-frequency return requests claiming defective items (Score: 65–82).
  - `BOT_OR_SCRAPER`: Sub-100ms rapid category scraping with session cookie clearing (Score: 70–96).
  - `DDOS`: Burst traffic exceeding 30 requests/10s per IP (Score: 90–99).
- **Security Priority State Machine**:
  $$\text{NORMAL (1)} < \text{STEP\_UP\_REQUIRED (2)} < \text{PROTECTED (3)} < \text{RESTRICTED (4)} < \text{DEACTIVATED (5)} < \text{BANNED (6)}$$
  *(Prevents accidental status downgrades during concurrent fraud evaluations).*
- **OTP Step-Up Authentication**: Generates 6-digit OTP challenge (300s expiry). Exceeding 3 failed attempts triggers a 24-hour restriction.
- **Restriction Expiration & Release**: Expired or released restrictions mandate passing OTP step-up verification on next login before returning to `NORMAL` status.
- **Admin Review & Ban Management**: Dedicated administrative review queue with single-click *Extend Restriction (24h)*, *Deactivate Account*, *Ban Account*, and *Revoke Ban & Activate* operations.

---

## ⚡ Apache Kafka Event Streaming Infrastructure

Telemetry events are published to **13 dedicated Kafka topics** mapped via `kafkaTopicMapper.ts`:

| Domain Category | Kafka Topic Target | Partition Key Strategy |
| :--- | :--- | :--- |
| **User & Auth** | `retail_user_events` | `customer_id` / `session_id` |
| **Discovery** | `retail_discovery_events` | `customer_id` / `session_id` |
| **Cart** | `retail_cart_events` | `customer_id` |
| **Checkout** | `retail_checkout_events` | `customer_id` |
| **Payment** | `retail_payment_events` | `customer_id` / `order_id` |
| **Order** | `retail_order_events` | `customer_id` / `order_id` |
| **Fulfillment** | `retail_fulfillment_events` | `order_id` |
| **Delivery** | `retail_delivery_events` | `order_id` |
| **Returns & Refunds** | `retail_return_events` | `customer_id` / `order_id` |
| **Reviews & Ratings** | `retail_review_events` | `customer_id` |
| **Coupons** | `retail_coupon_events` | `customer_id` / `device_id` |
| **System** | `retail_system_events` | `customer_id` / `order_id` |
| **Admin** | `retail_admin_events` | `admin_id` |
| **Unmapped / Dead Letter** | `retail_dead_letter` | `event_id` |

*Partition Key Rule*: Partitioning by `customer_id` guarantees strict chronological event ordering per customer at consumer nodes.

---

## 🗄️ Database Schema Reference (MySQL)

The application maintains 12 relational database tables:
1. `customers`: User profile, credentials, and default account status.
2. `customer_security`: Priority security status, step-up requirements, failed login counter.
3. `fraud_incidents`: Captured security incidents, risk scores, severity, AI recommendations.
4. `fraud_restrictions`: Active and historical temporary restrictions and 24-hour locks.
5. `verification_challenges`: Step-up OTP challenges, attempts, hashes, and expiration timestamps.
6. `banned_accounts`: Registry of permanently banned customer accounts.
7. `fraud_audit_log`: Append-only audit trail tracking security decisions.
8. `fraud_admin_actions`: Historical record of administrative security actions.
9. `categories` & `subcategories`: Product hierarchy and catalog metadata.
10. `products`: Inventory catalog, SKUs, pricing, ratings, and image URLs.
11. `orders` & `order_items`: Confirmed customer transactions and item breakdowns.
12. `sessions`: Active user browsing session records.

---

## 🚀 Local Development Setup

### Prerequisites
- **Node.js** (v20.x or higher)
- **MySQL Server** (v8.0+)
- **Apache Kafka** (v2.0+) *(Optional for local fallback mode)*

### 1. Clone Repository & Install Dependencies
```bash
# Clone repository
git clone https://github.com/naveenkumark2830-spec/RetailHub-E-Commerce-Webiste.git
cd RetailHub-E-Commerce-Webiste

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure Environment Variables
Create `.env` inside `backend/`:
```env
PORT=5000
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=retailhub
KAFKA_BROKER=localhost:9092
FRAUDGUARD_DECISION_TOPIC=retail_fraudguard_events
KAFKA_CONSUMER_GROUP=retailhub-website-fraudguard
JWT_SECRET=retailhub_super_secret_jwt_key_2026
```

### 3. Start Application
```bash
# Run backend server (watch mode)
cd backend
npm run dev

# Run frontend React app (Vite dev server)
cd ../frontend
npm run dev
```

---

## 📜 License & Copyright

© 2026 **RetailHub & FraudGuard Platform**. All rights reserved. Managed under the `naveenkumark2830-spec` GitHub organization.
