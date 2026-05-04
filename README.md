# 🚀 Incident Management System (IMS)

## 📌 Overview

This project is a **real-time Incident Management System** designed to simulate how modern SRE/DevOps teams detect, manage, and resolve system incidents.

It supports **signal ingestion, incident lifecycle tracking, RCA enforcement, MTTR calculation, and real-time monitoring via a dashboard**.

---

## ⚙️ Tech Stack

### Backend

* FastAPI (Python)
* PostgreSQL (SQLAlchemy ORM)
* Redis (Debounce / deduplication)
* MongoDB (Raw signal logging)
* SlowAPI (Rate limiting)

### Frontend

* React (Dashboard UI)
* Axios (API communication)

### DevOps

* Docker & Docker Compose

---

## ✨ Features

* 📡 **Signal Ingestion API**
* 🚨 **Automatic Incident Creation**
* 🔁 **Redis-based Debouncing (duplicate prevention)**
* 📊 **Incident Lifecycle Management**

  * OPEN → INVESTIGATING → RESOLVED → CLOSED
* 🧠 **RCA (Root Cause Analysis) Enforcement**
* ⏱ **MTTR Calculation (Mean Time To Resolution)**
* 📦 **MongoDB Logging for raw signals**
* 🚦 **Rate Limiting**
* 🐳 **Dockerized setup**
* 🎨 **Modern React Dashboard**

---

## 📁 Project Structure

```
Incident-Management-System/
│
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── database.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## 🚀 How to Run

### 1️⃣ Run Backend (Docker)

```bash
docker-compose up --build
```

Backend will run at:

```
http://127.0.0.1:8000
```

---

### 2️⃣ Run Frontend

```bash
cd frontend
npm install
npm start
```

Frontend will run at:

```
http://localhost:3000
```

---

## 📘 API Documentation

Swagger UI:

```
http://127.0.0.1:8000/docs
```

---

## 🔄 System Workflow

1. Send signal → `/signals`
2. Incident is created (if not duplicate)
3. Load incident in dashboard
4. Update status:

   * OPEN → INVESTIGATING → RESOLVED → CLOSED
5. Submit RCA before closing
6. MTTR is calculated automatically

---

## 🧪 Example API

### Create Signal

```json
POST /signals

{
  "component_id": "DB_SERVER",
  "severity": "P1",
  "message": "Database down"
}
```

---

## 🧠 Key Concepts

* **Redis** → Prevents duplicate incidents (debounce)
* **MongoDB** → Stores raw signal logs
* **MTTR** → Measures incident resolution time
* **Rate Limiting** → Protects API from overload
* **Docker** → Ensures consistent environment setup

---

## 📊 Metrics

* MTTR (Mean Time To Resolution)
* Incident Status Tracking
* Signal Processing Rate

---

## 🛠 Future Improvements

* 📈 Dashboard charts (MTTR trends)
* 📡 Real-time updates (WebSockets)
* 🔐 Authentication system
* 📋 Incident list view
* ☁️ Deployment on cloud (AWS/GCP)

---

## 👨‍💻 Author

Built as a DevOps/SRE-style project to demonstrate:

* Backend system design
* API development
* Monitoring workflows
* Full-stack integration

---

## 🏁 Conclusion

This project demonstrates how a real-world **Incident Management System** works, combining backend reliability, data storage, and frontend visualization into a cohesive system.

---
