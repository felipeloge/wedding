# Infrastructure & Setup Guide: Evolution API v2 on Oracle Cloud

This document details the configuration, deployment, and instance pairing steps for running **Evolution API v2** using Docker Compose on an **Oracle Cloud Infrastructure (OCI)** Ubuntu instance backed by **PostgreSQL**.

---

## Architecture Overview

* **Host Platform:** Oracle Cloud Infrastructure (Ubuntu VM)
* **API Engine:** Evolution API (`evoapicloud/evolution-api:latest`)
* **Database:** PostgreSQL 15 (`postgres:15-alpine`)
* **Connection Protocol:** WhatsApp Baileys integration via 8-digit Pairing Code

---

## Prerequisites & Firewall Setup

Evolution API requires exposed TCP port `8080`. Both the Oracle VCN network layer and local OS firewall must allow inbound traffic.

### 1. Oracle Cloud VCN Security List

In the Oracle Cloud Console:

* Navigate to **Networking** $\rightarrow$ **Virtual Cloud Networks** $\rightarrow$ **Public Subnet** $\rightarrow$ **Security Lists**.
* Add an **Ingress Rule**:
* **Source CIDR:** `0.0.0.0/0`
* **IP Protocol:** `TCP`
* **Destination Port Range:** `8080`



### 2. Ubuntu Firewall (`iptables`)

Allow traffic on port `8080` and save rules permanently:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 8080 -j ACCEPT
sudo netfilter-persistent save

```

---

## Docker Compose Setup

Navigate to your working directory (`/home/ubuntu/evolution-api`) and create the `docker-compose.yml` file.

```yaml
services:
  postgres:
    image: postgres:15-alpine
    container_name: evolution_postgres
    restart: always
    environment:
      POSTGRES_DB: evolution
      POSTGRES_USER: evolution
      POSTGRES_PASSWORD: evolution_password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  evolution-api:
    image: evoapicloud/evolution-api:latest
    container_name: evolution_api
    restart: always
    ports:
      - "8080:8080"
    depends_on:
      - postgres
    environment:
      - SERVER_URL=http://YOUR_PUBLIC_IP:8080
      - AUTHENTICATION_TYPE=apikey
      - AUTHENTICATION_API_KEY=YOUR_SECRET_API_KEY

      # Database Settings (Mandatory for Evolution API v2)
      - DATABASE_ENABLED=true
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://evolution:evolution_password@postgres:5432/evolution?schema=public
      - DATABASE_CLIENT_NAME=evolution_db
      - DATABASE_SAVE_DATA_INSTANCE=true
      - DATABASE_SAVE_DATA_NEW_MESSAGE=true

      # Session & Phone Emulation Overrides
      - CACHE_REDIS_ENABLED=false
      - SERVER_TYPE=http
      - SERVER_PORT=8080
      - CONFIG_SESSION_PHONE_CLIENT_NAME=Mac OS
      - CONFIG_SESSION_PHONE_NAME=Chrome
      - QRCODE_LIMIT=30

volumes:
  postgres_data:

```

### Starting the Service

Run the stack using Docker Compose:

```bash
docker compose up -d

```

Verify that both containers are running healthy:

```bash
docker ps

```

---

## Instance Creation & WhatsApp Pairing Procedure

> **Note:** Due to WhatsApp multi-device security restrictions blocking standard camera QR scanning on headless servers, instances must be initialized with `"qrcode": false` to utilize WhatsApp's 8-digit **Pairing Code** handshake.

### Step 1: Create the Instance (Pairing Code Mode)

Execute an HTTP `POST` request to initialize the `wedding` instance without QR code generation:

```bash
curl -X POST http://YOUR_PUBLIC_IP:8080/instance/create \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_SECRET_API_KEY" \
  -d '{
    "instanceName": "wedding",
    "qrcode": false,
    "integration": "WHATSAPP-BAILEYS"
  }'

```

### Step 2: Request the 8-Digit Pairing Code

Execute an HTTP `GET` request passing your target mobile number as a query parameter (formatted with country code, e.g., `55...` for Brazil):

```bash
curl -X GET "http://YOUR_PUBLIC_IP:8080/instance/connect/wedding?number=5511999999999" \
  -H "apikey: YOUR_SECRET_API_KEY"

```

**Response Example:**

```json
{
  "pairingCode": "ABCD-1234",
  "code": "..."
}

```

### Step 3: Link Device on WhatsApp Mobile

1. Open **WhatsApp** on the dedicated mobile phone.
2. Navigate to **Settings** $\rightarrow$ **Linked Devices** $\rightarrow$ **Link a Device**.
3. Select **"Link with phone number instead"** at the bottom of the camera screen.
4. Enter the 8-character code (e.g., `ABCD-1234`) returned in the API response.

---

## Operational Verification

Test text delivery once the session reaches a connected state:

```bash
curl -X POST http://YOUR_PUBLIC_IP:8080/message/sendText/wedding \
  -H "Content-Type: application/json" \
  -H "apikey: YOUR_SECRET_API_KEY" \
  -d '{
    "number": "5511999999999",
    "text": "Evolution API v2 connection established successfully."
  }'

```

---

## Useful Maintenance Commands

* **View API Logs:** `docker logs evolution_api --tail 100 -f`
* **Restart Services:** `docker compose restart`
* **Teardown & Rebuild Containers:** `docker compose down && docker compose up -d`