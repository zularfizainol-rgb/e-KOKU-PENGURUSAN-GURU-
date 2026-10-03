import * as XLSX from 'xlsx';
import { 
  Teacher, 
  KokuUnit, 
  UnitAssignment, 
  ConflictIssue, 
  UnitCategory, 
  SessionType, 
  RoleType, 
  CoordinatorSessionType, 
  CategoryCoordinator,
  ExecutiveRoleType,
  ExecutiveLeader
} from '../types/koku';

/**
 * Pemetaan Gred Perkhidmatan Perguruan KPM:
 * SSM (Sistem Saraan Malaysia / Gred Lama) -> SSPA (Sistem Saraan Perkhidmatan Awam / Gred Baharu)
 * Format: DG41/DG9, DG44/DG10, DG48/DG12, DG52/DG13, DG54/DG14
 */
export interface ServiceGradeOption {
  value: string;
  ssm: string;
  sspa: string;
  label: string;
  description: string;
}

export const TEACHER_SERVICE_GRADES: ServiceGradeOption[] = [
  { value: 'DG41/DG9', ssm: 'DG41', sspa: 'DG9', label: 'DG41/DG9', description: 'Pegawai Perkhidmatan Pendidikan Siswazah (Gred Permulaan)' },
  { value: 'DG42/DG10', ssm: 'DG42', sspa: 'DG10', label: 'DG42/DG10', description: 'Pegawai Perkhidmatan Pendidikan Siswazah (Kenaikan Pangkat Ex-PPPLD)' },
  { value: 'DG44/DG10', ssm: 'DG44', sspa: 'DG10', label: 'DG44/DG10', description: 'Pegawai Perkhidmatan Pendidikan Siswazah (Time-Based)' },
  { value: 'DG48/DG12', ssm: 'DG48', sspa: 'DG12', label: 'DG48/DG12', description: 'Pegawai Perkhidmatan Pendidikan Siswazah (Kanan)' },
  { value: 'DG52/DG13', ssm: 'DG52', sspa: 'DG13', label: 'DG52/DG13', description: 'Pegawai Perkhidmatan Pendidikan Siswazah (Kanan Lanjutan)' },
  { value: 'DG54/DG14', ssm: 'DG54', sspa: 'DG14', label: 'DG54/DG14', description: 'Pegawai Perkhidmatan Pendidikan Siswazah (Gred Utama)' },
  { value: 'DG34/DG7', ssm: 'DG34', sspa: 'DG7', label: 'DG34/DG7', description: 'Pegawai Perkhidmatan Pendidikan Lepasan Diploma' },
  { value: 'DG32/DG6', ssm: 'DG32', sspa: 'DG6', label: 'DG32/DG6', description: 'Pegawai Perkhidmatan Pendidikan Lepasan Diploma' },
  { value: 'DG29/DG6', ssm: 'DG29', sspa: 'DG6', label: 'DG29/DG6', description: 'Pegawai Perkhidmatan Pendidikan Lepasan Diploma (Permulaan)' },
  { value: 'DC41/DC9', ssm: 'DC41', sspa: 'DC9', label: 'DC41/DC9', description: 'Guru Kontrak / COS Siswazah' },
];

/**
 * Format paparan gred guru secara automatik ke format Gred Lama / Gred SSPA Baharu
 * Contoh: jika data simpan 'DG41', paparkan 'DG41/DG9'
 */
