'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState('admin');
  const [username, setUsername] = useState('');
  const [nidn, setNidn] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if user already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            // Redirect based on role
            if (data.session.role === 'admin') {
              router.push('/dashboard/admin');
            } else if (data.session.role === 'dosen') {
              router.push('/dashboard/dosen');
            }
          }
        }
      } catch (err) {
        console.error('Session check error:', err);
      } finally {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [router]);

  // Add font import on client side only (matches DosenPage)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Jost:wght@400;500;600&display=swap');

      * { font-family: 'Jost', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif; }

      button { font-family: 'Poppins', 'Jost', sans-serif; }

      button:hover {
        opacity: 0.92;
        transform: translateY(-1px);
      }

      button:active {
        transform: translateY(0);
      }

      input:hover {
        border-color: #FF7A00 !important;
      }

      input:focus {
        outline: none;
        border-color: #FF7A00 !important;
        box-shadow: 0 0 0 3px rgba(255,122,0,0.14) !important;
      }
    `;
    document.head.appendChild(styleSheet);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        role,
        ...(role === 'admin' ? { username, password } : { nidn }),
      };

      console.log('📤 Sending login request:', { role: payload.role });

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('📥 Response status:', res.status);
      console.log('📥 Response headers:', res.headers.get('content-type'));

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        const text = await res.text();
        console.error('Response text:', text.substring(0, 200));
        setError('Server error: Invalid response format. Check console for details.');
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Login gagal');
        if (data.details) {
          console.error('Server error details:', data.details);
        }
        return;
      }

      console.log('✅ Login successful, redirecting to:', data.redirect);
      if (data.redirect) {
        router.push(data.redirect);
      }
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError('Terjadi kesalahan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingCard}>
          <span style={styles.loadingIcon}>⏳</span>
          <p style={styles.loadingText}>Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.pageWrap}>
        <div style={styles.card}>
          {/* Header */}
          <div style={styles.cardHeader}>
            <div style={styles.headerIconWrap}>
              <span style={styles.headerIcon}>🎓</span>
            </div>
            <div>
              <div style={styles.breadcrumb}>
                Matriks Kelas <span style={styles.breadcrumbSep}>/</span>{' '}
                <span style={styles.breadcrumbActive}>Masuk</span>
              </div>
              <h1 style={styles.title}>Selamat Datang</h1>
              <p style={styles.subtitle}>Sistem Penjadwalan Kelas</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Role Selection */}
            <div style={styles.formGroup}>
              <label style={styles.label}>Pilih Role</label>
              <div style={styles.roleButtons}>
                <button
                  type="button"
                  onClick={() => {
                    setRole('admin');
                    setError('');
                  }}
                  style={role === 'admin' ? styles.roleButtonActive : styles.roleButton}
                >
                  👨‍💼 Admin
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRole('dosen');
                    setError('');
                  }}
                  style={role === 'dosen' ? styles.roleButtonActive : styles.roleButton}
                >
                  👨‍🏫 Dosen
                </button>
              </div>
            </div>

            {/* Admin Login Form */}
            {role === 'admin' && (
              <>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Contoh: admin"
                    style={styles.input}
                    required
                  />
                  <small style={styles.hint}>Dummy: admin</small>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    style={styles.input}
                    required
                  />
                  <small style={styles.hint}>Dummy: admin123</small>
                </div>
              </>
            )}

            {/* Dosen Login Form */}
            {role === 'dosen' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>NIDN</label>
                <input
                  type="text"
                  value={nidn}
                  onChange={(e) => setNidn(e.target.value)}
                  placeholder="Masukkan NIDN Anda"
                  style={styles.input}
                  required
                />
                <small style={styles.hint}>NIDN harus terdaftar di database</small>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div style={styles.error}>
                <span>❌</span> {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.btnPrimary,
                ...(loading ? styles.btnPrimaryDisabled : {}),
              }}
            >
              {loading ? '⏳ Mengecek...' : '🔓 Masuk'}
            </button>
          </form>

          {/* Info Box */}
          <div style={styles.infoBox}>
            <strong style={styles.infoTitle}>🔐 Akun Demo</strong>
            <div style={styles.infoContent}>
              <div style={styles.infoRow}>
                <span style={styles.badgeCode}>Admin</span>
                <span>Username: admin &nbsp;·&nbsp; Password: admin123</span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.badgeProdi}>Dosen</span>
                <span>Gunakan NIDN dari database</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edumy-inspired design tokens (matches DosenPage) ──────────
// Primary: #FF7A00 (Edumy signature orange)
// Ink/navy: #1E2A45 · Muted text: #8A96AD · Background: #F3F5FA
// Accents: indigo #3E5EF0, pink #E0448A, teal #12B886

const styles = {
  // ── Page shell ────────────────────────────────────────────
  container: {
    minHeight: '100vh',
    background: '#F3F5FA',
    padding: '2rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Jost', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  pageWrap: {
    width: '100%',
    maxWidth: '440px',
  },

  // ── Card ─────────────────────────────────────────────────
  card: {
    backgroundColor: 'white',
    borderRadius: '18px',
    boxShadow: '0 4px 22px rgba(30,42,69,0.06)',
    border: '1px solid #EEF1F8',
    padding: '2rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.75rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid #EEF1F8',
  },
  headerIconWrap: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #3FA96B, #1B7A43)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(255,122,0,0.28)',
    flexShrink: 0,
  },
  headerIcon: {
    fontSize: '1.6rem',
  },
  breadcrumb: {
    fontSize: '0.78rem',
    color: '#9AA5BC',
    fontWeight: '500',
    marginBottom: '0.35rem',
  },
  breadcrumbSep: {
    color: '#C7CEDD',
    margin: '0 0.25rem',
  },
  breadcrumbActive: {
    color: '#1B7A43',
    fontWeight: '600',
  },
  title: {
    fontSize: '1.4rem',
    fontWeight: '700',
    color: '#1E2A45',
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
    letterSpacing: '-0.01em',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#8A96AD',
    margin: '0.2rem 0 0 0',
  },

  // ── Form ─────────────────────────────────────────────────
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    fontWeight: '600',
    color: '#5B6A88',
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  roleButtons: {
    display: 'flex',
    gap: '0.7rem',
  },
  roleButton: {
    flex: 1,
    padding: '0.65rem 1rem',
    background: '#F3F5FA',
    color: '#5B6A88',
    border: '1.5px solid #E4E8F1',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  roleButtonActive: {
    flex: 1,
    padding: '0.65rem 1rem',
    background: 'linear-gradient(135deg, #3FA96B, #1B7A43)',
    color: 'white',
    border: '1.5px solid transparent',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(255,122,0,0.35)',
    transition: 'all 0.2s',
  },
  input: {
    padding: '0.7rem 0.9rem',
    borderRadius: '10px',
    border: '1.5px solid #E4E8F1',
    fontSize: '0.9rem',
    color: '#1E2A45',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
    fontFamily: "'Jost', sans-serif",
  },
  hint: {
    fontSize: '0.75rem',
    color: '#9AA5BC',
  },
  error: {
    padding: '0.75rem 1rem',
    background: '#FDEBEE',
    color: '#E5484D',
    border: '1px solid #F8CDD3',
    borderRadius: '12px',
    fontSize: '0.85rem',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },

  // ── Buttons ─────────────────────────────────────────────
  btnPrimary: {
    padding: '0.75rem 1.35rem',
    background: 'linear-gradient(135deg, #3FA96B, #1B7A43)',
    color: 'white',
    border: 'none',
    borderRadius: '999px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(255,122,0,0.35)',
    transition: 'opacity 0.2s, transform 0.1s',
  },
  btnPrimaryDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },

  // ── Info box ────────────────────────────────────────────
  infoBox: {
    marginTop: '1.75rem',
    paddingTop: '1.5rem',
    borderTop: '1px solid #EEF1F8',
  },
  infoTitle: {
    fontSize: '0.85rem',
    color: '#1E2A45',
    fontFamily: "'Poppins', sans-serif",
  },
  infoContent: {
    marginTop: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    fontSize: '0.82rem',
    color: '#5B6A88',
  },
  badgeCode: {
    backgroundColor: '#EDEBFF',
    color: '#5B4FE0',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: '700',
    display: 'inline-block',
    flexShrink: 0,
  },
  badgeProdi: {
    backgroundColor: '#E4F7F0',
    color: '#0E9B6E',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: '700',
    display: 'inline-block',
    flexShrink: 0,
  },

  // ── Loading state ───────────────────────────────────────
  loadingContainer: {
    minHeight: '100vh',
    background: '#F3F5FA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Jost', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: '18px',
    boxShadow: '0 4px 22px rgba(30,42,69,0.06)',
    border: '1px solid #EEF1F8',
    padding: '2.5rem 3rem',
    textAlign: 'center',
  },
  loadingIcon: {
    fontSize: '2rem',
    display: 'block',
    marginBottom: '0.75rem',
  },
  loadingText: {
    color: '#1B7A43',
    fontSize: '1rem',
    fontWeight: '600',
    margin: 0,
  },
};
