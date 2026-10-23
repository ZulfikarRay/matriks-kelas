import knex from '@/lib/knex';
import { NextResponse } from 'next/server';

const timeToMinutes = (time) => {
  if (!time) return 0;
  const [hours, minutes] = String(time).split(':').map(Number);
  return (hours * 60) + minutes;
};

const normalizeSemester = (semester) => String(semester ?? '').trim().toLowerCase();

const isSameSemesterGroup = (firstSemester, secondSemester) => {
  const first = normalizeSemester(firstSemester);
  const second = normalizeSemester(secondSemester);
  if (!first || !second) return true;

  const firstNumber = Number(first);
  const secondNumber = Number(second);
  const firstGroup = Number.isNaN(firstNumber) ? first : (firstNumber % 2 === 0 ? 'genap' : 'gasal');
  const secondGroup = Number.isNaN(secondNumber) ? second : (secondNumber % 2 === 0 ? 'genap' : 'gasal');
  const normalizedFirstGroup = firstGroup === 'even' ? 'genap' : firstGroup === 'odd' ? 'gasal' : firstGroup;
  const normalizedSecondGroup = secondGroup === 'even' ? 'genap' : secondGroup === 'odd' ? 'gasal' : secondGroup;

  return normalizedFirstGroup === normalizedSecondGroup;
};

const isSameAcademicYear = (firstYearId, secondYearId) => (
  firstYearId === null ||
  firstYearId === undefined ||
  secondYearId === null ||
  secondYearId === undefined ||
  String(firstYearId) === String(secondYearId)
);