export function formatTeacherGrade(grade?: string): string {
  if (!grade) return 'DG41/DG9';
  const trimmed = grade.trim();
  
  // Normalisasikan jika sebelum ini disimpan dengan spasi cth: 'DG41 / DG1-1' atau 'DG41 / DG9'
  const normalized = trimmed.replace(/\s*\/\s*/, '/').toUpperCase();

  // Semak jika sudah sepadan dengan mana-mana value atau label
  const directMatch = TEACHER_SERVICE_GRADES.find(g => g.value.toUpperCase() === normalized || g.label.toUpperCase() === normalized);
  if (directMatch) return directMatch.label;

  // Jika format lama 'DG41 / DG1-1', ambil bahagian SSM sebelum '/'
  const ssmPart = trimmed.split('/')[0].trim();
  const matchedFromPart = TEACHER_SERVICE_GRADES.find(g => g.ssm.toLowerCase() === ssmPart.toLowerCase());
  if (matchedFromPart) return matchedFromPart.label;

  // Cari padanan mengikut SSM terus
  const matched = TEACHER_SERVICE_GRADES.find(g => g.ssm.toLowerCase() === trimmed.toLowerCase());
  if (matched) return matched.label;

  // Cari jika pengguna masukkan kod SSPA (cth: DG9, DG10, DG12, DG13, DG14)
  const matchedSspa = TEACHER_SERVICE_GRADES.find(g => g.sspa.toLowerCase() === trimmed.toLowerCase());
  if (matchedSspa) return matchedSspa.label;

  return trimmed;
}

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

export function getCategoryTitle(category: UnitCategory): string {
  switch (category) {
    case 'BERUNIFORM':
      return 'Unit Beruniform';
    case 'KELAB':
      return 'Kelab & Persatuan';
    case 'SUKAN':
      return 'Sukan & Permainan';
    case 'RUMAH_SUKAN':
      return 'Rumah Sukan';
    case 'PEMBANGUNAN':
      return 'Pembangunan & Khas';
    default:
      return category;
  }
}

export function getCoordinatorSessionBadge(session: CoordinatorSessionType): { label: string; bg: string; text: string; icon: string } {
  switch (session) {
    case 'Pagi':
      return {
        label: 'Sesi Pagi',
        bg: 'bg-amber-100 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700',
        text: 'text-amber-900 dark:text-amber-200',
        icon: '☀️',
      };
    case 'Petang':
      return {
        label: 'Sesi Petang',
        bg: 'bg-indigo-100 dark:bg-indigo-950/80 border-indigo-300 dark:border-indigo-700',
        text: 'text-indigo-900 dark:text-indigo-200',
        icon: '🌇',
      };
    case 'Kedua-dua Sesi':
      return {
        label: 'Kedua-dua Sesi',
        bg: 'bg-emerald-100 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700',
        text: 'text-emerald-900 dark:text-emerald-200',
        icon: '✨',
      };
    default:
      return {
        label: session,
        bg: 'bg-purple-100 dark:bg-purple-950/80 border-purple-300 dark:border-purple-700',
        text: 'text-purple-900 dark:text-purple-200',
        icon: '⭐',
      };
  }
}

export const STANDARD_ROLES: RoleType[] = [
  'Ketua Guru Penasihat',
  'Penyelaras',
  'Setiausaha',
  'Jurulatih',
  'Pengurus',
  'Ketua Panitia',
  'Penolong Ketua Guru Penasihat',
  'Bendahari',
  'AJK',
];

export const EXECUTIVE_ROLES: ExecutiveRoleType[] = [
  'Setiausaha Kokurikulum',
  'Naib Setiausaha Kokurikulum',
  'Setiausaha Sukan',
  'Naib Setiausaha Sukan',
];

export function getExecutiveRoleMeta(role: string): { title: string; shortTitle: string; icon: string; bg: string; text: string; ring: string } {
  switch (role) {
    case 'Setiausaha Kokurikulum':
      return {
        title: 'Setiausaha Kokurikulum',
        shortTitle: 'SU Kokurikulum',
        icon: '📋',
        bg: 'bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white shadow-md',
        text: 'text-blue-700 dark:text-blue-300',
        ring: 'ring-2 ring-blue-300 dark:ring-blue-600',
      };
    case 'Naib Setiausaha Kokurikulum':
      return {
        title: 'Naib Setiausaha Kokurikulum',
        shortTitle: 'Naib SU Kokurikulum',
        icon: '📑',
        bg: 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md',
        text: 'text-sky-700 dark:text-sky-300',
        ring: 'ring-2 ring-sky-300 dark:ring-sky-600',
      };
    case 'Setiausaha Sukan':
      return {
        title: 'Setiausaha Sukan',
        shortTitle: 'SU Sukan',
        icon: '⚡',
        bg: 'bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white shadow-md',
        text: 'text-amber-700 dark:text-amber-300',
        ring: 'ring-2 ring-amber-300 dark:ring-amber-600',
      };
    case 'Naib Setiausaha Sukan':
      return {
        title: 'Naib Setiausaha Sukan',
        shortTitle: 'Naib SU Sukan',
        icon: '🏃',
        bg: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md',
        text: 'text-orange-700 dark:text-orange-300',
        ring: 'ring-2 ring-orange-300 dark:ring-orange-600',
      };
    default:
      return {
        title: role,
        shortTitle: role,
        icon: '🎖️',
        bg: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md',
        text: 'text-purple-700 dark:text-purple-300',
        ring: 'ring-2 ring-purple-300 dark:ring-purple-600',
      };
  }
}

