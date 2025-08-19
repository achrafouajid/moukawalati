# Moukawalati  

**Moukawalati** is an **AI-powered fintech ERP platform** built on a modern **PERN stack (PostgreSQL, Express.js, React, Node.js)** with **microservices architecture** and **RabbitMQ** for service-to-service communication.  

It streamlines and unifies business operations by integrating:  
- 📄 Invoicing  
- 👥 CRM  
- 📊 Project Management  
- 💰 Accounting  
- 🔗 Supply Chain Planning  
- 📦 Inventory Management  
- 🏬 Warehouse Management System (WMS)  
- 🚚 Transportation Management System (TMS)  
- 👷 Labor Management System (LMS)  

---

## 🚀 Vision  

Moukawalati goes beyond a traditional ERP by embedding **artificial intelligence** into its core.  
- Modular design → Each business domain runs as an independent microservice.  
- AI-driven workflows → The system continuously learns from user data.  
- Natural language interaction → Users can **talk to a chatbot** to perform tasks across modules (e.g., “Create an invoice for client X”, “Generate a supply chain report”).  
- Seamless orchestration → AI integrates across multiple services to automate repetitive tasks, assist in decision-making, and streamline operations.  

---

## 🏗️ Architecture Overview  

- **Frontend:** React (client interface)  
- **Backend:** Node.js + Express (modular services)  
- **Database:** PostgreSQL (per service persistence)  
- **Messaging:** RabbitMQ (event-driven communication between services)  
- **AI Layer:** Custom NLP & ML pipelines for chatbot-driven task automation  