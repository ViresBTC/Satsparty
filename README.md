# SatsParty ⚡🎉

**Onboarding masivo a Bitcoin Lightning en eventos presenciales.**

El organizador conecta su nodo Lightning. Los asistentes escanean un QR y reciben una wallet con sats reales en segundos. Sin apps, sin KYC, sin fricción.

> Proyecto para la hackathon **FOUNDATIONS** de [La Crypta](https://hackaton.lacrypta.ar) — Marzo 2026

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FViresBTC%2FSatsparty&env=DATABASE_URL&envDescription=PostgreSQL%20connection%20string%20(free%20at%20neon.tech)&envLink=https%3A%2F%2Fneon.tech&project-name=satsparty&repository-name=satsparty)

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

1. Entrá al panel admin (`/admin`) con tu clave Nostr (nsec o extensión NIP-07)
2. Creá un evento: nombre, fecha, sats de bienvenida, capacidad máxima
3. Conectá tu Alby Hub (URL + auth token)
4. Compartí el QR del evento

### Para el Asistente

1. Escaneá el QR con la cámara del celular
2. Escribí tu nombre
3. En 10 segundos tenés:
   - Una wallet Lightning funcional
   - Sats de bienvenida para gastar
   - Una Lightning Address (`tunombre@tudominio.app`) para recibir pagos
4. Enviá, recibí y explorá Lightning desde el navegador

**Opción alternativa:** el asistente puede conectar su propia wallet existente via NWC y recibir una Lightning Address igualmente.

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
│   LNURL-pay (Lightning Address) ── Live Prices       │
│                                                      │
│   PostgreSQL (Neon) ──── Alby Hub Client              │
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
| Base de datos | PostgreSQL (Neon) | Serverless-compatible, gratis, sin WASM |
| Lightning | Alby Hub API + NWC | Sub-wallets aisladas por asistente |
| Lightning Address | LNURL-pay (LUD-16) | Direcciones `usuario@dominio` automáticas |
| Precios | CoinGecko + Yadio | BTC/USD y USD/ARS en vivo con fallbacks |
| QR Codes | qrcode (lib) | QR reales escaneables |
| Identidad | Nostr (NIP-07, NIP-98) | Auth descentralizada, sin passwords |
| Deploy | Vercel | Free tier, deploy automático desde GitHub |

---

## Funcionalidades

### Panel de Administración
- Login con clave Nostr (nsec) o extensión (Alby, nos2x)
- Acceso directo via `/admin`
- Crear y gestionar múltiples eventos
- Conectar Alby Hub con test de conexión integrado
- QR único por evento para compartir
- Estadísticas en tiempo real: asistentes, sats distribuidos
- Cerrar/reabrir/eliminar eventos
- Lista de asistentes con estado de onboarding
- Dominio configurable para Lightning Addresses

### Wallet del Asistente
- Balance en SATS, USD y ARS (conversión en tiempo real via APIs)
- Enviar sats a Lightning Address, LNURL o invoice BOLT11
- Detección automática de invoices BOLT11 al pegar
- Recibir con Lightning Address propia o invoice con monto
- QR codes reales escaneables
- Botón de copiar invoice/address
- Notificación de pagos recibidos (polling de balance)
- Animaciones de rayo y confetti al recibir pagos
- Historial de transacciones
- Exportar clave NWC para migrar a otra wallet

### Lightning Addresses
- Generación automática: `nombre@tudominio.app`
- Funciona con cualquier wallet que soporte LNURL-pay
- Endpoint `.well-known/lnurlp` compatible con LUD-16
- Auto-detección del dominio (sin configuración manual)
- Funciona tanto para wallets creadas como para wallets propias conectadas via NWC

### Precios en Vivo
- BTC/USD via CoinGecko (fallback: Blockchain.info)
- USD/ARS via Yadio (fallback: DolarAPI)
- Cache en memoria de 60 segundos
- Funciona sin base de datos (ideal para cold starts rápidos)

### Onboarding
- Pantallas guiadas paso a paso
- Opción de crear wallet nueva o conectar wallet existente via NWC
- Creación de wallet automática al ingresar nombre
- Fondeo instantáneo con sats de bienvenida
- Animación de confetti y rayo al completar
- Misiones educativas sobre Bitcoin y Lightning

---

## Inicio Rápido

### Prerrequisitos

