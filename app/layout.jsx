'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  // Compute activeTab langsung dari pathname tanpa setState
  const getActiveTab = () => {
    if (pathname.includes('/dosen')) return 'dosen';
    if (pathname.includes('/ruangan')) return 'ruangan';
    if (pathname.includes('/kurikulum')) return 'kurikulum';
    if (pathname.includes('/kelas')) return 'kelas';
    if (pathname.includes('/jadwal')) return 'jadwal';
    return '';
  };

  const activeTab = getActiveTab();

  const navItems = [
    { id: 'dosen', label: '👨‍🏫 Dosen', href: '/dashboard/admin/dosen' },
    { id: 'ruangan', label: '🏛️ Ruangan', href: '/dashboard/admin/ruangan' },
    { id: 'kurikulum', label: '📖 Kurikulum', href: '/dashboard/admin/kurikulum' },
    { id: 'kelas', label: '📚 Kelas', href: '/dashboard/admin/kelas' },
    { id: 'jadwal', label: '📅 Jadwal', href: '/dashboard/admin/jadwal' },
  ];

  return (
    <div style={styles.wrapper}>
      {/* Header */}
      <div style={styles.header}>
        <Link href="/dashboard/admin" style={{ textDecoration: 'none' }}>
          <h1 style={styles.title}>📊 Matriks Kelas</h1>
        </Link>
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
  },
  title: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: '700',
    cursor: 'pointer',
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
    color: '#4a5568',
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