class ScheduleRequestError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const prepareScheduleData = async (trx, body, excludedScheduleIds = []) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ScheduleRequestError('Data jadwal tidak valid', 400);
  }

  const requiredFields = ['kelas_id', 'hari', 'ruangan_id', 'jam_mulai', 'jam_selesai'];
  for (const field of requiredFields) {
    if (!body[field]) {
      throw new ScheduleRequestError(`Field ${field} diperlukan`, 400);
    }
  }

  const newStart = timeToMinutes(body.jam_mulai);
  const newEnd = timeToMinutes(body.jam_selesai);
  if (newEnd <= newStart) {
    throw new ScheduleRequestError('Jam selesai harus setelah jam mulai', 400);
  }

  const kelasData = await trx('kelas')
    .where('kelas.id', body.kelas_id)
    .first();

  if (!kelasData) {
    throw new ScheduleRequestError('Data kelas tidak ditemukan', 404);
  }

  const kurikulumData = kelasData.f_matkul_id
    ? await trx('kurikulum')
      .where('kurikulum.id', kelasData.f_matkul_id)
      .first()
    : null;
  const kurikulumMaster = kelasData.f_kurikulum
    ? await trx('kurikulum_master')
      .where('kurikulum_master.id', kelasData.f_kurikulum)
      .first()
    : null;
  const academicYearId = kurikulumMaster?.f_tahun_ajaran ?? null;
  const dosenData = body.dosen_id
    ? await trx('dosen')
      .where('dosen.id', body.dosen_id)
      .first()
    : kelasData.dosen
      ? await trx('dosen').where({ f_namapegawai: kelasData.dosen }).first()
      : null;
  const effectiveDosenId = body.dosen_id || dosenData?.id || null;
  const ruanganData = await trx('ruangan')
    .where('ruangan.id', body.ruangan_id)
    .first();

  if (!ruanganData) {
    throw new ScheduleRequestError('Data ruangan tidak ditemukan', 404);
  }

  const semester = kurikulumData?.f_semester || kelasData.f_semester || null;
  let roomQuery = trx('jadwal')
    .leftJoin('kelas as schedule_kelas', 'jadwal.kelas_id', 'schedule_kelas.id')
    .leftJoin('kurikulum_master as schedule_kurikulum_master', 'schedule_kelas.f_kurikulum', 'schedule_kurikulum_master.id')
    .where({ hari: body.hari, ruangan_id: Number(body.ruangan_id) });
  if (excludedScheduleIds.length > 0) {
    roomQuery = roomQuery.whereNotIn('jadwal.id', excludedScheduleIds);
  }
  const roomSchedules = await roomQuery.select(
    'jadwal.display_name',
    'jadwal.jam_mulai',
    'jadwal.jam_selesai',
    'jadwal.semester',
    'schedule_kurikulum_master.f_tahun_ajaran as tahun_ajaran_id',
  );
  const roomConflict = roomSchedules.find((schedule) => (
    isSameAcademicYear(schedule.tahun_ajaran_id, academicYearId) &&
    isSameSemesterGroup(schedule.semester, semester) &&
    newStart < timeToMinutes(schedule.jam_selesai) &&
    newEnd > timeToMinutes(schedule.jam_mulai)
  ));

  if (roomConflict) {
    throw new ScheduleRequestError(
      `Jadwal bentrok: ${roomConflict.display_name} sudah dijadwalkan pada jam tersebut`,
      409,
    );
  }

  if (effectiveDosenId) {
    let lecturerQuery = trx('jadwal')
      .leftJoin('kelas as schedule_kelas', 'jadwal.kelas_id', 'schedule_kelas.id')
      .leftJoin('kurikulum_master as schedule_kurikulum_master', 'schedule_kelas.f_kurikulum', 'schedule_kurikulum_master.id')
      .where({ hari: body.hari, dosen_id: effectiveDosenId });
    if (excludedScheduleIds.length > 0) {
      lecturerQuery = lecturerQuery.whereNotIn('jadwal.id', excludedScheduleIds);
    }
    const lecturerSchedules = await lecturerQuery.select(
      'jadwal.display_name',
      'jadwal.jam_mulai',
      'jadwal.jam_selesai',
      'jadwal.semester',
      'schedule_kurikulum_master.f_tahun_ajaran as tahun_ajaran_id',
    );
    const lecturerConflict = lecturerSchedules.some((schedule) => (
      isSameAcademicYear(schedule.tahun_ajaran_id, academicYearId) &&
      isSameSemesterGroup(schedule.semester, semester) &&
      newStart < timeToMinutes(schedule.jam_selesai) &&
      newEnd > timeToMinutes(schedule.jam_mulai)
    ));

    if (lecturerConflict) {
      throw new ScheduleRequestError('Dosen sudah memiliki jadwal lain pada waktu yang sama', 409);
    }
  }

  const insertData = {
    kelas_id: body.kelas_id,
    dosen_id: effectiveDosenId,
    kurikulum_id: body.kurikulum_id || kelasData.f_matkul_id || null,
    hari: body.hari,
    ruangan_id: Number(body.ruangan_id),
    jam_mulai: body.jam_mulai,
    jam_selesai: body.jam_selesai,
    display_name: kelasData.display_name || kelasData.nama_kelas,
    nama_mk: kurikulumData?.f_namamk || kelasData.nama_kelas || '',
    kode_mk: kurikulumData?.f_kodemk || '',
    nama_dosen: dosenData?.f_nama_dosen || '',
    nama_ruangan: ruanganData?.f_namaruang || '',
    semester,
    sks: kurikulumData?.f_sks_kurikulum || kelasData.f_sks_kurikulum || null,
    lantai: ruanganData?.f_lantai || null,
  };

  return insertData;
};

const insertSchedule = async (trx, body) => {
  const insertData = await prepareScheduleData(trx, body);
  const [id] = await trx('jadwal').insert(insertData).returning('id');
  const scheduleId = typeof id === 'object' ? id.id : id;

  return { ...insertData, id: scheduleId };
};

const updateSchedule = async (trx, id, body) => {
  const updateData = await prepareScheduleData(trx, body, [id]);
  await trx('jadwal').where({ id }).update({
    ...updateData,
    updated_at: trx.fn.now(),
  });
  return { ...updateData, id };
};

