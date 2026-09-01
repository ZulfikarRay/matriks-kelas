'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DosenPreferenceModal from '@/app/components/DosenPreferenceModal';
import { DEFAULT_PREFERENCE_DAYS, getEffectivePreferencePreset, minutesToTime } from '@/lib/dosen-preference';

export default function JadwalPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [kelasList, setKelasList] = useState([]);
  const [jadwalData, setJadwalData] = useState({});
  const [loading, setLoading] = useState(true);
  const [messagePopup, setMessagePopup] = useState({ show: false, type: '', text: '' });

  const [presets, setPresets] = useState({
    Normal: {
      jamMulai: '07:10', durasiSlot: 50,
      jamIstirahatMulaiSeninKamis: '12:10', jamIstirahatSelesaiSeninKamis: '13:00',
      jamIstirahatMulaiSabtu: '12:10', jamIstirahatSelesaiSabtu: '13:00',
      jamIstirahatMulaiJumat: '11:20', jamIstirahatSelesaiJumat: '13:30',
      jamSelesai: '18:00',
    },
    Ramadhan: {
      jamMulai: '08:00', durasiSlot: 40,
      jamIstirahatMulaiSeninKamis: '12:10', jamIstirahatSelesaiSeninKamis: '13:00',
      jamIstirahatMulaiSabtu: '12:10', jamIstirahatSelesaiSabtu: '13:00',
      jamIstirahatMulaiJumat: '11:20', jamIstirahatSelesaiJumat: '13:30',
      jamSelesai: '17:10',
    },
  });

  const [activePreset, setActivePreset] = useState('Normal');
  const [settings, setSettings] = useState(presets.Normal);
  const [selectedPresetOption, setSelectedPresetOption] = useState('Normal');
  const [visibleDays, setVisibleDays] = useState({ Senin: true, Selasa: true, Rabu: true, Kamis: true, Jumat: true, Sabtu: true });
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [sessionInput, setSessionInput] = useState('');
  const [sessionInputMode, setSessionInputMode] = useState('manual');
  const [selectedRuangan, setSelectedRuangan] = useState('');
  const [selectedHari, setSelectedHari] = useState('Senin');
  const [selectedJamMulai, setSelectedJamMulai] = useState('07:10');
  const [calculatedJamSelesai, setCalculatedJamSelesai] = useState('08:00');
  const [selectedKelas, setSelectedKelas] = useState(null);
  const [ruanganList, setRuanganList] = useState([]);
  const [roomClassFilters, setRoomClassFilters] = useState({});
  const [editingSession, setEditingSession] = useState(null);
  const [showAutoGenModal, setShowAutoGenModal] = useState(false);
  const [autoGenSettings, setAutoGenSettings] = useState({ combineTheoryPracticum: true, skipSaturday: true, semester: 'Gasal' });
  const [tahunAjaranList, setTahunAjaranList] = useState([]);
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('Gasal');
  const [dosenList, setDosenList] = useState([]);
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [selectedDosenForPref, setSelectedDosenForPref] = useState(null);
  const [databasePresetsList, setDatabasePresetsList] = useState([]);
  const [customPreferenceByDosenId, setCustomPreferenceByDosenId] = useState({});
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [selectedProdiFilter, setSelectedProdiFilter] = useState('ALL');

  const tableRef = useRef(null);
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const semesters = ['Gasal', 'Genap'];

  const buildRoomClassFilters = (rows) => rows.reduce((result, row) => {
    const roomId = String(row.ruangan_id);
    if (!result[roomId]) result[roomId] = { biasa: new Set(), praktikum: new Set(), noClass: false };
    if (row.jenis_kelas === 'tidak_ada') result[roomId].noClass = true;
    else result[roomId][row.jenis_kelas]?.add(Number(row.kelas_id));
    return result;
  }, {});

  // ===== ALL LOGIC UNCHANGED =====
  const fetchData = async () => {
    try {
      setLoading(true);
      const [kelasRes, jadwalRes, ruanganRes, roomFiltersRes, dosenRes, presetsRes] = await Promise.all([
        fetch('/api/kelas'),
        fetch('/api/jadwal'),
        fetch('/api/ruangan'),
        fetch('/api/ruangan/filter-kelas'),
        fetch('/api/dosen'),
        fetch('/api/jadwal/presets')
      ]);
      
      if (!kelasRes.ok) {
        const error = await kelasRes.json();
        throw new Error(`Kelas API error: ${error.error || 'Unknown error'}`);
      }
      if (!jadwalRes.ok) {
        const error = await jadwalRes.json();
        throw new Error(`Jadwal API error: ${error.error || 'Unknown error'}`);
      }
      if (!ruanganRes.ok) {
        const error = await ruanganRes.json();
        throw new Error(`Ruangan API error: ${error.error || 'Unknown error'}`);
      }
      
      const kelas = await kelasRes.json();
      const jadwal = await jadwalRes.json();
      const ruangan = await ruanganRes.json();
      const roomFilters = await roomFiltersRes.json();
      const dosen = await dosenRes.json();
      const presets = await presetsRes.json();
      // Deduplicate kelas by id
      const uniqueKelas = Array.from(new Map((Array.isArray(kelas) ? kelas : []).map(k => [k.id, k])).values());
      setKelasList(uniqueKelas);
      setRuanganList(Array.isArray(ruangan) ? ruangan : []);
      setRoomClassFilters(buildRoomClassFilters(Array.isArray(roomFilters) ? roomFilters : []));
      const safeDosenList = Array.isArray(dosen) ? dosen : [];
      setDosenList(safeDosenList);
      setDatabasePresetsList(Array.isArray(presets) ? presets : []);
      const organizedJadwal = {};
      days.forEach((day) => { organizedJadwal[day] = {}; });
      const jadwalArray = Array.isArray(jadwal) ? jadwal : [];
      jadwalArray.forEach((j) => {
        if (!organizedJadwal[j.hari]) organizedJadwal[j.hari] = {};
        if (!organizedJadwal[j.hari][j.ruangan_id]) organizedJadwal[j.hari][j.ruangan_id] = [];
        organizedJadwal[j.hari][j.ruangan_id].push(j);
      });
      setJadwalData(organizedJadwal);
      await loadCustomPreferenceIndicators(safeDosenList);
    } catch {
      showMessage('error', 'Error loading data. Please try again.');
      setKelasList([]); setRuanganList([]); setRoomClassFilters({}); setDosenList([]); setDatabasePresetsList([]); setCustomPreferenceByDosenId({});
    } finally { setLoading(false); }
  };

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (!res.ok) {
          router.push('/login');
          return;
        }
      } catch {
        router.push('/login');
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  // Load data only after auth check
  useEffect(() => {
    if (!checking) {
      fetchData();
      fetchTahunAjaran();
    }
  }, [checking]); // eslint-disable-line react-hooks/exhaustive-deps


  const handleEditDosenPreference = (dosen) => {
    setSelectedDosenForPref(dosen);
    setShowPreferenceModal(true);
  };

  const fetchTahunAjaran = async () => {
    try { const res = await fetch('/api/tahun-ajaran'); const data = await res.json(); setTahunAjaranList(Array.isArray(data) ? data : []); }
    catch { showMessage('error', 'Gagal fetch tahun ajaran'); setTahunAjaranList([]); }
  };

  const getSemesterNumbers = (semesterLabel) => {
    if (semesterLabel === 'Gasal') return [1, 3, 5, 7, 9];
    if (semesterLabel === 'Genap') return [2, 4, 6, 8, 10];
    return [];
  };

  const getSemesterNumbersForComparison = (selectedSemesterLabel) => {
    return getSemesterNumbers(selectedSemesterLabel);
  };

  const isSessionInSemesterLabel = (sessionSemesterValue, semesterLabel) => {
    const normalizedValue = normalizeText(sessionSemesterValue);
    const normalizedSemester = normalizeText(semesterLabel);

    if (!normalizedValue) return true;
    if (normalizedValue === normalizedSemester) return true;

    const numericValue = Number(sessionSemesterValue);
    if (Number.isNaN(numericValue)) return false;

    if (normalizedSemester === 'gasal') return [1, 3, 5, 7, 9].includes(numericValue);
    if (normalizedSemester === 'genap') return [2, 4, 6, 8, 10].includes(numericValue);

    return false;
  };

  const fetchKelasAndJadwalBySemester = async (tahunId, semester) => {
    try {
      setLoading(true);
      const [kelasRes, jadwalRes, ruanganRes] = await Promise.all([fetch('/api/kelas'), fetch('/api/jadwal'), fetch('/api/ruangan')]);
      if (!kelasRes.ok || !jadwalRes.ok || !ruanganRes.ok) { console.warn('Failed to fetch kelas, jadwal, or ruangan'); return; }
      const kelasRaw = await kelasRes.json(); const jadwalRaw = await jadwalRes.json(); const ruanganRaw = await ruanganRes.json();
      let kelas = Array.isArray(kelasRaw) ? kelasRaw : [];
      let jadwal = Array.isArray(jadwalRaw) ? jadwalRaw : [];
      let ruangan = Array.isArray(ruanganRaw) ? ruanganRaw : [];
      const semesterNumbers = getSemesterNumbers(semester);
      kelas = kelas.filter((k) => { const kSemester = Number(k.f_semester || k.semester || k.matkul_semester || 0); return (!k.f_tahun_ajaran || String(k.f_tahun_ajaran) === String(tahunId)) && semesterNumbers.includes(kSemester); });
      // Deduplicate kelas by id to prevent React key warnings
      const uniqueKelas = Array.from(new Map(kelas.map(k => [k.id, k])).values());
      const kelasIds = uniqueKelas.map((k) => k.id);
      jadwal = jadwal.filter((j) => kelasIds.includes(j.f_kelas || j.kelas_id));
      setKelasList(uniqueKelas);
      setRuanganList(ruangan);
      const organizedJadwal = {};
      days.forEach((day) => { organizedJadwal[day] = {}; });
      jadwal.forEach((j) => { if (!organizedJadwal[j.hari]) organizedJadwal[j.hari] = {}; if (!organizedJadwal[j.hari][j.ruangan_id]) organizedJadwal[j.hari][j.ruangan_id] = []; organizedJadwal[j.hari][j.ruangan_id].push(j); }); setJadwalData(organizedJadwal);
    } catch (err) { console.warn('Error fetching filtered data:', err.message); } finally { setLoading(false); }
  };

  useEffect(() => { if (selectedTahunAjaran && selectedSemester) { fetchKelasAndJadwalBySemester(selectedTahunAjaran, selectedSemester); } else { setKelasList([]); setJadwalData({}); } }, [selectedTahunAjaran, selectedSemester]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSelectedJamMulai(settings.jamMulai); setCalculatedJamSelesai(calculateJamSelesai(settings.jamMulai, 1)); }, [settings.durasiSlot, activePreset]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setAutoGenSettings((prev) => ({ ...prev, semester: selectedSemester })); }, [selectedSemester]);

  // Add hover styles + font import on client side only (matches DosenPage design system)
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

      ::-webkit-scrollbar { height: 8px; width: 8px; }
      ::-webkit-scrollbar-thumb { background: #E4E8F1; border-radius: 8px; }
      ::-webkit-scrollbar-track { background: transparent; }
    `;
    document.head.appendChild(styleSheet);
  }, []);

  const showMessage = (type, text) => {
    setMessagePopup({ show: true, type, text });
  };

  const closeMessagePopup = () => {
    setMessagePopup({ show: false, type: '', text: '' });
  };
  const timeToMinutes = (timeStr) => { if (!timeStr) return 0; const [h, m] = timeStr.split(':').map(Number); return h * 60 + m; };
  const getBreakTimes = (hari) => { const isJumat = hari === 'Jumat'; const isSabtu = hari === 'Sabtu'; return { mulai: isJumat ? settings.jamIstirahatMulaiJumat : isSabtu ? settings.jamIstirahatMulaiSabtu : settings.jamIstirahatMulaiSeninKamis, selesai: isJumat ? settings.jamIstirahatSelesaiJumat : isSabtu ? settings.jamIstirahatSelesaiSabtu : settings.jamIstirahatSelesaiSeninKamis }; };

  const generateTimeSlots = (hari) => {
    const slots = []; const mulai = timeToMinutes(settings.jamMulai); const selesai = timeToMinutes(settings.jamSelesai);
    const { mulai: breakMulai, selesai: breakSelesai } = getBreakTimes(hari);
    const breakMulaiMin = timeToMinutes(breakMulai); const breakSelesaiMin = timeToMinutes(breakSelesai);
    for (let time = mulai; time < selesai; time += settings.durasiSlot) {
      const endTime = time + settings.durasiSlot;
      const isBreak = (time >= breakMulaiMin && time < breakSelesaiMin) || (time < breakSelesaiMin && endTime > breakMulaiMin);
      slots.push({ start: minutesToTime(time), end: minutesToTime(Math.min(endTime, selesai)), isBreak });
    }
    return slots;
  };

  const calculateJamSelesai = (jamMulai, sks) => { const startMinutes = timeToMinutes(jamMulai); const durationMinutes = (sks || 1) * settings.durasiSlot; return minutesToTime(startMinutes + durationMinutes); };
  const getRoomFloor = (ruangan) => Number(ruangan?.lantai ?? ruangan?.f_lantai);
  const getDosenIdForKelas = (kelas) => {
    const dosenName = normalizeText(kelas?.dosen);
    if (!dosenName) return null;
    const dosen = dosenList.find((item) => normalizeText(item.f_namapegawai) === dosenName || normalizeText(item.f_nidn) === dosenName);
    return dosen?.id || null;
  };
  const isDosenOccupied = (hari, dosenId, slotStart, slotEnd, semesterLabel = selectedSemester) => {
    if (!dosenId) return false;
    const startMin = timeToMinutes(slotStart);
    const endMin = timeToMinutes(slotEnd);
    return Object.values(jadwalData[hari] || {}).some((sessions) => sessions.some((session) => (
      String(session.dosen_id) === String(dosenId) &&
      isSessionInSemesterLabel(session.semester, semesterLabel) &&
      timeToMinutes(session.jam_mulai) < endMin && timeToMinutes(session.jam_selesai) > startMin
    )));
  };
  const isSlotOccupied = (hari, ruanganId, slotStart, slotEnd, semesterLabel = selectedSemester) => { const dayData = jadwalData[hari] || {}; const sessionsInRuangan = dayData[ruanganId] || []; const slotStartMin = timeToMinutes(slotStart); const slotEndMin = timeToMinutes(slotEnd); return sessionsInRuangan.some((session) => { if (!isSessionInSemesterLabel(session.semester, semesterLabel)) return false; const sessionStart = timeToMinutes(session.jam_mulai); const sessionEnd = timeToMinutes(session.jam_selesai); return sessionStart < slotEndMin && sessionEnd > slotStartMin; }); };
  const findExistingKelasSchedule = (kelasId) => { const semesterNumbers = getSemesterNumbersForComparison(selectedSemester); for (const hari of days) { const dayData = jadwalData[hari] || {}; for (const ruanganId in dayData) { const sessions = dayData[ruanganId]; const found = sessions.find((s) => s.kelas_id === kelasId && semesterNumbers.includes(Number(s.semester))); if (found) return { found: true, hari, jamMulai: found.jam_mulai, jamSelesai: found.jam_selesai, ruangan: ruanganList.find((r) => r.id === parseInt(ruanganId))?.f_namaruang || 'Ruangan tidak diketahui' }; } } return { found: false }; };
  const isSessionCutByBreak = (hari, jamMulai, jamSelesai, sks = 1) => { if (sks < 2) return false; const breakTimes = getBreakTimes(hari); const breakStartMin = timeToMinutes(breakTimes.mulai); const breakEndMin = timeToMinutes(breakTimes.selesai); const sessionStartMin = timeToMinutes(jamMulai); const sessionEndMin = timeToMinutes(jamSelesai); return sessionStartMin < breakEndMin && sessionEndMin > breakStartMin; };
  const findOverlappingSession = (hari, ruanganId, jamMulai, jamSelesai) => { const dayData = jadwalData[hari] || {}; const sessionsInRuangan = dayData[parseInt(ruanganId)] || []; const newStart = timeToMinutes(jamMulai); const newEnd = timeToMinutes(jamSelesai); const semesterNumbers = getSemesterNumbersForComparison(selectedSemester); for (const existingSession of sessionsInRuangan) { if (!semesterNumbers.includes(Number(existingSession.semester))) continue; if (editingSession && existingSession.id === editingSession.id) continue; const existingStart = timeToMinutes(existingSession.jam_mulai); const existingEnd = timeToMinutes(existingSession.jam_selesai); if (newStart < existingEnd && newEnd > existingStart) return { found: true, conflictName: existingSession.display_name, conflictTime: `${existingSession.jam_mulai}-${existingSession.jam_selesai}` }; } return { found: false }; }

  const buildDefaultAvailabilityGrid = () => {
    const defaultGrid = {};
    DEFAULT_PREFERENCE_DAYS.forEach((day) => {
      defaultGrid[day] = {};
      const sessions = generateTimeSlots(day);
      sessions.forEach((slot) => {
        if (slot.isBreak) return;
        defaultGrid[day][`${slot.start}-${slot.end}`] = true;
      });
    });
    return defaultGrid;
  };

  const shuffleArray = (items) => {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const getDosenPreferenceProfile = async (dosenId) => {
    const defaultGrid = buildDefaultAvailabilityGrid();
    const defaultFloors = { 1: true, 2: true, 3: true, 4: true };

    try {
      const res = await fetch(`/api/dosen/preferences?dosenId=${dosenId}`);
      if (!res.ok) {
        return { isCustom: false, preferredDays: DEFAULT_PREFERENCE_DAYS, preferredFloors: [1, 2, 3, 4], availability: defaultGrid };
      }

      const prefs = await res.json();
      const availability = JSON.parse(JSON.stringify(defaultGrid));
      const floorPref = Array.isArray(prefs) && prefs.length > 0 ? (prefs[0]?.dosen_prefer_lantai || '1,2,3,4') : '1,2,3,4';
      const floorNumbers = floorPref.split(',').map((item) => parseInt(item.trim(), 10)).filter((item) => !Number.isNaN(item));
      const preferredFloors = floorNumbers.length > 0 ? floorNumbers : [1, 2, 3, 4];

      prefs.forEach((pref) => {
        if (availability[pref.hari] && availability[pref.hari][pref.sesi] !== undefined) {
          availability[pref.hari][pref.sesi] = Boolean(pref.is_available);
        }
      });

      const customDayKeys = DEFAULT_PREFERENCE_DAYS.filter((day) => {
        const daySessions = Object.keys(availability[day] || {});
        return daySessions.some((session) => availability[day][session] !== defaultGrid[day][session]);
      });

      const hasCustomFloors = Object.keys(defaultFloors).some((floor) => {
        const floorNumber = Number(floor);
        return Boolean(defaultFloors[floorNumber]) !== preferredFloors.includes(floorNumber);
      });

      return {
        isCustom: customDayKeys.length > 0 || hasCustomFloors,
        preferredDays: customDayKeys.length > 0 ? customDayKeys : DEFAULT_PREFERENCE_DAYS,
        preferredFloors,
        availability,
      };
    } catch (err) {
      console.warn('Could not fetch dosen preference profile:', err);
      return { isCustom: false, preferredDays: DEFAULT_PREFERENCE_DAYS, preferredFloors: [1, 2, 3, 4], availability: defaultGrid };
    }
  };

  const getAutoGenCandidateSlots = (kelas, profile, semesterLabel = selectedSemester) => {
    const sks = Number(kelas?.sks || kelas?.f_sks_kurikulum || 1);
    const preferredFloors = profile?.preferredFloors || [1, 2, 3, 4];
    const preferredDays = Array.isArray(profile?.preferredDays) ? profile.preferredDays : days;
    const dosenId = getDosenIdForKelas(kelas);
    const allowedDays = autoGenSettings.skipSaturday
      ? preferredDays.filter((day) => day !== 'Sabtu')
      : preferredDays;
    const practicum = isPracticumName(kelas);
    const rooms = ruanganList.filter((ruangan) => (
      preferredFloors.includes(getRoomFloor(ruangan)) &&
      isRoomAllowedForClass(ruangan, kelas, practicum ? 'praktikum' : 'biasa')
    ));
    const candidates = [];

    allowedDays.forEach((day) => {
      const timeSlots = generateTimeSlots(day);
      timeSlots.forEach((slot) => {
        if (slot.isBreak) return;

        const jamSelesai = calculateJamSelesai(slot.start, sks);
        if (timeToMinutes(jamSelesai) > timeToMinutes(settings.jamSelesai)) return;
        if (sks >= 2 && isSessionCutByBreak(day, slot.start, jamSelesai, sks)) return;

        rooms.forEach((ruangan) => {
          if (isSlotOccupied(day, ruangan.id, slot.start, jamSelesai, semesterLabel)) return;
          if (isDosenOccupied(day, dosenId, slot.start, jamSelesai, semesterLabel)) return;

          const sessionKey = `${slot.start}-${slot.end}`;
          const isAvailable = profile?.availability?.[day]?.[sessionKey];
          if (profile?.isCustom && isAvailable === false) return;

          candidates.push({
            hari: day,
            ruangan_id: ruangan.id,
            jam_mulai: slot.start,
            jam_selesai: jamSelesai,
          });
        });
      });
    });

    return shuffleArray(candidates);
  };

  const getKelasName = (kelas) => String(kelas?.display_name || kelas?.nama_kelas || '').trim();
  const getCourseName = (kelas) => String(kelas?.f_namamk || getKelasName(kelas).split(' (')[0] || '').trim();

  const isPracticumName = (kelas) => /^praktikum\s+/i.test(normalizeText(getCourseName(kelas)));
  const isRoomAllowedForClass = (ruangan, kelas, jenis = isPracticumName(kelas) ? 'praktikum' : 'biasa') => {
    const filter = roomClassFilters[String(ruangan.id)];
    if (!filter) return jenis === 'biasa';
    if (filter.noClass) return false;
    return filter[jenis]?.has(Number(kelas.id)) || false;
  };

  const isRoomAllowedForPair = (ruangan, practicumKelas) => {
    const filter = roomClassFilters[String(ruangan.id)];
    return Boolean(filter && !filter.noClass && filter.praktikum?.has(Number(practicumKelas.id)));
  };

  const getBaseCourseName = (kelas) => normalizeText(getCourseName(kelas)).replace(/^praktikum\s+/i, '').trim();

  const getCoveredSessionKeys = (hari, jamMulai, jamSelesai) => {
    const startMin = timeToMinutes(jamMulai);
    const endMin = timeToMinutes(jamSelesai);
    const keys = [];

    generateTimeSlots(hari).forEach((slot) => {
      if (slot.isBreak) return;
      const slotStart = timeToMinutes(slot.start);
      const slotEnd = timeToMinutes(slot.end);
      if (slotStart >= startMin && slotEnd <= endMin) {
        keys.push(`${slot.start}-${slot.end}`);
      }
    });

    return keys;
  };

  const isWindowAvailableForProfile = (hari, jamMulai, jamSelesai, profile) => {
    if (!profile?.isCustom) return true;
    const coveredKeys = getCoveredSessionKeys(hari, jamMulai, jamSelesai);
    if (coveredKeys.length === 0) return false;

    return coveredKeys.every((key) => profile?.availability?.[hari]?.[key] !== false);
  };

  const getPairedAutoGenCandidateSlots = (theoryKelas, practicumKelas, profile, semesterLabel = selectedSemester) => {
    const theorySks = Number(theoryKelas?.sks || theoryKelas?.f_sks_kurikulum || 1);
    const practicumSks = Number(practicumKelas?.sks || practicumKelas?.f_sks_kurikulum || 1);
    const totalSks = theorySks + practicumSks;
    const preferredFloors = profile?.preferredFloors || [1, 2, 3, 4];
    const preferredDays = Array.isArray(profile?.preferredDays) ? profile.preferredDays : days;
    const theoryDosenId = getDosenIdForKelas(theoryKelas);
    const practicumDosenId = getDosenIdForKelas(practicumKelas);
    const allowedDays = autoGenSettings.skipSaturday
      ? preferredDays.filter((day) => day !== 'Sabtu')
      : preferredDays;
    const rooms = ruanganList.filter((ruangan) => (
      preferredFloors.includes(getRoomFloor(ruangan)) &&
      isRoomAllowedForPair(ruangan, practicumKelas)
    ));
    const candidates = [];

    allowedDays.forEach((day) => {
      const timeSlots = generateTimeSlots(day);
      timeSlots.forEach((slot) => {
        if (slot.isBreak) return;

        const theoryEnd = calculateJamSelesai(slot.start, theorySks);
        const totalEnd = calculateJamSelesai(slot.start, totalSks);

        if (timeToMinutes(totalEnd) > timeToMinutes(settings.jamSelesai)) return;
        if (totalSks >= 2 && isSessionCutByBreak(day, slot.start, totalEnd, totalSks)) return;

        if (!isWindowAvailableForProfile(day, slot.start, totalEnd, profile)) return;

        rooms.forEach((ruangan) => {
          if (isSlotOccupied(day, ruangan.id, slot.start, totalEnd, semesterLabel)) return;
          if (isDosenOccupied(day, theoryDosenId, slot.start, totalEnd, semesterLabel)) return;
          if (isDosenOccupied(day, practicumDosenId, slot.start, totalEnd, semesterLabel)) return;

          candidates.push({
            hari: day,
            ruangan_id: ruangan.id,
            jam_mulai: slot.start,
            theory_end: theoryEnd,
            jam_selesai: totalEnd,
          });
        });
      });
    });

    return shuffleArray(candidates);
  };

  const loadCustomPreferenceIndicators = async (dosenItems) => {
    if (!Array.isArray(dosenItems) || dosenItems.length === 0) {
      setCustomPreferenceByDosenId({});
      return;
    }

    try {
      const profiles = await Promise.all(
        dosenItems.map(async (dosen) => {
          const profile = await getDosenPreferenceProfile(dosen.id);
          return [dosen.id, Boolean(profile.isCustom)];
        })
      );

      setCustomPreferenceByDosenId(Object.fromEntries(profiles));
    } catch (error) {
      console.warn('Failed to load custom preference indicators:', error);
      setCustomPreferenceByDosenId({});
    }
  };

  const normalizeText = (value) => String(value || '').toLowerCase().trim();

  const miniDashboardStats = (() => {
    const baseKelas = Array.isArray(kelasList) ? kelasList : [];

    const getProdiIdFromKelas = (kelas) => {
      const nidnOrName = normalizeText(kelas?.dosen);
      if (!nidnOrName) return '';

      const byNidn = dosenList.find((d) => normalizeText(d?.f_nidn) === nidnOrName);
      if (byNidn?.f_progdi_id) return String(byNidn.f_progdi_id).trim();

      const byName = dosenList.find((d) => normalizeText(d?.f_namapegawai) === nidnOrName);
      if (byName?.f_progdi_id) return String(byName.f_progdi_id).trim();

      return '';
    };

    const scopedKelas = selectedProdiFilter === 'ALL'
      ? baseKelas
      : baseKelas.filter((kelas) => normalizeText(getProdiIdFromKelas(kelas)) === normalizeText(selectedProdiFilter));

    const scopedKelasIds = new Set(scopedKelas.map((kelas) => Number(kelas.id)));
    const scheduledKelasIds = new Set();

    Object.values(jadwalData || {}).forEach((dayData) => {
      Object.values(dayData || {}).forEach((sessions) => {
        (sessions || []).forEach((session) => {
          const kelasId = Number(session.kelas_id ?? session.f_kelas ?? session.f_kelas_id ?? 0);
          if (!scopedKelasIds.has(kelasId)) return;
          if (!isSessionInSemesterLabel(session.semester, selectedSemester)) return;
          scheduledKelasIds.add(kelasId);
        });
      });
    });

    const totalKelas = scopedKelas.length;
    const masukJadwal = scheduledKelasIds.size;
    const belumMasuk = Math.max(totalKelas - masukJadwal, 0);

    return { totalKelas, masukJadwal, belumMasuk };
  })();

  const getSessionContext = (session) => {
    const kelas = kelasList.find((k) => Number(k.id) === Number(session.kelas_id));
    const dosenById = session.dosen_id ? dosenList.find((d) => Number(d.id) === Number(session.dosen_id)) : null;
    const dosenByKelas = kelas?.dosen
      ? dosenList.find((d) => normalizeText(d.f_namapegawai) === normalizeText(kelas.dosen))
      : null;
    const dosenBySession = session.nama_dosen_db
      ? dosenList.find((d) => normalizeText(d.f_namapegawai) === normalizeText(session.nama_dosen_db))
      : null;

    const dosen = dosenById || dosenByKelas || dosenBySession || null;
    const dosenName = dosen?.f_namapegawai || session.nama_dosen_db || session.nama_dosen || kelas?.dosen || '';
    const nidn = dosen?.f_nidn || '';
    const prodiId = dosen?.f_progdi_id || '';
    const mataKuliah = session.nama_matakuliah || session.nama_mk || session.display_name || kelas?.display_name || kelas?.nama_kelas || '';

    return {
      dosenName,
      nidn,
      prodiId,
      mataKuliah,
      isCustomPreference: dosen?.id ? Boolean(customPreferenceByDosenId[dosen.id]) : false,
    };
  };

  const isSessionVisibleByFilters = (session) => {
    const searchKeyword = normalizeText(scheduleSearch);
    const { dosenName, nidn, mataKuliah, prodiId } = getSessionContext(session);

    if (selectedProdiFilter !== 'ALL' && normalizeText(prodiId) !== normalizeText(selectedProdiFilter)) {
      return false;
    }

    if (!searchKeyword) {
      return true;
    }

    return [dosenName, nidn, mataKuliah, session.display_name]
      .map((item) => normalizeText(item))
      .some((item) => item.includes(searchKeyword));
  };

  const hasFormData = () => {
    return sessionInput.trim().length > 0 || selectedKelas !== null;
  };

  const resetFormFields = () => {
    setSessionInput('');
    setSelectedKelas(null);
    setSessionInputMode('manual');
    setSelectedJamMulai(settings.jamMulai);
    setCalculatedJamSelesai(calculateJamSelesai(settings.jamMulai, 1));
    setEditingSession(null);
  };

  const handleSessionModalOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      if (hasFormData()) {
        if (window.confirm('⚠️ Form memiliki data yang belum disimpan. Tutup tanpa menyimpan?')) {
          resetFormFields();
          setShowSessionModal(false);
        }
      } else {
        setShowSessionModal(false);
      }
    }
  };

  const handleUpdatePreset = async () => {
    const presetKey = selectedPresetOption || activePreset || 'Normal';
    const nextSettings = {
      jamMulai: settings.jamMulai,
      durasiSlot: settings.durasiSlot,
      jamIstirahatMulaiSeninKamis: settings.jamIstirahatMulaiSeninKamis,
      jamIstirahatSelesaiSeninKamis: settings.jamIstirahatSelesaiSeninKamis,
      jamIstirahatMulaiSabtu: settings.jamIstirahatMulaiSabtu,
      jamIstirahatSelesaiSabtu: settings.jamIstirahatSelesaiSabtu,
      jamIstirahatMulaiJumat: settings.jamIstirahatMulaiJumat,
      jamIstirahatSelesaiJumat: settings.jamIstirahatSelesaiJumat,
      jamSelesai: settings.jamSelesai,
    };

    setPresets((prev) => ({
      ...prev,
      [presetKey]: nextSettings,
    }));

    setActivePreset(presetKey);
    setSelectedPresetOption(presetKey);
    showMessage('success', `Pengaturan preset ${presetKey} berhasil disimpan`);
  };

  const handleAddSession = async () => {
    if (!selectedRuangan || !sessionInput) { showMessage('error', 'Pilih ruangan dan isi sesi'); return; }
    try {
      const ruangan = ruanganList.find((r) => r.id === parseInt(selectedRuangan));
      let displayName = ''; let sks = 1; let kelasId = null; let dosenId = null;
      if (sessionInputMode === 'import') {
        const kelas = kelasList.find((k) => k.id === parseInt(sessionInput));
        if (!kelas) { showMessage('error', 'Kelas tidak ditemukan'); return; }
        displayName = kelas.display_name || kelas.nama_kelas; sks = kelas.sks || kelas.f_sks_kurikulum || 1; kelasId = kelas.id;
        
        if (kelas.dosen) {
          try {
            const dosenRes = await fetch(`/api/dosen?nidn=${kelas.dosen}`);
            if (dosenRes.ok) {
              const dosenList = await dosenRes.json();
              if (Array.isArray(dosenList) && dosenList.length > 0) {
                dosenId = dosenList[0].id;
              }
            }
          } catch {
            console.warn('Could not find dosen by NIDN:', kelas.dosen);
          }
        }
        if (!editingSession) { const existingSchedule = findExistingKelasSchedule(kelasId); if (existingSchedule.found) { showMessage('error', `Kelas "${displayName}" sudah dijadwalkan pada ${existingSchedule.hari} pukul ${existingSchedule.jamMulai}-${existingSchedule.jamSelesai} di ruangan ${existingSchedule.ruangan}`); return; } }
      } else { displayName = sessionInput; sks = 1; }
      const jamSelesai = calculateJamSelesai(selectedJamMulai, sks);
      const dayData = jadwalData[selectedHari] || {}; const sessionsInRuangan = dayData[parseInt(selectedRuangan)] || [];
      const newStart = timeToMinutes(selectedJamMulai); const newEnd = timeToMinutes(jamSelesai);
      const semesterNumbers = getSemesterNumbersForComparison(selectedSemester);
      for (const existingSession of sessionsInRuangan) { if (!semesterNumbers.includes(Number(existingSession.semester))) continue; if (editingSession && existingSession.id === editingSession.id) continue; const existingStart = timeToMinutes(existingSession.jam_mulai); const existingEnd = timeToMinutes(existingSession.jam_selesai); if (newStart < existingEnd && newEnd > existingStart) { showMessage('error', `Jadwal bentrok dengan: ${existingSession.display_name} (${existingSession.jam_mulai}-${existingSession.jam_selesai})`); return; } }
      if (sks >= 2 && isSessionCutByBreak(selectedHari, selectedJamMulai, jamSelesai, sks)) { const breakTimes = getBreakTimes(selectedHari); showMessage('error', `Kelas dengan ${sks} SKS tidak boleh terpotong jam istirahat (${breakTimes.mulai}-${breakTimes.selesai})`); return; }
      const jadwalPayload = { kelas_id: kelasId, hari: selectedHari, ruangan_id: parseInt(selectedRuangan), jam_mulai: selectedJamMulai, jam_selesai: jamSelesai, display_name: displayName, nama_ruangan: ruangan?.f_namaruang || '', semester: selectedSemester, ...(dosenId && { dosen_id: dosenId }) };
      const endpoint = editingSession ? { method: 'PUT', body: { id: editingSession.id, ...jadwalPayload } } : { method: 'POST', body: jadwalPayload };
      const res = await fetch('/api/jadwal', { method: endpoint.method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(endpoint.body) });
      if (!res.ok) { const err = await res.json(); showMessage('error', err.error || 'Gagal menyimpan sesi'); return; }
      showMessage('success', editingSession ? 'Sesi diupdate' : 'Sesi ditambahkan');
      setSessionInput(''); setEditingSession(null); setShowSessionModal(false); await fetchData();
    } catch (err) { showMessage('error', `Error: ${err.message}`); }
  };

  const handleDeleteSession = async (jadwalId) => {
    if (!confirm('Hapus sesi ini?')) return;
    try { const res = await fetch('/api/jadwal', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: jadwalId }) }); if (!res.ok) throw new Error('Gagal menghapus'); showMessage('success', 'Sesi dihapus'); await fetchData(); }
    catch (err) { showMessage('error', `Error: ${err.message}`); return false; }
    return true;
  };

  const handleDeleteEditingSession = async () => {
    if (!editingSession) return;
    const deleted = await handleDeleteSession(editingSession.id);
    if (deleted) {
      resetFormFields();
      setShowSessionModal(false);
    }
  };

  const generateScheduleAuto = async () => {
    try {
      const generationSemester = autoGenSettings.semester || selectedSemester;
      const emptyKelas = kelasList.filter((k) => {
        const hasSchedule = days.some((day) => {
          const dayData = jadwalData[day] || {};
          return Object.values(dayData).some((arr) => arr.some((j) => {
            const sessionKelasId = Number(j.kelas_id ?? j.f_kelas ?? j.f_kelas_id ?? 0);
            const kelasId = Number(k.id);
            return sessionKelasId === kelasId && isSessionInSemesterLabel(j.semester, generationSemester);
          }));
        });
        return !hasSchedule;
      });

      if (emptyKelas.length === 0) {
        showMessage('success', 'Tidak ada kelas yang perlu di-generate');
        setShowAutoGenModal(false);
        return;
      }

      const randomize = (items) => shuffleArray(items);
      const profileCacheByNidn = {};
      const defaultProfile = { isCustom: false, preferredDays: DEFAULT_PREFERENCE_DAYS, preferredFloors: [1, 2, 3, 4], availability: buildDefaultAvailabilityGrid() };

      const getProfileForKelas = async (kelas) => {
        const kelasDosenNidn = normalizeText(kelas?.dosen);
        if (!kelasDosenNidn) return defaultProfile;
        if (profileCacheByNidn[kelasDosenNidn]) return profileCacheByNidn[kelasDosenNidn];

        let profile = defaultProfile;
        const dosenRes = await fetch(`/api/dosen?nidn=${encodeURIComponent(kelas.dosen)}`);
        if (dosenRes.ok) {
          const dosenMatches = await dosenRes.json();
          const dosen = Array.isArray(dosenMatches) ? dosenMatches[0] : null;
          if (dosen?.id) {
            profile = await getDosenPreferenceProfile(dosen.id);
          }
        }

        profileCacheByNidn[kelasDosenNidn] = profile;
        return profile;
      };

      const buildScheduleUnits = () => {
        if (!autoGenSettings.combineTheoryPracticum) {
          return emptyKelas.map((kelas) => ({ type: 'single', kelas }));
        }

        const praktikumByBase = {};
        const theoryClasses = [];
        const practicumClasses = [];
        emptyKelas.forEach((kelas) => {
          if (isPracticumName(kelas)) {
            const base = getBaseCourseName(kelas);
            if (!praktikumByBase[base]) praktikumByBase[base] = [];
            praktikumByBase[base].push(kelas);
            practicumClasses.push(kelas);
          } else {
            theoryClasses.push(kelas);
          }
        });

        const usedIds = new Set();
        const units = [];

        randomize(theoryClasses).forEach((kelas) => {
          const base = getBaseCourseName(kelas);
          const candidates = praktikumByBase[base] || [];
          const theoryDosen = normalizeText(kelas.dosen);
          const theoryDosenId = getDosenIdForKelas(kelas);
          const practicumPair = candidates
            .filter((item) => !usedIds.has(item.id))
            .sort((a, b) => {
              const aSameDosen = (theoryDosenId && theoryDosenId === getDosenIdForKelas(a)) || (theoryDosen && theoryDosen === normalizeText(a.dosen)) ? 0 : 1;
              const bSameDosen = (theoryDosenId && theoryDosenId === getDosenIdForKelas(b)) || (theoryDosen && theoryDosen === normalizeText(b.dosen)) ? 0 : 1;
              return aSameDosen - bSameDosen;
            })[0];

          if (practicumPair) {
            units.push({ type: 'pair', theory: kelas, practicum: practicumPair });
            usedIds.add(kelas.id);
            usedIds.add(practicumPair.id);
          } else {
            units.push({ type: 'single', kelas });
            usedIds.add(kelas.id);
          }
        });

        randomize(practicumClasses).forEach((kelas) => {
          if (!usedIds.has(kelas.id)) {
            units.push({ type: 'single', kelas });
            usedIds.add(kelas.id);
          }
        });

        return units;
      };

      const scheduleUnits = buildScheduleUnits();
      const customFirstUnits = [];
      const defaultUnits = [];

      for (const unit of scheduleUnits) {
        const anchorKelas = unit.type === 'pair' ? unit.theory : unit.kelas;
        const profile = await getProfileForKelas(anchorKelas);
        const nextUnit = { ...unit, profile };

        if (profile.isCustom) {
          customFirstUnits.push(nextUnit);
        } else {
          defaultUnits.push(nextUnit);
        }
      }

      const orderedUnits = [...shuffleArray(customFirstUnits), ...shuffleArray(defaultUnits)];
      let generated = 0;
      let generatedSingleClasses = 0;
      let generatedPairBundles = 0;
      let skippedNoCandidate = 0;
      let skippedSaturdayOnlyPreference = 0;
      let skippedApiFailure = 0;
      const skippedDetails = [];

      for (const unit of orderedUnits) {
        const preferredDays = Array.isArray(unit.profile?.preferredDays) ? unit.profile.preferredDays : days;
        const hasNonSaturdayPreferredDay = preferredDays.some((day) => day !== 'Sabtu');
        const classCount = unit.type === 'pair' ? 2 : 1;

        if (autoGenSettings.skipSaturday && unit.profile?.isCustom && !hasNonSaturdayPreferredDay) {
          skippedSaturdayOnlyPreference += classCount;
          skippedDetails.push(`${getKelasName(anchorKelas)}: preferensi hanya Sabtu`);
          continue;
        }

        if (unit.type === 'pair') {
          const candidates = getPairedAutoGenCandidateSlots(unit.theory, unit.practicum, unit.profile, generationSemester);
          if (candidates.length === 0) {
            skippedNoCandidate += classCount;
            skippedDetails.push(`${getKelasName(unit.theory)} + ${getKelasName(unit.practicum)}: tidak ada slot cocok`);
            continue;
          }

          const candidate = candidates[0];
          const theoryPayload = {
            kelas_id: unit.theory.id,
            hari: candidate.hari,
            ruangan_id: candidate.ruangan_id,
            jam_mulai: candidate.jam_mulai,
            jam_selesai: candidate.theory_end,
            display_name: unit.theory.display_name || unit.theory.nama_kelas,
            semester: generationSemester,
            dosen_id: getDosenIdForKelas(unit.theory),
          };

          const practicumPayload = {
            kelas_id: unit.practicum.id,
            hari: candidate.hari,
            ruangan_id: candidate.ruangan_id,
            jam_mulai: candidate.theory_end,
            jam_selesai: candidate.jam_selesai,
            display_name: unit.practicum.display_name || unit.practicum.nama_kelas,
            semester: generationSemester,
            dosen_id: getDosenIdForKelas(unit.practicum),
          };

          const theoryRes = await fetch('/api/jadwal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(theoryPayload),
          });

          if (!theoryRes.ok) {
            skippedApiFailure += classCount;
            const error = await theoryRes.json().catch(() => ({}));
            skippedDetails.push(`${getKelasName(unit.theory)} + ${getKelasName(unit.practicum)}: ${error.error || 'gagal menyimpan teori'}`);
            continue;
          }

          const practicumRes = await fetch('/api/jadwal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(practicumPayload),
          });

          if (!practicumRes.ok) {
            skippedApiFailure += classCount;
            const error = await practicumRes.json().catch(() => ({}));
            skippedDetails.push(`${getKelasName(unit.theory)} + ${getKelasName(unit.practicum)}: ${error.error || 'gagal menyimpan praktikum'}`);
            continue;
          }

          generated += 2;
          generatedPairBundles += 1;
          continue;
        }

        const kelas = unit.kelas;
        const candidates = getAutoGenCandidateSlots(kelas, unit.profile, generationSemester);
        if (candidates.length === 0) {
          skippedNoCandidate += classCount;
          skippedDetails.push(`${getKelasName(kelas)}: tidak ada slot cocok`);
          continue;
        }

        const candidate = candidates[0];
        const jadwalPayload = {
          kelas_id: kelas.id,
          hari: candidate.hari,
          ruangan_id: candidate.ruangan_id,
          jam_mulai: candidate.jam_mulai,
          jam_selesai: candidate.jam_selesai,
          display_name: kelas.display_name || kelas.nama_kelas,
          semester: generationSemester,
          dosen_id: getDosenIdForKelas(kelas),
        };

        const res = await fetch('/api/jadwal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(jadwalPayload),
        });

        if (res.ok) {
          generated += 1;
          generatedSingleClasses += 1;
        } else {
          skippedApiFailure += classCount;
          const error = await res.json().catch(() => ({}));
          skippedDetails.push(`${getKelasName(kelas)}: ${error.error || 'gagal menyimpan ke server'}`);
        }
      }

      const totalSkipped = skippedNoCandidate + skippedSaturdayOnlyPreference + skippedApiFailure;
      showMessage(
        'success',
        `Hasil generate jadwal:\n\n✅ Sesi berhasil: ${generated}\n- Kelas single: ${generatedSingleClasses}\n- Pasangan teori+praktikum: ${generatedPairBundles} pasangan (${generatedPairBundles * 2} sesi)\n\n⏭️ Kelas dilewati: ${totalSkipped}\n- Tidak ada slot cocok: ${skippedNoCandidate}\n- Preferensi hanya Sabtu (filter Sabtu aktif): ${skippedSaturdayOnlyPreference}\n- Gagal simpan ke server: ${skippedApiFailure}${skippedDetails.length ? `\n\nDetail:\n- ${skippedDetails.join('\n- ')}` : ''}`
      );
      setShowAutoGenModal(false);
      await fetchData();
    } catch (err) {
      showMessage('error', `Error generating schedule: ${err.message}`);
    }
  };

  const exportToXLSX = () => {
    const wb = XLSX.utils.book_new();
    days.forEach((day) => {
      if (!visibleDays[day]) return;
      const timeSlots = generateTimeSlots(day); const dayData = jadwalData[day] || {}; const wsData = [];
      wsData.push([`JADWAL KULIAH - ${day} (${selectedSemester})`]); wsData.push([`Preset: ${activePreset}`]); wsData.push([]);
      const headerRow = ['Ruangan']; timeSlots.forEach((slot) => headerRow.push(`${slot.start}-${slot.end}`)); wsData.push(headerRow);
      const sortedRuangan = [...ruanganList].sort((a, b) => (a.f_namaruang || '').localeCompare(b.f_namaruang || ''));
      const semesterNumbers = getSemesterNumbersForComparison(selectedSemester);
      sortedRuangan.forEach((ruangan) => {
        const row = [ruangan.f_namaruang]; const sessions = (dayData[ruangan.id] || []).filter((s) => semesterNumbers.includes(Number(s.semester)));
        timeSlots.forEach((slot) => { const occupyingSession = sessions.find((s) => { const sessionStartMin = timeToMinutes(s.jam_mulai); const sessionEndMin = timeToMinutes(s.jam_selesai); const slotStartMin = timeToMinutes(slot.start); const slotEndMin = timeToMinutes(slot.end); return sessionStartMin < slotEndMin && sessionEndMin > slotStartMin; }); if (occupyingSession) row.push(occupyingSession.display_name); else if (slot.isBreak) row.push('ISTIRAHAT'); else row.push(''); });
        wsData.push(row);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData); ws['!cols'] = [{ wch: 20 }, ...timeSlots.map(() => ({ wch: 14 }))];
      XLSX.utils.book_append_sheet(wb, ws, day);
    });
    XLSX.writeFile(wb, `jadwal_kuliah_${selectedSemester}_${new Date().toISOString().split('T')[0]}.xlsx`);
    showMessage('success', 'Jadwal diexport ke XLSX');
  };

  // ===== SHARED INLINE STYLES (Edumy design system — matches DosenPage) =====
  const s = {
    page: { minHeight: '100vh', backgroundColor: '#F3F5FA', fontFamily: "'Jost', 'Poppins', -apple-system, BlinkMacSystemFont, sans-serif" },
    inner: { maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 2rem' },
    // Header
    titleBar: { padding: '2rem 2rem 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' },
    breadcrumb: { fontSize: '0.8rem', color: '#9AA5BC', fontWeight: '500', marginBottom: '0.5rem' },
    breadcrumbSep: { color: '#C7CEDD', margin: '0 0.25rem' },
    breadcrumbActive: { color: '#1B7A43', fontWeight: '600' },
    titleText: { fontSize: '1.9rem', fontWeight: 700, color: '#1E2A45', margin: 0, fontFamily: "'Poppins', sans-serif", letterSpacing: '-0.01em' },
    titleSub: { fontSize: '0.9rem', color: '#8A96AD', margin: '0.35rem 0 0 0' },
    headerIconWrap: { width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #3FA96B, #1B7A43)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(27,122,67,0.28)' },
    headerIcon: { fontSize: '1.6rem' },
    // Cards
    card: { backgroundColor: 'white', borderRadius: '18px', boxShadow: '0 4px 22px rgba(30,42,69,0.06)', border: '1px solid #EEF1F8', marginBottom: '1.5rem', overflow: 'hidden' },
    cardHeader: { backgroundColor: '#FAFBFF', borderBottom: '1px solid #EEF1F8', padding: '1rem 1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' },
    cardHeaderText: { fontSize: '1rem', fontWeight: 700, color: '#1E2A45', margin: 0, fontFamily: "'Poppins', sans-serif" },
    cardBody: { padding: '1.75rem' },
    // Alerts
    alertSuccess: { padding: '0.85rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem', fontWeight: 500, fontSize: '0.875rem', backgroundColor: '#F0FBF6', color: '#0E9B6E', border: '1px solid #C3EEDF' },
    alertError: { padding: '0.85rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem', fontWeight: 500, fontSize: '0.875rem', backgroundColor: '#FDF1F2', color: '#E5484D', border: '1px solid #F8CDD3' },
    // Inputs
    input: { width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1.5px solid #E4E8F1', fontSize: '0.875rem', color: '#1E2A45', boxSizing: 'border-box', outline: 'none', backgroundColor: 'white' },
    inputDisabled: { width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1.5px solid #E4E8F1', fontSize: '0.875rem', color: '#5B6A88', boxSizing: 'border-box', backgroundColor: '#F8FAFC' },
    select: { width: '100%', padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1.5px solid #E4E8F1', fontSize: '0.875rem', color: '#1E2A45', boxSizing: 'border-box', outline: 'none', backgroundColor: 'white', cursor: 'pointer' },
    // Labels
    label: { display: 'block', fontWeight: 600, fontSize: '0.78rem', color: '#5B6A88', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.4rem' },
    // Buttons (Edumy pill style)
    btnPrimary: { padding: '0.6rem 1.35rem', background: 'linear-gradient(135deg, #3FA96B, #1B7A43)', color: 'white', border: 'none', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(27,122,67,0.35)', transition: 'opacity 0.2s, transform 0.1s' },
    btnSuccess: { padding: '0.6rem 1.35rem', backgroundColor: '#E4F7F0', color: '#0E9B6E', border: '1px solid #C3EEDF', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s, transform 0.1s' },
    btnPurple: { padding: '0.6rem 1.35rem', background: 'linear-gradient(135deg, #2FA365, #146C39)', color: 'white', border: 'none', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(20,108,57,0.32)', transition: 'opacity 0.2s, transform 0.1s' },
    btnAmber: { padding: '0.6rem 1.35rem', backgroundColor: '#D7F0E1', color: '#146C39', border: '1px solid #BEE7CC', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s, transform 0.1s' },
    btnGray: { padding: '0.6rem 1.35rem', backgroundColor: '#F3F5FA', color: '#5B6A88', border: '1px solid #E4E8F1', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' },
    btnGrayDisabled: { padding: '0.6rem 1.35rem', backgroundColor: '#F3F5FA', color: '#C2CADA', border: '1px solid #E4E8F1', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600, cursor: 'not-allowed' },
    btnSavePreset: { padding: '0.55rem 1.1rem', backgroundColor: '#E4F7F0', color: '#0E9B6E', border: '1px solid #C3EEDF', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' },
    btnPresetActive: { padding: '0.5rem 1.25rem', background: 'linear-gradient(135deg, #3FA96B, #1B7A43)', color: 'white', border: 'none', borderRadius: '999px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(27,122,67,0.3)', fontSize: '0.875rem' },
    btnPresetInactive: { padding: '0.5rem 1.25rem', backgroundColor: '#F3F5FA', color: '#5B6A88', border: '1px solid #E4E8F1', borderRadius: '999px', fontWeight: 500, cursor: 'pointer', fontSize: '0.875rem' },
    btnClose: { backgroundColor: '#F3F5FA', border: '1px solid #E4E8F1', color: '#5B6A88', fontSize: '1rem', cursor: 'pointer', borderRadius: '999px', padding: '0.3rem 0.7rem', lineHeight: 1 },
    // Filter strips
    filterStrip: { padding: '1rem 1.25rem', backgroundColor: '#EAF7EF', borderRadius: '14px', borderLeft: '4px solid #1B7A43', marginBottom: '1.25rem' },
    subFilterStrip: { padding: '1rem 1.25rem', backgroundColor: '#FAFBFF', borderRadius: '14px', border: '1px solid #EEF1F8', marginBottom: '1.25rem' },
    searchHint: { display: 'block', marginTop: '0.5rem', fontSize: '0.75rem', color: '#8A96AD' },
    // Modal
    overlay: { position: 'fixed', inset: 0, padding: '1rem', boxSizing: 'border-box', overflowY: 'auto', backgroundColor: 'rgba(20,24,40,0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 },
    modalBox: { backgroundColor: 'white', borderRadius: '20px', maxWidth: '480px', width: 'min(480px, 100%)', maxHeight: 'calc(100vh - 2rem)', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(20,24,40,0.28)', overflow: 'hidden' },
    modalHeader: { backgroundColor: '#FAFBFF', borderBottom: '1px solid #EEF1F8', padding: '1.25rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    modalTitle: { fontSize: '1.1rem', fontWeight: 700, color: '#1E2A45', margin: 0, fontFamily: "'Poppins', sans-serif" },
    modalBody: { padding: '1.75rem', overflowY: 'auto', minHeight: 0 },
    modalFooter: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #EEF1F8' },
    btnDeleteModal: { marginRight: 'auto', padding: '0.6rem 1rem', backgroundColor: '#FDEBEE', color: '#E5484D', border: '1px solid #F8CDD3', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' },
    // Info/warning boxes
    infoBlue: { padding: '0.75rem 1rem', borderRadius: '10px', backgroundColor: '#E3F5EA', border: '1px solid #BEE7CC', fontSize: '0.8rem', color: '#1B7A43', marginTop: '0.75rem' },
    warnYellow: { padding: '0.75rem 1rem', borderRadius: '10px', backgroundColor: '#EAF7EF', border: '1px solid #BEE7CC', fontSize: '0.8rem', color: '#12592F', marginTop: '0.75rem' },
    errRed: { padding: '0.75rem 1rem', borderRadius: '10px', backgroundColor: '#FDF1F2', border: '1px solid #F8CDD3', fontSize: '0.8rem', color: '#E5484D', marginTop: '0.75rem' },
    // Day section
    dayBadge: { backgroundColor: '#D7F0E1', color: '#146C39', padding: '0.2rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700 },
    // Table cells
    cellBreak: { backgroundColor: '#FDEBEE', textAlign: 'center', padding: '0.5rem', fontSize: '0.72rem', fontWeight: 700, color: '#E5484D', position: 'relative', border: '1px solid #F8CDD3' },
    cellOccupied: { backgroundColor: '#E4F7F0', padding: '0.25rem', fontSize: '0.72rem', position: 'relative', border: '1px solid #C3EEDF', cursor: 'pointer', textAlign: 'center', verticalAlign: 'middle' },
    customPreferenceBadge: { display: 'inline-block', backgroundColor: '#EAF7EF', color: '#12592F', border: '1px solid #BEE7CC', borderRadius: '999px', padding: '0.08rem 0.4rem', fontSize: '0.6rem', fontWeight: 700 },
    cellEmpty: { backgroundColor: 'white', padding: '0.25rem', border: '1px solid #F3F5FA', textAlign: 'center', verticalAlign: 'middle', cursor: 'pointer' },
    cellBtnEdit: { fontSize: '0.65rem', backgroundColor: '#E3F5EA', color: '#1B7A43', border: 'none', borderRadius: '999px', padding: '0.15rem 0.5rem', cursor: 'pointer', marginRight: '0.25rem', fontWeight: 600 },
    cellBtnDel: { fontSize: '0.65rem', backgroundColor: '#FDEBEE', color: '#E5484D', border: 'none', borderRadius: '999px', padding: '0.15rem 0.5rem', cursor: 'pointer', fontWeight: 600 },
    cellAddBtn: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: '#1B7A43', fontSize: '1.25rem', fontWeight: 700, cursor: 'pointer' },
    // Checkbox day toggle
    dayToggleCard: { backgroundColor: '#FAFBFF', borderRadius: '14px', border: '1px solid #EEF1F8', padding: '1rem 1.5rem', marginBottom: '1.5rem' },
    // Preset info
    presetInfoBox: { backgroundColor: '#EAF7EF', borderRadius: '14px', padding: '0.9rem 1.1rem', marginTop: '0.75rem', fontSize: '0.8rem', color: '#12592F', borderLeft: '4px solid #1B7A43' },
    // Mini dashboard stats
    miniStatsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '0.85rem', marginBottom: '1.25rem' },
    miniStatCard: { backgroundColor: '#FAFBFF', border: '1px solid #EEF1F8', borderRadius: '14px', padding: '0.9rem 1rem' },
    miniStatLabel: { fontSize: '0.72rem', fontWeight: 700, color: '#8A96AD', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' },
    miniStatValue: { fontSize: '1.45rem', fontWeight: 800, color: '#1E2A45', lineHeight: 1.1, fontFamily: "'Poppins', sans-serif" },
    miniStatHint: { fontSize: '0.72rem', color: '#8A96AD', marginTop: '0.45rem' },
    // Popup modal styling
    popupBox: { background: 'white', borderRadius: '20px', width: '360px', maxWidth: '90vw', boxShadow: '0 24px 64px rgba(20,24,40,0.28)', overflow: 'hidden', padding: '2rem', textAlign: 'center' },
    popupTitle: { fontSize: '2.5rem', margin: '0 0 1rem 0', lineHeight: 1 },
    popupText: { fontSize: '0.95rem', color: '#1E2A45', margin: '0 0 1.5rem 0', lineHeight: '1.5', whiteSpace: 'pre-line', fontWeight: 500 },
    popupBtn: { padding: '0.6rem 1.6rem', background: 'linear-gradient(135deg, #3FA96B, #1B7A43)', color: 'white', border: 'none', borderRadius: '999px', fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 14px rgba(27,122,67,0.3)', transition: 'opacity 0.2s' },
  };

  const effectivePreferencePreset = getEffectivePreferencePreset({
    databasePresets: databasePresetsList,
    localPreset: settings,
    localPresetName: selectedPresetOption || activePreset || 'Default',
  });

  const handlePreferenceSaved = ({ dosenId, isCustom }) => {
    setCustomPreferenceByDosenId((prev) => ({
      ...prev,
      [dosenId]: Boolean(isCustom),
    }));
  };

  if (checking) return (
    <div style={s.page}>
      <div style={s.titleBar}>
        <div>
          <div style={s.breadcrumb}>Dashboard <span style={s.breadcrumbSep}>/</span> Manajemen Akademik <span style={s.breadcrumbSep}>/</span> <span style={s.breadcrumbActive}>Jadwal</span></div>
          <h1 style={s.titleText}>Jadwal Kuliah</h1>
          <p style={s.titleSub}>Kelola jadwal kuliah dengan mudah</p>
        </div>
        <div style={s.headerIconWrap}><span style={s.headerIcon}>📅</span></div>
      </div>
      <div style={{ textAlign: 'center', padding: '4rem', color: '#1B7A43', fontWeight: 600 }}>⏳ Checking authentication...</div>
    </div>
  );

  if (loading) return (
    <div style={s.page}>
      <div style={s.titleBar}>
        <div>
          <div style={s.breadcrumb}>Dashboard <span style={s.breadcrumbSep}>/</span> Manajemen Akademik <span style={s.breadcrumbSep}>/</span> <span style={s.breadcrumbActive}>Jadwal</span></div>
          <h1 style={s.titleText}>Jadwal Kuliah</h1>
          <p style={s.titleSub}>Kelola jadwal kuliah dengan mudah</p>
        </div>
        <div style={s.headerIconWrap}><span style={s.headerIcon}>📅</span></div>
      </div>
      <div style={{ textAlign: 'center', padding: '4rem', color: '#1B7A43', fontWeight: 600 }}>⏳ Memuat data...</div>
    </div>
  );

  return (
    <div style={s.page}>
      {/* ── Title Bar ── */}
      <div style={s.titleBar}>
        <div>
          <div style={s.breadcrumb}>Dashboard <span style={s.breadcrumbSep}>/</span> Manajemen Akademik <span style={s.breadcrumbSep}>/</span> <span style={s.breadcrumbActive}>Jadwal</span></div>
          <h1 style={s.titleText}>Jadwal Kuliah</h1>
          <p style={s.titleSub}>Kelola jadwal kuliah dengan mudah</p>
        </div>
        <div style={s.headerIconWrap}><span style={s.headerIcon}>📅</span></div>
      </div>

      <div style={s.inner}>
        {/* ── Spacer ── */}
        <div style={{ height: '1.5rem' }} />

        {/* ── Message Popup ── */}
        {messagePopup.show && (
          <div style={s.overlay} onClick={closeMessagePopup}>
            <div style={s.popupBox} onClick={(e) => e.stopPropagation()}>
              <h2 style={s.popupTitle}>{messagePopup.type === 'success' ? '✅' : '❌'}</h2>
              <p style={s.popupText}>{messagePopup.text}</p>
              <button style={s.popupBtn} onClick={closeMessagePopup}>Tutup</button>
            </div>
          </div>
        )}

        {/* ── Filter Section ── */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <h3 style={s.cardHeaderText}>🔍 Filter Jadwal</h3>
          </div>
          <div style={s.cardBody}>
            <div style={s.filterStrip}>
              <label style={s.label}>📅 Tahun Ajaran</label>
              <select value={selectedTahunAjaran} onChange={(e) => setSelectedTahunAjaran(e.target.value)} style={s.select}>
                <option value="">-- Pilih Tahun Ajaran --</option>
                {tahunAjaranList.map((t) => <option key={t.id} value={t.id}>{t.tahun_ajaran}</option>)}
              </select>
            </div>
            {selectedTahunAjaran && (
              <div style={s.subFilterStrip}>
                <label style={s.label}>📚 Semester</label>
                <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} style={s.select}>
                  {semesters.map((sem) => <option key={sem} value={sem}>{sem}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {selectedTahunAjaran && (
          <>
        {/* ── Control Panel ── */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h3 style={s.cardHeaderText}>🎛️ Pengaturan Jadwal</h3>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {dosenList.length > 0 && (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    onClick={() => {
                      setSelectedDosenForPref(dosenList[0]);
                      handleEditDosenPreference(dosenList[0]);
                    }}
                    style={s.btnSavePreset}
                    title="Pilih dosen untuk edit preferensi"
                  >
                    👥 Kelola Preferensi Dosen
                  </button>
                  {dosenList.length > 1 && (
                    <select
                      onChange={(e) => {
                        const dosen = dosenList.find(d => d.id === parseInt(e.target.value));
                        if (dosen) {
                          setSelectedDosenForPref(dosen);
                          handleEditDosenPreference(dosen);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: '0',
                        right: '0',
                        opacity: '0',
                        width: '100%',
                        height: '100%',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="">Pilih dosen</option>
                      {dosenList.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.f_namapegawai} {customPreferenceByDosenId[d.id] ? '• Custom' : '• Default'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={s.cardBody}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={s.label}>Preset</label>
              <select
                value={selectedPresetOption}
                onChange={(e) => {
                  const nextPreset = e.target.value;
                  setSelectedPresetOption(nextPreset);
                  setActivePreset(nextPreset);
                  setSettings(presets[nextPreset]);
                }}
                style={s.select}
              >
                <option value="Normal">Normal</option>
                <option value="Ramadhan">Ramadhan</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={s.label}>Jam Mulai</label>
                <input type="time" value={settings.jamMulai} onChange={(e) => setSettings({ ...settings, jamMulai: e.target.value })} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Istirahat Senin-Kamis</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="time" value={settings.jamIstirahatMulaiSeninKamis} onChange={(e) => setSettings({ ...settings, jamIstirahatMulaiSeninKamis: e.target.value })} style={{ ...s.input, flex: 1 }} />
                  <span style={{ color: '#8A96AD' }}>–</span>
                  <input type="time" value={settings.jamIstirahatSelesaiSeninKamis} onChange={(e) => setSettings({ ...settings, jamIstirahatSelesaiSeninKamis: e.target.value })} style={{ ...s.input, flex: 1 }} />
                </div>
              </div>
              <div>
                <label style={s.label}>Durasi per Slot (menit)</label>
                <input type="number" value={settings.durasiSlot} min={10} max={120} onChange={(e) => setSettings({ ...settings, durasiSlot: parseInt(e.target.value) })} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Jam Selesai</label>
                <input type="time" value={settings.jamSelesai} onChange={(e) => setSettings({ ...settings, jamSelesai: e.target.value })} style={s.input} />
              </div>
              <div>
                <label style={s.label}>Istirahat Jumat</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input type="time" value={settings.jamIstirahatMulaiJumat} onChange={(e) => setSettings({ ...settings, jamIstirahatMulaiJumat: e.target.value })} style={{ ...s.input, flex: 1 }} />
                  <span style={{ color: '#8A96AD' }}>–</span>
                  <input type="time" value={settings.jamIstirahatSelesaiJumat} onChange={(e) => setSettings({ ...settings, jamIstirahatSelesaiJumat: e.target.value })} style={{ ...s.input, flex: 1 }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                <button onClick={() => setShowAutoGenModal(true)} style={s.btnPurple}>⚡ Generate Otomatis</button>
                <button onClick={handleUpdatePreset} style={s.btnAmber}>💾 Simpan Perubahan</button>
              </div>
              <button onClick={exportToXLSX} style={s.btnSuccess}>📊 Export XLSX</button>
            </div>
          </div>
        </div>

        {/* ── Day Visibility ── */}
        <div style={s.dayToggleCard}>
          <p style={{ ...s.label, marginBottom: '0.75rem' }}>Tampilkan / Sembunyikan Hari</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {days.map((day) => (
              <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#42506B', fontWeight: 500 }}>
                <input type="checkbox" checked={visibleDays[day]} onChange={(e) => setVisibleDays({ ...visibleDays, [day]: e.target.checked })} style={{ accentColor: '#1B7A43', width: '16px', height: '16px' }} />
                {day}
              </label>
            ))}
          </div>
        </div>

        {/* ── Schedule Matrix ── */}
        <div style={s.card}>
          <div style={s.miniStatsGrid}>
            <div style={s.miniStatCard}>
              <div style={s.miniStatLabel}>Jumlah Kelas</div>
              <div style={s.miniStatValue}>{miniDashboardStats.totalKelas}</div>
              <div style={s.miniStatHint}>{selectedProdiFilter === 'ALL' ? 'Semua fakultas/prodi' : `Filter prodi: ${selectedProdiFilter}`}</div>
            </div>
            <div style={s.miniStatCard}>
              <div style={s.miniStatLabel}>Sudah Masuk Jadwal</div>
              <div style={{ ...s.miniStatValue, color: '#0E9B6E' }}>{miniDashboardStats.masukJadwal}</div>
              <div style={s.miniStatHint}>Kelas yang sudah punya sesi</div>
            </div>
            <div style={s.miniStatCard}>
              <div style={s.miniStatLabel}>Belum Masuk Jadwal</div>
              <div style={{ ...s.miniStatValue, color: '#146C39' }}>{miniDashboardStats.belumMasuk}</div>
              <div style={s.miniStatHint}>Perlu dijadwalkan</div>
            </div>
          </div>

          <div style={s.subFilterStrip}>
            <label style={s.label}>🔎 Search Sesi (Dosen / NIDN / Mata Kuliah)</label>
            <input
              type="text"
              value={scheduleSearch}
              onChange={(e) => setScheduleSearch(e.target.value)}
              placeholder="Contoh: Budi, 0011223344, Algoritma"
              style={s.input}
            />
            <small style={s.searchHint}>Saat diisi, matriks hanya menampilkan sesi yang cocok dengan keyword.</small>
          </div>

          <div style={s.subFilterStrip}>
            <label style={s.label}>🏷️ Filter Prodi ID</label>
            <select value={selectedProdiFilter} onChange={(e) => setSelectedProdiFilter(e.target.value)} style={s.select}>
              <option value="ALL">Default - Semua Prodi</option>
              {Array.from(new Set(dosenList.map((d) => (d.f_progdi_id || '').trim()).filter(Boolean))).sort().map((prodiId) => (
                <option key={prodiId} value={prodiId}>{prodiId}</option>
              ))}
            </select>
          </div>

          <div style={s.cardHeader}>
            <h3 style={s.cardHeaderText}>📋 Matriks Jadwal Kuliah</h3>
          </div>
          <div ref={tableRef} style={s.cardBody}>
            {days.map((day) => {
              if (!visibleDays[day]) return null;
              const dayData = jadwalData[day] || {};
              const timeSlots = generateTimeSlots(day);
              const semesterNumbers = getSemesterNumbersForComparison(selectedSemester);
              const filteredDayData = {};
              Object.entries(dayData).forEach(([ruanganId, sessions]) => {
                filteredDayData[ruanganId] = (sessions || []).filter((session) => {
                  if (!semesterNumbers.includes(Number(session.semester))) return false;
                  return isSessionVisibleByFilters(session);
                });
              });
              const totalSesi = Object.values(filteredDayData).flat().length;
              const hasActiveDisplayFilter = normalizeText(scheduleSearch).length > 0 || selectedProdiFilter !== 'ALL';

              return (
                <div key={day} style={{ marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1E2A45', margin: 0, fontFamily: "'Poppins', sans-serif" }}>{day}</h3>
                    <span style={s.dayBadge}>{totalSesi} sesi</span>
                  </div>
                  <div style={{ maxHeight: '70vh', overflow: 'auto', borderRadius: '14px', border: '1px solid #EEF1F8' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#FAFBFF' }}>
                          <th style={{ padding: '0.65rem 0.75rem', textAlign: 'left', color: '#5B6A88', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', width: '120px', border: '1px solid #EEF1F8' }}>Ruangan</th>
                          {timeSlots.map((slot, idx) => (
                            <th key={idx} style={{ padding: '0.5rem 0.25rem', textAlign: 'center', color: slot.isBreak ? '#E5484D' : '#5B6A88', fontWeight: slot.isBreak ? 700 : 600, fontSize: '0.68rem', width: '80px', backgroundColor: slot.isBreak ? '#FDEBEE' : 'transparent', border: '1px solid #EEF1F8' }}>
                              <div>{slot.start}</div><div style={{ fontSize: '0.6rem', opacity: 0.6 }}>–</div><div>{slot.end}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...ruanganList].sort((a, b) => (a.f_namaruang || '').localeCompare(b.f_namaruang || '')).map((ruangan) => (
                          <tr key={ruangan.id} style={{ borderBottom: '1px solid #F3F5FA' }}>
                            <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, fontSize: '0.8rem', color: '#146C39', backgroundColor: '#EAF7EF', border: '1px solid #EEF1F8', verticalAlign: 'middle' }}>
                              {ruangan.f_namaruang}
                            </td>
                            {timeSlots.map((slot, idx) => {
                              const sessions = filteredDayData[ruangan.id] || [];
                              const sessionInSlot = sessions.find((s) => s.jam_mulai === slot.start && s.jam_selesai === slot.end);
                              const occupyingSession = sessions.find((s) => { const ss = timeToMinutes(s.jam_mulai); const se = timeToMinutes(s.jam_selesai); const ts = timeToMinutes(slot.start); const te = timeToMinutes(slot.end); return ss < te && se > ts; });
                              const isOccupied = Boolean(occupyingSession);

                              const openEditModal = (session) => {
                                setEditingSession(session); setSelectedHari(day); setSelectedRuangan(ruangan.id);
                                setSelectedJamMulai(session.jam_mulai); setCalculatedJamSelesai(session.jam_selesai);
                                if (session.kelas_id) { const kelas = kelasList.find((k) => k.id === session.kelas_id); setSelectedKelas(kelas); setSessionInputMode('import'); setSessionInput(session.kelas_id.toString()); }
                                else { setSessionInputMode('manual'); setSessionInput(session.display_name); }
                                setShowSessionModal(true);
                              };

                              if (slot.isBreak) return (
                                <td key={idx} style={s.cellBreak}>ISTIRAHAT</td>
                              );
                              if (sessionInSlot) return (
                                <td key={idx} style={s.cellOccupied}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', height: '100%', justifyContent: 'center' }}>
                                    <span style={{ fontWeight: 700, color: '#0E9B6E', fontSize: '0.7rem', textAlign: 'center', lineHeight: 1.3 }}>{sessionInSlot.display_name}</span>
                                    {getSessionContext(sessionInSlot).isCustomPreference && (
                                      <span style={s.customPreferenceBadge}>Custom Pref</span>
                                    )}
                                    <div style={{ display: 'flex', gap: '0.2rem' }}>
                                      <button onClick={() => openEditModal(sessionInSlot)} style={s.cellBtnEdit}>Edit</button>
                                      <button onClick={() => handleDeleteSession(sessionInSlot.id)} style={s.cellBtnDel}>Hapus</button>
                                    </div>
                                  </div>
                                </td>
                              );
                              if (isOccupied && occupyingSession) return (
                                <td key={idx} style={{ ...s.cellOccupied, backgroundColor: '#EAF7EF', border: '1px solid #BEE7CC' }} onClick={() => openEditModal(occupyingSession)}>
                                  <span style={{ fontSize: '0.65rem', color: '#146C39', fontStyle: 'italic', opacity: 0.85 }}>({occupyingSession.display_name})</span>
                                </td>
                              );
                              if (hasActiveDisplayFilter) return (
                                <td key={idx} style={s.cellEmpty} />
                              );
                              return (
                                <td key={idx} style={s.cellEmpty}>
                                  <button onClick={() => { setSelectedHari(day); setSelectedRuangan(ruangan.id); setSelectedJamMulai(slot.start); setCalculatedJamSelesai(calculateJamSelesai(slot.start, 1)); setSessionInput(''); setSelectedKelas(null); setEditingSession(null); setShowSessionModal(true); }} style={s.cellAddBtn} title="Tambah sesi">+</button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
          </>
        )}
      </div>

      {/* ── Session Modal ── */}
      {showSessionModal && (
        <div style={s.overlay} onClick={handleSessionModalOverlayClick}>
          <div style={s.modalBox}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>{editingSession ? '✏️ Edit Sesi' : '➕ Tambah Sesi'}</h2>
              <button style={s.btnClose} onClick={() => { resetFormFields(); setShowSessionModal(false); }}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={s.label}>Hari</label>
                  <input type="text" value={selectedHari} disabled style={s.inputDisabled} />
                </div>
                <div>
                  <label style={s.label}>Ruangan</label>
                  <select value={selectedRuangan} onChange={(e) => setSelectedRuangan(e.target.value)} style={s.select}>
                    <option value="">Pilih Ruangan</option>
                    {[...ruanganList].sort((a, b) => (a.f_namaruang || '').localeCompare(b.f_namaruang || '')).map((r) => <option key={r.id} value={r.id}>{r.f_namaruang}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Mode Input</label>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    {['manual', 'import'].map((mode) => (
                      <label key={mode} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem', color: '#42506B', fontWeight: sessionInputMode === mode ? 700 : 400 }}>
                        <input type="radio" value={mode} checked={sessionInputMode === mode} onChange={(e) => setSessionInputMode(e.target.value)} style={{ accentColor: '#1B7A43' }} />
                        {mode === 'manual' ? 'Manual' : 'Import dari Kelas'}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={s.label}>Jam Mulai</label>
                  <input type="time" value={selectedJamMulai} onChange={(e) => { setSelectedJamMulai(e.target.value); const sks = selectedKelas?.sks || selectedKelas?.f_sks_kurikulum || 1; setCalculatedJamSelesai(calculateJamSelesai(e.target.value, sks)); }} style={s.input} />
                </div>
                <div>
                  <label style={s.label}>Jam Selesai (Otomatis)</label>
                  <input type="time" value={calculatedJamSelesai} disabled style={s.inputDisabled} />
                  {selectedKelas && <small style={{ fontSize: '0.75rem', color: '#1B7A43', marginTop: '0.25rem', display: 'block', fontWeight: 600 }}>📊 {selectedKelas.sks || selectedKelas.f_sks_kurikulum || 1} SKS × {settings.durasiSlot} menit</small>}
                  {selectedKelas && (() => { const sks = selectedKelas.sks || selectedKelas.f_sks_kurikulum || 1; if (sks >= 2 && isSessionCutByBreak(selectedHari, selectedJamMulai, calculatedJamSelesai, sks)) { const bt = getBreakTimes(selectedHari); return <div style={s.errRed}><strong>❌ Jadwal Tidak Valid</strong><br />Kelas {sks} SKS tidak boleh terpotong istirahat <strong>{bt.mulai}–{bt.selesai}</strong></div>; } return null; })()}
                </div>
                <div>
                  <label style={s.label}>{sessionInputMode === 'manual' ? 'Nama Sesi' : 'Pilih Kelas'}</label>
                  {sessionInputMode === 'manual' ? (
                    <input type="text" value={sessionInput} onChange={(e) => setSessionInput(e.target.value)} placeholder="Contoh: Algoritma & Struktur Data" style={s.input} />
                  ) : (
                    <>
                      {kelasList.length > 0 ? (
                        <select value={sessionInput} onChange={(e) => { setSessionInput(e.target.value); const kelas = kelasList.find((k) => k.id === parseInt(e.target.value)); if (kelas) { setSelectedKelas(kelas); setCalculatedJamSelesai(calculateJamSelesai(selectedJamMulai, kelas.sks || kelas.f_sks_kurikulum || 1)); } else { setSelectedKelas(null); setCalculatedJamSelesai(calculateJamSelesai(selectedJamMulai, 1)); } }} style={s.select}>
                          <option value="">Pilih Kelas</option>
                          {kelasList.map((k) => <option key={k.id} value={k.id}>{k.display_name || k.nama_kelas} (SKS: {k.sks || k.f_sks_kurikulum})</option>)}
                        </select>
                      ) : (
                        <div style={{ padding: '0.7rem 0.9rem', borderRadius: '10px', border: '1.5px solid #F8CDD3', fontSize: '0.875rem', color: '#E5484D', backgroundColor: '#FDF1F2' }}>
                          <strong>❌ Tidak ada kelas</strong><br />
                          <small>Pastikan sudah memilih tahun ajaran dan semester</small>
                        </div>
                      )}
                      {selectedKelas && !editingSession && (() => { const es = findExistingKelasSchedule(selectedKelas.id); return es.found ? <div style={s.warnYellow}><strong>⚠️ Sudah dijadwalkan</strong><br />{es.hari} pukul {es.jamMulai}–{es.jamSelesai} di {es.ruangan}</div> : null; })()}
                    </>
                  )}
                </div>
                {selectedRuangan && (() => { const ov = findOverlappingSession(selectedHari, selectedRuangan, selectedJamMulai, calculatedJamSelesai); return ov.found ? <div style={s.errRed}><strong>❌ Waktu Bentrok</strong><br />Sudah dipakai oleh <strong>{ov.conflictName}</strong> pukul <strong>{ov.conflictTime}</strong></div> : null; })()}
              </div>
              {(() => {
                const isDuplicate = sessionInputMode === 'import' && selectedKelas && !editingSession && findExistingKelasSchedule(selectedKelas.id).found;
                const sks = selectedKelas?.sks || selectedKelas?.f_sks_kurikulum || 1;
                const isCutByBreak = selectedKelas && sks >= 2 && isSessionCutByBreak(selectedHari, selectedJamMulai, calculatedJamSelesai, sks);
                const isOverlap = selectedRuangan && findOverlappingSession(selectedHari, selectedRuangan, selectedJamMulai, calculatedJamSelesai).found;
                const isDisabled = isDuplicate || isCutByBreak || isOverlap;
                return (
                  <div style={s.modalFooter}>
                    {editingSession && (
                      <button onClick={handleDeleteEditingSession} style={s.btnDeleteModal}>🗑️ Hapus Jadwal</button>
                    )}
                    <button onClick={() => { resetFormFields(); setShowSessionModal(false); }} style={s.btnGray}>Batal</button>
                    <button onClick={handleAddSession} disabled={isDisabled} style={isDisabled ? s.btnGrayDisabled : s.btnPrimary}>{editingSession ? 'Update' : 'Simpan'}</button>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ── Auto-Gen Modal ── */}
      {showAutoGenModal && (
        <div style={s.overlay}>
          <div style={s.modalBox}>
            <div style={s.modalHeader}>
              <h2 style={s.modalTitle}>⚡ Generate Jadwal Otomatis</h2>
              <button style={s.btnClose} onClick={() => setShowAutoGenModal(false)}>✕</button>
            </div>
            <div style={s.modalBody}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={s.label}>Semester Generate</label>
                  <select
                    value={autoGenSettings.semester}
                    onChange={(e) => setAutoGenSettings({ ...autoGenSettings, semester: e.target.value })}
                    style={s.select}
                  >
                    <option value="Gasal">Gasal</option>
                    <option value="Genap">Genap</option>
                  </select>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#42506B' }}>
                  <input
                    type="checkbox"
                    checked={autoGenSettings.combineTheoryPracticum}
                    onChange={(e) => setAutoGenSettings({ ...autoGenSettings, combineTheoryPracticum: e.target.checked })}
                    style={{ accentColor: '#1B7A43' }}
                  />
                  Gabungkan teori dan praktikum (jika pasangan ditemukan)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#42506B' }}>
                  <input
                    type="checkbox"
                    checked={autoGenSettings.skipSaturday}
                    onChange={(e) => setAutoGenSettings({ ...autoGenSettings, skipSaturday: e.target.checked })}
                    style={{ accentColor: '#1B7A43' }}
                  />
                  Tidak mengisi hari Sabtu
                </label>
              </div>
              <div style={s.infoBlue}>Generate selalu menyesuaikan preferensi dosen. Jika preferensi dosen hanya di Sabtu dan filter Sabtu aktif, kelas tersebut akan dilewati.</div>
              <div style={s.modalFooter}>
                <button onClick={() => setShowAutoGenModal(false)} style={s.btnGray}>Batal</button>
                <button onClick={generateScheduleAuto} style={s.btnPurple}>Generate</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Preferensi Dosen Modal ── */}
      <DosenPreferenceModal
        open={showPreferenceModal}
        dosen={selectedDosenForPref}
        preset={effectivePreferencePreset}
        onClose={() => setShowPreferenceModal(false)}
        onSaved={handlePreferenceSaved}
        onShowMessage={showMessage}
      />
    </div>
  );
}