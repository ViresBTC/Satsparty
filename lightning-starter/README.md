# SatsParty ⚡🎉

**Onboarding masivo a Bitcoin Lightning en eventos presenciales.**

El organizador conecta su nodo Lightning. Los asistentes escanean un QR y reciben una wallet con sats reales en segundos. Sin apps, sin KYC, sin fricción.

> Proyecto para la hackathon **FOUNDATIONS** de [La Crypta](https://hackaton.lacrypta.ar) — Marzo 2026

---

## El Problema

Explicarle Bitcoin a alguien es difícil. Que lo **use** es otra cosa. En eventos presenciales de Lightning, el onboarding es lento, confuso y requiere que cada asistente instale apps, cree cuentas y entienda conceptos complejos antes de su primera transacción.

## La Solución

SatsParty automatiza todo el proceso. Un QR. Una wallet. Sats reales. En 10 segundos.

```
Organizador                          Asistente
    |                                    |
    |  1. Crea evento en SatsParty       |
    |  2. Conecta su Alby Hub           |
    |  3. Imprime QR del evento          |
    |                                    |
    |           ----  QR  ---->          |
    |                                    |
    |                          4. Escanea QR desde el celular
    |                          5. Ingresa su nombre
    |                          6. Recibe wallet + 100 sats
    |                          7. Ya puede enviar y recibir ⚡
```

---

## Cómo Funciona

### Para el Organizador

1. Entrá al panel admin con tu clave Nostr (nsec o extensión NIP-07)
2. Creá un evento: nombre, fecha, sats de bienvenida, capacidad máxima
3. Conectá tu Alby Hub (URL + auth token)
4. Compartí el QR del evento

### Para el Asistente

1. Escaneá el QR con la cámara del celular
2. Escribí tu nombre
3. En 10 segundos tenés:
   - Una wallet Lightning funcional
   - Sats de bienvenida para gastar
   - Una Lightning Address para recibir pagos
4. Enviá, recibí y explorá Lightning desde el navegador

No necesita instalar nada. Todo funciona desde el browser.

---

## Arquitectura

```
┌──────────────────────────────────────────────────────┐
│                    FRONTEND (Vite SPA)                │
│                                                      │
│   Onboarding ──── Dashboard ──── Admin Panel         │
│   (asistente)    (wallet)       (organizador)        │
└──────────────────────┬───────────────────────────────┘
                       │ API REST + JWT
┌──────────────────────┴───────────────────────────────┐
│                   BACKEND (Hono)                      │
│                                                      │
│   Auth (Nostr/NIP-98) ── Events CRUD ── Onboard     │
│                                                      │
│   SQLite (sql.js) ──── Alby Hub Client               │
└──────────────────────┬───────────────────────────────┘
                       │ HTTP API + Bearer Token
┌──────────────────────┴───────────────────────────────┐
│                  ALBY HUB (nodo Lightning)            │
│                                                      │
│   Crear sub-wallets aisladas por asistente           │
│   Cada wallet tiene su propia NWC URL                │
│   Fondos aislados — un asistente no accede a otro    │
└──────────────────────────────────────────────────────┘
```

### Stack Técnico

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Frontend | Vite + Vanilla JS | Rápido, sin frameworks pesados |
| Backend | Hono | Ultra-liviano (~13KB), serverless-ready |
| Base de datos | sql.js (WASM SQLite) | Compatible con Vercel serverless |
| Lightning | Alby Hub API + NWC | Sub-wallets aisladas por asistente |
| Identidad | Nostr (NIP-07, NIP-98) | Auth descentralizada, sin passwords |
| Deploy | Vercel | Free tier, deploy automático desde GitHub |

---

## Funcionalidades

### Panel de Administración
- Login con clave Nostr (nsec) o extensión (Alby, nos2x)
- Crear y gestionar múltiples eventos
- Conectar Alby Hub con test de conexión integrado
- QR único por evento para compartir
- Estadísticas en tiempo real: asistentes, sats distribuidos
- Cerrar/reabrir eventos
- Lista de asistentes con estado de onboarding

### Wallet del Asistente
- Balance en SATS, USD y ARS (conversión en tiempo real)
- Enviar sats a Lightning Address, LNURL o invoice BOLT11
- Recibir con Lightning Address propia o invoice con monto
- Escanear QR para pagar
- Historial de transacciones
- Exportar clave NWC para migrar a otra wallet

### Onboarding
- 8 pantallas guiadas paso a paso
- Creación de wallet automática al ingresar nombre
- Fondeo instantáneo con sats de bienvenida
- Animación de confetti y rayo al completar
- Modo demo para presentaciones sin nodo real

---

## Inicio Rápido

### Prerrequisitos

- Node.js 18+
- npm
- Un Alby Hub (cloud o self-hosted) para crear wallets

### Instalación

```bash
# Clonar el repositorio
git clone https://github.com/ViresBTC/Satsparty.git
cd Satsparty/lightning-starter

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu configuración
```

### Configuración (.env)

```env
# NWC URL de tu wallet (para testing)
NWC_URL=nostr+walletconnect://...

# Lightning Address (para testing)
LIGHTNING_ADDRESS=tu@getalby.com

# Password del admin (modo demo)
ADMIN_PASSWORD=tu-password-seguro

# Secreto para JWT (cambiar en producción)
JWT_SECRET=un-string-aleatorio-de-32-caracteres

# Puerto del backend
PORT=3001
```

### Desarrollo

```bash
# Frontend + Backend simultáneos
npm run dev

# Solo frontend (Vite)
npm run dev:front

# Solo backend (Hono)
npm run dev:server
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api
- Panel Admin: http://localhost:5173/#admin

### Deploy a Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
vercel
```

O conectá tu repo de GitHub a Vercel para deploy automático en cada push.

---

## Estructura del Proyecto

```
lightning-starter/
├── src/                              # Frontend
│   ├── main.js                       # Router y bootstrap
│   ├── onboarding.js                 # Flujo de onboarding (8 pantallas)
│   ├── dashboard.js                  # Wallet del asistente
│   ├── admin.js                      # Panel del organizador
│   ├── services/
│   │   ├── nwc.js                    # Cliente NWC (pagos Lightning)
│   │   ├── nostr.js                  # Identidad Nostr (login, firma)
│   │   ├── api.js                    # Cliente HTTP con JWT
│   │   ├── state.js                  # Estado + conversión de precios
│   │   └── qr.js                     # Generación de QR
│   └── styles/
│       ├── base.css                  # Design system
│       ├── onboarding.css            # Estilos onboarding
│       ├── dashboard.css             # Estilos wallet
│       └── admin.css                 # Estilos admin
├── server/                           # Backend
│   ├── app.js                        # App Hono (compartida dev/Vercel)
│   ├── index.js                      # Entry point desarrollo
│   ├── db.js                         # SQLite con sql.js
│   ├── middleware/
│   │   └── auth.js                   # JWT + verificación Nostr
│   ├── routes/
│   │   ├── auth.js                   # Login Nostr + demo
│   │   ├── events.js                 # CRUD eventos + test Alby
│   │   ├── onboard.js                # Claim de wallets
│   │   └── prices.js                 # Precios BTC/USD/ARS
│   └── services/
│       └── alby.js                   # Cliente API Alby Hub
├── api/
│   └── [...route].js                 # Entry point Vercel serverless
├── vercel.json                       # Config de deploy
└── package.json
```

---

## API

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `POST` | `/api/auth/nostr` | — | Login con evento Nostr firmado |
| `POST` | `/api/auth/login` | — | Login demo (password) |
| `GET` | `/api/auth/me` | JWT | Verificar sesión |
| `POST` | `/api/events` | JWT | Crear evento |
| `GET` | `/api/events` | JWT | Listar eventos del admin |
| `PATCH` | `/api/events/:id` | JWT | Actualizar evento |
| `DELETE` | `/api/events/:id` | JWT | Eliminar evento |
| `POST` | `/api/events/test-alby` | — | Test de conexión a Alby Hub |
| `GET` | `/api/onboard/:code` | — | Info del evento (público) |
| `POST` | `/api/onboard/:code/claim` | — | Crear wallet para asistente |
| `GET` | `/api/prices` | — | Precios BTC/USD, USD/ARS |

---

## Seguridad

- **Credenciales del Alby Hub** se almacenan en el servidor, nunca se exponen al frontend
- **Sub-wallets aisladas**: cada asistente accede solo a sus propios fondos
- **Auth Nostr (NIP-98)**: el admin firma cada request con su clave privada
- **JWT con expiración** de 24 horas
- **Sanitización**: los datos sensibles se filtran antes de enviar al cliente

---

## Roadmap

- [x] Onboarding completo (8 pantallas)
- [x] Wallet funcional (enviar, recibir, historial)
- [x] Panel admin (eventos, asistentes, estadísticas)
- [x] Integración Alby Hub (crear sub-wallets automáticas)
- [x] Auth Nostr (nsec + NIP-07)
- [x] Deploy en Vercel
- [x] Conversión multi-moneda (SATS/USD/ARS)
- [ ] Sistema de misiones (aprender Lightning paso a paso)
- [ ] Recarga de wallet con pesos/USDT
- [ ] Notificaciones en tiempo real

---

## Hackathon FOUNDATIONS

| | |
|---|---|
| **Evento** | FOUNDATIONS by La Crypta |
| **Tema** | Lightning Payments Basics |
| **Fechas** | Marzo 2026 |
| **Premio** | 1,000,000 sats |
| **Info** | [hackaton.lacrypta.ar](https://hackaton.lacrypta.ar) |

---

## Licencia

MIT

---

Hecho con ⚡ para la comunidad Bitcoin.
