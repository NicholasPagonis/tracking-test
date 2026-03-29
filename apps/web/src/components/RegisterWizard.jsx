import { useState, useEffect, useRef } from 'react';
import { fetchRoles, registerDevice, pingDevice } from '../api/admin.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}`;

const STEPS = ['Details', 'App', 'Configure', 'Test'];

const PLATFORMS = [
  { value: 'ios', label: 'iPhone (iOS)' },
  { value: 'android', label: 'Android' },
];

const APPS = [
  {
    value: 'owntracks',
    label: 'OwnTracks',
    badge: 'Recommended',
    badgeColor: '#16a34a',
    description: 'Free iOS & Android app. Uses native OS location APIs for accurate background tracking.',
    storeUrl: { ios: 'https://apps.apple.com/app/owntracks/id692424691', android: 'https://play.google.com/store/apps/details?id=org.owntracks.android' },
  },
  {
    value: 'traccar',
    label: 'Traccar Client',
    badge: null,
    description: 'Simple open-source client. Background accuracy on iOS is limited.',
    storeUrl: { ios: 'https://apps.apple.com/app/traccar-client/id843156974', android: 'https://play.google.com/store/apps/details?id=org.traccar.client' },
  },
];

function generateKey(deviceId) {
  return `${deviceId.toLowerCase()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function RegisterWizard({ onClose, onRegistered }) {
  const [step, setStep] = useState(0);
  const [roles, setRoles] = useState([]);
  const [selectedApp, setSelectedApp] = useState('owntracks');
  const [form, setForm] = useState({
    device_id: '',
    role_id: '',
    display_name: '',
    platform: 'ios',
    api_key: '',
    notes: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(null);
  const [pingStatus, setPingStatus] = useState('waiting');
  const [pingAge, setPingAge] = useState(null);
  const pingTimer = useRef(null);
  const pingAttempts = useRef(0);

  useEffect(() => {
    fetchRoles()
      .then(({ data }) => setRoles(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (form.device_id && !form.api_key) {
      setForm((f) => ({ ...f, api_key: generateKey(form.device_id) }));
    }
  }, [form.device_id]);

  // Start polling for a ping when on step 3
  useEffect(() => {
    if (step !== 3 || !registered) return;
    pingAttempts.current = 0;
    setPingStatus('waiting');

    pingTimer.current = setInterval(async () => {
      pingAttempts.current++;
      try {
        const result = await pingDevice(registered.device_id);
        if (result.received) {
          clearInterval(pingTimer.current);
          setPingStatus('success');
          setPingAge(result.age_seconds);
        }
      } catch { /* keep polling */ }

      if (pingAttempts.current >= 24) {
        clearInterval(pingTimer.current);
        setPingStatus('timeout');
      }
    }, 5000);

    return () => clearInterval(pingTimer.current);
  }, [step, registered]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: null }));
  }

  function validateStep0() {
    const e = {};
    if (!form.device_id.trim()) e.device_id = 'Required';
    else if (!/^[A-Za-z0-9_-]+$/.test(form.device_id)) e.device_id = 'Letters, numbers, _ and - only';
    if (!form.role_id) e.role_id = 'Required';
    if (!form.display_name.trim()) e.display_name = 'Required';
    if (!form.platform) e.platform = 'Required';
    if (!form.api_key.trim()) e.api_key = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleRegister() {
    if (!validateStep0()) return;
    setSubmitting(true);
    try {
      const { data } = await registerDevice(form);
      setRegistered(data);
      setStep(1);
    } catch (err) {
      setErrors({ _global: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  const ownTracksUrl = `${API_BASE}/owntracks`;
  const traccarUrl = registered ? `${API_BASE}/ingest?key=${form.api_key}` : '';

  return (
    <Overlay onClose={onClose}>
      <div style={{ width: 540, maxWidth: '95vw' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16 }}>Register Device</div>
            <div style={{ color: 'var(--c-text-muted)', fontSize: 12, marginTop: 2 }}>
              Step {step + 1} of {STEPS.length} — {STEPS[step]}
            </div>
          </div>
          <button onClick={onClose} style={btnGhost}>✕</button>
        </div>

        <StepBar current={step} steps={STEPS} />

        {/* ── Step 0: Details ── */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 20 }}>
            {errors._global && <ErrorBanner msg={errors._global} />}

            <Field label="Device identifier" error={errors.device_id} hint="A unique ID for this device — e.g. TDM_1">
              <input
                style={inputStyle(errors.device_id)}
                placeholder="e.g. TDM_1"
                value={form.device_id}
                onChange={(e) => set('device_id', e.target.value.trim())}
              />
            </Field>

            <Field label="Display name" error={errors.display_name}>
              <input
                style={inputStyle(errors.display_name)}
                placeholder="e.g. Terminal Duty Manager 1"
                value={form.display_name}
                onChange={(e) => set('display_name', e.target.value)}
              />
            </Field>

            <div style={{ display: 'flex', gap: 12 }}>
              <Field label="Role" error={errors.role_id} style={{ flex: 1 }}>
                <select
                  style={inputStyle(errors.role_id)}
                  value={form.role_id}
                  onChange={(e) => set('role_id', e.target.value)}
                >
                  <option value="">Select role...</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.code} — {r.label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Platform" error={errors.platform} style={{ flex: 1 }}>
                <select
                  style={inputStyle(errors.platform)}
                  value={form.platform}
                  onChange={(e) => set('platform', e.target.value)}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="API key" error={errors.api_key} hint="Auto-generated — used to authenticate this device.">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...inputStyle(errors.api_key), flex: 1, fontFamily: 'monospace', fontSize: 12 }}
                  value={form.api_key}
                  onChange={(e) => set('api_key', e.target.value.trim())}
                />
                <button
                  style={btnSecondary}
                  onClick={() => set('api_key', generateKey(form.device_id || 'device'))}
                >
                  Regenerate
                </button>
              </div>
            </Field>

            <Field label="Notes" hint="Optional">
              <input
                style={inputStyle()}
                placeholder="e.g. T2 morning shift"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
              />
            </Field>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button style={btnPrimary} onClick={handleRegister} disabled={submitting}>
                {submitting ? 'Registering…' : 'Register device →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 1: Choose app ── */}
        {step === 1 && registered && (
          <div style={{ marginTop: 20 }}>
            <p style={{ color: 'var(--c-text-muted)', fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
              Device <strong style={{ color: 'var(--c-text)' }}>{registered.device_id}</strong> registered.
              Choose the tracking app to install on the phone.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {APPS.map((app) => (
                <button
                  key={app.value}
                  onClick={() => setSelectedApp(app.value)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14,
                    padding: '14px 16px', borderRadius: 8, cursor: 'pointer',
                    textAlign: 'left', width: '100%',
                    background: selectedApp === app.value ? '#1d4ed822' : 'var(--c-bg)',
                    border: `2px solid ${selectedApp === app.value ? '#3b82f6' : 'var(--c-border)'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                    border: `2px solid ${selectedApp === app.value ? '#3b82f6' : 'var(--c-border)'}`,
                    background: selectedApp === app.value ? '#3b82f6' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selectedApp === app.value && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--c-text)' }}>{app.label}</span>
                      {app.badge && (
                        <span style={{
                          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                          background: app.badgeColor + '22', color: app.badgeColor,
                          border: `1px solid ${app.badgeColor}55`,
                        }}>
                          {app.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--c-text-muted)', lineHeight: 1.5 }}>
                      {app.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button style={btnPrimary} onClick={() => setStep(2)}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Configure ── */}
        {step === 2 && registered && (
          <div style={{ marginTop: 20 }}>
            {selectedApp === 'owntracks' ? (
              <OwnTracksConfig
                deviceId={registered.device_id}
                apiKey={form.api_key}
                platform={form.platform}
                url={ownTracksUrl}
              />
            ) : (
              <TraccarConfig
                deviceId={registered.device_id}
                platform={form.platform}
                url={traccarUrl}
              />
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button style={btnSecondary} onClick={() => setStep(1)}>← Back</button>
              <button style={btnPrimary} onClick={() => setStep(3)}>
                I've configured the app → Test connection
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Test ── */}
        {step === 3 && registered && (
          <div style={{ marginTop: 20 }}>
            <PingPanel
              status={pingStatus}
              deviceId={registered.device_id}
              ageSeconds={pingAge}
              appName={APPS.find((a) => a.value === selectedApp)?.label}
              onRetry={() => {
                pingAttempts.current = 0;
                setPingStatus('waiting');
              }}
            />

            {pingStatus === 'success' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                <button style={btnPrimary} onClick={() => { onRegistered?.(); onClose(); }}>
                  Done
                </button>
              </div>
            )}

            {pingStatus === 'timeout' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20, gap: 10 }}>
                <button style={btnSecondary} onClick={() => setStep(2)}>← Back</button>
                <button style={btnSecondary} onClick={() => { onRegistered?.(); onClose(); }}>
                  Skip — close anyway
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Overlay>
  );
}

// ── App config panels ─────────────────────────────────────────────────────────

function OwnTracksConfig({ deviceId, apiKey, platform, url }) {
  const isIos = platform === 'ios';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* Section 1: Install */}
      <Section title="1. Install OwnTracks">
        <p style={prose}>
          Download <strong style={em}>OwnTracks</strong> from the{' '}
          {isIos ? 'App Store (search "OwnTracks")' : 'Play Store (search "OwnTracks")'}.
          Open the app and allow location permissions — choose <strong style={em}>Always</strong> when prompted.
        </p>
      </Section>

      {/* Section 2: Connection */}
      <Section title="2. Connection settings">
        <p style={{ ...prose, marginBottom: 10 }}>
          {isIos
            ? 'Tap the top-left menu icon → Settings → tap the connection row at the top.'
            : 'Tap the top-left menu icon → Preferences → Connection.'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ConfigRow label="Mode" value="HTTP" />
          <ConfigRow label="URL" value={url} copyable mono />
          <ConfigRow label="Username" value={deviceId} copyable />
          <ConfigRow label="Password" value={apiKey} copyable mono />
          <ConfigRow label="Device ID" value={deviceId} copyable />
          <ConfigRow label="Tracker ID (tid)" value={deviceId.slice(0, 2).toUpperCase()} copyable />
        </div>
        <p style={{ ...prose, marginTop: 8 }}>
          <strong style={em}>Tracker ID</strong> is a 2-character label shown on maps — use initials or an abbreviation.
        </p>
      </Section>

      {/* Section 3: Location mode */}
      <Section title="3. Location reporting mode">
        <p style={{ ...prose, marginBottom: 10 }}>
          {isIos
            ? 'In Settings, find the Monitoring section:'
            : 'In Preferences → Reporting:'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isIos ? (
            <>
              <ModeRow
                name="Move Mode"
                badge="Best accuracy"
                badgeColor="#16a34a"
                description="Sends every ~100m or 300s. Uses GPS continuously. Recommended for active field use."
              />
              <ModeRow
                name="Significant Location Change"
                badge="Battery saver"
                badgeColor="#2563eb"
                description="Sends when iOS detects you've moved ~500m. Uses cell towers and WiFi. Good for less critical tracking."
              />
            </>
          ) : (
            <>
              <ModeRow
                name="Move Mode"
                badge="Best accuracy"
                badgeColor="#16a34a"
                description="GPS-based, updates every 10 seconds. Recommended for active field use."
              />
              <ModeRow
                name="Significant Changes"
                badge="Battery saver"
                badgeColor="#2563eb"
                description="Checks every 15 minutes using WiFi and cell towers. Good for low-priority tracking."
              />
            </>
          )}
        </div>
        {!isIos && (
          <p style={{ ...prose, marginTop: 10 }}>
            In <strong style={em}>Preferences → Reporting</strong> you can also set{' '}
            <strong style={em}>Interval</strong> (seconds between checks) and{' '}
            <strong style={em}>Displacement</strong> (metres moved before sending) for fine-grained control.
          </p>
        )}
      </Section>

      {/* Section 4: Background / permissions */}
      <Section title="4. Background permissions">
        {isIos ? (
          <p style={prose}>
            Go to <strong style={em}>Settings → OwnTracks → Location</strong> and confirm it is set to{' '}
            <strong style={em}>Always</strong>. Without this, iOS will suspend tracking when the screen locks.
          </p>
        ) : (
          <p style={prose}>
            Go to <strong style={em}>Settings → Apps → OwnTracks → Battery</strong> and set to{' '}
            <strong style={em}>Unrestricted</strong>. Also disable battery optimisation for OwnTracks.
            The app will show an ongoing notification while tracking — this is required on Android 8+.
          </p>
        )}
      </Section>

    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--c-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ModeRow({ name, badge, badgeColor, description }) {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 6,
      background: 'var(--c-bg)', border: '1px solid var(--c-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--c-text)' }}>{name}</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
          background: badgeColor + '22', color: badgeColor,
          border: `1px solid ${badgeColor}55`,
        }}>{badge}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--c-text-muted)', lineHeight: 1.5 }}>{description}</div>
    </div>
  );
}