export function getRoleColorBadge(role: RoleType): { bg: string; text: string; isPenyelaras?: boolean; isExecutive?: boolean } {
  const normalized = (role || '').trim().toLowerCase();
  
  // Jawatan Eksekutif / Pentadbiran Kokurikulum Utama
  if (role === 'Setiausaha Kokurikulum' || normalized.includes('setiausaha kokurikulum') && !normalized.includes('naib')) {
    return {
      bg: 'bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white font-black shadow-md ring-2 ring-blue-300 dark:ring-blue-500 border border-blue-200',
      text: 'text-blue-700 dark:text-blue-300',
      isExecutive: true,
    };
  }
  if (role === 'Naib Setiausaha Kokurikulum' || normalized.includes('naib setiausaha kokurikulum') || normalized.includes('penolong setiausaha kokurikulum')) {
    return {
      bg: 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-black shadow-md ring-2 ring-sky-300 dark:ring-sky-500 border border-sky-200',
      text: 'text-sky-700 dark:text-sky-300',
      isExecutive: true,
    };
  }
  if (role === 'Setiausaha Sukan' || normalized.includes('setiausaha sukan') && !normalized.includes('naib')) {
    return {
      bg: 'bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white font-black shadow-md ring-2 ring-amber-300 dark:ring-amber-500 border border-amber-200',
      text: 'text-amber-700 dark:text-amber-300',
      isExecutive: true,
    };
  }
  if (role === 'Naib Setiausaha Sukan' || normalized.includes('naib setiausaha sukan') || normalized.includes('penolong setiausaha sukan')) {
    return {
      bg: 'bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black shadow-md ring-2 ring-orange-300 dark:ring-orange-500 border border-orange-200',
      text: 'text-orange-700 dark:text-orange-300',
      isExecutive: true,
    };
  }

  if (normalized === 'penyelaras' || normalized.includes('penyelaras')) {
    return { 
      bg: 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-black shadow-md ring-2 ring-purple-300 dark:ring-purple-500 border border-purple-200', 
      text: 'text-purple-600 dark:text-purple-400',
      isPenyelaras: true,
    };
  }

  switch (role) {
    case 'Ketua Guru Penasihat':
      return { bg: 'bg-rose-500 text-white font-bold shadow-xs', text: 'text-rose-600 dark:text-rose-400' };
    case 'Jurulatih':
      return { bg: 'bg-emerald-600 text-white font-bold shadow-xs', text: 'text-emerald-600 dark:text-emerald-400' };
    case 'Pengurus':
      return { bg: 'bg-amber-500 text-white font-bold shadow-xs', text: 'text-amber-600 dark:text-amber-400' };
    case 'Ketua Panitia':
      return { bg: 'bg-cyan-600 text-white font-bold shadow-xs', text: 'text-cyan-600 dark:text-cyan-400' };
    case 'Setiausaha':
      return { bg: 'bg-blue-600 text-white font-bold shadow-xs', text: 'text-blue-600 dark:text-blue-400' };
    case 'Penolong Ketua Guru Penasihat':
      return { bg: 'bg-pink-600 text-white font-medium shadow-xs', text: 'text-pink-600 dark:text-pink-400' };
    case 'Bendahari':
      return { bg: 'bg-teal-600 text-white font-medium shadow-xs', text: 'text-teal-600 dark:text-teal-400' };
    case 'AJK':
      return { bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium', text: 'text-slate-700 dark:text-slate-300' };
    default:
      // Custom / Jawatan Lain
      return { 
        bg: 'bg-violet-600 text-white font-bold shadow-xs', 
        text: 'text-violet-600 dark:text-violet-400' 
      };
  }
}

export function exportMatrixToExcel(
  teachers: Teacher[],
  units: KokuUnit[],
  assignments: UnitAssignment[],
  schoolName: string,
  academicYear: string,
  categoryCoordinators: CategoryCoordinator[] = [],
  executiveLeaders: ExecutiveLeader[] = []
) {
  const wb = XLSX.utils.book_new();
  const unitMap = new Map(units.map(u => [u.id, u]));

  // Susun data guru mengikut Sesi (Pagi -> Petang) dan Alphabet (A -> Z)
  const sortedTeachers = sortTeachersBySessionAndAlphabet(teachers);

  // 1. TAB JADUAL KESELURUHAN
  const masterData = sortedTeachers.map((teacher, index) => {
    const tAssigns = assignments.filter(a => a.teacherId === teacher.id);
    const teacherCoords = (categoryCoordinators || []).filter(c => c.teacherId === teacher.id);
    const coordStr = teacherCoords.length > 0
      ? teacherCoords.map(c => `${c.roleTitle || 'Penyelaras'} ${getCategoryTitle(c.category)} (${c.session})`).join('; ')
      : '-';

    const teacherExecs = (executiveLeaders || []).filter(e => e.teacherId === teacher.id);
    const execStr = teacherExecs.length > 0
      ? teacherExecs.map(e => `${e.role} (${e.session})`).join('; ')
      : '-';

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
      'Gred (Lama / SSPA)': formatTeacherGrade(teacher.grade),
      'Sesi Bertugas': teacher.session,
      'Jawatan Eksekutif Kokurikulum': execStr,
      'Penyelaras Unit Besar': coordStr,
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

  // 4. TAB SENARAI PENYELARAS UNIT BESAR (Jika ada dilantik)
  if (categoryCoordinators && categoryCoordinators.length > 0) {
    const teacherLookup = new Map(teachers.map(t => [t.id, t]));
    const coordRows: (string | number)[][] = [
      ['SENARAI GURU PENYELARAS UNIT BESAR KOKURIKULUM', ''],
      ['Sekolah', schoolName],
      ['Tahun Akademik', academicYear],
      ['', ''],
      ['Bil', 'Kategori Unit Besar', 'Gelaran Jawatan', 'Pilihan Sesi Bertugas', 'Nama Guru', 'Sesi Hakiki Guru', 'Gred Jawatan', 'No. Telefon']
    ];

    categoryCoordinators.forEach((c, idx) => {
      const teacher = teacherLookup.get(c.teacherId);
      coordRows.push([
        idx + 1,
        getCategoryTitle(c.category),
        c.roleTitle || 'Penyelaras',
        c.session,
        teacher?.name || 'Guru Tidak Ditemui',
        teacher?.session || '-',
        teacher?.grade || '-',
        teacher?.phone || '-'
      ]);
    });

    const wsCoords = XLSX.utils.aoa_to_sheet(coordRows);
    XLSX.utils.book_append_sheet(wb, wsCoords, 'Penyelaras_Unit_Besar');
  }

  // 5. TAB SENARAI JAWATANKUASA PENGURUSAN KOKURIKULUM SEKOLAH (SU Koku, Naib SU, SU Sukan, Naib SU Sukan)
  if (executiveLeaders && executiveLeaders.length > 0) {
    const teacherLookup = new Map(teachers.map(t => [t.id, t]));
    const execRows: (string | number)[][] = [
      ['SENARAI JAWATANKUASA PENGURUSAN KOKURIKULUM SEKOLAH', ''],
      ['Sekolah', schoolName],
      ['Tahun Akademik', academicYear],
      ['', ''],
      ['Bil', 'Jawatan Pengurusan Kokurikulum', 'Nama Guru Dilantik', 'No. Fail / KP', 'Sesi Dilantik', 'Sesi Asal Guru', 'Gred Jawatan', 'Tarikh Lantikan']
    ];

    executiveLeaders.forEach((e, idx) => {
      const teacher = teacherLookup.get(e.teacherId);
      execRows.push([
        idx + 1,
        e.role,
        teacher?.name || 'Guru Tidak Ditemui',
        teacher?.staffId || '-',
        e.session,
        teacher?.session || '-',
        formatTeacherGrade(teacher?.grade),
        e.appointedAt ? new Date(e.appointedAt).toLocaleDateString('ms-MY') : '-'
      ]);
    });

    const wsExec = XLSX.utils.aoa_to_sheet(execRows);
    XLSX.utils.book_append_sheet(wb, wsExec, 'Jawatankuasa_Eksekutif');
  }

  const fileName = `Agihan_Kokurikulum_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${academicYear.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Memeriksa sama ada teks nama adalah nama guru yang sah atau teks sistem/tajuk jadual/nombor/panduan
 */
export function isValidTeacherName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;

  // Singkirkan jika hanya nombor (contohnya index 1, 2, 3...)
  if (/^\d+$/.test(trimmed)) return false;

  // Singkirkan jika format tarikh atau masa atau formula
  if (/^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}/.test(trimmed) || /^\d{1,2}:\d{2}/.test(trimmed) || /^=/.test(trimmed)) {
    return false;
  }

  // Singkirkan jika corak ID sistem yang tersilap masuk
  if (/^imported-\d+/i.test(trimmed) || /^t-\d+/i.test(trimmed) || /^imp-\d+/i.test(trimmed) || /^t-sheet/i.test(trimmed) || /^a-sheet/i.test(trimmed) || /^u-custom/i.test(trimmed)) {
    return false;
  }

  const lower = trimmed.toLowerCase();

  // Singkirkan teks tajuk, panduan GPK, statistik, atau tajuk helaian yang termasuk tersilap
  const invalidKeywords = [
    'nama guru', 'nama penuh guru', 'nama', 'guru', 'bil', 'no', 'jawatan', 'jawatan guru',
    'sesi', 'sesi bertugas', 'sesi hakiki guru', 'sesi unit', 'jantina', 'gred', 'gred jawatan',
    'no telefon', 'emel', 'emel rasmi', 'catatan', 'senarai guru', 'senarai unit', 'ringkasan unit',
    'agihan kokurikulum', 'unit beruniform', 'kelab persatuan', 'sukan permainan',
    'rumah sukan', 'jumlah', 'jumlah keseluruhan guru', 'tamat', 'id guru', 'id agihan', 'kod unit',
    'tahun akademik', 'tarikh kemaskini', 'no. fail / kp guru', 'no. kad pengenalan / fail',
    'panduan pengurusan data', 'panduan gpk', 'ciri-ciri & cara penggunaan', 'keterangan tab helaian',
    'sekolah:', 'tahun akademik:', 'tarikh disimpan:', 'akses bebas & tanpa had',
    'edit langsung di google sheet', 'buka di telefon atau komputer', 'segerak semula ke e-koku',
    'ketua guru penasihat', 'setiausaha', 'guru sesi pagi', 'guru sesi petang',
    'pengakap', 'pandu puteri', 'bulan sabit merah', 'krs', 'puteri islam', 'tkrs',
    'bahasa melayu', 'bahasa inggeris', 'stem', 'agama islam', 'seni budaya',
    'bola sepak', 'badminton', 'bola jaring', 'olahraga', 'sepat takraw',
    'merah', 'biru', 'hijau', 'kuning', 'pagi', 'petang'
  ];

  if (invalidKeywords.includes(lower)) return false;

  // Jika mengandungi frasa tajuk panduan
  if (lower.startsWith('panduan ') || lower.startsWith('tab "') || lower.startsWith('ciri-ciri') || lower.startsWith('sekolah:')) {
    return false;
  }

  return true;
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

    if (!name || !isValidTeacherName(name)) {
      return; // Skip empty row or invalid row header
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
