'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DosenPreferenceModal from '@/app/components/DosenPreferenceModal';
import { DEFAULT_LOCAL_PREFERENCE_PRESET, getEffectivePreferencePreset } from '@/lib/dosen-preference';

export default function DosenPage() {
  const router = useRouter();
  const [data, setData] = useState([]);
  const [file, setFile] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [messagePopup, setMessagePopup] = useState({ show: false, type: '', text: '' });
  const [importStats, setImportStats] = useState({ show: false, success: 0, duplicate: 0, failed: 0 });

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: null,
  });

  const [showPreferenceForm, setShowPreferenceForm] = useState(false);
  const [presets, setPresets] = useState([]);
  const [selectedDosenForPreference, setSelectedDosenForPreference] = useState(null);

  const [form, setForm] = useState({
    id: '',
    f_nidn: '',
    f_nip: '',
    f_title_depan: '',
    f_namapegawai: '',
    f_title_belakang: '',
    f_tempatlahir: '',
    f_tanggallahir: '',
    f_jeniskelamin: '',
    f_progdi_id: '',
  });

  const [selectedIds, setSelectedIds] = useState([]);

  const redirectToLogin = (loginUrl) => {
    router.push(loginUrl === '/login' ? loginUrl : '/login');
  };

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dosen');
      const contentType = res.headers.get('content-type') || '';
      const payload = contentType.includes('application/json') ? await res.json() : null;

      if (!res.ok) {
        if (res.status === 401) {
          redirectToLogin(payload?.loginUrl);
          return;
        }

        const apiError = payload?.error || `HTTP ${res.status}`;
        throw new Error(apiError);
      }

      const safeData = Array.isArray(payload) ? payload : [];
      safeData.sort((a, b) => new Date(a.f_tanggallahir) - new Date(b.f_tanggallahir));

      setData(safeData);
      setSelectedIds([]);
    } catch (error) {
      setData([]);
      showMessage('error', `Gagal memuat data dosen: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchPresets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch Presets
  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/jadwal/presets');
      if (res.status === 401) {
        const contentType = res.headers.get('content-type') || '';
        const payload = contentType.includes('application/json') ? await res.json() : null;
        redirectToLogin(payload?.loginUrl);
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch presets: ${res.status}`);
      }
      const data = await res.json();
      setPresets(data);
    } catch (err) {
      console.error('Error fetching presets:', err);
      setPresets([]);
    }
  };

  const showMessage = (type, text) => {
    setMessagePopup({ show: true, type, text });
  };

  const closeMessagePopup = () => {
    setMessagePopup({ show: false, type: '', text: '' });
  };

  const closeImportStats = () => {
    setImportStats({ show: false, success: 0, duplicate: 0, failed: 0 });
  };

  // Form Handlers
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    // Validations
    if (!form.f_nidn) {
      showMessage('error', 'NIDN wajib diisi');
      return;
    }
    if (!/^\d+$/.test(form.f_nidn)) {
      showMessage('error', 'NIDN harus berupa angka');
      return;
    }
    if (form.f_nidn.length !== 10 && form.f_nidn.length !== 12) {
      showMessage('error', 'NIDN harus 10 atau 12 digit');
      return;
    }

    if (!form.f_nip) {
      showMessage('error', 'NIP wajib diisi');
      return;
    }
    if (!/^\d+$/.test(form.f_nip)) {
      showMessage('error', 'NIP harus berupa angka');
      return;
    }

    if (!form.f_namapegawai) {
      showMessage('error', 'Nama dosen wajib diisi');
      return;
    }

    // Tanggal validation
    if (form.f_tanggallahir) {
      const date = new Date(form.f_tanggallahir);
      if (isNaN(date.getTime())) {
        showMessage('error', 'Tanggal lahir tidak valid');
        return;
      }

      const year = date.getFullYear();
      const currentYear = new Date().getFullYear();
      if (year < 1950 || year > currentYear) {
        showMessage('error', 'Tahun lahir tidak valid');
        return;
      }
    }

    // Jenis kelamin validation
    if (form.f_jeniskelamin && !['L', 'P'].includes(form.f_jeniskelamin)) {
      showMessage('error', 'Jenis kelamin harus L atau P');
      return;
    }

    const method = form.id ? 'PUT' : 'POST';
    const url = '/api/dosen';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error('Gagal menyimpan data');

      showMessage('success', form.id ? 'Data dosen berhasil diupdate' : 'Data dosen berhasil ditambahkan');
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
      f_nidn: '',
      f_nip: '',
      f_title_depan: '',
      f_namapegawai: '',
      f_title_belakang: '',
      f_tempatlahir: '',
      f_tanggallahir: '',
      f_jeniskelamin: '',
      f_progdi_id: '',
    });
  };

  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (data) => {
    setForm({
      id: data.id,
      f_nidn: data.f_nidn || '',
      f_nip: data.f_nip || '',
      f_title_depan: data.f_title_depan || '',
      f_namapegawai: data.f_namapegawai || '',
      f_title_belakang: data.f_title_belakang || '',
      f_tempatlahir: data.f_tempatlahir || '',
      f_tanggallahir: data.f_tanggallahir ? new Date(data.f_tanggallahir).toISOString().split('T')[0] : '',
      f_jeniskelamin: data.f_jeniskelamin || '',
      f_progdi_id: data.f_progdi_id || '',
    });
    setShowForm(true);
  };

  const handleEditPreference = (data) => {
    setSelectedDosenForPreference({ id: data.id, f_namapegawai: data.f_namapegawai });
    setShowPreferenceForm(true);
  };

  // Import Handlers
  const downloadTemplate = async () => {
    try {
      const res = await fetch('/api/dosen/import');

      if (!res.ok) {
        throw new Error('Download template gagal');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'template-dosen.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showMessage('success', '✅ Template berhasil diunduh');
    } catch (error) {
      showMessage('error', `❌ ${error.message}`);
    }
  };

  // Import Data Handler
  const handleImport = async () => {
    if (!file) {
      showMessage('error', 'Pilih file terlebih dahulu');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch('/api/dosen/import', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Import gagal');
      }

      // Tampilkan statistik import
      const summary = result.summary || result;
      setImportStats({
        show: true,
        success: summary.success || 0,
        duplicate: summary.duplicated || summary.duplicate || 0,
        failed: summary.failed || 0,
      });
      setFile(null);
      const fileInput = document.getElementById('fileInput');
      if (fileInput) fileInput.value = '';
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
    } finally {
      setUploading(false);
    }
  };

  // Delete Handlers
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

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      showMessage('error', 'Pilih data yang akan dihapus');
      return;
    }

    if (!confirm(`Hapus ${selectedIds.length} data dosen yang dipilih?`)) return;

    try {
      const res = await fetch('/api/dosen/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menghapus data');

      showMessage('success', `${selectedIds.length} data dosen berhasil dihapus`);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const handleDeleteOne = async (id, nama) => {
    if (!confirm(`Hapus dosen "${nama}"?`)) return;

    try {
      const res = await fetch('/api/dosen/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Gagal menghapus data');

      showMessage('success', 'Data dosen berhasil dihapus');
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  // Helper Functions
  function formatDateDisplay(value) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  function formatNamaLengkap(dosen) {
    let nama = '';
    if (dosen.f_title_depan) nama += dosen.f_title_depan + ' ';
    nama += dosen.f_namapegawai;
    if (dosen.f_title_belakang) nama += ', ' + dosen.f_title_belakang;
    return nama;
  }

  // Sort Function
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key: null, direction: null };
      return { key, direction: 'asc' };
    });
  };

  const sortedData = [...data];
  if (sortConfig.key) {
    sortedData.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'f_tanggallahir') {
        aVal = aVal ? new Date(aVal) : null;
        bVal = bVal ? new Date(bVal) : null;
      }

      if (!aVal && !bVal) return 0;
      if (!aVal) return 1;
      if (!bVal) return -1;

      if (sortConfig.direction === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕';
    if (sortConfig.direction === 'asc') return '↑';
    if (sortConfig.direction === 'desc') return '↓';
    return '↕';
  };

  // Dashboard summary stats (Edumy-style stat widgets)
  const totalDosen = data.length;
  const totalLaki = data.filter((d) => d.f_jeniskelamin === 'L').length;
  const totalPerempuan = data.filter((d) => d.f_jeniskelamin === 'P').length;
  const totalProdi = new Set(data.map((d) => d.f_progdi_id).filter(Boolean)).size;
  const effectivePreferencePreset = getEffectivePreferencePreset({
    databasePresets: presets,
    localPreset: DEFAULT_LOCAL_PREFERENCE_PRESET,
    localPresetName: 'Normal',
  });

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
            <div style={styles.breadcrumb}>Dashboard <span style={styles.breadcrumbSep}>/</span> Manajemen Akademik <span style={styles.breadcrumbSep}>/</span> <span style={styles.breadcrumbActive}>Dosen</span></div>
            <h1 style={styles.title}>Data Dosen</h1>
            <p style={styles.subtitle}>Kelola biodata, preferensi jadwal, dan impor data dosen.</p>
          </div>
          <div style={styles.headerIconWrap}>
            <span style={styles.headerIcon}>🎓</span>
          </div>
        </div>

        {/* Stat widgets */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#E3F5EA', color: '#1B7A43' }}>👥</div>
            <div>
              <div style={styles.statNumber}>{totalDosen}</div>
              <div style={styles.statLabel}>Total Dosen</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#D7F0E1', color: '#146C39' }}>♂</div>
            <div>
              <div style={styles.statNumber}>{totalLaki}</div>
              <div style={styles.statLabel}>Dosen Laki-laki</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#FDE8F1', color: '#E0448A' }}>♀</div>
            <div>
              <div style={styles.statNumber}>{totalPerempuan}</div>
              <div style={styles.statLabel}>Dosen Perempuan</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#E4F7F0', color: '#12B886' }}>📚</div>
            <div>
              <div style={styles.statNumber}>{totalProdi}</div>
              <div style={styles.statLabel}>Program Studi</div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          {/* Toolbar */}
          <div style={styles.toolbar}>
            <div style={styles.toolbarLeft}>
              <button style={styles.btnPrimary} onClick={handleAddNew}>
                ➕ Tambah Dosen
              </button>
              <button style={styles.btnOutlineTeal} onClick={downloadTemplate}>
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
              <h2 style={styles.tableTitle}>📋 Daftar Dosen</h2>
              <span style={styles.badgeCount}>Total: {data.length} dosen</span>
            </div>

            {loading ? (
              <div style={styles.loading}>⏳ Memuat data...</div>
            ) : data.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📭</span>
                <p style={{ margin: 0, fontWeight: 600, color: '#42506B' }}>Belum ada data dosen</p>
                <small style={{ color: '#8A96AD' }}>Klik &quot;Tambah Dosen&quot; atau import dari Excel</small>
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
                      <th style={styles.th} onClick={() => handleSort('f_nidn')}>
                        NIDN <span style={styles.sortIcon}>{renderSortIcon('f_nidn')}</span>
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_nip')}>
                        NIP <span style={styles.sortIcon}>{renderSortIcon('f_nip')}</span>
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_namapegawai')}>
                        Nama Lengkap <span style={styles.sortIcon}>{renderSortIcon('f_namapegawai')}</span>
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_tempatlahir')}>
                        Tempat Lahir <span style={styles.sortIcon}>{renderSortIcon('f_tempatlahir')}</span>
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_tanggallahir')}>
                        Tanggal Lahir <span style={styles.sortIcon}>{renderSortIcon('f_tanggallahir')}</span>
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_jeniskelamin')}>
                        JK <span style={styles.sortIcon}>{renderSortIcon('f_jeniskelamin')}</span>
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_progdi_id')}>
                        Prodi ID <span style={styles.sortIcon}>{renderSortIcon('f_progdi_id')}</span>
                      </th>
                      <th style={styles.thAksi}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((d) => (
                      <tr key={d.id} className="edumy-row" style={styles.tableRow}>
                        <td style={styles.tdCheckbox}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(d.id)}
                            onChange={() => handleSelect(d.id)}
                            style={styles.checkbox}
                          />
                        </td>
                        <td style={styles.td}>
                          <span style={styles.badgeCode}>{d.f_nidn}</span>
                        </td>
                        <td style={styles.td}>{d.f_nip}</td>
                        <td style={styles.td}>
                          <strong style={{ color: '#2B3654' }}>{formatNamaLengkap(d)}</strong>
                        </td>
                        <td style={styles.td}>{d.f_tempatlahir || '-'}</td>
                        <td style={styles.td}>
                          <span style={styles.badgeDate}>{formatDateDisplay(d.f_tanggallahir)}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={d.f_jeniskelamin === 'L' ? styles.badgeMale : styles.badgeFemale}>
                            {d.f_jeniskelamin === 'L' ? '♂ Laki-laki' : d.f_jeniskelamin === 'P' ? '♀ Perempuan' : '-'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.badgeProdi}>{d.f_progdi_id || '-'}</span>
                        </td>
                        <td style={styles.tdAksi}>
                          <button style={styles.btnIconPrimary} onClick={() => handleEdit(d)} title="Edit Biodata">
                            ✏️
                          </button>
                          <button style={styles.btnIconInfo} onClick={() => handleEditPreference(d)} title="Edit Preferensi">
                            📅
                          </button>
                          <button style={styles.btnIconDanger} onClick={() => handleDeleteOne(d.id, d.f_namapegawai)} title="Hapus">
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

      {/* Modal Form */}
      {showForm && (
        <div style={styles.modal} onClick={() => setShowForm(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeaderBar}>
              <h3 style={styles.modalTitle}>
                {form.id ? '✏️ Edit Biodata Dosen' : '➕ Tambah Dosen'}
              </h3>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>NIDN *</label>
                  <input
                    style={styles.input}
                    name="f_nidn"
                    value={form.f_nidn}
                    onChange={handleChange}
                    placeholder="10 atau 12 digit angka"
                    disabled={!!form.id}
                    maxLength="12"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>NIP *</label>
                  <input
                    style={styles.input}
                    name="f_nip"
                    value={form.f_nip}
                    onChange={handleChange}
                    placeholder="Nomor Induk Pegawai"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Gelar Depan</label>
                  <input
                    style={styles.input}
                    name="f_title_depan"
                    value={form.f_title_depan}
                    onChange={handleChange}
                    placeholder="Contoh: Dr., Prof."
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Nama Dosen *</label>
                  <input
                    style={styles.input}
                    name="f_namapegawai"
                    value={form.f_namapegawai}
                    onChange={handleChange}
                    placeholder="Nama lengkap"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Gelar Belakang</label>
                  <input
                    style={styles.input}
                    name="f_title_belakang"
                    value={form.f_title_belakang}
                    onChange={handleChange}
                    placeholder="Contoh: M.Kom., Ph.D"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Tempat Lahir</label>
                  <input
                    style={styles.input}
                    name="f_tempatlahir"
                    value={form.f_tempatlahir}
                    onChange={handleChange}
                    placeholder="Kota tempat lahir"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Tanggal Lahir</label>
                  <input
                    style={styles.input}
                    type="date"
                    name="f_tanggallahir"
                    value={form.f_tanggallahir}
                    onChange={handleChange}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Program Studi ID</label>
                  <input
                    style={styles.input}
                    name="f_progdi_id"
                    value={form.f_progdi_id}
                    onChange={handleChange}
                    placeholder="ID Program Studi"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Jenis Kelamin</label>
                  <div style={styles.radioGroup}>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="f_jeniskelamin"
                        value="L"
                        checked={form.f_jeniskelamin === 'L'}
                        onChange={handleChange}
                      />
                      <span>♂ Laki-laki</span>
                    </label>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="f_jeniskelamin"
                        value="P"
                        checked={form.f_jeniskelamin === 'P'}
                        onChange={handleChange}
                      />
                      <span>♀ Perempuan</span>
                    </label>
                  </div>
                </div>
              </div>

              <div style={styles.modalActions}>
                <button style={styles.btnPrimary} onClick={handleSubmit}>
                  💾 Simpan
                </button>
                <button style={styles.btnSecondary} onClick={() => setShowForm(false)}>
                  ❌ Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DosenPreferenceModal
        open={showPreferenceForm}
        dosen={selectedDosenForPreference}
        preset={effectivePreferencePreset}
        onClose={() => setShowPreferenceForm(false)}
        onShowMessage={showMessage}
        emptyStateMessage="Belum ada preset jadwal. Silakan buat preset terlebih dahulu di menu Jadwal."
      />
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
  badgeDate: {
    backgroundColor: '#F3F5FA',
    color: '#5B6A88',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '500',
    display: 'inline-block',
  },
  badgeMale: {
    backgroundColor: '#D7F0E1',
    color: '#146C39',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
  },
  badgeFemale: {
    backgroundColor: '#FDE8F1',
    color: '#E0448A',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
  },
  badgeProdi: {
    backgroundColor: '#E4F7F0',
    color: '#0E9B6E',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '500',
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
  btnIconInfo: {
    background: '#D7F0E1',
    border: 'none',
    fontSize: '0.95rem',
    cursor: 'pointer',
    padding: '0.4rem 0.65rem',
    borderRadius: '10px',
    transition: 'background 0.2s',
    marginRight: '0.4rem',
    color: '#146C39',
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
  modalTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  modalTitle: {
    fontSize: '1.15rem',
    fontWeight: '700',
    color: '#1E2A45',
    margin: 0,
    fontFamily: "'Poppins', sans-serif",
  },
  statusBadgeDefault: {
    backgroundColor: '#E4F7F0',
    color: '#0E9B6E',
    borderRadius: '999px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.78rem',
    fontWeight: '700',
    border: '1px solid #C3EEDF',
  },
  statusBadgeCustom: {
    backgroundColor: '#EAF7EF',
    color: '#146C39',
    borderRadius: '999px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.78rem',
    fontWeight: '700',
    border: '1px solid #BEE7CC',
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
  },
  radioGroup: {
    display: 'flex',
    gap: '1rem',
    padding: '0.4rem 0',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: '#42506B',
    fontWeight: '500',
  },

  // ── Preference / session grid ──────────────────────────────
  preferenceGrid: {
    overflowX: 'auto',
    marginBottom: '1.5rem',
    borderRadius: '14px',
    border: '1px solid #EEF1F8',
  },
  preferenceTable: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.82rem',
  },
  preferenceHeaderCell: {
    padding: '0.65rem 0.5rem',
    textAlign: 'center',
    fontWeight: '700',
    background: '#FAFBFF',
    color: '#5B6A88',
    border: '1px solid #EEF1F8',
    fontSize: '0.75rem',
    letterSpacing: '0.03em',
  },
  preferenceRowHeader: {
    padding: '0.65rem 1rem',
    fontWeight: '700',
    backgroundColor: '#EAF7EF',
    border: '1px solid #EEF1F8',
    minWidth: '80px',
    color: '#146C39',
    fontSize: '0.82rem',
  },
  preferenceCell: {
    padding: '0.5rem',
    textAlign: 'center',
    border: '1px solid #F3F5FA',
  },

  // ── Info / preset info block ───────────────────────────────
  presetInfo: {
    backgroundColor: '#EAF7EF',
    padding: '1rem 1.25rem',
    borderRadius: '14px',
    marginBottom: '1.5rem',
    fontSize: '0.9rem',
    color: '#12592F',
    borderLeft: '4px solid #1B7A43',
    fontWeight: '500',
  },
  presetDetails: {
    display: 'block',
    fontSize: '0.82rem',
    color: '#146C39',
    marginTop: '0.3rem',
    fontWeight: '400',
  },
  presetLegend: {
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#FAFBFF',
    borderRadius: '10px',
    color: '#8A96AD',
    textAlign: 'center',
    borderTop: '1px solid #EEF1F8',
    fontSize: '0.82rem',
  },

  // ── Session header div (for schedule cells) ────────────────
  sessionHeaderDiv: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
  },
  checkboxSmall: {
    cursor: 'pointer',
    width: '16px',
    height: '16px',
    accentColor: '#1B7A43',
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