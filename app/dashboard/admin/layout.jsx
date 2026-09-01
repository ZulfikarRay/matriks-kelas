'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import AuthRedirectOnUnauthorized from '@/app/components/AuthRedirectOnUnauthorized';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setSession(data.session);
      } catch {
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Memuat...</div>;
  }

  // Compute activeTab langsung dari pathname tanpa setState
  const getActiveTab = () => {
    if (pathname.includes('/presensi')) return 'presensi';
    if (pathname.includes('/tahun-ajaran')) return 'tahun-ajaran';
    if (pathname.includes('/dosen')) return 'dosen';
    if (pathname.includes('/ruangan')) return 'ruangan';
    if (pathname.includes('/kelas')) return 'kelas';
    if (pathname.includes('/kurikulum')) return 'kurikulum';
    if (pathname.includes('/jadwal')) return 'jadwal';
    return '';
  };

  const activeTab = getActiveTab();

  const navItems = [
    { id: 'presensi', label: '✅ Presensi', href: '/dashboard/admin/presensi' },
    { id: 'tahun-ajaran', label: '📅 Setup', href: '/dashboard/admin/tahun-ajaran' },
    { id: 'dosen', label: '👨‍🏫 Dosen', href: '/dashboard/admin/dosen' },
    { id: 'kurikulum', label: '📖 Kurikulum', href: '/dashboard/admin/kurikulum' },
    { id: 'ruangan', label: '🏢 Ruangan', href: '/dashboard/admin/ruangan' },
    { id: 'kelas', label: '📚 KRS Matakuliah', href: '/dashboard/admin/kelas' },
    { id: 'jadwal', label: '📅 Jadwal', href: '/dashboard/admin/jadwal' },
  ];

  return (
    <div style={styles.wrapper}>
      <AuthRedirectOnUnauthorized />
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <Link href="/dashboard/admin" style={{ textDecoration: 'none' }}>
            <h1 style={styles.title}>📊 Matriks Kelas</h1>
          </Link>
          {session && (
            <div style={styles.userInfo}>
              <span style={styles.userName}>👤 {session.username || session.nama || 'User'}</span>
              <button onClick={handleLogout} style={styles.logoutButton}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          {navItems.map(item => (
            <Link key={item.id} href={item.href} style={{ textDecoration: 'none' }}>
              <button
                style={{
                  ...styles.navItem,
                  ...(activeTab === item.id ? styles.navItemActive : {}),
                }}
              >
                {item.label}
                {activeTab === item.id && <div style={styles.navUnderline}></div>}
              </button>
            </Link>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div style={styles.contentWrapper}>
        {children}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    padding: '2rem',
    background: 'linear-gradient(135deg, #3FA96B 0%, #1B7A43 100%)',
    color: 'white',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: '700',
    cursor: 'pointer',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  userName: {
    fontSize: '0.95rem',
    fontWeight: '500',
  },
  logoutButton: {
    padding: '0.5rem 1rem',
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    fontSize: '0.85rem',
  },
  nav: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderBottom: '2px solid #e2e8f0',
    padding: '0 2rem',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  navContent: {
    display: 'flex',
    gap: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
  },
  navItem: {
    background: 'none',
    border: 'none',
    padding: '1rem 0.5rem',
    fontSize: '1rem',
    fontWeight: '500',
    color: '#000000',
    cursor: 'pointer',
    transition: 'color 0.2s',
    position: 'relative',
    whiteSpace: 'nowrap',
  },
  navItemActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  navUnderline: {
    position: 'absolute',
    bottom: '0',
    left: '0',
    right: '0',
    height: '3px',
    backgroundColor: '#667eea',
    borderRadius: '3px 3px 0 0',
  },
  contentWrapper: {
    flex: 1,
    background: 'linear-gradient(135deg, #3FA96B 0%, #1B7A43 100%)',
    padding: '0',
  },
};