const prose = { color: 'var(--c-text-muted)', fontSize: 12, lineHeight: 1.6, margin: 0 };
const em = { color: 'var(--c-text)' };

function TraccarConfig({ deviceId, platform, url }) {
  return (
    <div>
      <p style={{ color: 'var(--c-text-muted)', fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
        Install <strong style={{ color: 'var(--c-text)' }}>Traccar Client</strong> from the App Store / Play Store,
        then configure it with the settings below.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ConfigRow label="Device identifier" value={deviceId} copyable />
        <ConfigRow label="Server URL" value={url} copyable mono />
        <ConfigRow label="Location accuracy" value="Highest" />
        <ConfigRow label="Interval (seconds)" value={platform === 'ios' ? '30' : '5'} />
        <ConfigRow label="Distance" value="Disabled" />
      </div>

      {platform === 'ios' && (
        <div style={{
          marginTop: 14, padding: '10px 14px', borderRadius: 6,
          background: '#92400e22', border: '1px solid #92400e66',
          color: '#fbbf24', fontSize: 12, lineHeight: 1.6,
        }}>
          <strong>iPhone note:</strong> Grant <em>Always</em> location permission. iOS throttles background
          updates for Traccar Client — keep the app foregrounded for reliable tracking.
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PingPanel({ status, deviceId, ageSeconds, appName, onRetry }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== 'waiting') return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  if (status === 'waiting') {
    return (
      <div style={{ textAlign: 'center', padding: '30px 0' }}>
        <Spinner />
        <div style={{ fontWeight: 600, fontSize: 15, marginTop: 14 }}>Waiting for a location ping…</div>
        <div style={{ color: 'var(--c-text-muted)', fontSize: 12, marginTop: 6 }}>
          Listening for <strong>{deviceId}</strong> · {elapsed}s elapsed
        </div>
        <div style={{ color: 'var(--c-text-muted)', fontSize: 12, marginTop: 4 }}>
          Open {appName}, start tracking, and send a location update.
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center', padding: '30px 0' }}>
        <div style={{ fontSize: 48 }}>✅</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginTop: 12, color: 'var(--c-active)' }}>
          Location received!
        </div>
        <div style={{ color: 'var(--c-text-muted)', fontSize: 13, marginTop: 6 }}>
          <strong>{deviceId}</strong> is live — last ping {ageSeconds}s ago.
        </div>
        <div style={{ color: 'var(--c-text-muted)', fontSize: 12, marginTop: 4 }}>
          The device is now visible on the dashboard map.
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '30px 0' }}>
      <div style={{ fontSize: 48 }}>⏱</div>
      <div style={{ fontWeight: 700, fontSize: 15, marginTop: 12, color: 'var(--c-stale)' }}>
        No ping received after 2 minutes
      </div>
      <div style={{ color: 'var(--c-text-muted)', fontSize: 12, marginTop: 8, lineHeight: 1.7 }}>
        Check that:<br />
        • {appName} is running and tracking is started<br />
        • Location permission is set to <em>Always</em><br />
        • The credentials were entered correctly<br />
        • Your phone has internet access and can reach the server
      </div>
      <button style={{ ...btnSecondary, marginTop: 16 }} onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

function StepBar({ current, steps }) {
  return (
    <div style={{ display: 'flex', gap: 0 }}>
      {steps.map((label, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            color: i <= current ? 'var(--c-text)' : 'var(--c-text-muted)',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              background: i < current ? 'var(--c-active)' : i === current ? '#3b82f6' : 'var(--c-border)',
              color: i <= current ? '#fff' : 'var(--c-text-muted)',
              flexShrink: 0,
            }}>
              {i < current ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 12 }}>{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 1, background: i < current ? 'var(--c-active)' : 'var(--c-border)', margin: '0 8px' }} />
          )}
        </div>
      ))}
    </div>
  );
}

