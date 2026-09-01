'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardHome() {
  const navItems = [
    {
      id: 'presensi',
      icon: '✅',
      label: 'Presensi',
      href: '/dashboard/admin/presensi',
      desc: 'Pantau presensi harian dan terima atau tolak presensi dosen.',
      iconBg: '#E4F7F0',
      iconColor: '#087A42',
    },
    {
      id: 'dosen',
      icon: '👨‍🏫',
      label: 'Dosen',
      href: '/dashboard/admin/dosen',
      desc: 'Kelola biodata, preferensi jadwal, dan impor data dosen.',
      iconBg: '#E3F5EA',
      iconColor: '#1B7A43',
    },
    {
      id: 'kurikulum',
      icon: '📖',
      label: 'Kurikulum',
      href: '/dashboard/admin/kurikulum',
      desc: 'Susun dan kelola struktur kurikulum program studi.',
      iconBg: '#D7F0E1',
      iconColor: '#146C39',
    },
    {
      id: 'ruangan',
      icon: '🏢',
      label: 'Ruangan',
      href: '/dashboard/admin/ruangan',
      desc: 'Atur data ruang kelas, kapasitas, dan lantai gedung.',
      iconBg: '#FDE8F1',
      iconColor: '#E0448A',
    },
    {
      id: 'kelas',
      icon: '📚',
      label: 'KRS Matakuliah',
      href: '/dashboard/admin/kelas',
      desc: 'Kelola pengambilan mata kuliah dan kelas mahasiswa.',
      iconBg: '#E4F7F0',
      iconColor: '#12B886',
    },
    {
      id: 'jadwal',
      icon: '📅',
      label: 'Jadwal',
      href: '/dashboard/admin/jadwal',
      desc: 'Susun preset dan generate jadwal perkuliahan otomatis.',
      iconBg: '#E3F5EA',
      iconColor: '#1B7A43',
    },
  ];

  // Add hover styles + font import on client side only (matches DosenPage)
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&family=Jost:wght@400;500;600&display=swap');

      * { font-family: 'Jost', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif; }

      .edumy-menu-card {
        transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
      }
      .edumy-menu-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 28px rgba(30,42,69,0.10);
        border-color: #BEE7CC;
      }
      .edumy-menu-card:active {
        transform: translateY(-1px);
      }

      ::-webkit-scrollbar { height: 8px; width: 8px; }
      ::-webkit-scrollbar-thumb { background: #E4E8F1; border-radius: 8px; }
      ::-webkit-scrollbar-track { background: transparent; }
    `;
    document.head.appendChild(styleSheet);
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.pageWrap}>

        {/* Edumy-style breadcrumb / page header */}
        <div style={styles.pageHeader}>
          <div>
            <div style={styles.breadcrumb}>
              Dashboard <span style={styles.breadcrumbSep}>/</span>{' '}
              <span style={styles.breadcrumbActive}>Beranda</span>
            </div>
            <h1 style={styles.title}>Matriks Kelas</h1>
            <p style={styles.subtitle}>Selamat datang kembali! Pilih menu di bawah untuk memulai.</p>
          </div>
          <div style={styles.headerIconWrap}>
            <span style={styles.headerIcon}>🎓</span>
          </div>
        </div>

        {/* Main card */}
        <div style={styles.card}>
          <div style={styles.tableHeader}>
            <h2 style={styles.tableTitle}>📋 Menu Utama</h2>
            <span style={styles.badgeCount}>{navItems.length} modul</span>
          </div>

          <div style={styles.menuGrid}>
            {navItems.map((item) => (
              <Link key={item.id} href={item.href} style={styles.linkReset}>
                <div className="edumy-menu-card" style={styles.menuCard}>
                  <div style={{ ...styles.menuIconWrap, background: item.iconBg, color: item.iconColor }}>
                    {item.icon}
                  </div>
                  <h3 style={styles.menuCardTitle}>{item.label}</h3>
                  <p style={styles.menuCardDesc}>{item.desc}</p>
                  <span style={styles.menuCardArrow}>Buka &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edumy-inspired design tokens (shared with DosenPage) ──────
// Primary: #1B7A43 (dark green)
// Ink/navy: #1E2A45 · Muted text: #8A96AD · Background: #F3F5FA
// Accents: pink #E0448A, teal #12B886

const styles = {

  // ── Page shell ────────────────────────────────────────────
  container: {
    minHeight: '100vh',
    background: '#F3F5FA',
    padding: '2rem',
    fontFamily: "'Jost', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
  },

  pageWrap: {
    maxWidth: '1400px',
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

  // ── Main card ────────────────────────────────────────────
  card: {
    backgroundColor: 'white',
    borderRadius: '18px',
    boxShadow: '0 4px 22px rgba(30,42,69,0.06)',
    border: '1px solid #EEF1F8',
    padding: '1.75rem',
  },

  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    padding: '0 0.1rem',
  },
  tableTitle: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#1E2A45',
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
  },
  badgeCount: {
    backgroundColor: '#E3F5EA',
    color: '#146C39',
    padding: '0.3rem 0.9rem',
    borderRadius: '999px',
    fontSize: '0.78rem',
    fontWeight: '700',
    letterSpacing: '0.02em',
  },

  // ── Menu grid ──────────────────────────────────────────────
  menuGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '1.25rem',
  },

  linkReset: {
    textDecoration: 'none',
    color: 'inherit',
  },

  menuCard: {
    backgroundColor: '#FAFBFF',
    borderRadius: '16px',
    padding: '1.75rem 1.5rem',
    border: '1px solid #EEF1F8',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    height: '100%',
    boxSizing: 'border-box',
  },

  menuIconWrap: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.4rem',
    marginBottom: '0.5rem',
  },

  menuCardTitle: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#1E2A45',
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
  },

  menuCardDesc: {
    fontSize: '0.85rem',
    color: '#8A96AD',
    margin: 0,
    lineHeight: '1.5',
    flexGrow: 1,
  },

  menuCardArrow: {
    fontSize: '0.8rem',
    fontWeight: '700',
    color: '#1B7A43',
    marginTop: '0.5rem',
  },
};