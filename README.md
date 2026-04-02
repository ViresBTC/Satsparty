# SatsParty ⚡🎉

**Onboarding masivo a Bitcoin Lightning en eventos presenciales.**

El organizador conecta su wallet Lightning via NWC. Los asistentes escanean un QR y reciben una wallet custodial con sats reales en segundos. Sin apps, sin KYC, sin fricción.

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
    |  2. Conecta su wallet via NWC      |
    |  3. Imprime QR del evento          |
    |                                    |
    |           ----  QR  ---->          |
    |                                    |
    |                          4. Escanea QR desde el celular
    |                          5. Ingresa su nombre
    |                          6. Recibe wallet + sats de bienvenida
    |                          7. Ya puede enviar y recibir ⚡
```

---

## Cómo Funciona

### Para el Organizador

1. Entrá al panel admin (`/admin`) con tu clave Nostr (nsec o extensión NIP-07)
2. Creá un evento: nombre, fecha, sats de bienvenida, capacidad máxima
3. Conectá tu wallet Lightning via NWC (Nostr Wallet Connect)
4. Compartí el QR del evento

### Para el Asistente

1. Escaneá el QR con la cámara del celular
2. Escribí tu nombre
3. En 10 segundos tenés:
   - Una wallet Lightning custodial funcional
   - Sats de bienvenida para gastar
   - Una Lightning Address (`tunombre@tudominio.app`) para recibir pagos
4. Enviá, recibí y explorá Lightning desde el navegador

**Recuperar cuenta:** si cerrás el navegador, podés recuperar tu wallet ingresando el token único que se te asigna al registrarte.

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
                       │ API REST + Bearer Token
┌──────────────────────┴───────────────────────────────┐
│                   BACKEND (Hono)                      │
│                                                      │
│   Auth (Nostr/NIP-98) ── Events CRUD ── Onboard     │
│   Wallet API (custodial) ── LNURL-pay ── Prices     │
│                                                      │
│   PostgreSQL (Neon)                                   │
└──────────────────────┬───────────────────────────────┘
                       │ NWC (Nostr Wallet Connect)
┌──────────────────────┴───────────────────────────────┐
│              WALLET DEL ORGANIZADOR                   │
│                                                      │
│   Un solo NWC por evento                             │
│   Balances virtuales por asistente en la DB          │
│   Patrón seguro: deducir → pagar → reembolsar       │
└──────────────────────────────────────────────────────┘
```

### Modelo Custodial

SatsParty usa un modelo custodial simple y seguro:

- **Un solo NWC** del organizador maneja todos los pagos Lightning del evento
- Los **balances de cada asistente** son virtuales, almacenados en PostgreSQL
- Cuando un asistente paga: se **deduce primero** el balance → se ejecuta el pago via NWC → si falla, se **reembolsa** automáticamente
- Cuando un asistente recibe: el pago llega al NWC del admin → se **acredita** al balance virtual del asistente

### Stack Técnico

| Capa | Tecnología | Por qué |
|------|-----------|---------|
| Frontend | Vite + Vanilla JS | Rápido, sin frameworks pesados |
| Backend | Hono | Ultra-liviano (~13KB), serverless-ready |
| Base de datos | PostgreSQL (Neon) | Serverless-compatible, gratis |
| Lightning | NWC (Nostr Wallet Connect) | Un NWC por evento, compatible con cualquier wallet |
| Lightning Address | LNURL-pay (LUD-16) | Direcciones `nombre@dominio` automáticas |
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
- Conectar wallet via NWC con test de conexión integrado
- QR único por evento para compartir
- Estadísticas en tiempo real: asistentes, sats distribuidos
- Cerrar/reabrir/eliminar eventos
- Lista de asistentes con estado de onboarding

### Wallet del Asistente
- Balance en SATS, USD y ARS (conversión en tiempo real via APIs)
- Enviar sats a Lightning Address, LNURL o invoice BOLT11
- Detección automática de invoices BOLT11 al pegar
- Recibir con Lightning Address propia o invoice con monto
- QR codes reales escaneables
- Botón de copiar invoice/address
- Notificación de pagos recibidos (polling de balance)
- Animaciones de rayo y confetti al recibir pagos
- Historial de transacciones real (sin datos demo)
- Token único para recuperar cuenta

### Lightning Addresses
- Generación automática: `nombre@tudominio.app`
- Nombres únicos — si ya existe, se pide elegir otro
- Funciona con cualquier wallet que soporte LNURL-pay
- Endpoint `.well-known/lnurlp` compatible con LUD-16
- Auto-detección del dominio (sin configuración manual)

### Precios en Vivo
- BTC/USD via CoinGecko (fallback: Blockchain.info)
- USD/ARS via Yadio (fallback: DolarAPI)
- Cache en memoria de 60 segundos