// GET semua jadwal dengan join ke tabel kelas, kurikulum, dosen, dan ruangan
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const kurikulumId = searchParams.get('kurikulum_id');
    const dosenId = searchParams.get('dosen_id');

    let query = knex('jadwal')
      .leftJoin('kelas', 'jadwal.kelas_id', 'kelas.id')
      .leftJoin('kurikulum', 'jadwal.kurikulum_id', 'kurikulum.id')
      .leftJoin('dosen', 'jadwal.dosen_id', 'dosen.id')
      .leftJoin('ruangan', 'jadwal.ruangan_id', 'ruangan.id')
      .select(
        'jadwal.id',
        'jadwal.kelas_id',
        'jadwal.dosen_id',
        'jadwal.kurikulum_id',
        'jadwal.hari',
        'jadwal.ruangan_id',
        'jadwal.jam_mulai',
        'jadwal.jam_selesai',
        'jadwal.display_name',
        'jadwal.nama_mk',
        'jadwal.kode_mk',
        'jadwal.nama_dosen',
        'jadwal.nama_ruangan',
        'jadwal.semester',
        'jadwal.sks',
        'jadwal.lantai',
        'jadwal.learning_type',
        'jadwal.learning_time',
        'jadwal.created_at',
        'jadwal.updated_at',
        'kelas.nama_kelas',
        'kurikulum.f_namamk as nama_matakuliah',
        'dosen.f_namapegawai as nama_dosen_db',
        'ruangan.f_namaruang as nama_ruangan_db'
      );

    // Filter berdasarkan kurikulum_id jika diberikan
    if (kurikulumId) {
      query = query.where('jadwal.kurikulum_id', parseInt(kurikulumId));
    }

    // Filter berdasarkan dosen_id jika diberikan
    if (dosenId) {
      query = query.where('jadwal.dosen_id', parseInt(dosenId));
    }

    const data = await query
      .orderBy('jadwal.hari', 'asc')
      .orderBy('jadwal.jam_mulai', 'asc');
    
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('GET jadwal error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// POST simpan jadwal baru
export async function POST(req) {
  try {
    const body = await req.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Data jadwal tidak valid' }, { status: 400 });
    }
    const isBatch = Array.isArray(body.sessions);
    if (isBatch && (body.sessions.length < 1 || body.sessions.length > 2)) {
      return NextResponse.json(
        { error: 'Batch jadwal harus berisi satu atau dua sesi' },
        { status: 400 },
      );
    }
    const replaceScheduleIds = body.replace_schedule_ids;
    if (
      replaceScheduleIds !== undefined &&
      (!isBatch || !Array.isArray(replaceScheduleIds) || replaceScheduleIds.length !== 1)
    ) {
      return NextResponse.json(
        { error: 'Penggantian jadwal harus berupa batch dengan satu ID jadwal' },
        { status: 400 },
      );
    }

    const sessions = isBatch ? body.sessions : [body];
    const inserted = await knex.transaction(async (trx) => {
      let scheduleToReplace = null;
      if (replaceScheduleIds) {
        const existingSchedules = await trx('jadwal')
          .whereIn('id', replaceScheduleIds)
          .select('id', 'kelas_id');
        if (existingSchedules.length !== replaceScheduleIds.length) {
          throw new ScheduleRequestError('Jadwal yang akan diganti tidak ditemukan', 404);
        }

        const replacementClassIds = new Set(sessions.map((session) => String(session.kelas_id)));
        if (existingSchedules.some((schedule) => !replacementClassIds.has(String(schedule.kelas_id)))) {
          throw new ScheduleRequestError('Jadwal pengganti harus mencakup kelas dari jadwal lama', 400);
        }

        scheduleToReplace = existingSchedules[0];
      }

      const recordsByIndex = new Map();
      if (scheduleToReplace) {
        const replacementIndex = sessions.findIndex(
          (session) => String(session.kelas_id) === String(scheduleToReplace.kelas_id),
        );
        if (replacementIndex < 0) {
          throw new ScheduleRequestError('Kelas dari jadwal lama tidak ditemukan dalam batch', 400);
        }

        recordsByIndex.set(
          replacementIndex,
          await updateSchedule(trx, scheduleToReplace.id, sessions[replacementIndex]),
        );
      }

      for (let index = 0; index < sessions.length; index += 1) {
        if (recordsByIndex.has(index)) continue;
        recordsByIndex.set(index, await insertSchedule(trx, sessions[index]));
      }

      return sessions.map((_, index) => recordsByIndex.get(index));
    });

    if (isBatch) {
      return NextResponse.json({
        success: true,
        data: inserted,
        message: 'Jadwal berhasil disimpan',
      });
    }

    return NextResponse.json({ 
      success: true,
      id: inserted[0].id,
      data: inserted[0],
      message: 'Jadwal berhasil disimpan',
    });
  } catch (err) {
    console.error('❌ POST jadwal error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: err.status || 500 },
    );
  }
}

