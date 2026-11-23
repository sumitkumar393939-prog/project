# Girls Hostel Security Management System
MERN + ESP32 (Wokwi) + Socket.IO + MongoDB + Email

This is a classroom/demo prototype. It simulates a gate sensor event using a Wokwi pushbutton.
A simulated event is NOT proof of an actual intrusion. Do not use this starter project as a real
hostel security system without professional security, privacy, networking, and safety review.

## Project structure

- `backend/` Express API, MongoDB, Socket.IO, device/dashboard authentication, email alerts
- `frontend/` React dashboard with live alerts, audio warning, event history and acknowledgement
- `iot/` Wokwi ESP32 sketch and circuit
- `.gitignore`

## Requirements

- Node.js 20+ and npm
- VS Code
- MongoDB Atlas account (or local MongoDB)
- Wokwi account
- Gmail account with 2-Step Verification and an App Password (optional for email)

## 1. Configure MongoDB

1. Create a free MongoDB Atlas cluster.
2. Create a database user and password.
3. Allow your development IP in Network Access.
4. Copy the Node.js connection string.
5. Put it in `backend/.env` as `MONGO_URI`.
6. Replace `<password>` and the database name in the connection string.

## 2. Configure backend

Open a terminal in `backend/`:

```bash
npm install
```

Copy `.env.example` to `.env`, then fill in values:

- `MONGO_URI`: MongoDB connection string
- `DEVICE_TOKEN`: long random secret shared with the Wokwi sketch
- `DASHBOARD_API_KEY`: long random secret for dashboard API/socket access
- `CLIENT_URL`: `http://localhost:5173` during local frontend development
- `WARDEN_EMAIL`, `EMAIL_USER`, `EMAIL_PASS`: optional email settings

Generate secrets with a password manager or a secure random generator. Never commit `.env`.

Run:

```bash
npm run dev
```

Expected: `MongoDB connected` and `API listening on port 5000`.

Open `http://localhost:5000/health` to check the API.

## 3. Configure frontend

Open a second terminal in `frontend/`:

```bash
npm install
```

Copy `.env.example` to `.env` and set:

```env
VITE_API_URL=http://localhost:5000
VITE_DASHBOARD_API_KEY=the_same_value_as_backend_DASHBOARD_API_KEY
```

Run:

```bash
npm run dev
```

Open `http://localhost:5173`.

Click **Enable sound** once. Browsers require a user interaction before playing audio.

## 4. Test without Wokwi first

With backend and frontend running, use this command (replace the token):

```bash
curl -X POST http://localhost:5000/api/events \
  -H "Content-Type: application/json" \
  -H "x-device-token: YOUR_DEVICE_TOKEN" \
  -d "{\"deviceId\":\"GATE-01\",\"eventType\":\"GATE_SENSOR_TEST\",\"status\":\"ALERT\",\"source\":\"MANUAL_TEST\"}"
```

The event should appear on the dashboard without refreshing. It should also be saved in MongoDB.
If email settings are configured, an email is attempted.

## 5. Run Wokwi

1. Open https://wokwi.com/projects/new/esp32 in your browser.
2. Add the contents of `iot/diagram.json` and `iot/sketch.ino` to the Wokwi project.
3. In `sketch.ino`, set `BACKEND_URL` to your publicly deployed backend URL, ending with `/api/events`.
4. Set `DEVICE_TOKEN` to the exact backend `DEVICE_TOKEN`.
5. Start the simulation and open Serial Monitor.
6. Press the virtual button. It sends a `GATE_SENSOR_TEST` event.

IMPORTANT: Wokwi's public simulator cannot normally reach your computer's `localhost`.
For end-to-end Wokwi testing, deploy the backend to an HTTPS host and use that public URL.
For local-only testing, use the curl command above.

## 6. Deploying

For a demo deployment, you can deploy the backend and frontend separately (for example, using Render
or another Node-compatible host and a static frontend host).

Backend environment variables must be configured in the hosting provider:
`MONGO_URI`, `DEVICE_TOKEN`, `DASHBOARD_API_KEY`, `CLIENT_URL`, `WARDEN_EMAIL`,
`EMAIL_USER`, `EMAIL_PASS`, `PORT` (host may provide PORT).

Frontend build environment variables:
`VITE_API_URL=https://YOUR-BACKEND-HOST`
`VITE_DASHBOARD_API_KEY=the same dashboard key`

Set backend `CLIENT_URL` to the deployed frontend origin. Rebuild/redeploy frontend after changing Vite env vars.

For the Wokwi sketch, use:
`https://YOUR-BACKEND-HOST/api/events`

## Email setup

Email is optional. For Gmail, enable 2-Step Verification and create an App Password if your account
supports it. Put that app password in `EMAIL_PASS`; do not use your normal Gmail password.
If email is not configured, dashboard alerts and database logging still work.

## Security notes

- This demo uses shared device and dashboard API keys, not a full user-account system.
- Do not expose dashboard keys in public repositories or share the dashboard URL publicly.
- For real deployment, use proper individual warden accounts, hashed passwords, role-based access,
  HTTPS certificate validation on devices, key rotation, audit logs, backups, and a reviewed privacy policy.
- The Wokwi sketch disables TLS certificate verification only to make the simulator demo easier.
  Replace this with certificate validation before any real device deployment.
- Keep records only as long as necessary and restrict them to authorized staff.
- Use simulated events only; do not label them as confirmed intrusions.