- Node.js 20+
- npm
- Una base de datos PostgreSQL (gratis en [neon.tech](https://neon.tech))
- Un Alby Hub (cloud o self-hosted) para crear sub-wallets

### Deploy en un click

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FViresBTC%2FSatsparty&env=DATABASE_URL&envDescription=PostgreSQL%20connection%20string%20(free%20at%20neon.tech)&envLink=https%3A%2F%2Fneon.tech&project-name=satsparty&repository-name=satsparty)

1. Click en el botón de arriba
2. Creá una DB gratis en [neon.tech](https://neon.tech) y pegá el connection string como `DATABASE_URL`
3. Listo — tu instancia de SatsParty está corriendo

### Instalación manual

```bash
# Clonar el repositorio
git clone https://github.com/ViresBTC/Satsparty.git
cd Satsparty

# Instalar dependencias
npm install

# Configurar variable de entorno
export DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# Frontend + Backend simultáneos
npm run dev:all
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api
- Panel Admin: http://localhost:5173/admin

---

## Estructura del Proyecto

```
satsparty/
├── src/                              # Frontend
│   ├── main.js                       # Router y bootstrap
│   ├── onboarding.js                 # Flujo de onboarding
│   ├── dashboard.js                  # Wallet del asistente
│   ├── admin.js                      # Panel del organizador
│   ├── services/
│   │   ├── nwc.js                    # Cliente NWC (pagos Lightning)
│   │   ├── nostr.js                  # Identidad Nostr (login, firma)
│   │   ├── api.js                    # Cliente HTTP con JWT
│   │   ├── state.js                  # Estado + conversión de precios
│   │   └── qr.js                     # Generación de QR reales
│   └── styles/
│       ├── base.css                  # Design system
│       ├── onboarding.css            # Estilos onboarding
│       ├── dashboard.css             # Estilos wallet
│       └── admin.css                 # Estilos admin
├── server/                           # Backend
│   ├── app.js                        # App Hono (compartida dev/Vercel)
│   ├── index.js                      # Entry point desarrollo
│   ├── db.js                         # PostgreSQL via Neon
│   ├── middleware/
│   │   └── auth.js                   # JWT + verificación Nostr
│   ├── routes/
│   │   ├── auth.js                   # Login Nostr + demo
│   │   ├── events.js                 # CRUD eventos + test Alby
│   │   ├── onboard.js                # Claim de wallets
│   │   ├── attendees.js              # Registro de asistentes
│   │   ├── prices.js                 # Precios BTC/USD/ARS en vivo
│   │   └── lnurlp.js                # Lightning Address (LNURL-pay)
│   └── services/
│       ├── alby.js                   # Cliente API Alby Hub
│       └── prices.js                 # Fetch de precios con cache
├── api/
│   ├── [...route].js                 # Vercel serverless handler
│   ├── health.js                     # Health check (lightweight)
│   └── prices.js                     # Precios (lightweight, no DB)
├── vercel.json                       # Config de deploy
└── package.json
```

---

## API

| Método | Endpoint | Auth | Descripción |
|--------|----------|------|-------------|
| `GET` | `/api/health` | — | Health check |
| `GET` | `/api/prices` | — | Precios BTC/USD, USD/ARS en vivo |
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
| `POST` | `/api/attendees/register` | — | Registrar usuario con wallet propia |
| `GET` | `/.well-known/lnurlp/:user` | — | LNURL-pay step 1 (metadata) |
| `GET` | `/.well-known/lnurlp/:user/callback` | — | LNURL-pay step 2 (invoice) |

---

## Seguridad

- **Credenciales del Alby Hub** se almacenan en el servidor, nunca se exponen al frontend
- **Sub-wallets aisladas**: cada asistente accede solo a sus propios fondos
- **Auth Nostr (NIP-98)**: el admin firma cada request con su clave privada
- **JWT con expiración** de 24 horas
- **Sanitización**: los datos sensibles se filtran antes de enviar al cliente
- **NWC URLs** almacenadas en PostgreSQL serverless (Neon), no en el cliente

---

## Roadmap

- [x] Onboarding completo con pantallas guiadas
- [x] Wallet funcional (enviar, recibir, historial)
- [x] Panel admin (eventos, asistentes, estadísticas)
- [x] Integración Alby Hub (crear sub-wallets automáticas)
- [x] Auth Nostr (nsec + NIP-07)
- [x] Deploy en Vercel con Neon PostgreSQL
- [x] Conversión multi-moneda (SATS/USD/ARS) con precios en vivo
- [x] Lightning Addresses funcionales (LNURL-pay LUD-16)
- [x] QR codes reales escaneables
- [x] Detección automática de invoices BOLT11
- [x] Notificaciones de pagos recibidos
- [x] Conectar wallet propia via NWC
- [ ] Sistema de misiones completo (aprender Lightning paso a paso)
- [ ] Recarga de wallet con pesos/USDT
- [ ] Push notifications

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
