'use client';

import { useEffect, useState } from 'react';

export default function RuanganPage() {
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

  const [form, setForm] = useState({
    id: '',
    f_ruang_id: '',
    f_koderuang: '',
    f_namaruang: '',
    f_kapasitas_kuliah: '',
    f_alamatruang: '',
    lantai: '',
  });

  const [selectedIds, setSelectedIds] = useState([]);
  const [kelasList, setKelasList] = useState([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [roomClassTypes, setRoomClassTypes] = useState({});

  // Safe JSON parser — checks content-type before parsing
  const safeJson = async (res) => {
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error('Server error: invalid response format');
    }
    return res.json();
  };

  // Fetch Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ruangan');
      const json = await safeJson(res);
      // Guard against non-array API responses
      setData(Array.isArray(json) ? json : []);
      setSelectedIds([]);
    } catch (error) {
      showMessage('error', 'Gagal memuat data: ' + error.message);
      setData([]); // Ensure data is always an array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetch('/api/kelas').then((res) => res.json()).then((json) => setKelasList(Array.isArray(json) ? json : [])).catch(() => setKelasList([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (!form.f_koderuang) {
      showMessage('error', 'Kode ruangan wajib diisi');
      return;
    }
    if (!form.f_namaruang) {
      showMessage('error', 'Nama ruangan wajib diisi');
      return;
    }
    if (form.f_kapasitas_kuliah && !/^\d+$/.test(form.f_kapasitas_kuliah)) {
      showMessage('error', 'Kapasitas harus berupa angka');
      return;
    }

    const method = form.id ? 'PUT' : 'POST';
    const url = form.id ? `/api/ruangan/${form.id}` : '/api/ruangan';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errData = await safeJson(res);
        throw new Error(errData.error || 'Gagal menyimpan data');
      }

      showMessage('success', form.id ? 'Data berhasil diupdate' : 'Data berhasil ditambahkan');
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
      f_ruang_id: '',
      f_koderuang: '',
      f_namaruang: '',
      f_kapasitas_kuliah: '',
      f_alamatruang: '',
      lantai: '',
    });
  };

  const handleAddNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch('/api/ruangan/template');
      if (!res.ok) throw new Error('Gagal download template');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'template_ruangan.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      showMessage('success', '✅ Template berhasil diunduh');
    } catch (error) {
      showMessage('error', `❌ ${error.message}`);
    }
  };

  const handleEdit = (rowData) => {
    setForm({
      id: rowData.id,
      f_ruang_id: rowData.f_ruang_id || '',
      f_koderuang: rowData.f_koderuang || '',
      f_namaruang: rowData.f_namaruang || '',
      f_kapasitas_kuliah: rowData.f_kapasitas_kuliah || '',
      f_alamatruang: rowData.f_alamatruang || '',
      lantai: rowData.lantai || '',
    });
    setShowForm(true);
  };

  const handleOpenFilter = async () => {
    try {
      const res = await fetch('/api/ruangan/filter-kelas');
      const rows = await res.json();
      const grouped = {};
      (Array.isArray(rows) ? rows : []).forEach((row) => {
        const roomId = String(row.ruangan_id);
        if (!grouped[roomId]) grouped[roomId] = new Set();
        grouped[roomId].add(row.jenis_kelas);
      });
      const next = {};
      data.forEach((room) => {
        const types = grouped[String(room.id)];
        next[room.id] = !types || types.size === 0 ? 'biasa' : types.has('tidak_ada') ? 'tidak_ada' : [...types][0];
      });
      setRoomClassTypes(next);
      setShowFilterModal(true);
    } catch (error) {
      showMessage('error', 'Gagal memuat filter kelas: ' + error.message);
    }
  };

  const handleSaveFilter = async () => {
    try {
      for (const room of data) {
        const selectedType = roomClassTypes[room.id] || 'biasa';
        const filters = selectedType === 'tidak_ada' ? [{ jenis_kelas: 'tidak_ada', kelas_id: null }] : kelasList.flatMap((kelas) => {
          const courseName = String(kelas.f_namamk || kelas.display_name || '').trim().toLowerCase();
          const jenis = courseName.startsWith('praktikum ') ? 'praktikum' : 'biasa';
          return selectedType === jenis ? [{ jenis_kelas: jenis, kelas_id: kelas.id }] : [];
        });
        const res = await fetch('/api/ruangan/filter-kelas', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ruangan_id: room.id, filters }),
        });
        const result = await safeJson(res);
        if (!res.ok) throw new Error(result.error || `Gagal menyimpan filter ${room.f_koderuang}`);
      }
      showMessage('success', 'Filter kelas berhasil disimpan');
      setShowFilterModal(false);
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  // Import Handlers
  const handleImport = async () => {
    if (!file) {
      showMessage('error', 'Pilih file terlebih dahulu');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const res = await fetch('/api/ruangan/import', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Import gagal');

      const result = await safeJson(res);

      setImportStats({
        show: true,
        success: result.success || 0,
        duplicate: result.duplicate || 0,
        failed: result.failed || 0,
      });
      setFile(null);
      const fileInput = document.getElementById('fileInput');
      if (fileInput) fileInput.value = '';
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
      // Reset file state on failed import so user can retry
      setFile(null);
      const fileInput = document.getElementById('fileInput');
      if (fileInput) fileInput.value = '';
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

    if (!confirm(`Hapus ${selectedIds.length} data yang dipilih?`)) return;

    try {
      const res = await fetch('/api/ruangan/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });

      if (!res.ok) throw new Error('Gagal menghapus data');

      showMessage('success', `${selectedIds.length} data berhasil dihapus`);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

  const handleDeleteOne = async (id, nama) => {
    if (!confirm(`Hapus ruangan "${nama}"?`)) return;

    try {
      const res = await fetch('/api/ruangan/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      });

      if (!res.ok) throw new Error('Gagal menghapus data');

      showMessage('success', 'Data berhasil dihapus');
      fetchData();
    } catch (error) {
      showMessage('error', error.message);
    }
  };

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
  const totalRuangan = data.length;
  const totalKapasitas = data.reduce((sum, d) => sum + (parseInt(d.f_kapasitas_kuliah, 10) || 0), 0);
  const rataKapasitas = totalRuangan > 0 ? Math.round(totalKapasitas / totalRuangan) : 0;
  const totalLantai = new Set(data.map((d) => d.lantai).filter((v) => v !== null && v !== undefined && v !== '')).size;

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
            <div style={styles.breadcrumb}>Dashboard <span style={styles.breadcrumbSep}>/</span> Manajemen Akademik <span style={styles.breadcrumbSep}>/</span> <span style={styles.breadcrumbActive}>Ruangan</span></div>
            <h1 style={styles.title}>Data Ruangan</h1>
            <p style={styles.subtitle}>Kelola data ruangan, kapasitas, dan impor data ruangan.</p>
          </div>
          <div style={styles.headerIconWrap}>
            <span style={styles.headerIcon}>🏢</span>
          </div>
        </div>

        {/* Stat widgets */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#E3F5EA', color: '#1B7A43' }}>🏢</div>
            <div>
              <div style={styles.statNumber}>{totalRuangan}</div>
              <div style={styles.statLabel}>Total Ruangan</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#D7F0E1', color: '#146C39' }}>👥</div>
            <div>
              <div style={styles.statNumber}>{totalKapasitas}</div>
              <div style={styles.statLabel}>Total Kapasitas</div>
            </div>
          </div>
          <div style={{ ...styles.statCard }}>
            <div style={{ ...styles.statIcon, background: '#FDE8F1', color: '#E0448A' }}>📊</div>
            <div>
              <div style={styles.statNumber}>{rataKapasitas}</div>
              <div style={styles.statLabel}>Rata-rata Kapasitas</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#E4F7F0', color: '#12B886' }}>🏬</div>
            <div>
              <div style={styles.statNumber}>{totalLantai}</div>
              <div style={styles.statLabel}>Jumlah Lantai</div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          {/* Toolbar */}
          <div style={styles.toolbar}>
            <div style={styles.toolbarLeft}>
              <button style={styles.btnPrimary} onClick={handleAddNew}>
                ➕ Tambah Ruangan
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
              <h2 style={styles.tableTitle}>📋 Daftar Ruangan</h2>
              <div style={styles.tableHeaderActions}>
                <span style={styles.badgeCount}>Total: {data.length} ruangan</span>
                <button style={styles.btnPrimary} onClick={handleOpenFilter}>⚙️ Filter Kelas</button>
              </div>
            </div>

            {loading ? (
              <div style={styles.loading}>⏳ Memuat data...</div>
            ) : data.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={styles.emptyIcon}>📭</span>
                <p style={{ margin: 0, fontWeight: 600, color: '#42506B' }}>Belum ada data ruangan</p>
                <small style={{ color: '#8A96AD' }}>Klik &quot;Tambah Ruangan&quot; atau import dari Excel</small>
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
                      <th style={styles.th} onClick={() => handleSort('f_koderuang')}>
                        Kode Ruang <span style={styles.sortIcon}>{renderSortIcon('f_koderuang')}</span>
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_namaruang')}>
                        Nama Ruang <span style={styles.sortIcon}>{renderSortIcon('f_namaruang')}</span>
                      </th>
                      <th style={styles.th} onClick={() => handleSort('f_kapasitas_kuliah')}>
                        Kapasitas <span style={styles.sortIcon}>{renderSortIcon('f_kapasitas_kuliah')}</span>
                      </th>
                      <th style={styles.th} onClick={() => handleSort('lantai')}>
                        Lantai <span style={styles.sortIcon}>{renderSortIcon('lantai')}</span>
                      </th>
                      <th style={styles.th}>Alamat</th>
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
                          <span style={styles.badgeCode}>{d.f_koderuang}</span>
                        </td>
                        <td style={styles.td}>
                          <strong style={{ color: '#2B3654' }}>{d.f_namaruang}</strong>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.badgeCapacity}>👥 {d.f_kapasitas_kuliah || '-'} orang</span>
                        </td>
                        <td style={styles.td}>
                          <span style={styles.badgeProdi}>{d.lantai || '-'}</span>
                        </td>
                        <td style={styles.td}>{d.f_alamatruang || '-'}</td>
                        <td style={styles.tdAksi}>
                          <button style={styles.btnIconPrimary} onClick={() => handleEdit(d)} title="Edit Ruangan">
                            ✏️
                          </button>
                          <button style={styles.btnIconDanger} onClick={() => handleDeleteOne(d.id, d.f_namaruang)} title="Hapus">
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
                {form.id ? '✏️ Edit Ruangan' : '➕ Tambah Ruangan'}
              </h3>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Kode Ruangan *</label>
                  <input
                    style={styles.input}
                    name="f_koderuang"
                    value={form.f_koderuang}
                    onChange={handleChange}
                    placeholder="Contoh: R-101"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Nama Ruangan *</label>
                  <input
                    style={styles.input}
                    name="f_namaruang"
                    value={form.f_namaruang}
                    onChange={handleChange}
                    placeholder="Contoh: Ruang Kelas A"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Kapasitas</label>
                  <input
                    style={styles.input}
                    name="f_kapasitas_kuliah"
                    value={form.f_kapasitas_kuliah}
                    onChange={handleChange}
                    placeholder="Jumlah kapasitas (angka)"
                    type="number"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Lantai</label>
                  <input
                    style={styles.input}
                    name="lantai"
                    value={form.lantai}
                    onChange={handleChange}
                    placeholder="Nomor lantai"
                    type="number"
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>ID Ruang</label>
                  <input
                    style={styles.input}
                    name="f_ruang_id"
                    value={form.f_ruang_id}
                    onChange={handleChange}
                    placeholder="ID ruangan"
                  />
                </div>

                <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                  <label style={styles.label}>Alamat</label>
                  <textarea
                    style={styles.textarea}
                    name="f_alamatruang"
                    value={form.f_alamatruang}
                    onChange={handleChange}
                    placeholder="Alamat atau lokasi ruangan"
                    rows="3"
                  />
                </div>
              </div>

              <div style={styles.modalActions}>
                <button style={styles.btnPrimary} onClick={handleSubmit}>
                  💾 Simpan
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

      {showFilterModal && (
        <div style={styles.modal} onClick={() => setShowFilterModal(false)}>
          <div style={{ ...styles.modalContent, maxWidth: '95vw', minWidth: 'min(900px, 95vw)' }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeaderBar}>
              <h3 style={styles.modalTitle}>⚙️ Filter Kelas per Ruangan</h3>
            </div>
            <div style={styles.modalBody}>
              <p style={styles.filterHint}>Tentukan jenis kelas yang boleh menggunakan setiap ruangan. Kelas praktikum dipakai untuk pasangan teori-praktikum.</p>
              <div style={styles.filterTableWrap}>
                <table style={styles.filterTable}>
                  <thead>
                    <tr>
                      <th style={styles.filterTypeHeader}>Kode Ruang</th>
                      <th style={styles.filterClassHeader}>Jenis Kelas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((room) => (
                      <tr key={room.id}>
                        <td style={styles.filterTypeCell}>{room.f_koderuang || room.f_namaruang}</td>
                        <td style={styles.filterCell}>
                          <select style={styles.filterSelect} value={roomClassTypes[room.id] || 'semua'} onChange={(e) => setRoomClassTypes((previous) => ({ ...previous, [room.id]: e.target.value }))}>
                            <option value="biasa">Kelas biasa</option>
                            <option value="praktikum">Kelas praktikum</option>
                            <option value="tidak_ada">Tidak ada kelas</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={styles.modalActions}>
                <button style={styles.btnPrimary} onClick={handleSaveFilter}>💾 Simpan Filter</button>
                <button style={styles.btnSecondary} onClick={() => setShowFilterModal(false)}>Batal</button>
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
  tableHeaderActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    flexWrap: 'wrap',
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
  badgeCapacity: {
    backgroundColor: '#D7F0E1',
    color: '#146C39',
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
  filterHint: {
    margin: '0 0 1rem',
    color: '#8A96AD',
    fontSize: '0.85rem',
  },
  filterTableWrap: {
    overflowX: 'auto',
    maxHeight: '55vh',
    overflowY: 'auto',
    border: '1px solid #EEF1F8',
    borderRadius: '10px',
  },
  filterTable: {
    borderCollapse: 'collapse',
    minWidth: '900px',
    width: '100%',
  },
  filterTypeHeader: {
    position: 'sticky',
    left: 0,
    zIndex: 2,
    minWidth: '130px',
    padding: '0.75rem',
    textAlign: 'left',
    background: '#FAFBFF',
    border: '1px solid #EEF1F8',
    color: '#5B6A88',
  },
  filterClassHeader: {
    minWidth: '150px',
    maxWidth: '180px',
    padding: '0.75rem',
    background: '#FAFBFF',
    border: '1px solid #EEF1F8',
    color: '#5B6A88',
    fontSize: '0.75rem',
  },
  filterTypeCell: {
    position: 'sticky',
    left: 0,
    zIndex: 1,
    padding: '0.9rem',
    background: '#EAF7EF',
    border: '1px solid #EEF1F8',
    color: '#146C39',
    fontWeight: 700,
  },
  filterCell: {
    padding: '0.9rem',
    textAlign: 'center',
    border: '1px solid #EEF1F8',
  },
  filterSelect: {
    minWidth: '240px',
    padding: '0.65rem 0.8rem',
    borderRadius: '8px',
    border: '1px solid #E4E8F1',
    color: '#42506B',
    background: 'white',
    fontSize: '0.85rem',
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
  textarea: {
    padding: '0.7rem 0.9rem',
    borderRadius: '10px',
    border: '1.5px solid #E4E8F1',
    fontSize: '0.9rem',
    color: '#1E2A45',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    resize: 'vertical',
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