### Onboarding
- Pantallas guiadas paso a paso
- Creación de wallet automática al ingresar nombre
- Fondeo instantáneo con sats de bienvenida (reales, desde la DB)
- Recuperación de cuenta con token único
- Animación de confetti y rayo al completar
- Misiones educativas sobre Bitcoin y Lightning

---

## Inicio Rápido

### Prerrequisitos

- Node.js 20+
- npm
- Una base de datos PostgreSQL (gratis en [neon.tech](https://neon.tech))
- Una wallet Lightning compatible con NWC (Alby, Mutiny, etc.)

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
│   ├── landing.js                    # Landing page
│   ├── services/
│   │   ├── nwc.js                    # Cliente NWC (pagos Lightning)
│   │   ├── nostr.js                  # Identidad Nostr (login, firma)
│   │   ├── api.js                    # Cliente HTTP + wallet API custodial
│   │   ├── state.js                  # Estado global + conversión de precios
│   │   └── qr.js                     # Generación de QR reales
│   └── styles/
│       ├── base.css                  # Design system
│       ├── landing.css               # Estilos landing (glassmorphism)
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
│   │   ├── auth.js                   # Login Nostr
│   │   ├── events.js                 # CRUD eventos
│   │   ├── onboard.js                # Claim de wallets (custodial)
│   │   ├── attendees.js              # Recuperación de cuenta por token
│   │   ├── wallet.js                 # API custodial (balance, pay, invoice)
│   │   ├── prices.js                 # Precios BTC/USD/ARS en vivo
│   │   └── lnurlp.js                # Lightning Address (LNURL-pay)
│   └── services/
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
| `GET` | `/api/auth/me` | JWT | Verificar sesión |
| `POST` | `/api/events` | JWT | Crear evento |
| `GET` | `/api/events` | JWT | Listar eventos del admin |
| `PATCH` | `/api/events/:id` | JWT | Actualizar evento |
| `DELETE` | `/api/events/:id` | JWT | Eliminar evento |
| `GET` | `/api/onboard/:code` | — | Info del evento (público) |
| `POST` | `/api/onboard/:code/claim` | — | Crear wallet custodial para asistente |
| `POST` | `/api/attendees/recover` | — | Recuperar cuenta con token |
| `GET` | `/api/wallet/balance` | Token | Balance del asistente |
| `GET` | `/api/wallet/transactions` | Token | Historial de transacciones |
| `POST` | `/api/wallet/pay` | Token | Pagar invoice Lightning |
| `POST` | `/api/wallet/invoice` | Token | Crear invoice para recibir |
| `GET` | `/api/wallet/check-invoice/:hash` | Token | Verificar si un invoice fue pagado |
| `GET` | `/.well-known/lnurlp/:user` | — | LNURL-pay step 1 (metadata) |
| `GET` | `/.well-known/lnurlp/:user/callback` | — | LNURL-pay step 2 (invoice) |

---

## Seguridad

- **Wallet custodial con patrón seguro**: deducir balance → pagar via NWC → reembolsar si falla
- **Token único por asistente** (nanoid 21 chars) como credencial de acceso
- **NWC del organizador** almacenado en el servidor, nunca expuesto al frontend
- **Auth Nostr (NIP-98)**: el admin firma cada request con su clave privada
- **JWT con expiración** de 24 horas para el panel admin
- **Lightning Addresses únicas**: verificación de disponibilidad antes de crear
- **Sanitización**: los datos sensibles se filtran antes de enviar al cliente

---

## Roadmap

- [x] Onboarding completo con pantallas guiadas
- [x] Wallet funcional (enviar, recibir, historial)
- [x] Panel admin (eventos, asistentes, estadísticas)
- [x] Sistema custodial con balances virtuales
- [x] Integración NWC (Nostr Wallet Connect)
- [x] Auth Nostr (nsec + NIP-07)
- [x] Deploy en Vercel con Neon PostgreSQL
- [x] Conversión multi-moneda (SATS/USD/ARS) con precios en vivo
- [x] Lightning Addresses funcionales (LNURL-pay LUD-16)
- [x] Lightning Addresses únicas (sin sufijos aleatorios)
- [x] QR codes reales escaneables
- [x] Detección automática de invoices BOLT11
- [x] Notificaciones de pagos recibidos
- [x] Recuperación de cuenta con token
- [x] Landing page con glassmorphism y animaciones
- [x] Eliminación de modo demo — solo datos reales
- [ ] Sistema de misiones completo (aprender Lightning paso a paso)
- [ ] Integración Alby Hub (sub-wallets aisladas por asistente)
- [ ] Push notifications
- [ ] Exportar wallet a app externa

---

## Licencia

MIT

---

Hecho con ⚡ para la comunidad Bitcoin.
