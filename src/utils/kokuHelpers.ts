import * as XLSX from 'xlsx';
import { Teacher, KokuUnit, UnitAssignment, ConflictIssue, UnitCategory, SessionType, RoleType } from '../types/koku';

/**
 * Susun senarai guru mengikut SESI (Pagi dahulu, kemudian Petang) dan ALPHABET (A ke Z)
 */
export function sortTeachersBySessionAndAlphabet(teachers: Teacher[]): Teacher[] {
  return [...teachers].sort((a, b) => {
    // 1. Sesi: Pagi di hadapan, diikuti Petang
    if (a.session !== b.session) {
      if (a.session === 'Pagi') return -1;
      if (b.session === 'Pagi') return 1;
      return a.session.localeCompare(b.session);
    }
    // 2. Alphabet: Nama guru A ke Z
    return a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' });
  });
}

/**
 * Susun senarai guru mengikut ALPHABET (A ke Z) sahaja
 */
export function sortTeachersAlphabetically(teachers: Teacher[]): Teacher[] {
  return [...teachers].sort((a, b) => a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' }));
}

export function detectTeacherConflicts(
  teachers: Teacher[],
  assignments: UnitAssignment[],
  units: KokuUnit[]
): ConflictIssue[] {
  const issues: ConflictIssue[] = [];
  const unitMap = new Map(units.map(u => [u.id, u]));

  teachers.forEach(teacher => {
    const teacherAssigns = assignments.filter(a => a.teacherId === teacher.id);
    const categoryCount: Record<UnitCategory, number> = {
      BERUNIFORM: 0,
      KELAB: 0,
      SUKAN: 0,
      RUMAH_SUKAN: 0,
      PEMBANGUNAN: 0,
    };

    const leadershipRoles: { role: string; unitName: string }[] = [];
    const suRoles: { role: string; unitName: string }[] = [];
    const sessionMismatches: string[] = [];

    teacherAssigns.forEach(assign => {
      const unit = unitMap.get(assign.unitId);
      if (!unit) return;

      categoryCount[unit.category] = (categoryCount[unit.category] || 0) + 1;

      if (assign.role === 'Ketua Guru Penasihat') {
        leadershipRoles.push({ role: assign.role, unitName: unit.name });
      }

      if (assign.role === 'Setiausaha') {
        suRoles.push({ role: assign.role, unitName: unit.name });
      }

      // Check if session differs from teacher's main school session
      if (assign.session !== teacher.session) {
        sessionMismatches.push(`${unit.name} (${assign.session})`);
      }
    });

    // 1. Duplicate Leadership (Ketua > 1)
    if (leadershipRoles.length > 1) {
      issues.push({
        teacherId: teacher.id,
        teacherName: teacher.name,
        type: 'DUPLICATE_LEADERSHIP',
        severity: 'error',
        message: `Memegang lebih daripada 1 jawatan Ketua Serentak (${leadershipRoles.length} Unit)`,
        details: leadershipRoles.map(l => `${l.role} di ${l.unitName}`),
      });
    }

    // 2. Duplicate Setiausaha (SU > 1)
    if (suRoles.length > 1) {
      issues.push({
        teacherId: teacher.id,
        teacherName: teacher.name,
        type: 'DUPLICATE_LEADERSHIP',
        severity: 'warning',
        message: `Memegang jawatan Setiausaha dalam ${suRoles.length} Unit berbeza`,
        details: suRoles.map(s => `Setiausaha di ${s.unitName}`),
      });
    }

    // 3. Duplicate Category (e.g. 2 Uniforms or 2 Clubs)
    const duplicateCategories: string[] = [];
    if (categoryCount.BERUNIFORM > 1) duplicateCategories.push(`Unit Beruniform (${categoryCount.BERUNIFORM} unit)`);
    if (categoryCount.KELAB > 1) duplicateCategories.push(`Kelab & Persatuan (${categoryCount.KELAB} unit)`);
    if (categoryCount.SUKAN > 1) duplicateCategories.push(`Sukan & Permainan (${categoryCount.SUKAN} unit)`);
    if (categoryCount.RUMAH_SUKAN > 1) duplicateCategories.push(`Rumah Sukan (${categoryCount.RUMAH_SUKAN} unit)`);

    if (duplicateCategories.length > 0) {
      issues.push({
        teacherId: teacher.id,
        teacherName: teacher.name,
        type: 'DUPLICATE_CATEGORY',
        severity: 'error',
        message: `Pertindihan unit dalam kategori yang sama`,
        details: duplicateCategories,
      });
    }

    // 4. Incomplete Core Allocation
    const missingCore: string[] = [];
    if (categoryCount.BERUNIFORM === 0) missingCore.push('Unit Beruniform');
    if (categoryCount.KELAB === 0) missingCore.push('Kelab & Persatuan');
    if (categoryCount.SUKAN === 0) missingCore.push('Sukan & Permainan');
    if (categoryCount.RUMAH_SUKAN === 0) missingCore.push('Rumah Sukan');

    if (missingCore.length > 0 && teacherAssigns.length > 0) {
      issues.push({
        teacherId: teacher.id,
        teacherName: teacher.name,
        type: 'INCOMPLETE_ASSIGNMENT',
        severity: 'info',
        message: `Belum lengkap 4 teras kokurikulum`,
        details: missingCore.map(m => `Belum diagih: ${m}`),
      });
    } else if (teacherAssigns.length === 0) {
      issues.push({
        teacherId: teacher.id,
        teacherName: teacher.name,
        type: 'INCOMPLETE_ASSIGNMENT',
        severity: 'warning',
        message: `Belum ada sebarang agihan unit kokurikulum`,
        details: ['Sila agihkan sekurang-kurangnya 4 teras utama'],
      });
    }

    // 5. Session mismatch warning
    if (sessionMismatches.length > 0) {
      issues.push({
        teacherId: teacher.id,
        teacherName: teacher.name,
        type: 'SESSION_MISMATCH',
        severity: 'info',
        message: `Bertugas kokurikulum merentasi sesi (Sesi Hakiki: ${teacher.session})`,
        details: sessionMismatches,
      });
    }
  });

  return issues;
}

export function getCategoryBadge(category: UnitCategory): { label: string; bg: string; text: string } {
  switch (category) {
    case 'BERUNIFORM':
      return { label: 'Unit Beruniform', bg: 'bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800', text: 'text-amber-800 dark:text-amber-300' };
    case 'KELAB':
      return { label: 'Kelab & Persatuan', bg: 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800', text: 'text-emerald-800 dark:text-emerald-300' };
    case 'SUKAN':
      return { label: 'Sukan & Permainan', bg: 'bg-blue-100 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800', text: 'text-blue-800 dark:text-blue-300' };
    case 'RUMAH_SUKAN':
      return { label: 'Rumah Sukan', bg: 'bg-rose-100 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800', text: 'text-rose-800 dark:text-rose-300' };
    case 'PEMBANGUNAN':
      return { label: 'Pembangunan & Khas', bg: 'bg-purple-100 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800', text: 'text-purple-800 dark:text-purple-300' };
  }
}

export function getRoleColorBadge(role: RoleType): { bg: string; text: string } {
  switch (role) {
    case 'Ketua Guru Penasihat':
      return { bg: 'bg-rose-500 text-white font-bold shadow-xs', text: 'text-white' };
    case 'Setiausaha':
      return { bg: 'bg-blue-600 text-white font-bold shadow-xs', text: 'text-white' };
    case 'AJK':
    default:
      return { bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium', text: 'text-slate-700 dark:text-slate-300' };
  }
}

export function exportMatrixToExcel(
  teachers: Teacher[],
  units: KokuUnit[],
  assignments: UnitAssignment[],
  schoolName: string,
  academicYear: string
) {
  const wb = XLSX.utils.book_new();
  const unitMap = new Map(units.map(u => [u.id, u]));

  // Susun data guru mengikut Sesi (Pagi -> Petang) dan Alphabet (A -> Z)
  const sortedTeachers = sortTeachersBySessionAndAlphabet(teachers);

  // 1. TAB JADUAL KESELURUHAN
  const masterData = sortedTeachers.map((teacher, index) => {
    const tAssigns = assignments.filter(a => a.teacherId === teacher.id);
    const uniform = tAssigns.find(a => unitMap.get(a.unitId)?.category === 'BERUNIFORM');
    const club = tAssigns.find(a => unitMap.get(a.unitId)?.category === 'KELAB');
    const sport = tAssigns.find(a => unitMap.get(a.unitId)?.category === 'SUKAN');
    const house = tAssigns.find(a => unitMap.get(a.unitId)?.category === 'RUMAH_SUKAN');
    const special = tAssigns.filter(a => unitMap.get(a.unitId)?.category === 'PEMBANGUNAN');

    return {
      'Bil': index + 1,
      'Nama Guru': teacher.name,
      'No. Fail / KP': teacher.staffId,
      'Jantina': teacher.gender,
      'Gred': teacher.grade || 'DG41',
      'Sesi Bertugas': teacher.session,
      'Pasukan Badan Beruniform': uniform ? `${unitMap.get(uniform.unitId)?.name} (${uniform.role})` : 'Tiada',
      'Kelab & Persatuan': club ? `${unitMap.get(club.unitId)?.name} (${club.role})` : 'Tiada',
      'Sukan & Permainan': sport ? `${unitMap.get(sport.unitId)?.name} (${sport.role})` : 'Tiada',
      'Rumah Sukan': house ? `${unitMap.get(house.unitId)?.name} (${house.role})` : 'Tiada',
      'Unit Pembangunan / Khas': special.length > 0 
        ? special.map(s => `${unitMap.get(s.unitId)?.name} (${s.role})`).join(', ')
        : '-',
      'Jumlah Unit': tAssigns.length
    };
  });

  const wsMaster = XLSX.utils.json_to_sheet(masterData);
  XLSX.utils.book_append_sheet(wb, wsMaster, 'Jadual_Induk_Guru');

  // 2. TAB SENARAI MENGIKUT UNIT
  const unitDetailRows: (string | number)[][] = [
    ['Kategori', 'Kod Unit', 'Nama Unit', 'Bilangan Guru', 'Ketua Guru Penasihat / Ketua Rumah', 'Setiausaha', 'Senarai Guru Sesi Pagi', 'Senarai Guru Sesi Petang']
  ];

  // Susun unit mengikut Kategori & Abjad
  const sortedUnits = [...units].sort((a, b) => a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' }));

  sortedUnits.forEach(u => {
    const uAssigns = assignments.filter(a => a.unitId === u.id);
    const teacherLookup = new Map(teachers.map(t => [t.id, t]));
    
    const ketua = uAssigns.find(a => a.role === 'Ketua Guru Penasihat');
    const ketuaName = ketua ? `${teacherLookup.get(ketua.teacherId)?.name} (${ketua.session})` : 'Belum dilantik';

    const su = uAssigns.find(a => a.role === 'Setiausaha');
    const suName = su ? `${teacherLookup.get(su.teacherId)?.name} (${su.session})` : 'Belum dilantik';

    const morningTeachers = uAssigns
      .filter(a => a.session === 'Pagi')
      .sort((a, b) => (teacherLookup.get(a.teacherId)?.name || '').localeCompare(teacherLookup.get(b.teacherId)?.name || '', 'ms', { sensitivity: 'base' }))
      .map(a => `${teacherLookup.get(a.teacherId)?.name} [${a.role}]`)
      .join('; ');

    const afternoonTeachers = uAssigns
      .filter(a => a.session === 'Petang')
      .sort((a, b) => (teacherLookup.get(a.teacherId)?.name || '').localeCompare(teacherLookup.get(b.teacherId)?.name || '', 'ms', { sensitivity: 'base' }))
      .map(a => `${teacherLookup.get(a.teacherId)?.name} [${a.role}]`)
      .join('; ');

    unitDetailRows.push([
      u.category,
      u.code,
      u.name,
      uAssigns.length,
      ketuaName,
      suName,
      morningTeachers || '-',
      afternoonTeachers || '-'
    ]);
  });

  const wsUnits = XLSX.utils.aoa_to_sheet(unitDetailRows);
  XLSX.utils.book_append_sheet(wb, wsUnits, 'Agihan_Mengikut_Unit');

  // 3. TAB STATISTIK & SESI
  const statsRows: (string | number)[][] = [
    ['STATISTIK AGIHAN TUGAS KOKURIKULUM', ''],
    ['Sekolah', schoolName],
    ['Tahun Akademik', academicYear],
    ['Tarikh Laporan Dijana', new Date().toLocaleDateString('ms-MY')],
    ['', ''],
    ['Kategori', 'Nama Unit', 'Sasaran Pagi', 'Guru Pagi Dilantik', 'Sasaran Petang', 'Guru Petang Dilantik', 'Jumlah Guru'],
  ];

  units.forEach(u => {
    const uAssigns = assignments.filter(a => a.unitId === u.id);
    const pagiCount = uAssigns.filter(a => a.session === 'Pagi').length;
    const petangCount = uAssigns.filter(a => a.session === 'Petang').length;
    statsRows.push([
      u.category,
      u.name,
      u.targetMorning || 0,
      pagiCount,
      u.targetAfternoon || 0,
      petangCount,
      uAssigns.length
    ]);
  });

  const wsStats = XLSX.utils.aoa_to_sheet(statsRows);
  XLSX.utils.book_append_sheet(wb, wsStats, 'Analisis_Sesi');

  const fileName = `Agihan_Kokurikulum_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function parseTeacherImportFile(fileData: ArrayBuffer): { teachers: Partial<Teacher>[]; errors: string[] } {
  const wb = XLSX.read(fileData, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const worksheet = wb.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });

  const teachers: Partial<Teacher>[] = [];
  const errors: string[] = [];

  if (jsonData.length === 0) {
    errors.push('Fail Excel/CSV kosong atau format tidak sah.');
    return { teachers, errors };
  }

  jsonData.forEach((row, idx) => {
    // Look for common headers in Malaysian school Excel files
    const keys = Object.keys(row);
    const findValue = (regex: RegExp) => {
      const matchedKey = keys.find(k => regex.test(k.toLowerCase().trim()));
      return matchedKey ? String(row[matchedKey]).trim() : '';
    };

    const name = findValue(/nama|guru|teacher|name/i);
    const staffId = findValue(/kp|ic|fail|kad pengenalan|no ic|no kp|id/i);
    const sessionStr = findValue(/sesi|session|waktu/i);
    const genderStr = findValue(/jantina|gender|sex/i);
    const grade = findValue(/gred|grade|jawatan/i);
    const phone = findValue(/telefon|tel|phone|hp|bimbit/i);
    const email = findValue(/emel|email|e-mel/i);

    if (!name) {
      return; // Skip empty row
    }

    // Determine session
    let session: SessionType = 'Pagi';
    if (/petang|afternoon|pm/i.test(sessionStr)) {
      session = 'Petang';
    }

    // Determine gender
    let gender: 'L' | 'P' = 'L';
    if (/p|perempuan|wanita|female|f/i.test(genderStr)) {
      gender = 'P';
    } else if (/binti|a\/p|puan|cik|hajah/i.test(name)) {
      gender = 'P';
    }

    teachers.push({
      id: `imported-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      staffId: staffId || `G${1000 + idx}`,
      session,
      gender,
      grade: grade || 'DG41',
      phone: phone || '',
      email: email || '',
    });
  });

  return { teachers, errors };
}
