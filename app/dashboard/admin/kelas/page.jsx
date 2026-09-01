'use client';

import { useEffect, useState, Fragment } from 'react';

export default function KelasPage() {
  const [prodi, setProdi] = useState([]);
  const [matkul, setMatkul] = useState([]);
  const [selectedMatkul, setSelectedMatkul] = useState(null);
  const [kelasList, setKelasList] = useState([]);
  const [dosenList, setDosenList] = useState([]);
  const [kelasBaru, setKelasBaru] = useState([]);
  const [messagePopup, setMessagePopup] = useState({ show: false, type: '', text: '' });
  const [activeTab, setActiveTab] = useState('view');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [searchMatkul, setSearchMatkul] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingKelas, setEditingKelas] = useState(null);
  const [editingDosenSearch, setEditingDosenSearch] = useState('');
  const [showDosenDropdown, setShowDosenDropdown] = useState(false);
  const [searchKeywordView, setSearchKeywordView] = useState('');

  // Filter states
  const [tahunAjaranList, setTahunAjaranList] = useState([]);
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('');
  const [kurikulumMasterList, setKurikulumMasterList] = useState([]);
  const [selectedKodeKurikulum, setSelectedKodeKurikulum] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('gasal');
  const [selectedTahunKurikulum, setSelectedTahunKurikulum] = useState('');
  const [selectedKurikulumId, setSelectedKurikulumId] = useState('');

  // FETCH
  const fetchProdi = async () => {
    try {
      const res = await fetch('/api/kurikulum-master');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProdi(data);
    } catch (err) {
      showMessage('error', `Error loading prodi: ${err.message}`);
    }
  };

  const fetchMatkul = async (id) => {
    try {
      const res = await fetch(`/api/kurikulum?kurikulum_id=${id}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMatkul(data);
    } catch (err) {
      showMessage('error', `Error loading matkul: ${err.message}`);
    }
  };

  const fetchDosen = async (namaProdi) => {
    try {
      const res = await fetch(`/api/dosen?prodi=${encodeURIComponent(namaProdi)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setDosenList(data);
    } catch (err) {
      console.error('❌ Fetch dosen error:', err);
    }
  };

  const fetchKelasBaru = async () => {
    try {
      const res = await fetch('/api/kelas');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setKelasBaru(data);
    } catch (err) {
      console.error('❌ Fetch kelas error:', err);
    }
  };

  const fetchTahunAjaran = async () => {
    try {
      const res = await fetch('/api/tahun-ajaran');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTahunAjaranList(data);
    } catch (err) {
      console.error('❌ Fetch tahun ajaran error:', err);
    }
  };

  const fetchKurikulumMaster = async () => {
    try {
      const res = await fetch('/api/kurikulum-master');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setKurikulumMasterList(Array.isArray(data) ? data : []);
      setSelectedKodeKurikulum('');
      setSelectedTahunKurikulum('');
      setSelectedKurikulumId('');
    } catch (err) {
      console.error('❌ Fetch kurikulum master error:', err);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchProdi();
      await fetchKelasBaru();
      await fetchTahunAjaran();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showMessage = (type, text) => {
    setMessagePopup({ show: true, type, text });
  };

  const closeMessagePopup = () => {
    setMessagePopup({ show: false, type: '', text: '' });
  };

  // HANDLER
  const handleMatkul = (id) => {
    if (!id) {
      setKelasList([]);
      setSelectedMatkul(null);
      return;
    }

    const mk = matkul.find(m => m.id == id);
    setSelectedMatkul(mk);
    setSearchMatkul(`${mk.f_kodemk} - ${mk.f_namamk}`);
    setShowDropdown(false);

    const existingClasses = kelasBaru.filter(
      k => k.f_matkul_id === mk.id &&
           k.f_kurikulum === selectedKurikulumId
    );

    const formattedClasses = existingClasses.map(k => ({
      id: k.id,
      nama: k.nama_kelas,
      dosen: k.dosen || '',
      isExisting: true,
    }));

    setKelasList(formattedClasses);
  };

  const getNextClassName = () => {
    if (kelasList.length === 0) return 'A';

    const existingCodes = new Set(kelasList.map(k => k.nama.charCodeAt(0)));

    for (let code = 65; code <= 90; code++) {
      if (!existingCodes.has(code)) {
        return String.fromCharCode(code);
      }
    }

    return 'Z';
  };

  const tambahKelas = () => {
    const nextName = getNextClassName();
    setKelasList([...kelasList, {
      tempId: `${Date.now()}-${Math.random()}`,
      nama: nextName,
      dosen: '',
      isExisting: false
    }]);
  };

  const hapusKelas = (index) => {
    setKelasList(kelasList.filter((_, i) => i !== index));
  };

  const handleDosen = (index, val) => {
    const updated = [...kelasList];
    updated[index].dosen = val;
    setKelasList(updated);
  };

  const handleTahunAjaranChange = (tahunId) => {
    setSelectedTahunAjaran(tahunId);
    setSelectedKodeKurikulum('');
    setSelectedTahunKurikulum('');
    setSelectedSemester('gasal');
    setSelectedKurikulumId('');
    if (tahunId) {
      fetchKurikulumMaster(tahunId);
    }
  };

  const handleKodeKurikulumChange = (kode) => {
    setSelectedKodeKurikulum(kode);
    setSelectedTahunKurikulum('');
    setSelectedSemester('gasal');
    setSelectedKurikulumId('');
    setSelectedMatkul(null);
    setSearchMatkul('');
    setKelasList([]);
    if (kode) {
      const selected = kurikulumMasterList.find(k => k.kode_kurikulum === kode);
      if (selected) {
        setSelectedKurikulumId(selected.id);
        setSelectedTahunKurikulum(String(selected.tahun_kurikulum));
        fetchMatkul(selected.id);
        fetchDosen(selected.nama_kurikulum);
      }
    }
  };

  const handleSemesterChange = (sem) => {
    if (selectedSemester !== sem) {
      setSelectedSemester(sem);
    }
  };

  const handleSave = async () => {
    if (!selectedKurikulumId || !selectedMatkul) {
      return showMessage('error', 'Lengkapi pilihan Kode Kurikulum dan Mata Kuliah');
    }

    try {
      const newClasses = kelasList.filter(k => !k.isExisting).map(k => ({
        nama: k.nama,
        dosen: k.dosen,
      }));
      const existingClasses = kelasList.filter(k => k.isExisting);

      if (newClasses.length > 0) {
        const res = await fetch('/api/kelas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            f_kurikulum: selectedKurikulumId,
            f_matkul_id: selectedMatkul.id,
            kelasList: newClasses,
          }),
        });

        if (!res.ok) throw new Error('Gagal simpan kelas baru');
      }

      for (const kelas of existingClasses) {
        const res = await fetch('/api/kelas', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: kelas.id,
            dosen: kelas.dosen,
          }),
        });

        if (!res.ok) throw new Error(`Gagal update kelas ${kelas.nama}`);
      }

      showMessage('success', 'Berhasil simpan kelas');
      await fetchKelasBaru();
      setKelasList([]);
      setSelectedMatkul(null);
      setSearchMatkul('');
      setActiveTab('view');
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const handleDeleteKelas = async (index) => {
    const kelas = kelasList[index];

    if (kelas.isExisting) {
      if (!confirm('Hapus kelas ini secara permanen?')) return;

      try {
        const res = await fetch('/api/kelas', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: kelas.id }),
        });

        if (!res.ok) throw new Error('Gagal hapus');
        showMessage('success', 'Kelas berhasil dihapus');
        await fetchKelasBaru();
        setKelasList(kelasList.filter((_, i) => i !== index));
      } catch (err) {
        showMessage('error', err.message);
      }
    } else {
      hapusKelas(index);
    }
  };

  const handleEditKelas = (kelas) => {
    setEditingKelas({ ...kelas, isDetailOnly: true });
    setEditingDosenSearch('');
    setShowDosenDropdown(false);
    setShowEditModal(true);
  };

  const handleEditDosenChange = (val) => {
    setEditingKelas({ ...editingKelas, dosen: val });
    setEditingDosenSearch(val);
    setShowDosenDropdown(true);
  };

  const handleSelectDosenFromDropdown = (dosenName) => {
    setEditingKelas({ ...editingKelas, dosen: dosenName });
    setEditingDosenSearch('');
    setShowDosenDropdown(false);
  };

  const handleSaveEdit = async () => {
    if (!editingKelas || !editingKelas.id) return;

    try {
      const res = await fetch('/api/kelas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingKelas.id,
          dosen: editingKelas.dosen || null,
        }),
      });

      if (!res.ok) throw new Error('Gagal update kelas');
      showMessage('success', 'Kelas berhasil diupdate');
      await fetchKelasBaru();
      setShowEditModal(false);
      setEditingKelas(null);
      setEditingDosenSearch('');
      setShowDosenDropdown(false);
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const handleDeleteClassFromView = async (kelasId) => {
    if (!confirm('Hapus kelas ini secara permanen?')) return;

    try {
      const res = await fetch('/api/kelas', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: kelasId }),
      });

      if (!res.ok) throw new Error('Gagal hapus');
      showMessage('success', 'Kelas berhasil dihapus');
      await fetchKelasBaru();
    } catch (err) {
      showMessage('error', err.message);
    }
  };

  const toggleExpandGroup = (groupKey) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  // SORT
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key: null, direction: null };
      return { key, direction: 'asc' };
    });
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕';
    if (sortConfig.direction === 'asc') return '↑';
    if (sortConfig.direction === 'desc') return '↓';
    return '↕';
  };

  const filteredMatkul = matkul.filter(m => {
    const matchKeyword = m.f_kodemk.toLowerCase().includes(searchMatkul.toLowerCase()) ||
      m.f_namamk.toLowerCase().includes(searchMatkul.toLowerCase());

    if (activeTab === 'add' && selectedSemester) {
      const semesterNumbers = selectedSemester === 'gasal' ? [1, 3, 5, 7] : [2, 4, 6, 8];
      return matchKeyword && semesterNumbers.includes(m.f_semester);
    }

    return matchKeyword;
  });

  const getFilteredDataByMasterFilters = () => {
    let filtered = kelasBaru;

    if (selectedTahunAjaran) {
      filtered = filtered.filter(k => !k.f_tahun_ajaran || String(k.f_tahun_ajaran) === String(selectedTahunAjaran));
    }

    if (selectedKodeKurikulum) {
      filtered = filtered.filter(k => k.kode_kurikulum === selectedKodeKurikulum);
    }

    if (selectedSemester) {
      if (selectedSemester === 'gasal') {
        filtered = filtered.filter(k => k.f_semester && [1, 3, 5, 7].includes(parseInt(k.f_semester)));
      } else if (selectedSemester === 'genap') {
        filtered = filtered.filter(k => k.f_semester && [2, 4, 6, 8].includes(parseInt(k.f_semester)));
      }
    }

    if (selectedTahunKurikulum) {
      filtered = filtered.filter(k => String(k.tahun_kurikulum) === String(selectedTahunKurikulum));
    }

    return filtered;
  };

  const getGroupedFilteredData = () => {
    const grouped = {};
    const filteredData = getFilteredDataByMasterFilters();

    filteredData.forEach(k => {
      const key = `${k.f_matkul_id}||${k.f_kurikulum}||${k.f_kodemk}||${k.f_namamk}`;
      if (!grouped[key]) {
        grouped[key] = {
          f_kurikulum: k.f_kurikulum,
          f_matkul_id: k.f_matkul_id,
          f_kodemk: k.f_kodemk,
          f_namamk: k.f_namamk,
          f_sks_kurikulum: k.f_sks_kurikulum || '-',
          f_semester: k.f_semester || '-',
          classes: []
        };
      }
      grouped[key].classes.push(k);
    });

    return Object.values(grouped);
  };

  const getFilteredAndGroupedData = () => {
    const prodiMap = {};
    prodi.forEach(p => {
      prodiMap[p.id] = p.nama_kurikulum;
    });

    let filtered = kelasBaru;

    if (selectedTahunAjaran) {
      filtered = filtered.filter(k => !k.f_tahun_ajaran || String(k.f_tahun_ajaran) === String(selectedTahunAjaran));
    }

    if (selectedKodeKurikulum) {
      filtered = filtered.filter(k => k.kode_kurikulum === selectedKodeKurikulum);
    }

    if (selectedSemester) {
      if (selectedSemester === 'gasal') {
        filtered = filtered.filter(k => k.f_semester && [1, 3, 5, 7].includes(parseInt(k.f_semester)));
      } else if (selectedSemester === 'genap') {
        filtered = filtered.filter(k => k.f_semester && [2, 4, 6, 8].includes(parseInt(k.f_semester)));
      }
    }

    if (selectedTahunKurikulum) {
      filtered = filtered.filter(k => String(k.tahun_kurikulum) === String(selectedTahunKurikulum));
    }

    if (searchKeywordView.trim()) {
      const keyword = searchKeywordView.toLowerCase();
      filtered = filtered.filter(k => {
        const prodiName = prodiMap[k.f_kurikulum] || '';

        return (
          k.f_kodemk.toLowerCase().includes(keyword) ||
          k.f_namamk.toLowerCase().includes(keyword) ||
          prodiName.toLowerCase().includes(keyword) ||
          k.nama_kelas.toLowerCase().includes(keyword) ||
          (k.dosen && k.dosen.toLowerCase().includes(keyword)) ||
          (k.f_namapegawai && k.f_namapegawai.toLowerCase().includes(keyword)) ||
          (k.display_name && k.display_name.toLowerCase().includes(keyword)) ||
          (k.f_sks_kurikulum && k.f_sks_kurikulum.toString().includes(keyword)) ||
          (k.f_semester && k.f_semester.toString().includes(keyword))
        );
      });
    }

    const grouped = {};
    filtered.forEach(k => {
      const key = `${k.f_matkul_id}||${k.f_kurikulum}||${k.f_kodemk}||${k.f_namamk}`;
      if (!grouped[key]) {
        grouped[key] = {
          f_kurikulum: k.f_kurikulum,
          f_matkul_id: k.f_matkul_id,
          f_kodemk: k.f_kodemk,
          f_namamk: k.f_namamk,
          f_sks_kurikulum: k.f_sks_kurikulum || '-',
          f_semester: k.f_semester || '-',
          classes: []
        };
      }
      grouped[key].classes.push(k);
    });

    return Object.values(grouped);
  };

  // Dashboard summary stats (Edumy-style stat widgets)
  const totalMatkul = getGroupedFilteredData().length;
  const totalKelas = getFilteredDataByMasterFilters().length;
  const totalDosenTerisi = new Set(getFilteredDataByMasterFilters().map((k) => k.dosen).filter(Boolean)).size;
  const totalBelumDosen = getFilteredDataByMasterFilters().filter((k) => !k.dosen).length;

  // Add hover styles + font import on client side only (same approach as DosenPage)
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

  // UI
  return (
    <div style={styles.container}>
      <div style={styles.pageWrap}>

        {/* Edumy-style breadcrumb / page header */}
        <div style={styles.pageHeader}>
          <div>
            <div style={styles.breadcrumb}>Dashboard <span style={styles.breadcrumbSep}>/</span> Manajemen Akademik <span style={styles.breadcrumbSep}>/</span> <span style={styles.breadcrumbActive}>Kelas</span></div>
            <h1 style={styles.title}>Dashboard KRS Matakuliah</h1>
            <p style={styles.subtitle}>Kelola kelas, penempatan dosen, dan preferensi jadwal per mata kuliah.</p>
          </div>
          <div style={styles.headerIconWrap}>
            <span style={styles.headerIcon}>📚</span>
          </div>
        </div>

        {/* Stat widgets */}
        <div style={styles.statsRow}>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#E3F5EA', color: '#1B7A43' }}>📖</div>
            <div>
              <div style={styles.statNumber}>{totalMatkul}</div>
              <div style={styles.statLabel}>Mata Kuliah</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#D7F0E1', color: '#146C39' }}>🏷️</div>
            <div>
              <div style={styles.statNumber}>{totalKelas}</div>
              <div style={styles.statLabel}>Total Kelas</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#E4F7F0', color: '#12B886' }}>👤</div>
            <div>
              <div style={styles.statNumber}>{totalDosenTerisi}</div>
              <div style={styles.statLabel}>Dosen Terisi</div>
            </div>
          </div>
          <div style={styles.statCard}>
            <div style={{ ...styles.statIcon, background: '#FDE8F1', color: '#E0448A' }}>⚠️</div>
            <div>
              <div style={styles.statNumber}>{totalBelumDosen}</div>
              <div style={styles.statLabel}>Belum Ada Dosen</div>
            </div>
          </div>
        </div>

        <div style={styles.card}>

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

          {/* Master Filter: Tahun Ajaran */}
          <div style={styles.masterFilter}>
            <label style={styles.filterLabel}>📅 Tahun Ajaran</label>
            <select
              value={selectedTahunAjaran}
              onChange={(e) => handleTahunAjaranChange(e.target.value)}
              style={styles.select}
            >
              <option value="">-- Pilih Tahun Ajaran --</option>
              {tahunAjaranList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tahun_ajaran}
                </option>
              ))}
            </select>
          </div>

          {/* Subfilters: Kurikulum, Semester & Tahun Kurikulum */}
          {selectedTahunAjaran && (
            <div style={styles.subFilters}>
              <div>
                <label style={styles.filterLabel}>📖 Kurikulum</label>
                <select
                  value={selectedKodeKurikulum}
                  onChange={(e) => handleKodeKurikulumChange(e.target.value)}
                  style={styles.select}
                >
                  <option value="">-- Pilih Kurikulum --</option>
                  {[...new Set(kurikulumMasterList.map(k => k.kode_kurikulum))].map((kode) => (
                    <option key={kode} value={kode}>
                      {kode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.filterLabel}>📚 Semester</label>
                <div style={styles.semesterToggleGroup}>
                  <button
                    style={{
                      ...styles.toggleButton,
                      ...(selectedSemester === 'gasal' ? styles.toggleButtonActive : styles.toggleButtonInactive),
                    }}
                    onClick={() => handleSemesterChange('gasal')}
                  >
                    Gasal (1,3,5,7)
                  </button>
                  <button
                    style={{
                      ...styles.toggleButton,
                      ...(selectedSemester === 'genap' ? styles.toggleButtonActive : styles.toggleButtonInactive),
                    }}
                    onClick={() => handleSemesterChange('genap')}
                  >
                    Genap (2,4,6,8)
                  </button>
                </div>
              </div>

              <div>
                <label style={styles.filterLabel}>📆 Tahun Kurikulum</label>
                <select
                  value={selectedTahunKurikulum}
                  onChange={(e) => setSelectedTahunKurikulum(e.target.value)}
                  style={styles.select}
                  disabled={!selectedKodeKurikulum}
                >
                  <option value="">-- Pilih Tahun Kurikulum --</option>
                  {selectedKodeKurikulum && selectedKurikulumId && (
                    <option value={selectedTahunKurikulum || kurikulumMasterList.find(k => k.id === selectedKurikulumId)?.tahun_kurikulum || ''}>
                      {kurikulumMasterList.find(k => k.id === selectedKurikulumId)?.tahun_kurikulum || ''}
                    </option>
                  )}
                </select>
              </div>
            </div>
          )}

          {/* Toolbar / tab navigation */}
          <div style={styles.toolbar}>
            <div style={styles.toolbarLeft}>
              <button
                style={activeTab === 'view' ? styles.btnPrimary : styles.btnOutlineTeal}
                onClick={() => setActiveTab('view')}
              >
                📋 Lihat Data Kelas
              </button>
              <button
                style={activeTab === 'add' ? styles.btnPrimary : styles.btnOutlineTeal}
                onClick={() => setActiveTab('add')}
              >
                ➕ Tambah Matakuliah
              </button>
            </div>
          </div>

          {/* ==================== TAB 1: LIHAT KELAS ==================== */}
          {activeTab === 'view' && (
            <div style={styles.tableWrapper}>
              <div style={styles.tableHeader}>
                <h2 style={styles.tableTitle}>📋 Daftar Kelas yang Tersimpan</h2>
                <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
                  <span style={styles.badgeCount}>Total: {kelasBaru.length} kelas</span>
                  <button style={styles.btnOutlineTeal} onClick={() => fetchKelasBaru()}>
                    🔄 Refresh Data
                  </button>
                </div>
              </div>

              {!selectedTahunAjaran || !selectedKodeKurikulum || !selectedTahunKurikulum ? (
                <div style={styles.emptyState}>
                  <span style={styles.emptyIcon}>📭</span>
                  <p style={{ margin: 0, fontWeight: 600, color: '#42506B' }}>Filter belum lengkap</p>
                  <small style={{ color: '#8A96AD' }}>
                    Silakan pilih <strong>Tahun Ajaran</strong>, <strong>Kode Kurikulum</strong>, dan <strong>Tahun Kurikulum</strong> untuk menampilkan daftar kelas
                  </small>
                </div>
              ) : (
                <div>
                  {/* Search Filter */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <input
                      type="text"
                      value={searchKeywordView}
                      onChange={(e) => setSearchKeywordView(e.target.value)}
                      placeholder="🔍 Cari kelas (Program Studi, Kode MK, Nama, Dosen, SKS, Semester...)..."
                      style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                    />
                    {searchKeywordView && (
                      <p style={{ fontSize: '0.85rem', color: '#8A96AD', marginTop: '0.5rem' }}>
                        Menampilkan hasil untuk: <strong>&quot;{searchKeywordView}&quot;</strong>
                      </p>
                    )}
                  </div>

                  {kelasBaru.length === 0 ? (
                    <div style={styles.emptyState}>
                      <span style={styles.emptyIcon}>📭</span>
                      <p style={{ margin: 0, fontWeight: 600, color: '#42506B' }}>Belum ada kelas yang tersimpan</p>
                      <button style={{ ...styles.btnPrimary, marginTop: '1rem' }} onClick={() => setActiveTab('add')}>
                        ➕ Buat Kelas
                      </button>
                    </div>
                  ) : (
                    <div style={styles.tableContainer}>
                      <table style={styles.table}>
                        <thead>
                          <tr style={styles.tableHeaderRow}>
                            <th style={{ ...styles.th, width: '50px' }}></th>
                            <th style={styles.th} onClick={() => handleSort('f_kurikulum')}>
                              Program Studi <span style={styles.sortIcon}>{renderSortIcon('f_kurikulum')}</span>
                            </th>
                            <th style={styles.th} onClick={() => handleSort('f_kodemk')}>
                              Kode MK <span style={styles.sortIcon}>{renderSortIcon('f_kodemk')}</span>
                            </th>
                            <th style={styles.th} onClick={() => handleSort('f_namamk')}>
                              Mata Kuliah <span style={styles.sortIcon}>{renderSortIcon('f_namamk')}</span>
                            </th>
                            <th style={styles.th} onClick={() => handleSort('f_sks_kurikulum')}>
                              SKS <span style={styles.sortIcon}>{renderSortIcon('f_sks_kurikulum')}</span>
                            </th>
                            <th style={styles.th} onClick={() => handleSort('f_semester')}>
                              Semester <span style={styles.sortIcon}>{renderSortIcon('f_semester')}</span>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(searchKeywordView ? getFilteredAndGroupedData() : getGroupedFilteredData()).map((group) => {
                            const prodiName = prodi.find(p => p.id === group.f_kurikulum)?.nama_kurikulum || '-';
                            const groupKey = `${group.f_matkul_id}||${group.f_kurikulum}||${group.f_kodemk}||${group.f_namamk}`;
                            const isExpanded = expandedGroups[groupKey];

                            return (
                              <Fragment key={groupKey}>
                                <tr className="edumy-row" style={styles.tableRow}>
                                  <td style={{ ...styles.td, textAlign: 'center' }}>
                                    <button
                                      style={styles.btnExpand}
                                      onClick={() => toggleExpandGroup(groupKey)}
                                      title={isExpanded ? 'Sembunyikan kelas' : 'Tampilkan kelas'}
                                    >
                                      {isExpanded ? '▼' : '▶'}
                                    </button>
                                  </td>
                                  <td style={styles.td}>{prodiName}</td>
                                  <td style={styles.td}>
                                    <span style={styles.badgeCode}>{group.f_kodemk}</span>
                                  </td>
                                  <td style={styles.td}>
                                    <strong style={{ color: '#2B3654' }}>{group.f_namamk}</strong>
                                    <span style={styles.classBadge}>{group.classes.length} kelas</span>
                                  </td>
                                  <td style={styles.td}>
                                    <span style={styles.badgeSks}>{group.f_sks_kurikulum} SKS</span>
                                  </td>
                                  <td style={styles.td}>
                                    <span style={styles.badgeSemester}>Semester {group.f_semester}</span>
                                  </td>
                                </tr>

                                {isExpanded && (
                                  <tr>
                                    <td colSpan="6" style={{ ...styles.td, padding: '1.5rem', background: '#EAF7EF' }}>
                                      <div style={styles.expandedContent}>
                                        <h3 style={styles.expandedTitle}>📚 Detail Kelas ({group.classes.length})</h3>

                                        <div style={styles.classesTable}>
                                          <div style={styles.classesTableHeader}>
                                            <div style={{ ...styles.classesTableCell, fontWeight: '700', flex: '0 0 150px' }}>Kelas</div>
                                            <div style={{ ...styles.classesTableCell, fontWeight: '700', flex: 1 }}>Dosen</div>
                                            <div style={{ ...styles.classesTableCell, fontWeight: '700', flex: '0 0 150px', textAlign: 'center' }}>Aksi</div>
                                          </div>

                                          {group.classes
                                            .sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas))
                                            .map((kelas, kelasIdx) => (
                                              <Fragment key={`${kelas.id || 'new'}-${kelas.nama_kelas}-${kelasIdx}`}>
                                                <div style={styles.classesTableRow}>
                                                  <div style={{ ...styles.classesTableCell, flex: '0 0 150px' }}>
                                                    <span style={styles.badgeKelas}>{kelas.nama_kelas}</span>
                                                  </div>
                                                  <div style={{ ...styles.classesTableCell, flex: 1 }}>
                                                    {kelas.dosen || <span style={{ color: '#B7BEC9' }}>-</span>}
                                                  </div>
                                                  <div style={{ ...styles.classesTableCell, flex: '0 0 150px', textAlign: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                                    <button
                                                      style={styles.btnIconInfo}
                                                      onClick={() => handleEditKelas(kelas)}
                                                      title="Lihat detail kelas"
                                                    >
                                                      📋
                                                    </button>
                                                    <button
                                                      style={styles.btnIconDanger}
                                                      onClick={() => handleDeleteClassFromView(kelas.id)}
                                                      title="Hapus kelas"
                                                    >
                                                      🗑️
                                                    </button>
                                                  </div>
                                                </div>

                                                {(kelas.prefer_lantai || kelas.prefer_hari || kelas.avoid_hari || kelas.prefer_jam_mulai || kelas.prefer_jam_selesai) && (
                                                  <div style={{ ...styles.classesTableRow, backgroundColor: '#FAFBFF', fontSize: '0.85rem' }}>
                                                    <div style={{ ...styles.classesTableCell, flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                                                      <div>
                                                        <span style={{ color: '#8A96AD', fontWeight: '500' }}>Lantai:</span>
                                                        <p style={{ margin: '0.25rem 0 0 0', color: kelas.prefer_lantai ? '#1E2A45' : '#B7BEC9' }}>
                                                          {kelas.prefer_lantai || '—'}
                                                        </p>
                                                      </div>
                                                      <div>
                                                        <span style={{ color: '#8A96AD', fontWeight: '500' }}>Hari:</span>
                                                        <p style={{ margin: '0.25rem 0 0 0', color: kelas.prefer_hari ? '#1E2A45' : '#B7BEC9' }}>
                                                          {kelas.prefer_hari || '—'}
                                                        </p>
                                                      </div>
                                                      <div>
                                                        <span style={{ color: '#8A96AD', fontWeight: '500' }}>Hindari:</span>
                                                        <p style={{ margin: '0.25rem 0 0 0', color: kelas.avoid_hari ? '#1E2A45' : '#B7BEC9' }}>
                                                          {kelas.avoid_hari || '—'}
                                                        </p>
                                                      </div>
                                                      <div>
                                                        <span style={{ color: '#8A96AD', fontWeight: '500' }}>Jam Mulai:</span>
                                                        <p style={{ margin: '0.25rem 0 0 0', color: kelas.prefer_jam_mulai ? '#1E2A45' : '#B7BEC9' }}>
                                                          {kelas.prefer_jam_mulai || '—'}
                                                        </p>
                                                      </div>
                                                      <div>
                                                        <span style={{ color: '#8A96AD', fontWeight: '500' }}>Jam Selesai:</span>
                                                        <p style={{ margin: '0.25rem 0 0 0', color: kelas.prefer_jam_selesai ? '#1E2A45' : '#B7BEC9' }}>
                                                          {kelas.prefer_jam_selesai || '—'}
                                                        </p>
                                                      </div>
                                                    </div>
                                                  </div>
                                                )}
                                              </Fragment>
                                            ))}
                                        </div>

                                        <button
                                          style={{ ...styles.btnPrimarySmall, width: '100%', marginTop: '0.75rem' }}
                                          onClick={() => {
                                            const matkulRef = group.classes[0];
                                            const mkData = {
                                              id: matkulRef.f_matkul_id,
                                              f_kodemk: matkulRef.f_kodemk,
                                              f_namamk: matkulRef.f_namamk,
                                              f_sks_kurikulum: matkulRef.f_sks_kurikulum,
                                              f_semester: matkulRef.f_semester,
                                            };
                                            setSelectedMatkul(mkData);
                                            setSearchMatkul(`${mkData.f_kodemk} - ${mkData.f_namamk}`);
                                            setKelasList(group.classes.map(k => ({
                                              id: k.id,
                                              nama: k.nama_kelas,
                                              dosen: k.dosen || '',
                                              isExisting: true,
                                            })));
                                            setActiveTab('add');
                                          }}
                                        >
                                          ✏️ Edit Kelas
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {searchKeywordView && getFilteredAndGroupedData().length === 0 && (
                    <div style={{ ...styles.emptyState, marginTop: '1rem' }}>
                      <span style={styles.emptyIcon}>🔍</span>
                      <p style={{ margin: 0, fontWeight: 600, color: '#42506B' }}>Tidak ada kelas yang cocok</p>
                      <small style={{ color: '#8A96AD' }}>
                        Tidak menemukan kelas dengan keyword: <strong>&quot;{searchKeywordView}&quot;</strong>
                      </small>
                      <div>
                        <button
                          style={{ ...styles.btnSecondary, marginTop: '1rem' }}
                          onClick={() => setSearchKeywordView('')}
                        >
                          ❌ Hapus Filter
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 2: KELOLA KELAS ==================== */}
          {activeTab === 'add' && (
            <div style={styles.tableWrapper}>
              {selectedTahunAjaran && selectedKodeKurikulum ? (
                <div style={styles.noticeInfo}>
                  ℹ️ Menampilkan mata kuliah untuk semester <strong>{selectedSemester === 'gasal' ? 'GASAL (1,3,5,7)' : 'GENAP (2,4,6,8)'}</strong>
                </div>
              ) : (
                <div style={styles.noticeWarning}>
                  ⚠️ Silakan pilih filter <strong>Tahun Ajaran</strong> dan <strong>Kode Kurikulum</strong> di atas untuk menambahkan kelas
                </div>
              )}

              <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                <label style={styles.label}>Mata Kuliah</label>
                <input
                  type="text"
                  placeholder="Cari kode atau nama MK..."
                  value={searchMatkul}
                  onChange={(e) => {
                    setSearchMatkul(e.target.value);
                    setShowDropdown(true);
                    if (e.target.value === '') {
                      setSelectedMatkul(null);
                      setKelasList([]);
                    }
                  }}
                  onFocus={() => setShowDropdown(true)}
                  style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                />

                {showDropdown && searchMatkul && filteredMatkul.length > 0 && (
                  <div style={styles.dropdown}>
                    {filteredMatkul.map(m => (
                      <div
                        key={m.id}
                        onClick={() => handleMatkul(m.id)}
                        style={{
                          ...styles.dropdownItem,
                          ...(selectedMatkul?.id === m.id ? styles.dropdownItemActive : {}),
                        }}
                      >
                        <div style={styles.dropdownTitle}>{m.f_kodemk}</div>
                        <div style={styles.dropdownSubtitle}>{m.f_namamk}</div>
                        <div style={styles.dropdownDetail}>SKS: {m.f_sks_kurikulum} | Semester: {m.f_semester}</div>
                      </div>
                    ))}
                  </div>
                )}

                {showDropdown && searchMatkul && filteredMatkul.length === 0 && (
                  <div style={styles.dropdownEmpty}>
                    Tidak ada mata kuliah yang cocok
                  </div>
                )}
              </div>

              {selectedMatkul && (
                <div style={styles.selectedInfo}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div>
                      <p style={{ margin: '0 0 0.4rem 0' }}><strong>📖 Mata Kuliah:</strong> {selectedMatkul.f_namamk}</p>
                      <p style={{ margin: 0 }}><strong>🔢 Kode:</strong> {selectedMatkul.f_kodemk}</p>
                    </div>
                    <div>
                      <p style={{ margin: '0 0 0.4rem 0' }}><strong>📊 SKS:</strong> <span style={styles.infoBadge}>{selectedMatkul.f_sks_kurikulum} SKS</span></p>
                      <p style={{ margin: 0 }}><strong>📅 Semester:</strong> <span style={styles.infoBadge}>Semester {selectedMatkul.f_semester}</span></p>
                    </div>
                  </div>
                </div>
              )}

              {selectedMatkul && (
                <>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <button style={styles.btnPrimary} onClick={tambahKelas}>
                      ➕ Tambah Kelas ({getNextClassName()})
                    </button>
                  </div>

                  {kelasList.length === 0 ? (
                    <div style={styles.emptyState}>
                      <span style={styles.emptyIcon}>📭</span>
                      <p style={{ margin: 0, fontWeight: 600, color: '#42506B' }}>Belum ada kelas</p>
                      <small style={{ color: '#8A96AD' }}>Klik &quot;➕ Tambah Kelas&quot; untuk menambahkan.</small>
                    </div>
                  ) : (
                    <div style={styles.tableContainer}>
                      <table style={styles.table}>
                        <thead>
                          <tr style={styles.tableHeaderRow}>
                            <th style={styles.th}>Kelas</th>
                            <th style={styles.th}>Dosen</th>
                            <th style={{ ...styles.thAksi, width: '80px' }}>Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kelasList.map((k, idx) => (
                            <tr key={`${k.id || k.tempId}-${k.nama}-${idx}`} className="edumy-row" style={styles.tableRow}>
                              <td style={styles.td}>
                                <span style={styles.badgeKelas}>{k.nama}</span>
                              </td>
                              <td style={styles.td}>
                                <input
                                  list={`dosen-list-${idx}`}
                                  value={k.dosen}
                                  onChange={(e) => handleDosen(idx, e.target.value)}
                                  placeholder="Ketik atau pilih dosen..."
                                  style={{ ...styles.input, width: '100%', boxSizing: 'border-box' }}
                                />
                                <datalist id={`dosen-list-${idx}`}>
                                  {dosenList.map((d) => (
                                    <option key={d.id} value={d.f_namapegawai} />
                                  ))}
                                </datalist>
                              </td>
                              <td style={{ ...styles.tdAksi }}>
                                <button
                                  style={styles.btnIconDanger}
                                  onClick={() => handleDeleteKelas(idx)}
                                  title="Hapus"
                                >
                                  🗑️
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {kelasList.length > 0 && (
                    <button onClick={handleSave} style={{ ...styles.btnPrimary, marginTop: '1.25rem', width: '100%', padding: '0.85rem 1.35rem', fontSize: '0.95rem' }}>
                      💾 Simpan Semua Kelas
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ==================== MODAL EDIT/DETAIL KELAS ==================== */}
          {showEditModal && editingKelas && (
            <div style={styles.modal} onClick={() => { setShowEditModal(false); setEditingKelas(null); setEditingDosenSearch(''); setShowDosenDropdown(false); }}>
              <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div style={styles.modalHeaderBar}>
                  <h3 style={styles.modalTitle}>{editingKelas.isDetailOnly ? '📋 Detail Kelas' : '✏️ Edit Kelas'}</h3>
                </div>

                <div style={styles.modalBody}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={styles.label}>Nama Kelas</label>
                    <input
                      type="text"
                      value={editingKelas.nama_kelas || ''}
                      disabled
                      style={{ ...styles.input, width: '100%', boxSizing: 'border-box', backgroundColor: '#F3F5FA', cursor: 'not-allowed' }}
                    />
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={styles.label}>Mata Kuliah</label>
                    <input
                      type="text"
                      value={editingKelas.f_namamk || ''}
                      disabled
                      style={{ ...styles.input, width: '100%', boxSizing: 'border-box', backgroundColor: '#F3F5FA', cursor: 'not-allowed' }}
                    />
                  </div>

                  <div style={{ marginBottom: '1.25rem', position: 'relative' }}>
                    <label style={styles.label}>Dosen</label>
                    <input
                      type="text"
                      value={editingKelas.dosen || ''}
                      onChange={editingKelas.isDetailOnly ? undefined : (e) => handleEditDosenChange(e.target.value)}
                      onFocus={editingKelas.isDetailOnly ? undefined : () => setShowDosenDropdown(true)}
                      onBlur={editingKelas.isDetailOnly ? undefined : () => setTimeout(() => setShowDosenDropdown(false), 200)}
                      placeholder="Ketik atau pilih dosen..."
                      disabled={editingKelas.isDetailOnly}
                      style={{
                        ...styles.input,
                        width: '100%',
                        boxSizing: 'border-box',
                        backgroundColor: editingKelas.isDetailOnly ? '#F3F5FA' : undefined,
                        cursor: editingKelas.isDetailOnly ? 'not-allowed' : 'text',
                      }}
                    />

                    {!editingKelas.isDetailOnly && showDosenDropdown && (
                      <div style={styles.dosenDropdownModal}>
                        {dosenList
                          .filter(d => d.f_namapegawai.toLowerCase().includes(editingDosenSearch.toLowerCase()))
                          .map((d) => (
                            <div
                              key={d.id}
                              onClick={() => handleSelectDosenFromDropdown(d.f_namapegawai)}
                              style={styles.dropdownItem}
                              title={d.f_namapegawai}
                            >
                              <div style={styles.dropdownTitle}>{d.f_namapegawai}</div>
                              {d.f_title_depan && (
                                <div style={styles.dropdownSubtitle}>
                                  {d.f_title_depan} {d.f_title_belakang || ''}
                                </div>
                              )}
                            </div>
                          ))}
                        {dosenList.filter(d => d.f_namapegawai.toLowerCase().includes(editingDosenSearch.toLowerCase())).length === 0 && (
                          <div style={{ ...styles.dropdownItem, textAlign: 'center', color: '#B7BEC9' }}>
                            Tidak ada dosen yang cocok
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={styles.label}>Display Name</label>
                    <input
                      type="text"
                      value={editingKelas.display_name || ''}
                      disabled
                      style={{ ...styles.input, width: '100%', boxSizing: 'border-box', backgroundColor: '#F3F5FA', cursor: 'not-allowed' }}
                    />
                  </div>

                  {editingKelas.dosen && (
                    <div style={styles.presetInfo}>
                      <strong>⚙️ Preferensi Dosen</strong>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                        <div>
                          <span style={{ color: '#146C39', fontWeight: '500' }}>Lantai:</span>
                          <p style={{ margin: '0.25rem 0 0 0', color: '#12592F' }}>{editingKelas.prefer_lantai || '—'}</p>
                        </div>
                        <div>
                          <span style={{ color: '#146C39', fontWeight: '500' }}>Hari Diinginkan:</span>
                          <p style={{ margin: '0.25rem 0 0 0', color: '#12592F' }}>{editingKelas.prefer_hari || '—'}</p>
                        </div>
                        <div>
                          <span style={{ color: '#146C39', fontWeight: '500' }}>Hari Dihindari:</span>
                          <p style={{ margin: '0.25rem 0 0 0', color: '#12592F' }}>{editingKelas.avoid_hari || '—'}</p>
                        </div>
                        <div>
                          <span style={{ color: '#146C39', fontWeight: '500' }}>Jam Mulai:</span>
                          <p style={{ margin: '0.25rem 0 0 0', color: '#12592F' }}>{editingKelas.prefer_jam_mulai || '—'}</p>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <span style={{ color: '#146C39', fontWeight: '500' }}>Jam Selesai:</span>
                          <p style={{ margin: '0.25rem 0 0 0', color: '#12592F' }}>{editingKelas.prefer_jam_selesai || '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={styles.modalActions}>
                    <button
                      style={styles.btnSecondary}
                      onClick={() => { setShowEditModal(false); setEditingKelas(null); setEditingDosenSearch(''); setShowDosenDropdown(false); }}
                    >
                      {editingKelas.isDetailOnly ? '✕ Tutup' : '❌ Batal'}
                    </button>
                    {!editingKelas.isDetailOnly && (
                      <button style={styles.btnPrimary} onClick={handleSaveEdit}>
                        💾 Simpan Perubahan
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
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

  // ── Master filter strip ───────────────────────────────────
  masterFilter: {
    marginBottom: '1.25rem',
    padding: '1.1rem 1.25rem',
    backgroundColor: '#EAF7EF',
    borderRadius: '14px',
    borderLeft: '4px solid #1B7A43',
  },
  filterLabel: {
    display: 'block',
    marginBottom: '0.6rem',
    fontWeight: '600',
    color: '#12592F',
    fontSize: '0.85rem',
  },

  // ── Sub-filters grid ──────────────────────────────────────
  subFilters: {
    marginBottom: '1.25rem',
    padding: '1.1rem 1.25rem',
    backgroundColor: '#FAFBFF',
    borderRadius: '14px',
    border: '1px solid #EEF1F8',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
  },

  // ── Semester toggle buttons ───────────────────────────────
  semesterToggleGroup: {
    display: 'flex',
    gap: '0.6rem',
    marginBottom: '0.5rem',
  },
  toggleButton: {
    flex: 1,
    padding: '0.6rem 1rem',
    borderRadius: '10px',
    border: '1.5px solid #E4E8F1',
    fontSize: '0.82rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  toggleButtonActive: {
    background: 'linear-gradient(135deg, #3FA96B, #1B7A43)',
    color: 'white',
    borderColor: '#1B7A43',
    boxShadow: '0 4px 14px rgba(27,122,67,0.3)',
  },
  toggleButtonInactive: {
    backgroundColor: 'white',
    color: '#5B6A88',
    borderColor: '#E4E8F1',
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

  // ── Inputs ─────────────────────────────────────────────────
  input: {
    padding: '0.7rem 0.9rem',
    borderRadius: '10px',
    border: '1.5px solid #E4E8F1',
    fontSize: '0.9rem',
    color: '#1E2A45',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
  },
  select: {
    padding: '0.7rem 0.9rem',
    borderRadius: '10px',
    border: '1.5px solid #E4E8F1',
    fontSize: '0.875rem',
    backgroundColor: '#FFFFFF',
    cursor: 'pointer',
    width: '100%',
    transition: 'border-color 0.2s',
    color: '#1E2A45',
    outline: 'none',
    boxSizing: 'border-box',
  },
  label: {
    display: 'block',
    marginBottom: '0.45rem',
    fontWeight: '600',
    color: '#5B6A88',
    fontSize: '0.78rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },

  // ── Dropdown panel ────────────────────────────────────────
  dropdown: {
    maxHeight: '250px',
    overflowY: 'auto',
    border: '1.5px solid #E4E8F1',
    borderTop: 'none',
    borderRadius: '0 0 10px 10px',
    backgroundColor: 'white',
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    boxShadow: '0 10px 24px rgba(30,42,69,0.12)',
  },
  dropdownItem: {
    padding: '0.75rem 1rem',
    borderBottom: '1px solid #F3F5FA',
    cursor: 'pointer',
    backgroundColor: 'white',
    transition: 'background-color 0.15s',
  },
  dropdownItemActive: {
    backgroundColor: '#EAF7EF',
  },
  dropdownTitle: {
    fontWeight: '700',
    color: '#146C39',
    fontSize: '0.875rem',
  },
  dropdownSubtitle: {
    fontSize: '0.825rem',
    color: '#42506B',
    marginTop: '0.2rem',
  },
  dropdownDetail: {
    fontSize: '0.75rem',
    color: '#8A96AD',
    marginTop: '0.2rem',
  },
  dropdownEmpty: {
    padding: '1rem',
    border: '1.5px solid #E4E8F1',
    borderTop: 'none',
    borderRadius: '0 0 10px 10px',
    color: '#8A96AD',
    textAlign: 'center',
    fontSize: '0.875rem',
  },

  // ── Notice boxes (info / warning) ─────────────────────────
  noticeInfo: {
    padding: '0.85rem 1.1rem',
    marginBottom: '1.5rem',
    backgroundColor: '#E4F7F0',
    borderLeft: '4px solid #12B886',
    borderRadius: '10px',
    fontSize: '0.9rem',
    color: '#0E9B6E',
  },
  noticeWarning: {
    padding: '0.9rem 1.1rem',
    marginBottom: '1.5rem',
    backgroundColor: '#EAF7EF',
    borderLeft: '4px solid #1B7A43',
    borderRadius: '10px',
    fontSize: '0.9rem',
    color: '#12592F',
  },

  // ── Selected item info bar ────────────────────────────────
  selectedInfo: {
    backgroundColor: '#EAF7EF',
    padding: '1rem 1.25rem',
    borderRadius: '14px',
    marginBottom: '1.5rem',
    borderLeft: '4px solid #1B7A43',
    color: '#1E2A45',
  },
  infoBadge: {
    background: 'linear-gradient(135deg, #3FA96B, #1B7A43)',
    color: 'white',
    padding: '0.25rem 0.85rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
    letterSpacing: '0.02em',
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
    gap: '0.75rem',
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

  // ── Table ──────────────────────────────────────────────────
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '14px',
    border: '1px solid #EEF1F8',
    marginBottom: '1rem',
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
  thAksi: {
    padding: '0.85rem 1rem',
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
    backgroundColor: '#E4F7F0',
    color: '#0E9B6E',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '700',
    display: 'inline-block',
  },
  badgeSemester: {
    backgroundColor: '#D7F0E1',
    color: '#146C39',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '700',
    display: 'inline-block',
  },
  classBadge: {
    marginLeft: '0.65rem',
    backgroundColor: '#D7F0E1',
    color: '#146C39',
    padding: '0.15rem 0.65rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: '600',
    display: 'inline-block',
  },
  badgeKelas: {
    background: 'linear-gradient(135deg, #3FA96B, #1B7A43)',
    color: 'white',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    fontWeight: '600',
    display: 'inline-block',
  },

  // ── Row action icon-buttons ────────────────────────────────
  btnExpand: {
    background: '#D7F0E1',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.85rem',
    padding: '0.3rem 0.5rem',
    color: '#146C39',
    fontWeight: '700',
    transition: 'background 0.2s',
    width: '30px',
    height: '30px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '10px',
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

  // ── Expanded kelas sub-table ──────────────────────────────
  expandedContent: {
    padding: '0.5rem',
  },
  expandedTitle: {
    margin: '0 0 0.75rem 0',
    fontSize: '0.95rem',
    fontWeight: '700',
    color: '#146C39',
    fontFamily: "'Poppins', sans-serif",
  },
  classesTable: {
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #EEF1F8',
    overflow: 'hidden',
  },
  classesTableHeader: {
    display: 'flex',
    background: '#FAFBFF',
    borderBottom: '1px solid #EEF1F8',
    padding: '0.65rem 1rem',
    gap: '1rem',
    color: '#5B6A88',
  },
  classesTableRow: {
    display: 'flex',
    padding: '0.65rem 1rem',
    borderBottom: '1px solid #F3F5FA',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: 'white',
    transition: 'background-color 0.15s',
  },
  classesTableCell: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.875rem',
    color: '#42506B',
  },

  // ── Preset / preference info block ─────────────────────────
  presetInfo: {
    backgroundColor: '#EAF7EF',
    padding: '1rem 1.25rem',
    borderRadius: '14px',
    marginBottom: '1.25rem',
    fontSize: '0.9rem',
    color: '#12592F',
    borderLeft: '4px solid #1B7A43',
    fontWeight: '500',
  },

  // ── Modal overlay + content (shared with DosenPage) ────────
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

  // ── Dosen dropdown inside modal ────────────────────────────
  dosenDropdownModal: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    border: '1.5px solid #E4E8F1',
    borderTop: 'none',
    borderRadius: '0 0 10px 10px',
    maxHeight: '200px',
    overflowY: 'auto',
    zIndex: 20,
    boxShadow: '0 10px 24px rgba(30,42,69,0.12)',
  },

  // ── Popup Modal (message + import stats) ───────────────────
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