function ConfigRow({ label, value, copyable, mono }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 12px', background: 'var(--c-bg)', borderRadius: 6,
      border: '1px solid var(--c-border)',
    }}>
      <span style={{ color: 'var(--c-text-muted)', fontSize: 12, flexShrink: 0, marginRight: 12 }}>{label}</span>
      <span style={{
        fontFamily: mono ? 'monospace' : 'inherit',
        fontSize: mono ? 11 : 13,
        fontWeight: 600,
        wordBreak: 'break-all',
        textAlign: 'right',
        flex: 1,
      }}>{value}</span>
      {copyable && (
        <button
          onClick={copy}
          style={{ ...btnGhost, marginLeft: 10, fontSize: 11, padding: '3px 8px', flexShrink: 0 }}
        >
          {copied ? '✓' : 'Copy'}
        </button>
      )}
    </div>
  );
}

function Field({ label, error, hint, children, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, ...style }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text-muted)' }}>{label}</label>
      {children}
      {hint && !error && <span style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>{hint}</span>}
      {error && <span style={{ fontSize: 11, color: 'var(--c-danger)' }}>{error}</span>}
    </div>
  );
}

function ErrorBanner({ msg }) {
  return (
    <div style={{
      padding: '8px 12px', borderRadius: 6,
      background: '#ef444422', border: '1px solid #ef444466',
      color: '#fca5a5', fontSize: 12,
    }}>
      {msg}
    </div>
  );
}

