'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DosenProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dosen, setDosen] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDosenData = async () => {
      try {
        // Check session first to get NIDN
        const sessionRes = await fetch('/api/auth/session');
        if (!sessionRes.ok) {
          router.push('/login');
          return;
        }

        const sessionData = await sessionRes.json();
        const nidn = sessionData.session.nidn;

        // Fetch dosen data
        const res = await fetch(`/api/dosen/get-by-nidn?nidn=${nidn}`);
        if (!res.ok) {
          setError('Gagal mengambil data profil');
          return;
        }

        const data = await res.json();
        setDosen(data);
      } catch (err) {
        console.error('Error:', err);
        setError('Terjadi kesalahan: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDosenData();
  }, [router]);

  // Add hover styles + font import on client side only (same as DosenPage)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Jost:wght@400;500;600&display=swap');

      * { font-family: 'Jost', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif; }

      ::-webkit-scrollbar { height: 8px; width: 8px; }
      ::-webkit-scrollbar-thumb { background: #E4E8F1; border-radius: 8px; }
      ::-webkit-scrollbar-track { background: transparent; }
    `;
    document.head.appendChild(styleSheet);
  }, []);

  function formatNamaLengkap(d) {
    if (!d) return '';
    let nama = '';
    if (d.f_title_depan) nama += d.f_title_depan + ' ';
    nama += d.f_namapegawai;
    if (d.f_title_belakang) nama += ', ' + d.f_title_belakang;
    return nama;
  }

  function formatTanggalLahir(value) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function jkLabel(jk) {
    if (jk === 'L' || jk === 'Laki-laki') return 'Laki-laki';
    if (jk === 'P' || jk === 'Perempuan') return 'Perempuan';
    return jk || '-';
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.pageWrap}>
          <div style={styles.card}>
            <div style={styles.loading}>⏳ Memuat profil...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.pageWrap}>
          <div style={{ ...styles.card, ...styles.errorCard }}>
            <span style={styles.errorIcon}>❌</span>
            <p style={styles.errorText}>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const jk = dosen?.f_jeniskelamin;
  const jkIsMale = jk === 'L' || jk === 'Laki-laki';
  const jkIsFemale = jk === 'P' || jk === 'Perempuan';

  return (
    <div style={styles.container}>
      <div style={styles.pageWrap}>

        {/* Edumy-style breadcrumb / page header */}
        <div style={styles.pageHeader}>
          <div>
            <div style={styles.breadcrumb}>Dashboard <span style={styles.breadcrumbSep}>/</span> Akun Saya <span style={styles.breadcrumbSep}>/</span> <span style={styles.breadcrumbActive}>Profil</span></div>
            <h1 style={styles.title}>Profil Dosen</h1>
            <p style={styles.subtitle}>Informasi biodata dan kepegawaian Anda.</p>
          </div>
          <div style={styles.headerIconWrap}>
            <span style={styles.headerIcon}>👤</span>
          </div>
        </div>

        {/* Identity summary widgets */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#E3F5EA', color: '#1B7A43' }}>🪪</div>
            <div>
              <div style={styles.statNumber}>{dosen?.f_nidn || '-'}</div>
              <div style={styles.statLabel}>NIDN</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#D7F0E1', color: '#146C39' }}>🧾</div>
            <div>
              <div style={styles.statNumber}>{dosen?.f_nip || '-'}</div>
              <div style={styles.statLabel}>NIP</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: jkIsMale ? '#E3F5EA' : jkIsFemale ? '#FDE8F1' : '#F3F5FA', color: jkIsMale ? '#1B7A43' : jkIsFemale ? '#E0448A' : '#8A96AD' }}>
              {jkIsMale ? '♂' : jkIsFemale ? '♀' : '—'}
            </div>
            <div>
              <div style={styles.statNumber}>{jkLabel(jk)}</div>
              <div style={styles.statLabel}>Jenis Kelamin</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#E4F7F0', color: '#0E9B6E' }}>📚</div>
            <div>
              <div style={styles.statNumber}>{dosen?.f_progdi_id || '-'}</div>
              <div style={styles.statLabel}>Program Studi</div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          {dosen && (
            <>
              {/* Name banner */}
              <div style={styles.nameBanner}>
                <div style={styles.avatarCircle}>
                  {dosen.f_namapegawai ? dosen.f_namapegawai.trim().charAt(0).toUpperCase() : '?'}
                </div>
                <div>
                  <div style={styles.nameBannerName}>{formatNamaLengkap(dosen)}</div>
                  <span style={styles.badgeCode}>{dosen.f_nidn || '-'}</span>
                </div>
              </div>

              <div style={styles.sectionsGrid}>
                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>🪪 Informasi Kepegawaian</h3>
                  <div style={styles.fieldGroup}>
                    <div style={styles.field}>
                      <label style={styles.label}>NIDN</label>
                      <span style={styles.badgeCode}>{dosen.f_nidn || '-'}</span>
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>NIP</label>
                      <span style={styles.value}>{dosen.f_nip || '-'}</span>
                    </div>
                  </div>
                </div>

                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>🎓 Nama dan Gelar</h3>
                  <div style={styles.fieldGroup}>
                    <div style={styles.field}>
                      <label style={styles.label}>Gelar Depan</label>
                      <span style={styles.value}>{dosen.f_title_depan || '-'}</span>
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Nama Lengkap</label>
                      <span style={styles.value}>{dosen.f_namapegawai}</span>
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Gelar Belakang</label>
                      <span style={styles.value}>{dosen.f_title_belakang || '-'}</span>
                    </div>
                  </div>
                </div>

                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>📍 Data Demografis</h3>
                  <div style={styles.fieldGroup}>
                    <div style={styles.field}>
                      <label style={styles.label}>Tempat Lahir</label>
                      <span style={styles.value}>{dosen.f_tempatlahir || '-'}</span>
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Tanggal Lahir</label>
                      <span style={styles.badgeDate}>{formatTanggalLahir(dosen.f_tanggallahir)}</span>
                    </div>
                    <div style={styles.field}>
                      <label style={styles.label}>Jenis Kelamin</label>
                      <span style={jkIsMale ? styles.badgeMale : jkIsFemale ? styles.badgeFemale : styles.value}>
                        {jkIsMale ? '♂ Laki-laki' : jkIsFemale ? '♀ Perempuan' : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={styles.section}>
                  <h3 style={styles.sectionTitle}>🏫 Organisasi</h3>
                  <div style={styles.fieldGroup}>
                    <div style={styles.field}>
                      <label style={styles.label}>Program Studi</label>
                      <span style={styles.badgeProdi}>{dosen.f_progdi_id || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Edumy-inspired design tokens (matches DosenPage) ────────────
// Primary: #1B7A43 (dark green)
// Ink/navy: #1E2A45 · Muted text: #8A96AD · Background: #F3F5FA
// Accents: pink #E0448A, teal #12B886

const styles = {

  container: {
    minHeight: '100vh',
    background: '#F3F5FA',
    padding: '2rem',
    fontFamily: "'Jost', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
  },

  pageWrap: {
    maxWidth: '1100px',
    margin: '0 auto',
  },

  // ── Header / breadcrumb ─────────────────────────────────────
  pageHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  breadcrumb: {
    fontSize: '0.8rem',
    color: '#9AA5BC',
    fontWeight: '500',
    marginBottom: '0.5rem',
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
    fontSize: '1.9rem',
    fontWeight: '700',
    color: '#1E2A45',
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
    letterSpacing: '-0.01em',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#8A96AD',
    margin: '0.35rem 0 0 0',
  },
  headerIconWrap: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: 'linear-gradient(135deg, #3FA96B, #1B7A43)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 20px rgba(27,122,67,0.28)',
  },
  headerIcon: {
    fontSize: '1.6rem',
  },

  // ── Stat widgets ────────────────────────────────────────────
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.1rem',
    marginBottom: '1.5rem',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '1.15rem 1.25rem',
    boxShadow: '0 4px 18px rgba(30,42,69,0.06)',
    border: '1px solid #EEF1F8',
  },
  statIcon: {
    width: '46px',
    height: '46px',
    borderRadius: '13px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    flexShrink: 0,
  },
  statNumber: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#1E2A45',
    fontFamily: "'Poppins', sans-serif",
    lineHeight: 1.2,
  },
  statLabel: {
    fontSize: '0.8rem',
    color: '#8A96AD',
    fontWeight: '500',
    marginTop: '0.15rem',
  },

  // ── Main card ────────────────────────────────────────────
  card: {
    backgroundColor: 'white',
    borderRadius: '18px',
    boxShadow: '0 4px 22px rgba(30,42,69,0.06)',
    border: '1px solid #EEF1F8',
    padding: '1.75rem',
  },

  errorCard: {
    textAlign: 'center',
    backgroundColor: '#FDF1F2',
    borderLeft: '4px solid #E5484D',
  },
  errorIcon: {
    fontSize: '2rem',
    display: 'block',
    marginBottom: '0.75rem',
  },
  errorText: {
    color: '#C0392B',
    fontWeight: '600',
    margin: 0,
  },

  loading: {
    textAlign: 'center',
    padding: '3rem',
    color: '#1B7A43',
    fontSize: '1rem',
    fontWeight: '600',
  },

  // ── Name banner ──────────────────────────────────────────────
  nameBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.1rem',
    paddingBottom: '1.5rem',
    marginBottom: '1.5rem',
    borderBottom: '1px solid #EEF1F8',
  },
  avatarCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3FA96B, #1B7A43)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.4rem',
    fontWeight: '700',
    fontFamily: "'Poppins', sans-serif",
    boxShadow: '0 8px 20px rgba(27,122,67,0.28)',
    flexShrink: 0,
  },
  nameBannerName: {
    fontSize: '1.25rem',
    fontWeight: '700',
    color: '#1E2A45',
    fontFamily: "'Poppins', sans-serif",
    marginBottom: '0.4rem',
  },

  // ── Section grid ─────────────────────────────────────────────
  sectionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
    gap: '1.25rem',
  },
  section: {
    padding: '1.25rem 1.4rem',
    backgroundColor: '#FAFBFF',
    borderRadius: '16px',
    border: '1px solid #EEF1F8',
  },
  sectionTitle: {
    margin: '0 0 1rem 0',
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#1E2A45',
    fontFamily: "'Poppins', sans-serif",
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
  },
  label: {
    fontWeight: '600',
    color: '#8A96AD',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  value: {
    fontSize: '0.9rem',
    color: '#42506B',
    fontWeight: '500',
  },

  // ── Data badges (pill style, matches DosenPage) ─────────────
  badgeCode: {
    backgroundColor: '#E3F5EA',
    color: '#1B7A43',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '700',
    display: 'inline-block',
    fontFamily: 'monospace',
    letterSpacing: '0.03em',
    width: 'fit-content',
  },
  badgeDate: {
    backgroundColor: '#F3F5FA',
    color: '#5B6A88',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '500',
    display: 'inline-block',
    width: 'fit-content',
  },
  badgeMale: {
    backgroundColor: '#D7F0E1',
    color: '#146C39',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
    width: 'fit-content',
  },
  badgeFemale: {
    backgroundColor: '#FDE8F1',
    color: '#E0448A',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
    width: 'fit-content',
  },
  badgeProdi: {
    backgroundColor: '#E4F7F0',
    color: '#0E9B6E',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '500',
    display: 'inline-block',
    width: 'fit-content',
  },
};