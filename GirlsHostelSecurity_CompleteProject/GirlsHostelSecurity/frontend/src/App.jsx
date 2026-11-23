import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import {
  Activity, AlertTriangle, BellRing, CheckCircle2,
  Clock3, Radio, RefreshCw, ShieldCheck, Volume2, VolumeX
} from "lucide-react";

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/$/, "");
const DASHBOARD_KEY = import.meta.env.VITE_DASHBOARD_API_KEY || "";

const api = axios.create({
  baseURL: API_URL,
  headers: { "x-dashboard-key": DASHBOARD_KEY }
});

function formatDate(value) {
  return new Date(value).toLocaleString();
}

export default function App() {
  const [events, setEvents] = useState([]);
  const [connected, setConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const audioContextRef = useRef(null);

  const loadEvents = useCallback(async () => {
    try {
      setError("");
      const response = await api.get("/api/events");
      setEvents(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load events. Check backend and dashboard key.");
    } finally {
      setLoading(false);
    }
  }, []);

  const playAlert = useCallback(async () => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!audioContextRef.current) audioContextRef.current = new AudioContextClass();
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") await ctx.resume();

      // Short synthesized tone; no external sound file required.
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.22);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.48);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (err) {
      console.warn("Audio alert unavailable:", err);
    }
  }, [soundEnabled]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const socket = io(API_URL, {
      autoConnect: true,
      auth: { dashboardKey: DASHBOARD_KEY },
      reconnection: true
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (err) => {
      setConnected(false);
      setError(err.message || "Live connection failed");
    });

    socket.on("new-event", (event) => {
      setEvents((previous) => [event, ...previous.filter((item) => item._id !== event._id)].slice(0, 100));
      playAlert();
    });

    socket.on("event-updated", (updated) => {
      setEvents((previous) => previous.map((item) => item._id === updated._id ? updated : item));
    });

    return () => socket.disconnect();
  }, [playAlert]);

  async function acknowledge(id) {
    try {
      const response = await api.patch(`/api/events/${id}/acknowledge`);
      setEvents((previous) => previous.map((item) => item._id === id ? response.data.event : item));
    } catch (err) {
      setError(err.response?.data?.message || "Could not acknowledge event.");
    }
  }

  async function enableSound() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        await ctx.resume();
        audioContextRef.current = ctx;
      }
      setSoundEnabled(true);
    } catch {
      setError("Your browser could not enable audio.");
    }
  }

  const pending = events.filter((event) => !event.acknowledged).length;
  const todayCount = events.filter((event) => {
    const date = new Date(event.createdAt);
    const now = new Date();
    return date.toDateString() === now.toDateString();
  }).length;

  return (
    <main className="page">
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon"><ShieldCheck size={27} /></div>
          <div>
            <h1>Hostel Security</h1>
            <p>Warden monitoring dashboard · Simulation</p>
          </div>
        </div>
        <div className={`connection ${connected ? "is-online" : "is-offline"}`}>
          <span className="status-dot" />
          {connected ? "Live connected" : "Not connected"}
        </div>
      </header>

      <section className="intro">
        <div>
          <p className="eyebrow">SECURITY OVERVIEW</p>
          <h2>Good day, Warden</h2>
          <p className="muted">Review simulated gate sensor events and their status.</p>
        </div>
        <div className="toolbar">
          <button className="secondary-button" onClick={loadEvents}><RefreshCw size={16} /> Refresh</button>
          <button className="primary-button" onClick={soundEnabled ? () => setSoundEnabled(false) : enableSound}>
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {soundEnabled ? "Sound enabled" : "Enable sound"}
          </button>
        </div>
      </section>

      {error && <div className="error-banner"><AlertTriangle size={18} />{error}</div>}

      <section className="stats">
        <article className="stat-card">
          <div className="stat-icon blue"><Activity /></div>
          <div><p>Total events loaded</p><strong>{events.length}</strong></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon red"><BellRing /></div>
          <div><p>Pending review</p><strong>{pending}</strong></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon green"><Clock3 /></div>
          <div><p>Events today</p><strong>{todayCount}</strong></div>
        </article>
        <article className="stat-card">
          <div className="stat-icon violet"><Radio /></div>
          <div><p>Dashboard connection</p><strong className="small-value">{connected ? "Online" : "Offline"}</strong></div>
        </article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Recent gate events</h3>
            <p className="muted">Latest 100 records · New events appear automatically</p>
          </div>
          <span className="demo-label">DEMO DATA</span>
        </div>

        {loading ? (
          <div className="empty">Loading event history…</div>
        ) : events.length === 0 ? (
          <div className="empty">
            <ShieldCheck size={34} />
            <strong>No events recorded</strong>
            <span>Send a test event from Wokwi or the README curl command.</span>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Event</th><th>Device</th><th>Source</th><th>Date & time</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event._id}>
                    <td><span className="event-name"><AlertTriangle size={16} />{event.eventType}</span></td>
                    <td>{event.deviceId}</td>
                    <td>{event.source}</td>
                    <td>{formatDate(event.createdAt)}</td>
                    <td>
                      <span className={`pill ${event.acknowledged ? "reviewed" : "pending"}`}>
                        {event.acknowledged ? "Reviewed" : "Pending"}
                      </span>
                    </td>
                    <td>
                      {event.acknowledged ? (
                        <span className="reviewed-text"><CheckCircle2 size={15} /> Done</span>
                      ) : (
                        <button className="review-button" onClick={() => acknowledge(event._id)}>Acknowledge</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer>
        <strong>Prototype notice:</strong> This dashboard displays simulated sensor events. An alert is not proof of an intrusion;
        a responsible staff member must verify any real-world concern.
      </footer>
    </main>
  );
}
