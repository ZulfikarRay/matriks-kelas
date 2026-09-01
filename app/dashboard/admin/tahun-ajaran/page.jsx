'use client';

import { useEffect, useState } from 'react';

// Moved outside main component to prevent unnecessary re-renders
const SortIndicator = ({ column, sortConfig }) => {
  if (sortConfig.key !== column) return <span style={{ color: '#1B7A43', fontWeight: 700 }}> ⇅</span>;
  return sortConfig.direction === 'asc' ? (
    <span style={{ color: '#1B7A43', fontWeight: 700 }}> ↑</span>
  ) : (
    <span style={{ color: '#1B7A43', fontWeight: 700 }}> ↓</span>
  );
};

export default function TahunAkademikPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    id: '',
    tahun_awal: '',
  });
  const [editingId, setEditingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [kurikulumTemplate, setKurikulumTemplate] = useState([]);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateForm, setTemplateForm] = useState({
    kode_kurikulum: '',
    nama_kurikulum: '',
  });
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: null,
  });

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/tahun-ajaran');

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server error: invalid response format');
      }

      const json = await res.json();

      setData(Array.isArray(json) ? json : []);
      setSelectedIds([]);
    } catch (error) {
      showMessage('error', 'Gagal memuat data: ' + error.message);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchKurikulumTemplate = async () => {
    try {
      const res = await fetch('/api/kurikulum-template');
      const contentType = res.headers.get('content-type');

      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server error: invalid response format');
      }

      const json = await res.json();
      setKurikulumTemplate(Array.isArray(json) ? json : []);
    } catch (error) {
      showMessage('error', 'Gagal memuat template kurikulum: ' + error.message);
      setKurikulumTemplate([]);
    }
  };

  useEffect(() => {
    fetchData();
    fetchKurikulumTemplate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add hover styles + font import on client side only (Edumy theme)
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

      input:hover, select:hover, textarea:hover {
        border-color: #1B7A43 !important;
      }

      input:focus, select:focus, textarea:focus {
        outline: none;
        border-color: #1B7A43 !important;
        box-shadow: 0 0 0 3px rgba(27,122,67,0.14) !important;
      }

      tr.edumy-row:hover {
        background-color: #EAF7EF !important;
      }

      ::-webkit-scrollbar { height: 8px; width: 8px; }
      ::-webkit-scrollbar-thumb { background: #E4E8F1; border-radius: 8px; }
      ::-webkit-scrollbar-track { background: transparent; }
    `;
    document.head.appendChild(styleSheet);
  }, []);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  // Form Handlers
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.tahun_awal) {
      showMessage('error', 'Tahun awal wajib diisi');
      return;
    }

    if (!/^\d{4}$/.test(String(form.tahun_awal))) {
      showMessage('error', 'Tahun harus berupa angka 4 digit');
      return;
    }

    const method = form.id ? 'PUT' : 'POST';
    const url = '/api/tahun-ajaran';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Gagal menyimpan data');
      }

      showMessage(
        'success',
        form.id ? 'Data berhasil diupdate' : 'Data berhasil ditambahkan'
      );
      setShowForm(false);
      resetForm();
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const resetForm = () => {
    setForm({
      id: '',
      tahun_awal: '',
    });
    setEditingId(null);
  };

  const handleAddNew = () => {
    resetForm();
    if (data.length > 0) {
      const lastYear = Number(data[0].tahun_awal) + 1;
      setForm({ id: '', tahun_awal: String(lastYear) });
    }
    setShowForm(true);
  };

  const handleSubmitTemplate = async () => {
    if (!templateForm.kode_kurikulum || !templateForm.nama_kurikulum) {
      showMessage('error', 'Kode dan nama kurikulum wajib diisi');
      return;
    }

    try {
      let res = await fetch('/api/kurikulum-template', {
        method: editingTemplateId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...templateForm, id: editingTemplateId }),
      });
      const result = await res.json();

      if (res.status === 409 && result.requiresSync) {
        const confirmed = confirm(`Ada ${result.affectedCount} kurikulum yang menggunakan kode ini. Sinkronkan perubahan ke kurikulum tersebut?`);
        if (!confirmed) return;

        res = await fetch('/api/kurikulum-template', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...templateForm, id: editingTemplateId, sync: true }),
        });
      }

      const finalResult = res === result ? result : await res.json();
      if (!res.ok) throw new Error(finalResult.error || 'Gagal menyimpan template');

      showMessage('success', editingTemplateId ? 'Template kurikulum berhasil diupdate' : 'Template kurikulum berhasil ditambahkan');
      setShowTemplateForm(false);
      setTemplateForm({ kode_kurikulum: '', nama_kurikulum: '' });
      setEditingTemplateId(null);
      fetchKurikulumTemplate();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const handleEditTemplate = (template) => {
    setTemplateForm({
      kode_kurikulum: template.kode_kurikulum,
      nama_kurikulum: template.nama_kurikulum,
    });
    setEditingTemplateId(template.id);
    setShowTemplateForm(true);
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Yakin ingin menghapus template kurikulum ini?')) return;

    try {
      let res = await fetch(`/api/kurikulum-template?id=${id}`, { method: 'DELETE' });
      let result = await res.json();

      if (res.status === 409 && result.requiresSync) {
        const confirmed = confirm(`Ada ${result.affectedCount} kurikulum yang menggunakan template ini. Hapus template beserta kurikulum tersebut?`);
        if (!confirmed) return;

        res = await fetch(`/api/kurikulum-template?id=${id}&sync=true`, { method: 'DELETE' });
        result = await res.json();
      }

      if (!res.ok) throw new Error(result.error || 'Gagal menghapus template');

      showMessage('success', 'Template kurikulum berhasil dihapus');
      fetchKurikulumTemplate();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const handleEdit = (rowData) => {
    setForm({
      id: rowData.id,
      tahun_awal: String(rowData.tahun_awal),
    });
    setEditingId(rowData.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus?')) return;

    try {
      const res = await fetch(`/api/tahun-ajaran/delete?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Gagal menghapus data');

      showMessage('success', 'Data berhasil dihapus');
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      showMessage('error', 'Pilih minimal 1 data');
      return;
    }

    if (!confirm(`Yakin ingin menghapus ${selectedIds.length} data?`)) return;

    try {
      const res = await fetch('/api/tahun-ajaran/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!res.ok) throw new Error('Gagal menghapus data');

      showMessage('success', 'Data berhasil dihapus');
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const handleSelectAll = (checked) => {
    setSelectedIds(checked ? data.map((row) => row.id) : []);
  };

  const handleSelectRow = (id, checked) => {
    setSelectedIds(
      checked
        ? [...selectedIds, id]
        : selectedIds.filter((selectedId) => selectedId !== id)
    );
  };

  // Sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = () => {
    const sorted = [...data];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sorted;
  };

  // Dashboard summary stats (Edumy-style stat widgets)
  const totalTahun = data.length;
  const currentYear = new Date().getFullYear();
  const tahunAktif = data.find((d) => Number(d.tahun_awal) === currentYear);
  const tahunTerbaru = data.length > 0 ? Math.max(...data.map((d) => Number(d.tahun_awal))) : '-';
  const tahunTerlama = data.length > 0 ? Math.min(...data.map((d) => Number(d.tahun_awal))) : '-';

  const sortedData = getSortedData();

  return (
    <div style={styles.container}>
      <div style={styles.pageWrap}>

        {/* Edumy-style breadcrumb / page header */}
        <div style={styles.pageHeader}>
          <div>
            <div style={styles.breadcrumb}>Dashboard <span style={styles.breadcrumbSep}>/</span> Manajemen Akademik <span style={styles.breadcrumbSep}>/</span> <span style={styles.breadcrumbActive}>Setup</span></div>
            <h1 style={styles.title}>Setup</h1>
            <p style={styles.subtitle}>Kelola periode tahun ajaran yang digunakan sistem dan Kurikulum Master.</p>
          </div>
          <div style={styles.headerIconWrap}>
            <span style={styles.headerIcon}>📅</span>
          </div>
        </div>

        {/* Stat widgets */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#E3F5EA', color: '#1B7A43' }}>📅</div>
            <div>
              <div style={styles.statNumber}>{totalTahun}</div>
              <div style={styles.statLabel}>Total Tahun Ajaran</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#E4F7F0', color: '#12B886' }}>✅</div>
            <div>
              <div style={styles.statNumber}>{tahunAktif ? tahunAktif.tahun_ajaran || `${tahunAktif.tahun_awal}/${Number(tahunAktif.tahun_awal) + 1}` : '-'}</div>
              <div style={styles.statLabel}>Tahun Berjalan</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#D7F0E1', color: '#146C39' }}>⬆️</div>
            <div>
              <div style={styles.statNumber}>{tahunTerbaru}</div>
              <div style={styles.statLabel}>Tahun Terbaru</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#FDE8F1', color: '#E0448A' }}>⬇️</div>
            <div>
              <div style={styles.statNumber}>{tahunTerlama}</div>
              <div style={styles.statLabel}>Tahun Terlama</div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          {/* Toolbar */}
          <div style={styles.toolbar}>
            <div style={styles.toolbarLeft}>
              <button style={styles.btnPrimary} onClick={handleAddNew}>
                ➕ Tambah Tahun Ajaran
              </button>
              <button
                style={{
                  ...styles.btnDanger,
                  ...(selectedIds.length === 0 ? styles.btnDisabled : {}),
                }}
                onClick={handleBulkDelete}
                disabled={selectedIds.length === 0}
              >
                🗑️ Hapus ({selectedIds.length})
              </button>
            </div>
          </div>

          {/* Table Section */}
          <div style={styles.tableWrapper}>
            <div style={styles.tableHeader}>
              <h2 style={styles.tableTitle}>Daftar Tahun Ajaran</h2>
              <span style={styles.badgeCount}>Total: {data.length} tahun</span>
            </div>

            {loading ? (
              <div style={styles.loading}>⏳ Memuat data...</div>
            ) : data.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📭</span>
                <p style={{ margin: 0, fontWeight: 600, color: '#42506B' }}>Belum ada data tahun ajaran</p>
                <small style={{ color: '#8A96AD' }}>Klik &quot;Tambah Tahun Ajaran&quot; untuk menambahkan data</small>
              </div>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.thCheckbox}>
                        <input
                          type="checkbox"
                          checked={selectedIds.length === data.length && data.length > 0}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          style={styles.checkbox}
                        />
                      </th>
                      <th style={styles.th} onClick={() => handleSort('tahun_ajaran')}>
                        Tahun Ajaran <SortIndicator column="tahun_ajaran" sortConfig={sortConfig} />
                      </th>
                      <th style={styles.thAksi}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((row) => (
                      <tr key={row.id} className="edumy-row" style={styles.tableRow}>
                        <td style={styles.tdCheckbox}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(row.id)}
                            onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                            style={styles.checkbox}
                          />
                        </td>
                        <td style={styles.td}>
                          <span style={styles.badgeDate}>{row.tahun_ajaran}</span>
                        </td>
                        <td style={styles.tdAksi}>
                          <button style={styles.btnIconPrimary} onClick={() => handleEdit(row)} title="Edit">
                            ✏️
                          </button>
                          <button style={styles.btnIconDanger} onClick={() => handleDelete(row.id)} title="Hapus">
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div style={{ ...styles.card, marginTop: '1.5rem' }}>
          <div style={styles.tableHeader}>
            <div>
              <h2 style={styles.tableTitle}>Kurikulum Master</h2>
            </div>
            <button
              style={styles.btnPrimary}
              onClick={() => {
                setTemplateForm({ kode_kurikulum: '', nama_kurikulum: '' });
                setEditingTemplateId(null);
                setShowTemplateForm(true);
              }}
            >
              Tambah Template
            </button>
          </div>

          {kurikulumTemplate.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={{ margin: 0, fontWeight: 600, color: '#42506B' }}>Belum ada template kurikulum</p>
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Kode Kurikulum</th>
                    <th style={styles.th}>Nama Kurikulum</th>
                    <th style={styles.thAksi}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {kurikulumTemplate.map((template) => (
                    <tr key={template.id} className="edumy-row" style={styles.tableRow}>
                      <td style={styles.td}><span style={styles.badgeDate}>{template.kode_kurikulum}</span></td>
                      <td style={styles.td}>{template.nama_kurikulum}</td>
                      <td style={styles.tdAksi}>
                        <button style={styles.btnIconPrimary} onClick={() => handleEditTemplate(template)} title="Edit">
                          ✏️
                        </button>
                        <button style={styles.btnIconDanger} onClick={() => handleDeleteTemplate(template.id)} title="Hapus">
                          🗑️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Message Popup */}
      {message.text && (
        <div style={styles.modal} onClick={() => setMessage({ type: '', text: '' })}>
          <div
            style={{
              ...styles.modalContentSmall,
              ...(message.type === 'success' ? styles.popupSuccess : styles.popupError),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.popupIcon}>
              {message.type === 'success' ? '✅' : '❌'}
            </div>
            <p style={styles.popupText}>{message.text}</p>
            <button style={styles.btnClose} onClick={() => setMessage({ type: '', text: '' })}>
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div
          style={styles.modal}
          onClick={() => {
            setShowForm(false);
            resetForm();
          }}
        >
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeaderBar}>
              <h3 style={styles.modalTitle}>
                {editingId ? '✏️ Edit Tahun Ajaran' : '➕ Tambah Tahun Ajaran'}
              </h3>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Tahun Awal *</label>
                <input
                  type="text"
                  name="tahun_awal"
                  placeholder="Contoh: 2026"
                  value={form.tahun_awal}
                  onChange={handleChange}
                  maxLength="4"
                  style={styles.input}
                />
                <small style={styles.hint}>
                  Tahun akhir akan otomatis menjadi tahun awal + 1
                </small>
              </div>

              <div style={styles.modalActions}>
                <button style={styles.btnPrimary} onClick={handleSubmit}>
                  💾 {editingId ? 'Update' : 'Simpan'}
                </button>
                <button
                  style={styles.btnSecondary}
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  ❌ Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTemplateForm && (
        <div
          style={styles.modal}
          onClick={() => {
            setShowTemplateForm(false);
            setTemplateForm({ kode_kurikulum: '', nama_kurikulum: '' });
            setEditingTemplateId(null);
          }}
        >
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeaderBar}>
              <h3 style={styles.modalTitle}>{editingTemplateId ? 'Edit Template Kurikulum' : 'Tambah Template Kurikulum'}</h3>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Kode Kurikulum *</label>
                <input style={styles.input} placeholder="Contoh: S1IF" value={templateForm.kode_kurikulum} onChange={(e) => setTemplateForm({ ...templateForm, kode_kurikulum: e.target.value.replace(/\s/g, '') })} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Nama Kurikulum *</label>
                <input style={styles.input} placeholder="Contoh: S1 Informatika" value={templateForm.nama_kurikulum} onChange={(e) => setTemplateForm({ ...templateForm, nama_kurikulum: e.target.value })} />
              </div>
              <div style={styles.modalActions}>
                <button style={styles.btnPrimary} onClick={handleSubmitTemplate}>{editingTemplateId ? 'Update' : 'Simpan'}</button>
                <button
                  style={styles.btnSecondary}
                  onClick={() => {
                    setShowTemplateForm(false);
                    setTemplateForm({ kode_kurikulum: '', nama_kurikulum: '' });
                    setEditingTemplateId(null);
                  }}
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Edumy-inspired design tokens ──────────────────────────────
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
  masterSubtitle: {
    color: '#8A96AD',
    fontSize: '0.85rem',
    margin: '0.3rem 0 0',
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
    fontSize: '1.45rem',
    fontWeight: '700',
    color: '#1E2A45',
    fontFamily: "'Poppins', sans-serif",
    lineHeight: 1.1,
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

  // ── Toolbar ────────────────────────────────────────────────
  toolbar: {
    marginBottom: '1.5rem',
    paddingBottom: '1.25rem',
    borderBottom: '1px solid #EEF1F8',
  },
  toolbarLeft: {
    display: 'flex',
    gap: '0.7rem',
    flexWrap: 'wrap',
    alignItems: 'center',
  },

  // ── Buttons (Edumy pill style) ──────────────────────────────
  btnPrimary: {
    padding: '0.6rem 1.35rem',
    background: 'linear-gradient(135deg, #3FA96B, #1B7A43)',
    color: 'white',
    border: 'none',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(27,122,67,0.35)',
    transition: 'opacity 0.2s, transform 0.1s',
  },
  btnDanger: {
    padding: '0.6rem 1.35rem',
    background: '#FDEBEE',
    color: '#E5484D',
    border: '1px solid #F8CDD3',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'opacity 0.2s, transform 0.1s',
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  btnSecondary: {
    padding: '0.6rem 1.35rem',
    background: '#F3F5FA',
    color: '#5B6A88',
    border: '1px solid #E4E8F1',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },

  // ── Table section ──────────────────────────────────────────
  tableWrapper: {
    marginTop: '0.25rem',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.9rem',
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

  // ── Empty / loading states ─────────────────────────────────
  emptyState: {
    textAlign: 'center',
    padding: '3.5rem 2rem',
    backgroundColor: '#FAFBFF',
    borderRadius: '16px',
    color: '#9AA5BC',
    border: '2px dashed #E4E8F1',
  },
  emptyIcon: {
    fontSize: '3rem',
    display: 'block',
    marginBottom: '1rem',
  },
  loading: {
    textAlign: 'center',
    padding: '3rem',
    color: '#1B7A43',
    fontSize: '1rem',
    fontWeight: '600',
  },

  // ── Table ──────────────────────────────────────────────────
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '14px',
    border: '1px solid #EEF1F8',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'white',
  },
  tableHeaderRow: {
    backgroundColor: '#FAFBFF',
  },
  th: {
    padding: '0.85rem 1rem',
    textAlign: 'left',
    fontWeight: '700',
    color: '#8A96AD',
    fontSize: '0.72rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    cursor: 'pointer',
    userSelect: 'none',
    whiteSpace: 'nowrap',
    borderBottom: '1px solid #EEF1F8',
  },
  thCheckbox: {
    padding: '0.85rem 1rem',
    width: '44px',
    textAlign: 'center',
    borderBottom: '1px solid #EEF1F8',
  },
  thAksi: {
    padding: '0.85rem 1rem',
    width: '110px',
    textAlign: 'center',
    color: '#8A96AD',
    fontSize: '0.72rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    borderBottom: '1px solid #EEF1F8',
  },
  td: {
    padding: '0.85rem 1rem',
    color: '#42506B',
    fontSize: '0.875rem',
    verticalAlign: 'middle',
  },
  tdCheckbox: {
    padding: '0.85rem 1rem',
    textAlign: 'center',
    verticalAlign: 'middle',
  },
  tdAksi: {
    padding: '0.85rem 1rem',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  },
  tableRow: {
    borderBottom: '1px solid #F3F5FA',
    transition: 'background-color 0.15s',
  },
  checkbox: {
    cursor: 'pointer',
    width: '17px',
    height: '17px',
    accentColor: '#1B7A43',
  },

  // ── Data badges (pill style) ────────────────────────────────
  badgeDate: {
    backgroundColor: '#F3F5FA',
    color: '#5B6A88',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
  },

  // ── Row action icon-buttons ────────────────────────────────
  btnIconPrimary: {
    background: '#E3F5EA',
    border: 'none',
    fontSize: '0.95rem',
    cursor: 'pointer',
    padding: '0.4rem 0.65rem',
    borderRadius: '10px',
    transition: 'background 0.2s',
    marginRight: '0.4rem',
    color: '#1B7A43',
  },
  btnIconDanger: {
    background: '#FDEBEE',
    border: 'none',
    fontSize: '0.95rem',
    cursor: 'pointer',
    padding: '0.4rem 0.65rem',
    borderRadius: '10px',
    transition: 'background 0.2s',
    color: '#E5484D',
  },

  // ── Modal overlay + content ────────────────────────────────
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(20,24,40,0.5)',
    backdropFilter: 'blur(3px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'white',
    borderRadius: '20px',
    minWidth: '420px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 24px 64px rgba(20,24,40,0.28)',
  },
  modalHeaderBar: {
    padding: '1.25rem 1.75rem',
    borderBottom: '1px solid #EEF1F8',
    background: '#FAFBFF',
    borderTopLeftRadius: '20px',
    borderTopRightRadius: '20px',
  },
  modalTitle: {
    fontSize: '1.15rem',
    fontWeight: '700',
    color: '#1E2A45',
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
  },
  modalBody: {
    padding: '1.75rem',
  },
  modalActions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
    marginTop: '1.5rem',
    paddingTop: '1.25rem',
    borderTop: '1px solid #EEF1F8',
  },

  // ── Form ─────────────────────────────────────────────────
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
  input: {
    padding: '0.7rem 0.9rem',
    borderRadius: '10px',
    border: '1.5px solid #E4E8F1',
    fontSize: '0.9rem',
    color: '#1E2A45',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
    width: '100%',
  },
  hint: {
    display: 'block',
    marginTop: '0.3rem',
    color: '#8A96AD',
    fontSize: '0.78rem',
  },

  // ── Popup Modal ────────────────────────────────────────────
  modalContentSmall: {
    background: 'white',
    borderRadius: '20px',
    minWidth: '350px',
    maxWidth: '85vw',
    padding: '2rem',
    boxShadow: '0 24px 64px rgba(20,24,40,0.28)',
    textAlign: 'center',
  },
  popupIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  popupText: {
    color: '#1E2A45',
    fontSize: '1rem',
    fontWeight: '500',
    marginBottom: '1.5rem',
    lineHeight: '1.5',
  },
  popupSuccess: {
    backgroundColor: '#F0FBF6',
    borderLeft: '4px solid #12B886',
  },
  popupError: {
    backgroundColor: '#FDF1F2',
    borderLeft: '4px solid #E5484D',
  },
  btnClose: {
    padding: '0.6rem 1.6rem',
    background: 'linear-gradient(135deg, #3FA96B, #1B7A43)',
    color: 'white',
    border: 'none',
    borderRadius: '999px',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(27,122,67,0.3)',
    transition: 'opacity 0.2s',
  },
};