function Spinner() {
  return (
    <div style={{
      width: 40, height: 40, margin: '0 auto',
      border: '3px solid var(--c-border)',
      borderTop: '3px solid #3b82f6',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
    }} />
  );
}

function Overlay({ onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--c-surface)',
        border: '1px solid var(--c-border)',
        borderRadius: 10,
        padding: 24,
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const base = {
  fontFamily: 'var(--font)',
  fontSize: 13,
  borderRadius: 6,
  border: '1px solid var(--c-border)',
  padding: '7px 12px',
  cursor: 'pointer',
  transition: 'all 0.15s',
};

const btnPrimary = {
  ...base,
  background: '#2563eb',
  color: '#fff',
  border: '1px solid #2563eb',
  fontWeight: 600,
};

const btnSecondary = {
  ...base,
  background: 'transparent',
  color: 'var(--c-text)',
};

const btnGhost = {
  ...base,
  background: 'transparent',
  color: 'var(--c-text-muted)',
  border: '1px solid transparent',
};

function inputStyle(error) {
  return {
    background: 'var(--c-bg)',
    border: `1px solid ${error ? 'var(--c-danger)' : 'var(--c-border)'}`,
    color: 'var(--c-text)',
    padding: '7px 10px',
    borderRadius: 6,
    fontSize: 13,
    width: '100%',
    outline: 'none',
    fontFamily: 'var(--font)',
  };
}
