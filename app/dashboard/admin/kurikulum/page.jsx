'use client';

import { useEffect, useState } from 'react';

export default function KurikulumPage() {
  const [kurikulumList, setKurikulumList] = useState([]);
  const [templateList, setTemplateList] = useState([]);
  const [selectedKurikulum, setSelectedKurikulum] = useState('');
  const [matkul, setMatkul] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [file, setFile] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [messagePopup, setMessagePopup] = useState({ show: false, type: '', text: '' });
  const [importStats, setImportStats] = useState({ show: false, success: 0, duplicate: 0, failed: 0 });
  const [showMatkulForm, setShowMatkulForm] = useState(false);
  const [editingMatkulId, setEditingMatkulId] = useState(null);
  const [showKurikulumForm, setShowKurikulumForm] = useState(false);
  const [kurikulumForm, setKurikulumForm] = useState({ template_id: '', tahun_kurikulum: '' });
  const [matkulForm, setMatkulForm] = useState({
    f_kodemk: '',
    f_namamk: '',
    f_sks_kurikulum: '',
    f_semester: '',
    f_namakelompok: '',
    f_singkatan: '',
    f_statusaktifmk: '',
  });

  // ================= HELPERS =================

  const safeJson = async (res) => {
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Server error: invalid response format');
    }
    return res.json();
  };

  // ================= FETCH =================
  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/kurikulum-template');
      const data = await safeJson(res);
      setTemplateList(Array.isArray(data) ? data : []);
    } catch (error) {
      showMessage('error', 'Gagal memuat template kurikulum: ' + error.message);
    }
  };

  const fetchKurikulum = async () => {
    try {
      const res = await fetch('/api/kurikulum-master');
      const data = await safeJson(res);
      setKurikulumList(Array.isArray(data) ? data : []);
    } catch (error) {
      showMessage('error', 'Gagal fetch kurikulum data: ' + error.message);
    }
  };

  const fetchMatkul = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/kurikulum?kurikulum_id=${id}`);
      const data = await safeJson(res);
      setMatkul(Array.isArray(data) ? data : []);
      setSelectedIds([]);
    } catch (error) {
      showMessage('error', 'Failed to fetch mata kuliah data: ' + error.message);
      setMatkul([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchKurikulum();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchMatkul(selectedKurikulum);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKurikulum]);

  const showMessage = (type, text) => {
    setMessagePopup({ show: true, type, text });
  };

  const closeMessagePopup = () => {
    setMessagePopup({ show: false, type: '', text: '' });
  };

  const closeImportStats = () => {
    setImportStats({ show: false, success: 0, duplicate: 0, failed: 0 });
  };

  const handleSubmitKurikulum = async () => {
    if (!kurikulumForm.template_id || !/^\d{4}$/.test(kurikulumForm.tahun_kurikulum)) {
      showMessage('error', 'Pilih template dan masukkan tahun kurikulum 4 digit');
      return;
    }

    try {
      const res = await fetch('/api/kurikulum-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kurikulumForm),
      });
      const result = await safeJson(res);
      if (!res.ok) throw new Error(result.error || 'Gagal membuat kurikulum');

      showMessage('success', 'Kurikulum berhasil dibuat');
      setShowKurikulumForm(false);
      setKurikulumForm({ template_id: '', tahun_kurikulum: '' });
      await fetchKurikulum();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  // ================= TAMBAH MATKUL =================
  const handleSubmitMatkul = async () => {
    if (!selectedKurikulum) {
      showMessage('error', 'Pilih kurikulum terlebih dahulu');
      return;
    }

    try {
      const res = await fetch('/api/kurikulum', {
        method: editingMatkulId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...matkulForm, id: editingMatkulId, f_kurikulum: selectedKurikulum }),
      });

      const result = await safeJson(res);
      if (!res.ok) throw new Error(result.error || 'Gagal');

      showMessage('success', editingMatkulId ? 'Mata kuliah berhasil diupdate' : 'Mata kuliah berhasil ditambahkan');
      setShowMatkulForm(false);
      setEditingMatkulId(null);
      setMatkulForm({
        f_kodemk: '',
        f_namamk: '',
        f_sks_kurikulum: '',
        f_semester: '',
        f_namakelompok: '',
        f_singkatan: '',
        f_statusaktifmk: '',
      });
      fetchMatkul(selectedKurikulum);
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const handleEditMatkul = (matkulData) => {
    setMatkulForm({
      f_kodemk: matkulData.f_kodemk || '',
      f_namamk: matkulData.f_namamk || '',
      f_sks_kurikulum: matkulData.f_sks_kurikulum || '',
      f_semester: matkulData.f_semester || '',
      f_namakelompok: matkulData.f_namakelompok || '',
      f_singkatan: matkulData.f_singkatan || '',
      f_statusaktifmk: matkulData.f_statusaktifmk || '',
    });
    setEditingMatkulId(matkulData.id);
    setShowMatkulForm(true);
  };

  // ================= DOWNLOAD TEMPLATE =================
  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/kurikulum/template');
      if (!res.ok) throw new Error('Gagal download template');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_kurikulum.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      showMessage('success', '✅ Template berhasil diunduh');
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  // ================= IMPORT =================
  const handleImport = async () => {
    if (!file || !selectedKurikulum) {
      showMessage('error', 'Pilih kurikulum dan file terlebih dahulu');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('kurikulum_id', selectedKurikulum);

    setUploading(true);
    try {
      const res = await fetch('/api/kurikulum/import', {
        method: 'POST',
        body: formData,
      });

      const result = await safeJson(res);
      if (!res.ok) throw new Error(result.error || 'Import gagal');

      setImportStats({
        show: true,
        success: result.success || 0,
        duplicate: result.duplicate || 0,
        failed: result.failed || 0,
      });
      setFile(null);
      const fileInput = document.getElementById('fileInput');
      if (fileInput) fileInput.value = '';
      fetchMatkul(selectedKurikulum);
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setUploading(false);
    }
  };

  // ================= DELETE =================
  const handleDeleteSelected = async () => {
    if (!selectedIds.length) {
      showMessage('error', 'Pilih data yang akan dihapus');
      return;
    }
    if (!confirm(`Hapus ${selectedIds.length} data?`)) return;

    try {
      const res = await fetch('/api/kurikulum/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!res.ok) throw new Error('Gagal hapus');

      showMessage('success', `${selectedIds.length} data berhasil dihapus`);
      setSelectedIds([]);
      fetchMatkul(selectedKurikulum);
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const handleDeleteOne = async (id, nama) => {
    if (!confirm(`Hapus "${nama}"?`)) return;

    try {
      const res = await fetch('/api/kurikulum/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });

      const result = await safeJson(res);
      if (!res.ok) throw new Error(result.error || 'Gagal hapus');

      showMessage('success', 'Mata kuliah berhasil dihapus');
      fetchMatkul(selectedKurikulum);
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  // ================= CHECKBOX =================
  const handleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === sortedData.length && sortedData.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(sortedData.map((d) => d.id));
    }
  };

  // ================= SORT =================
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key: null, direction: null };
      return { key, direction: 'asc' };
    });
  };

  const sortedData = [...matkul];
  if (sortConfig.key) {
    sortedData.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (!aVal && !bVal) return 0;
      if (!aVal) return 1;
      if (!bVal) return -1;
      return sortConfig.direction === 'asc'
        ? aVal > bVal ? 1 : -1
        : aVal < bVal ? 1 : -1;
    });
  }

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕';
    if (sortConfig.direction === 'asc') return '↑';
    if (sortConfig.direction === 'desc') return '↓';
    return '↕';
  };

  // Dashboard summary stats (Edumy-style stat widgets)
  const totalMatkul = matkul.length;
  const totalSks = matkul.reduce((sum, m) => sum + (parseInt(m.f_sks_kurikulum, 10) || 0), 0);
  const totalSemester = new Set(matkul.map((m) => m.f_semester).filter(Boolean)).size;
  const totalKelompok = new Set(matkul.map((m) => m.f_namakelompok).filter(Boolean)).size;

  // Add hover styles + font import on client side only
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

      button:disabled:hover {
        opacity: 1;
        transform: none;
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

  return (
    <div style={styles.container}>
      <div style={styles.pageWrap}>

        {/* Edumy-style breadcrumb / page header */}
        <div style={styles.pageHeader}>
          <div>
            <div style={styles.breadcrumb}>Dashboard <span style={styles.breadcrumbSep}>/</span> Manajemen Akademik <span style={styles.breadcrumbSep}>/</span> <span style={styles.breadcrumbActive}>Kurikulum</span></div>
            <h1 style={styles.title}>Data Kurikulum</h1>
            <p style={styles.subtitle}>Kelola kurikulum, mata kuliah, dan impor data kurikulum.</p>
          </div>
          <div style={styles.headerIconWrap}>
            <span style={styles.headerIcon}>📚</span>
          </div>
        </div>

        {/* Stat widgets */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#E3F5EA', color: '#1B7A43' }}>📘</div>
            <div>
              <div style={styles.statNumber}>{totalMatkul}</div>
              <div style={styles.statLabel}>Total Mata Kuliah</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#D7F0E1', color: '#146C39' }}>🎯</div>
            <div>
              <div style={styles.statNumber}>{totalSks}</div>
              <div style={styles.statLabel}>Total SKS</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#FDE8F1', color: '#E0448A' }}>🗓️</div>
            <div>
              <div style={styles.statNumber}>{totalSemester}</div>
              <div style={styles.statLabel}>Semester Aktif</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#E4F7F0', color: '#12B886' }}>🗂️</div>
            <div>
              <div style={styles.statNumber}>{totalKelompok}</div>
              <div style={styles.statLabel}>Kelompok Mata Kuliah</div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.masterFilter}>
            <label style={styles.filterLabel}>📖 Kurikulum</label>
            <select value={selectedKurikulum} onChange={(e) => setSelectedKurikulum(e.target.value)} style={styles.select}>
              <option value="">-- Pilih Kurikulum --</option>
              {kurikulumList.map((kurikulum) => (
                <option key={kurikulum.id} value={kurikulum.id}>
                  {kurikulum.kode_kurikulum} | {kurikulum.nama_kurikulum}
                </option>
              ))}
            </select>
            <button style={styles.btnPrimary} onClick={() => setShowKurikulumForm(true)}>➕ Buat Kurikulum</button>
          </div>

          {/* Toolbar - Mata Kuliah */}
          <div style={styles.toolbar}>
            <div style={styles.toolbarLeft}>
              <button
                style={selectedKurikulum ? styles.btnPrimary : styles.btnDisabled}
                disabled={!selectedKurikulum}
                onClick={() => {
                  setEditingMatkulId(null);
                  setMatkulForm({
                    f_kodemk: '',
                    f_namamk: '',
                    f_sks_kurikulum: '',
                    f_semester: '',
                    f_namakelompok: '',
                    f_singkatan: '',
                    f_statusaktifmk: '',
                  });
                  setShowMatkulForm(true);
                }}
              >
                ➕ Tambah Mata Kuliah
              </button>
              <button style={styles.btnOutlineTeal} onClick={handleDownloadTemplate}>
                📥 Download Template
              </button>
              <button style={styles.btnOutlineTeal} onClick={() => document.getElementById('fileInput').click()}>
                📂 Import Excel
              </button>
              <button style={styles.btnDanger} onClick={handleDeleteSelected}>
                🗑️ Hapus ({selectedIds.length})
              </button>
            </div>
          </div>

          {/* File Upload Section */}
          {file && (
            <div style={styles.fileInfo}>
              <span>📎 {file.name}</span>
              <button style={styles.btnPrimarySmall} onClick={handleImport} disabled={uploading}>
                {uploading ? '⏳ Mengupload...' : '📤 Upload'}
              </button>
              <button style={styles.btnSecondary} onClick={() => setFile(null)}>
                ❌ Batal
              </button>
            </div>
          )}

          <input id="fileInput" type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => setFile(e.target.files[0])} />

          {/* Table Section */}
          <div style={styles.tableWrapper}>
            <div style={styles.tableHeader}>
              <h2 style={styles.tableTitle}>📋 Daftar Mata Kuliah</h2>
              {selectedKurikulum && (
                <span style={styles.badgeCount}>Total: {matkul.length} mata kuliah</span>
              )}
            </div>

            {!selectedKurikulum ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📖</span>
                <p style={{ margin: 0, fontWeight: 600, color: '#42506B' }}>Pilih kurikulum terlebih dahulu</p>
              </div>
            ) : loading ? (
              <div style={styles.loading}>⏳ Memuat data...</div>
            ) : matkul.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📭</span>
                <p style={{ margin: 0, fontWeight: 600, color: '#42506B' }}>Belum ada mata kuliah</p>
                <small style={{ color: '#8A96AD' }}>Klik &quot;Tambah Mata Kuliah&quot; atau import dari Excel</small>
              </div>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.thCheckbox}>
                        <input
                          type="checkbox"
                          checked={selectedIds.length === sortedData.length && sortedData.length > 0}
                          onChange={handleSelectAll}
                          style={styles.checkbox}
                        />
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_kodemk')}>
                        Kode MK <span style={styles.sortIcon}>{renderSortIcon('f_kodemk')}</span>
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_namamk')}>
                        Nama Mata Kuliah <span style={styles.sortIcon}>{renderSortIcon('f_namamk')}</span>
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_sks_kurikulum')}>
                        SKS <span style={styles.sortIcon}>{renderSortIcon('f_sks_kurikulum')}</span>
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_semester')}>
                        Semester <span style={styles.sortIcon}>{renderSortIcon('f_semester')}</span>
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_namakelompok')}>
                        Kelompok <span style={styles.sortIcon}>{renderSortIcon('f_namakelompok')}</span>
                      </th>
                      <th style={styles.thAksi}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((m) => (
                      <tr key={m.id} className="edumy-row" style={styles.tableRow}>
                        <td style={styles.tdCheckbox}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(m.id)}
                            onChange={() => handleSelect(m.id)}
                            style={styles.checkbox}
                          />
                        </td>
                        <td style={styles.td}>
                          <span style={styles.badgeCode}>{m.f_kodemk}</span>
                        </td>
                        <td style={styles.td}>
                          <strong style={{ color: '#2B3654' }}>{m.f_namamk}</strong>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.badgeSks}>{m.f_sks_kurikulum} SKS</span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.badgeSemester}>Semester {m.f_semester}</span>
                        </td>
                        <td style={styles.td}>{m.f_namakelompok || '-'}</td>
                        <td style={styles.tdAksi}>
                          <button style={styles.btnIconPrimary} onClick={() => handleEditMatkul(m)} title="Edit">
                            ✏️
                          </button>
                          <button style={styles.btnIconDanger} onClick={() => handleDeleteOne(m.id, m.f_namamk)} title="Hapus">
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
      </div>

      {/* Modal Pesan Popup */}
      {messagePopup.show && (
        <div style={styles.modal} onClick={closeMessagePopup}>
          <div
            style={{
              ...styles.modalContentSmall,
              ...(messagePopup.type === 'success' ? styles.popupSuccess : styles.popupError),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.popupIcon}>
              {messagePopup.type === 'success' ? '✅' : '❌'}
            </div>
            <p style={styles.popupText}>{messagePopup.text}</p>
            <button style={styles.btnClose} onClick={closeMessagePopup}>
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Modal Import Stats */}
      {importStats.show && (
        <div style={styles.modal} onClick={closeImportStats}>
          <div
            style={styles.modalContentSmall}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={styles.popupTitle}>📊 Hasil Import</h3>
            <div style={styles.statsContainer}>
              <div style={{ ...styles.statBox, ...styles.statSuccess }}>
                <div style={styles.statBoxNumber}>{importStats.success}</div>
                <div style={styles.statBoxLabel}>Berhasil</div>
              </div>
              <div style={{ ...styles.statBox, ...styles.statWarning }}>
                <div style={styles.statBoxNumber}>{importStats.duplicate}</div>
                <div style={styles.statBoxLabel}>Duplikat</div>
              </div>
              <div style={{ ...styles.statBox, ...styles.statError }}>
                <div style={styles.statBoxNumber}>{importStats.failed}</div>
                <div style={styles.statBoxLabel}>Gagal</div>
              </div>
            </div>
            <button style={styles.btnClose} onClick={closeImportStats}>
              Tutup
            </button>
          </div>
        </div>
      )}

      {showKurikulumForm && (
        <div style={styles.modal} onClick={() => setShowKurikulumForm(false)}>
          <div style={styles.modalContentSmall} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.popupTitle}>Buat Kurikulum Baru</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Template Kurikulum *</label>
              <select style={styles.input} value={kurikulumForm.template_id} onChange={(e) => setKurikulumForm({ ...kurikulumForm, template_id: e.target.value })}>
                <option value="">Pilih template</option>
                {templateList.map((template) => <option key={template.id} value={template.id}>{template.kode_kurikulum} - {template.nama_kurikulum}</option>)}
              </select>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tahun Kurikulum *</label>
              <input style={styles.input} placeholder="Contoh: 2024" maxLength="4" value={kurikulumForm.tahun_kurikulum} onChange={(e) => setKurikulumForm({ ...kurikulumForm, tahun_kurikulum: e.target.value.replace(/[^0-9]/g, '') })} />
            </div>
            <div style={styles.modalActions}>
              <button style={styles.btnPrimary} onClick={handleSubmitKurikulum}>Simpan</button>
              <button style={styles.btnSecondary} onClick={() => setShowKurikulumForm(false)}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Mata Kuliah */}
      {showMatkulForm && (
        <div
          style={styles.modal}
          onClick={() => {
            setShowMatkulForm(false);
            setEditingMatkulId(null);
          }}
        >
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeaderBar}>
              <h3 style={styles.modalTitle}>{editingMatkulId ? '✏️ Edit Mata Kuliah' : '➕ Tambah Mata Kuliah'}</h3>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Kode MK *</label>
                  <input
                    style={styles.input}
                    placeholder="Kode mata kuliah"
                    value={matkulForm.f_kodemk}
                    onChange={(e) => setMatkulForm({ ...matkulForm, f_kodemk: e.target.value })}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Nama MK *</label>
                  <input
                    style={styles.input}
                    placeholder="Nama mata kuliah"
                    value={matkulForm.f_namamk}
                    onChange={(e) => setMatkulForm({ ...matkulForm, f_namamk: e.target.value })}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>SKS *</label>
                  <input
                    style={styles.input}
                    placeholder="Jumlah SKS"
                    value={matkulForm.f_sks_kurikulum}
                    onChange={(e) =>
                      setMatkulForm({ ...matkulForm, f_sks_kurikulum: e.target.value })
                    }
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Semester *</label>
                  <input
                    style={styles.input}
                    placeholder="Semester"
                    value={matkulForm.f_semester}
                    onChange={(e) =>
                      setMatkulForm({ ...matkulForm, f_semester: e.target.value })
                    }
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Nama Kelompok</label>
                  <input
                    style={styles.input}
                    placeholder="Kelompok mata kuliah"
                    value={matkulForm.f_namakelompok}
                    onChange={(e) =>
                      setMatkulForm({ ...matkulForm, f_namakelompok: e.target.value })
                    }
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Singkatan</label>
                  <input
                    style={styles.input}
                    placeholder="Singkatan MK"
                    value={matkulForm.f_singkatan}
                    onChange={(e) =>
                      setMatkulForm({ ...matkulForm, f_singkatan: e.target.value })
                    }
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Status Aktif</label>
                  <select
                    style={styles.input}
                    value={matkulForm.f_statusaktifmk}
                    onChange={(e) =>
                      setMatkulForm({ ...matkulForm, f_statusaktifmk: e.target.value })
                    }
                  >
                    <option value="">-- Pilih Status --</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Tidak Aktif">Tidak Aktif</option>
                  </select>
                </div>
              </div>

              <div style={styles.modalActions}>
                <button style={styles.btnPrimary} onClick={handleSubmitMatkul}>
                  💾 {editingMatkulId ? 'Update' : 'Simpan'}
                </button>
                <button
                  style={styles.btnSecondary}
                  onClick={() => {
                    setShowMatkulForm(false);
                    setEditingMatkulId(null);
                  }}
                >
                  ❌ Batal
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

  // ── Filter strips ─────────────────────────────────────────
  masterFilter: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
    padding: '0.9rem 1.25rem',
    backgroundColor: '#EAF7EF',
    borderRadius: '14px',
    border: '1px solid #BEE7CC',
    flexWrap: 'wrap',
  },
  subFilters: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1.5rem',
    padding: '0.9rem 1.25rem',
    backgroundColor: '#FAFBFF',
    borderRadius: '14px',
    border: '1px solid #EEF1F8',
    flexWrap: 'wrap',
  },
  filterLabel: {
    fontWeight: '700',
    color: '#12592F',
    whiteSpace: 'nowrap',
    fontSize: '0.85rem',
  },
  select: {
    padding: '0.6rem 1rem',
    borderRadius: '10px',
    border: '1.5px solid #E4E8F1',
    fontSize: '0.875rem',
    backgroundColor: 'white',
    cursor: 'pointer',
    color: '#42506B',
    fontWeight: '500',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
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
  btnPrimarySmall: {
    padding: '0.5rem 1.1rem',
    background: 'linear-gradient(135deg, #3FA96B, #1B7A43)',
    color: 'white',
    border: 'none',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(27,122,67,0.3)',
  },
  btnOutlineTeal: {
    padding: '0.6rem 1.35rem',
    background: '#E4F7F0',
    color: '#0E9B6E',
    border: '1px solid #C3EEDF',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
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
  btnDisabled: {
    padding: '0.6rem 1.35rem',
    background: '#F3F5FA',
    color: '#C7CEDD',
    border: '1px solid #E4E8F1',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'not-allowed',
  },

  // ── File info strip ────────────────────────────────────────
  fileInfo: {
    backgroundColor: '#EAF7EF',
    padding: '0.75rem 1.25rem',
    borderRadius: '14px',
    marginBottom: '1.5rem',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    flexWrap: 'wrap',
    border: '1px solid #BEE7CC',
    fontSize: '0.875rem',
    color: '#12592F',
    fontWeight: '500',
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
    flexWrap: 'wrap',
    gap: '0.5rem',
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
  sortIcon: {
    color: '#1B7A43',
    fontWeight: '700',
  },
  thCheckbox: {
    padding: '0.85rem 1rem',
    width: '44px',
    textAlign: 'center',
    borderBottom: '1px solid #EEF1F8',
  },
  thAksi: {
    padding: '0.85rem 1rem',
    width: '90px',
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
  },
  badgeSks: {
    backgroundColor: '#D7F0E1',
    color: '#146C39',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
  },
  badgeSemester: {
    backgroundColor: '#E4F7F0',
    color: '#0E9B6E',
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
    minWidth: '600px',
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

  // ── Form grid inside modal ─────────────────────────────────
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    marginBottom: '1rem',
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
  popupTitle: {
    color: '#1E2A45',
    fontSize: '1.25rem',
    fontWeight: '700',
    marginBottom: '1.5rem',
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
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

  // ── Import Stats ───────────────────────────────────────────
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  statBox: {
    padding: '1.5rem 1rem',
    borderRadius: '14px',
    textAlign: 'center',
  },
  statSuccess: {
    backgroundColor: '#F0FBF6',
  },
  statWarning: {
    backgroundColor: '#FFF6EC',
  },
  statError: {
    backgroundColor: '#FDF1F2',
  },
  statBoxNumber: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1E2A45',
    marginBottom: '0.5rem',
    fontFamily: "'Poppins', sans-serif",
  },
  statBoxLabel: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#5B6A88',
    textTransform: 'uppercase',
    letterSpacing: '0.02em',
  },
};