// PUT update jadwal
export async function PUT(req) {
  try {
    const body = await req.json();

    console.log('📝 Received PUT data:', body);

    if (!body.id) {
      return NextResponse.json(
        { error: 'ID jadwal diperlukan' },
        { status: 400 }
      );
    }

    // Cek apakah jadwal exists
    const existingJadwal = await knex('jadwal')
      .where({ id: body.id })
      .first();
    
    if (!existingJadwal) {
      return NextResponse.json(
        { error: 'Jadwal tidak ditemukan' },
        { status: 404 }
      );
    }
    
    // Siapkan data update
    const updateData = {
      updated_at: knex.fn.now()
    };
    
    // Update field yang diizinkan
    if (body.hari) updateData.hari = body.hari;
    if (body.ruangan_id) updateData.ruangan_id = parseInt(body.ruangan_id);
    if (body.jam_mulai) updateData.jam_mulai = body.jam_mulai;
    if (body.jam_selesai) updateData.jam_selesai = body.jam_selesai;
    if (body.dosen_id !== undefined) updateData.dosen_id = body.dosen_id;
    // Support learning_type dan learning_time untuk dosen
    if (body.learning_type !== undefined) updateData.learning_type = body.learning_type;
    if (body.learning_time !== undefined) updateData.learning_time = body.learning_time;
    // Note: semester should come from kurikulum.f_semester, not directly from body
    
    // Jika ada perubahan kelas_id, ambil data kelas terbaru
    if (body.kelas_id && body.kelas_id !== existingJadwal.kelas_id) {
      const kelasData = await knex('kelas')
        .where('kelas.id', body.kelas_id)
        .first();
      
      if (!kelasData) {
        return NextResponse.json(
          { error: 'Data kelas tidak ditemukan' },
          { status: 404 }
        );
      }
      
      const kurikulumData = kelasData.f_matkul_id 
        ? await knex('kurikulum')
            .where('kurikulum.id', kelasData.f_matkul_id)
            .first()
        : null;
      
      // Update semua data terkait kelas
      updateData.kelas_id = body.kelas_id;
      updateData.kurikulum_id = kelasData.f_matkul_id || null;
      updateData.display_name = kelasData.display_name || kelasData.nama_kelas;
      updateData.nama_mk = kurikulumData?.f_namamk || kelasData.nama_kelas || '';
      updateData.kode_mk = kurikulumData?.f_kodemk || '';
      updateData.semester = kurikulumData?.f_semester || kelasData.f_semester || null;
      updateData.sks = kurikulumData?.f_sks_kurikulum || kelasData.f_sks_kurikulum || null;
    }
    
    // Jika ada update ruangan, ambil data ruangan terbaru
    if (body.ruangan_id && body.ruangan_id !== existingJadwal.ruangan_id) {
      const ruanganData = await knex('ruangan')
        .where('ruangan.id', body.ruangan_id)
        .first();
      
      if (!ruanganData) {
        return NextResponse.json(
          { error: 'Data ruangan tidak ditemukan' },
          { status: 404 }
        );
      }
      
      updateData.nama_ruangan = ruanganData.f_namaruang || '';
      updateData.lantai = ruanganData.f_lantai || null;
    }
    
    // Jika ada update dosen_id, ambil data dosen terbaru
    if (body.dosen_id && body.dosen_id !== existingJadwal.dosen_id) {
      const dosenData = await knex('dosen')
        .where('dosen.id', body.dosen_id)
        .first();
      
      if (!dosenData) {
        return NextResponse.json(
          { error: 'Data dosen tidak ditemukan' },
          { status: 404 }
        );
      }
      
      updateData.nama_dosen = dosenData.f_nama_dosen || '';
    }
    
    // Cek bentrok jadwal (kecuali dengan dirinya sendiri)
    const hari = updateData.hari || existingJadwal.hari;
    const ruanganId = updateData.ruangan_id || existingJadwal.ruangan_id;
    const jamMulai = updateData.jam_mulai || existingJadwal.jam_mulai;
    const jamSelesai = updateData.jam_selesai || existingJadwal.jam_selesai;
    const semester = updateData.semester || existingJadwal.semester;
    const targetClassId = updateData.kelas_id || existingJadwal.kelas_id;
    const targetClass = await knex('kelas')
      .where({ id: targetClassId })
      .first('f_kurikulum');
    const targetCurriculum = targetClass?.f_kurikulum
      ? await knex('kurikulum_master')
        .where({ id: targetClass.f_kurikulum })
        .first('f_tahun_ajaran')
      : null;
    const academicYearId = targetCurriculum?.f_tahun_ajaran ?? null;
    
    const existingJadwalList = await knex('jadwal')
      .leftJoin('kelas as schedule_kelas', 'jadwal.kelas_id', 'schedule_kelas.id')
      .leftJoin('kurikulum_master as schedule_kurikulum_master', 'schedule_kelas.f_kurikulum', 'schedule_kurikulum_master.id')
      .where('jadwal.id', '!=', body.id)
      .where({ 'jadwal.hari': hari, 'jadwal.ruangan_id': ruanganId })
      .select(
        'jadwal.display_name',
        'jadwal.jam_mulai',
        'jadwal.jam_selesai',
        'jadwal.semester',
        'schedule_kurikulum_master.f_tahun_ajaran as tahun_ajaran_id',
      );
    
    const newStart = timeToMinutes(jamMulai);
    const newEnd = timeToMinutes(jamSelesai);
    if (newEnd <= newStart) {
      return NextResponse.json(
        { error: 'Jam selesai harus setelah jam mulai' },
        { status: 400 },
      );
    }

    const conflictingJadwal = existingJadwalList.find((jadwal) => (
      isSameAcademicYear(jadwal.tahun_ajaran_id, academicYearId) &&
      isSameSemesterGroup(jadwal.semester, semester) &&
      newStart < timeToMinutes(jadwal.jam_selesai) &&
      newEnd > timeToMinutes(jadwal.jam_mulai)
    ));

    if (conflictingJadwal) {
      return NextResponse.json(
        { error: `Jadwal bentrok: ${conflictingJadwal.display_name} sudah dijadwalkan pada jam tersebut` },
        { status: 409 }
      );
    }

    const dosenId = updateData.dosen_id !== undefined ? updateData.dosen_id : existingJadwal.dosen_id;
    if (dosenId) {
      const lecturerSchedules = await knex('jadwal')
        .leftJoin('kelas as schedule_kelas', 'jadwal.kelas_id', 'schedule_kelas.id')
        .leftJoin('kurikulum_master as schedule_kurikulum_master', 'schedule_kelas.f_kurikulum', 'schedule_kurikulum_master.id')
        .where({ 'jadwal.hari': hari, 'jadwal.dosen_id': dosenId })
        .where('jadwal.id', '!=', body.id)
        .select(
          'jadwal.display_name',
          'jadwal.jam_mulai',
          'jadwal.jam_selesai',
          'jadwal.semester',
          'schedule_kurikulum_master.f_tahun_ajaran as tahun_ajaran_id',
        );
      const lecturerConflict = lecturerSchedules.some((schedule) => (
        isSameAcademicYear(schedule.tahun_ajaran_id, academicYearId) &&
        isSameSemesterGroup(schedule.semester, semester) &&
        newStart < timeToMinutes(schedule.jam_selesai) &&
        newEnd > timeToMinutes(schedule.jam_mulai)
      ));

      if (lecturerConflict) {
        return NextResponse.json(
          { error: 'Dosen sudah memiliki jadwal lain pada waktu yang sama' },
          { status: 409 },
        );
      }
    }
    
    console.log('🔄 Updating data:', updateData);
    
    await knex('jadwal')
      .where({ id: body.id })
      .update(updateData);

    return NextResponse.json({ 
      success: true,
      message: 'Jadwal berhasil diupdate',
      updated_fields: Object.keys(updateData).filter(k => k !== 'updated_at')
    });
    
  } catch (err) {
    console.error('❌ PUT jadwal error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}

// DELETE jadwal
export async function DELETE(req) {
  try {
    const body = await req.json();

    if (!body.id) {
      return NextResponse.json(
        { error: 'ID jadwal diperlukan' },
        { status: 400 }
      );
    }

    // Optional: Ambil data jadwal sebelum dihapus untuk logging
    const jadwalToDelete = await knex('jadwal')
      .where({ id: body.id })
      .first();
    
    if (!jadwalToDelete) {
      return NextResponse.json(
        { error: 'Jadwal tidak ditemukan' },
        { status: 404 }
      );
    }

    console.log(`🗑️ Deleting jadwal: ${jadwalToDelete.display_name} (ID: ${body.id})`);

    const deleted = await knex('jadwal')
      .where({ id: body.id })
      .del();

    if (deleted === 0) {
      return NextResponse.json(
        { error: 'Jadwal tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: `Jadwal "${jadwalToDelete.display_name}" berhasil dihapus`,
      deleted_id: body.id
    });
    
  } catch (err) {
    console.error('❌ DELETE jadwal error:', err);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}
