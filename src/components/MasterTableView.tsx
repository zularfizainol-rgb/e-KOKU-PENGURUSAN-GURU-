import React, { useState, useMemo } from 'react';
import { 
  Search, 
  UserPlus, 
  FileSpreadsheet,
  AlertCircle, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Layers, 
  Sun,
  Sunset,
  Plus,
  Check,
  X,
  FileCheck,
  Award,
  ChevronDown,
  ChevronUp,
  Printer,
  Sparkles
} from 'lucide-react';
import { 
  Teacher, 
  KokuUnit, 
  UnitAssignment, 
  ConflictIssue, 
  RoleType, 
  SessionType, 
  UnitCategory,
  CategoryCoordinator,
  CoordinatorSessionType,
  ExecutiveRoleType,
  ExecutiveLeader
} from '../types/koku';
import { 
  getRoleColorBadge, 
  getCategoryBadge, 
  sortTeachersBySessionAndAlphabet, 
  isValidTeacherName, 
  formatTeacherGrade,
  getCategoryTitle,
  getCoordinatorSessionBadge,
  getExecutiveRoleMeta,
  EXECUTIVE_ROLES
} from '../utils/kokuHelpers';

interface MasterTableViewProps {
  teachers: Teacher[];
  units: KokuUnit[];
  assignments: UnitAssignment[];
  conflicts: ConflictIssue[];
  categoryCoordinators?: CategoryCoordinator[];
  executiveLeaders?: ExecutiveLeader[];
  onSetExecutiveLeader?: (role: ExecutiveRoleType, teacherId: string, session: CoordinatorSessionType, leaderIdToEdit?: string) => void;
  onRemoveExecutiveLeader?: (leaderId: string) => void;
  customRoles?: string[];
  onAddCustomRole?: (role: string) => void;
  onAddTeacher: () => void;
  onEditTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onAssignTeacherToUnit: (teacherId: string, unitId: string, role: RoleType, session: SessionType) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  onSelectTeacherConflict: (teacherId: string) => void;
  onOpenImport?: () => void;
  onPrintAppointmentLetter?: (teacher: Teacher) => void;
  filterConflictTeacherId?: string | null;
  onClearConflictFilter?: () => void;
  onCleanInvalidData?: () => void;
}

// Maklumat meta kategori untuk modal pemilihan unit
const CATEGORY_META: Record<UnitCategory, { title: string; shortTitle: string; icon: string; badgeClass: string }> = {
  BERUNIFORM: {
    title: 'Unit Beruniform',
    shortTitle: 'Beruniform',
    icon: '🛡️',
    badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
  },
  KELAB: {
    title: 'Kelab dan Persatuan',
    shortTitle: 'Kelab',
    icon: '🎨',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
  },
  SUKAN: {
    title: 'Sukan dan Permainan',
    shortTitle: 'Sukan',
    icon: '⚽',
    badgeClass: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800',
  },
  RUMAH_SUKAN: {
    title: 'Rumah Sukan',
    shortTitle: 'Rumah',
    icon: '🏆',
    badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
  },
  PEMBANGUNAN: {
    title: 'Pembangunan & Khas',
    shortTitle: 'Pembangunan',
    icon: '🚀',
    badgeClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800',
  },
};

// Maklumat 4 Jawatan Eksekutif Utama Kokurikulum Sekolah
const EXECUTIVE_POSITIONS: {
  role: ExecutiveRoleType;
  shortTitle: string;
  badgeCode: string;
  icon: string;
  dutySummary: string;
  theme: {
    border: string;
    bgHeader: string;
    badge: string;
    btn: string;
  };
}[] = [
  {
    role: 'Setiausaha Kokurikulum',
    shortTitle: 'SU Kokurikulum',
    badgeCode: 'SU KOKU',
    icon: '📋',
    dutySummary: 'Penyelaras induk pengurusan, takwim, dokumentasi & fail kokurikulum sekolah.',
    theme: {
      border: 'border-blue-200 dark:border-blue-800',
      bgHeader: 'from-blue-600 to-indigo-600',
      badge: 'bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-200 border-blue-300 dark:border-blue-700',
      btn: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
  },
  {
    role: 'Naib Setiausaha Kokurikulum',
    shortTitle: 'Naib SU Kokurikulum',
    badgeCode: 'NAIB SU KOKU',
    icon: '📑',
    dutySummary: 'Membantu urusan kokurikulum, penyelarasan sesi & laporan aktiviti.',
    theme: {
      border: 'border-sky-200 dark:border-sky-800',
      bgHeader: 'from-sky-600 to-blue-600',
      badge: 'bg-sky-100 text-sky-900 dark:bg-sky-900/60 dark:text-sky-200 border-sky-300 dark:border-sky-700',
      btn: 'bg-sky-600 hover:bg-sky-700 text-white',
    },
  },
  {
    role: 'Setiausaha Sukan',
    shortTitle: 'SU Sukan',
    badgeCode: 'SU SUKAN',
    icon: '⚡',
    dutySummary: 'Penyelaras sukan tahunan, olahraga, pertandingan MSSD/MSSN & 1M1S.',
    theme: {
      border: 'border-amber-200 dark:border-amber-800',
      bgHeader: 'from-amber-600 to-orange-600',
      badge: 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border-amber-300 dark:border-amber-700',
      btn: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
  },
  {
    role: 'Naib Setiausaha Sukan',
    shortTitle: 'Naib SU Sukan',
    badgeCode: 'NAIB SU SUKAN',
    icon: '🏃',
    dutySummary: 'Membantu pengurusan temasya sukan sekolah, padang & peralatan sukan.',
    theme: {
      border: 'border-emerald-200 dark:border-emerald-800',
      bgHeader: 'from-emerald-600 to-teal-600',
      badge: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  },
];

export const MasterTableView: React.FC<MasterTableViewProps> = ({
  teachers,
  units,
  assignments,
  conflicts,
  categoryCoordinators = [],
  executiveLeaders = [],
  onSetExecutiveLeader,
  onRemoveExecutiveLeader,
  customRoles = [],
  onAddCustomRole,
  onAddTeacher,
  onEditTeacher,
  onDeleteTeacher,
  onAssignTeacherToUnit,
  onRemoveAssignment,
  onSelectTeacherConflict,
  onOpenImport,
  onPrintAppointmentLetter,
  filterConflictTeacherId,
  onClearConflictFilter,
  onCleanInvalidData,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionFilter, setSessionFilter] = useState<'Semua' | 'Pagi' | 'Petang'>('Semua');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Konflik' | 'Lengkap' | 'Belum Lengkap'>('Semua');
  const [roleFilter, setRoleFilter] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<'sesi_alphabet' | 'alphabet' | 'assignments'>('sesi_alphabet');
  
  // State untuk Panel & Pelantikan Jawatankuasa Eksekutif (SU Koku, Naib SU Koku, SU Sukan, Naib SU Sukan)
  const [isExecutiveSectionExpanded, setIsExecutiveSectionExpanded] = useState(true);
  const [executiveModalState, setExecutiveModalState] = useState<{
    isOpen: boolean;
    role: ExecutiveRoleType;
    leaderIdToEdit?: string;
    initialTeacherId?: string;
    initialSession?: CoordinatorSessionType;
  } | null>(null);

  // State untuk Modal Pilih Unit Kategori Khusus
  const [pickerModalState, setPickerModalState] = useState<{
    teacher: Teacher;
    category: UnitCategory;
    isCategoryLocked: boolean;
  } | null>(null);

  const [teacherPendingDelete, setTeacherPendingDelete] = useState<Teacher | null>(null);

  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u])), [units]);
  const conflictMap = useMemo(() => {
    const map = new Map<string, ConflictIssue[]>();
    conflicts.forEach(c => {
      const arr = map.get(c.teacherId) || [];
      arr.push(c);
      map.set(c.teacherId, arr);
    });
    return map;
  }, [conflicts]);

  // Semak sama ada sekolah mempunyai unit, agihan, atau penyelaras bagi kategori PEMBANGUNAN
  const hasPembangunanData = useMemo(() => {
    return (
      units.some(u => u.category === 'PEMBANGUNAN') ||
      assignments.some(a => unitMap.get(a.unitId)?.category === 'PEMBANGUNAN') ||
      (categoryCoordinators || []).some(c => c.category === 'PEMBANGUNAN')
    );
  }, [units, assignments, unitMap, categoryCoordinators]);

  const filteredTeachers = useMemo(() => {
    const list = teachers.filter(teacher => {
      // Pastikan rekod adalah nama guru yang sah
      if (!teacher || !teacher.name || !isValidTeacherName(teacher.name)) {
        return false;
      }

      // Tapisan konflik khusus jika dipilih
      if (filterConflictTeacherId && teacher.id !== filterConflictTeacherId) {
        return false;
      }

      const tAssigns = assignments.filter(a => a.teacherId === teacher.id);
      const teacherCoords = (categoryCoordinators || []).filter(c => c.teacherId === teacher.id);
      const teacherExecRoles = (executiveLeaders || []).filter(e => e.teacherId === teacher.id);
      const isAnyCoord = teacherCoords.length > 0;
      const isAnyExec = teacherExecRoles.length > 0;

      // Carian nama guru, ID, telefon, atau nama unit / jawatan / penyelaras / eksekutif
      const search = searchTerm.toLowerCase();
      const matchCoordSearch = teacherCoords.some(c => 
        'penyelaras'.includes(search) || 
        c.category.toLowerCase().includes(search) ||
        getCategoryTitle(c.category).toLowerCase().includes(search) ||
        (c.roleTitle && c.roleTitle.toLowerCase().includes(search)) ||
        c.session.toLowerCase().includes(search)
      );
      const matchExecSearch = teacherExecRoles.some(e =>
        e.role.toLowerCase().includes(search) ||
        e.session.toLowerCase().includes(search) ||
        'eksekutif'.includes(search) ||
        'setiausaha'.includes(search) ||
        'sukan'.includes(search)
      );
      const matchRoleOrUnit = tAssigns.some(a => {
        const u = unitMap.get(a.unitId);
        return a.role.toLowerCase().includes(search) || (u && u.name.toLowerCase().includes(search));
      });
      const matchSearch = 
        teacher.name.toLowerCase().includes(search) || 
        teacher.staffId.toLowerCase().includes(search) ||
        (teacher.phone && teacher.phone.includes(search)) ||
        matchRoleOrUnit ||
        matchCoordSearch ||
        matchExecSearch;

      if (!matchSearch) return false;

      // Tapisan sesi
      if (sessionFilter !== 'Semua' && teacher.session !== sessionFilter) {
        return false;
      }

      // Tapisan jawatan khusus (cth: Eksekutif, Penyelaras, Jurulatih, Pengurus, Ketua Panitia)
      if (roleFilter !== 'Semua') {
        if (roleFilter === 'Eksekutif_Semua' || roleFilter === 'Eksekutif') {
          if (!isAnyExec) return false;
        } else if (roleFilter.startsWith('Eksekutif_')) {
          const targetRole = roleFilter.replace('Eksekutif_', '');
          if (!teacherExecRoles.some(e => e.role === targetRole)) return false;
        } else if (roleFilter === 'Penyelaras' || roleFilter === 'Penyelaras_Semua') {
          const hasCoordRole = isAnyCoord || tAssigns.some(a => a.role && a.role.toLowerCase().includes('penyelaras'));
          if (!hasCoordRole) return false;
        } else if (roleFilter.startsWith('Penyelaras_')) {
          const targetCat = roleFilter.replace('Penyelaras_', '');
          const matchCatCoord = teacherCoords.some(c => c.category === targetCat);
          if (!matchCatCoord) return false;
        } else {
          const hasRole = tAssigns.some(a => a.role === roleFilter);
          if (!hasRole) return false;
        }
      }

      // Tapisan status
      const tConflicts = conflictMap.get(teacher.id) || [];
      const hasErrorOrWarning = tConflicts.some(c => c.severity === 'error' || c.severity === 'warning');
      
      const hasUniform = tAssigns.some(a => unitMap.get(a.unitId)?.category === 'BERUNIFORM');
      const club = tAssigns.some(a => unitMap.get(a.unitId)?.category === 'KELAB');
      const sport = tAssigns.some(a => unitMap.get(a.unitId)?.category === 'SUKAN');
      const house = tAssigns.some(a => unitMap.get(a.unitId)?.category === 'RUMAH_SUKAN');
      const isComplete = hasUniform && club && sport && house && !hasErrorOrWarning;

      if (statusFilter === 'Konflik' && !hasErrorOrWarning) return false;
      if (statusFilter === 'Lengkap' && !isComplete) return false;
      if (statusFilter === 'Belum Lengkap' && isComplete) return false;

      return true;
    });

    // Susun data mengikut Sesi dan Alphabet (Lalai)
    return list.sort((a, b) => {
      if (sortBy === 'alphabet') {
        return a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' });
      }
      if (sortBy === 'assignments') {
        const countA = assignments.filter(x => x.teacherId === a.id).length;
        const countB = assignments.filter(x => x.teacherId === b.id).length;
        if (countB !== countA) return countB - countA;
        return a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' });
      }
      // Lalai: Mengikut SESI (Pagi dahulu, kemudian Petang) dan ALPHABET (A-Z)
      if (a.session !== b.session) {
        if (a.session === 'Pagi') return -1;
        if (b.session === 'Pagi') return 1;
        return a.session.localeCompare(b.session);
      }
      return a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' });
    });
  }, [teachers, searchTerm, sessionFilter, statusFilter, sortBy, filterConflictTeacherId, conflictMap, assignments, unitMap, categoryCoordinators, executiveLeaders, roleFilter]);

  // Buka modal pilih unit khusus untuk kategori tertentu
  const handleOpenCategoryPicker = (teacher: Teacher, category: UnitCategory) => {
    setPickerModalState({
      teacher,
      category,
      isCategoryLocked: true,
    });
  };

  // Buka modal urus semua unit untuk guru (semua kategori tersedia dalam tab, tapi setiap tab hanya paparkan unit kategori berkenaan)
  const handleOpenTeacherUnitsManager = (teacher: Teacher) => {
    setPickerModalState({
      teacher,
      category: 'BERUNIFORM',
      isCategoryLocked: false,
    });
  };

  return (
    <div className="space-y-5">
      {/* Active Conflict Banner if filtered */}
      {filterConflictTeacherId && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-sm text-amber-900 dark:text-amber-200 font-bold">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Menapis paparan jadual untuk guru terpilih daripada semakan pertindihan.</span>
          </div>
          <button
            type="button"
            onClick={onClearConflictFilter}
            className="text-xs font-black text-amber-800 dark:text-amber-300 underline hover:text-amber-950 cursor-pointer"
          >
            Papar Semua Guru Semula
          </button>
        </div>
      )}

      {/* RUANG PELANTIKAN JAWATANKUASA EKSEKUTIF KOKURIKULUM */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-5 sm:p-6 shadow-xl border border-indigo-500/20 text-white relative overflow-hidden">
        {/* Latar belakang hiasan cahaya */}
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Bahagian Kepala (Header) Ruang Pelantikan */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-indigo-500/20 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30 shrink-0">
              🏛️
            </div>
            <div>
              <div className="flex items-center flex-wrap gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-wide">
                  Jawatankuasa Pengurusan Kokurikulum Sekolah
                </h2>
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Jawatan Penting Sekolah
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-1 leading-relaxed">
                Pelantikan rasmi: <b>Setiausaha Kokurikulum</b>, <b>Naib Setiausaha Kokurikulum</b>, <b>Setiausaha Sukan</b> &amp; <b>Naib Setiausaha Sukan</b>. Nama guru &amp; jawatan dilantik akan dijana automatik dalam <b>Surat Pelantikan Rasmi</b>.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 self-end sm:self-auto shrink-0">
            {/* Butang Lantik */}
            <button
              type="button"
              onClick={() => {
                setExecutiveModalState({
                  isOpen: true,
                  role: 'Setiausaha Kokurikulum',
                  initialTeacherId: teachers[0]?.id || '',
                  initialSession: 'Kedua-dua Sesi',
                });
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-500/20 transition-all cursor-pointer hover:scale-102"
            >
              <Plus className="w-4 h-4" />
              <span>+ Lantik</span>
            </button>

            {/* Butang Kuncup / Kembang */}
            <button
              type="button"
              onClick={() => setIsExecutiveSectionExpanded(prev => !prev)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              title={isExecutiveSectionExpanded ? 'Kuncupkan panel' : 'Kembangkan panel'}
            >
              <span>{isExecutiveSectionExpanded ? 'Sembunyi' : 'Papar'}</span>
              {isExecutiveSectionExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 4 Kad Jawatan Eksekutif Utama Kokurikulum Sekolah */}
        {isExecutiveSectionExpanded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 relative z-10">
            {EXECUTIVE_POSITIONS.map(pos => {
              const leaders = executiveLeaders.filter(l => l.role === pos.role);
              const isAssigned = leaders.length > 0;

              return (
                <div
                  key={pos.role}
                  className={`bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl p-4 border transition-all flex flex-col justify-between shadow-xs ${
                    isAssigned 
                      ? `${pos.theme.border} ring-1 ring-indigo-500/10 dark:ring-indigo-400/10` 
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Kad Atas: Tajuk & Status */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl shrink-0 p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                          {pos.icon}
                        </span>
                        <div>
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${pos.theme.badge}`}>
                            {pos.badgeCode}
                          </span>
                        </div>
                      </div>

                      {/* Status Lantikan */}
                      {isAssigned ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shrink-0">
                          <Check className="w-3 h-3" />
                          <span>{leaders.length > 1 ? `${leaders.length} Dilantik` : 'Dilantik'}</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shrink-0">
                          Belum Dilantik
                        </span>
                      )}
                    </div>

                    <h3 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                      {pos.role}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {pos.dutySummary}
                    </p>
                  </div>

                  {/* Kandungan Tengah: Senarai Guru Dilantik atau Placeholder */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {isAssigned ? (
                      <div className="space-y-2.5">
                        {leaders.map(leader => {
                          const teacher = teachers.find(t => t.id === leader.teacherId);
                          return (
                            <div
                              key={leader.id}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-2 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="min-w-0 flex-1">
                                  <div className="font-black text-xs text-slate-900 dark:text-white truncate">
                                    {teacher?.name || 'Guru Tidak Ditemui'}
                                  </div>
                                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    <span>Gred: <b className="text-slate-700 dark:text-slate-300">{formatTeacherGrade(teacher?.grade)}</b></span>
                                    <span>•</span>
                                    <span>Asal: {teacher?.session || '-'}</span>
                                  </div>
                                </div>
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md shrink-0 ${
                                  leader.session === 'Kedua-dua Sesi'
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200'
                                    : leader.session === 'Pagi'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200'
                                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200'
                                }`}>
                                  {leader.session}
                                </span>
                              </div>

                              {/* Butang Tindakan: Surat Pelantikan & Kemaskini */}
                              <div className="flex items-center justify-between pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60 gap-1">
                                {/* Butang Surat Pelantikan untuk Guru ini */}
                                {teacher && onPrintAppointmentLetter && (
                                  <button
                                    type="button"
                                    onClick={() => onPrintAppointmentLetter(teacher)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:hover:bg-emerald-900/90 dark:text-emerald-300 text-[11px] font-black transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
                                    title={`Jana & cetak Surat Pelantikan rasmi bagi Cikgu ${teacher.name}`}
                                  >
                                    <FileCheck className="w-3.5 h-3.5" />
                                    <span>Surat Pelantikan</span>
                                  </button>
                                )}

                                <div className="flex items-center gap-1">
                                  {/* Kemaskini */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setExecutiveModalState({
                                        isOpen: true,
                                        role: pos.role,
                                        leaderIdToEdit: leader.id,
                                        initialTeacherId: leader.teacherId,
                                        initialSession: leader.session,
                                      });
                                    }}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                    title="Kemas kini nama guru atau pilihan sesi"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Gugurkan */}
                                  {onRemoveExecutiveLeader && (
                                    <button
                                      type="button"
                                      onClick={() => onRemoveExecutiveLeader(leader.id)}
                                      className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                      title="Gugurkan pelantikan jawatan ini"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Butang Tambah Lantikan Tambahan jika sekolah ada ramai pelantikan (cth: sesi petang) */}
                        <button
                          type="button"
                          onClick={() => {
                            setExecutiveModalState({
                              isOpen: true,
                              role: pos.role,
                              initialTeacherId: teachers[0]?.id || '',
                              initialSession: pos.role.includes('Naib') ? 'Petang' : 'Kedua-dua Sesi',
                            });
                          }}
                          className="w-full py-1.5 px-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-400 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Tambah Lantikan {pos.shortTitle}</span>
                        </button>
                      </div>
                    ) : (
                      /* Keadaan Belum Dilantik */
                      <div className="py-3 px-2 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-800/30">
                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mb-2">
                          Tiada guru dilantik setakat ini
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setExecutiveModalState({
                              isOpen: true,
                              role: pos.role,
                              initialTeacherId: teachers[0]?.id || '',
                              initialSession: pos.role.includes('Naib') ? 'Pagi' : 'Kedua-dua Sesi',
                            });
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer ${pos.theme.btn}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Lantik {pos.shortTitle}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Control Bar: Search, Filters & Action Buttons */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        {/* Search Input - Diperbesarkan untuk kemudahan guru menaip dan mencari */}
        <div className="relative flex-1 min-w-[280px] lg:min-w-[380px]">
          <Search className="w-5 h-5 absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Taip nama guru, nombor fail/KP, atau unit..."
            className="w-full pl-11 sm:pl-12 pr-10 py-3 sm:py-3.5 text-sm sm:text-base rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50/90 dark:bg-slate-800/90 text-slate-900 dark:text-white font-semibold placeholder:font-normal placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-emerald-500/15 shadow-xs transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-black transition-colors cursor-pointer"
              title="Kosongkan carian"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Controls & Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Sesi Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
            {(['Semua', 'Pagi', 'Petang'] as const).map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSessionFilter(s)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  sessionFilter === s
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {s === 'Pagi' && <Sun className="w-3.5 h-3.5 inline mr-1 text-amber-500" />}
                {s === 'Petang' && <Sunset className="w-3.5 h-3.5 inline mr-1 text-indigo-500" />}
                {s}
              </button>
            ))}
          </div>

          {/* Quick Filter: Tunjuk Penyelaras Sahaja */}
          <button
            type="button"
            onClick={() => setRoleFilter(prev => prev === 'Penyelaras' ? 'Semua' : 'Penyelaras')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              roleFilter === 'Penyelaras'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md ring-2 ring-purple-300 dark:ring-purple-600 scale-102'
                : 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
            }`}
            title="Tapis dan cari guru yang memegang jawatan Penyelaras Unit"
          >
            <Award className="w-3.5 h-3.5" />
            <span>⭐ Tunjuk Penyelaras Sahaja</span>
            {roleFilter === 'Penyelaras' && <Check className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          {/* Role Filter Dropdown */}
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-purple-500 cursor-pointer"
          >
            <option value="Semua">Semua Jawatan Guru</option>
            <optgroup label="🏛️ Jawatankuasa Eksekutif Kokurikulum">
              <option value="Eksekutif_Semua">🏛️ Semua Pegawai Eksekutif (SU / Naib SU)</option>
              <option value="Eksekutif_Setiausaha Kokurikulum">📋 Setiausaha Kokurikulum</option>
              <option value="Eksekutif_Naib Setiausaha Kokurikulum">📑 Naib Setiausaha Kokurikulum</option>
              <option value="Eksekutif_Setiausaha Sukan">⚡ Setiausaha Sukan</option>
              <option value="Eksekutif_Naib Setiausaha Sukan">🏃 Naib Setiausaha Sukan</option>
            </optgroup>
            <optgroup label="⭐ Penyelaras Unit Besar">
              <option value="Penyelaras">⭐ Semua Penyelaras Unit</option>
              <option value="Penyelaras_BERUNIFORM">⭐ Penyelaras Unit Beruniform</option>
              <option value="Penyelaras_KELAB">⭐ Penyelaras Kelab &amp; Persatuan</option>
              <option value="Penyelaras_SUKAN">⭐ Penyelaras Sukan &amp; Permainan</option>
              <option value="Penyelaras_RUMAH_SUKAN">⭐ Penyelaras Rumah Sukan</option>
              {hasPembangunanData && (
                <option value="Penyelaras_PEMBANGUNAN">⭐ Penyelaras Pembangunan</option>
              )}
            </optgroup>
            <optgroup label="Jawatan Dalam Unit">
              <option value="Ketua Guru Penasihat">Ketua Guru Penasihat</option>
              <option value="Jurulatih">Jurulatih</option>
              <option value="Pengurus">Pengurus</option>
              <option value="Ketua Panitia">Ketua Panitia</option>
              <option value="Setiausaha">Setiausaha</option>
              <option value="Penolong Ketua Guru Penasihat">Penolong Ketua Guru Penasihat</option>
              <option value="Bendahari">Bendahari</option>
              <option value="AJK">AJK</option>
              {customRoles.map(cr => (
                <option key={`opt-custom-role-${cr}`} value={cr}>{cr}</option>
              ))}
            </optgroup>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="Semua">Semua Status Guru</option>
            <option value="Konflik">⚠️ Ada Pertindihan / Konflik</option>
            <option value="Lengkap">✅ Agihan Lengkap 4 Teras</option>
            <option value="Belum Lengkap">⏳ Belum Lengkap</option>
          </select>

          {/* Susun Mengikut Sesi & Alphabet Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <span className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">Susun:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="text-xs font-extrabold bg-transparent text-emerald-800 dark:text-emerald-300 focus:outline-hidden cursor-pointer"
            >
              <option value="sesi_alphabet">Sesi (Pagi ➔ Petang) &amp; Abjad (A ➔ Z)</option>
              <option value="alphabet">Abjad Sahaja (A ➔ Z)</option>
              <option value="assignments">Jumlah Unit Terbanyak</option>
            </select>
          </div>

          {/* Import Guru daripada Excel Button */}
          {onOpenImport && (
            <button
              type="button"
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer hover:shadow-md"
              title="Import senarai nama guru sekolah dari fail Excel (.xlsx, .xls atau .csv)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Import Excel Guru</span>
            </button>
          )}

          {/* Add Teacher Button */}
          <button
            type="button"
            onClick={onAddTeacher}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer hover:shadow-md"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah Guru</span>
          </button>

          {/* Clean Invalid Data Button (Buang data bukan nama guru) */}
          {onCleanInvalidData && (
            <button
              type="button"
              onClick={onCleanInvalidData}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 dark:bg-slate-800 dark:hover:bg-rose-950/40 dark:text-slate-300 dark:hover:text-rose-300 border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all cursor-pointer"
              title="Keluarkan sebarang baris bukan nama guru (tajuk, panduan, atau ID) daripada jadual"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan Senarai</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container: Paparan Berstruktur */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-extrabold text-xs border-b border-slate-200 dark:border-slate-700">
                <th className="py-4 px-3 w-12 text-center">Bil</th>
                <th className="py-4 px-4 min-w-[210px]">
                  <button
                    type="button"
                    onClick={() => setSortBy(prev => prev === 'alphabet' ? 'sesi_alphabet' : 'alphabet')}
                    className="flex items-center gap-1.5 hover:text-emerald-600 transition-colors cursor-pointer text-left uppercase tracking-wider font-extrabold text-xs"
                    title="Klik untuk susun ikut Abjad A-Z atau Sesi & Abjad"
                  >
                    <span>Nama Guru</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-black tracking-normal ${
                      sortBy === 'alphabet' || sortBy === 'sesi_alphabet'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      A-Z
                    </span>
                  </button>
                </th>
                <th className="py-4 px-3 text-center w-24">
                  <button
                    type="button"
                    onClick={() => setSortBy('sesi_alphabet')}
                    className="inline-flex items-center justify-center gap-1 hover:text-amber-600 transition-colors cursor-pointer uppercase tracking-wider font-extrabold text-xs mx-auto"
                    title="Klik untuk susun mengikut Sesi (Pagi dahulu, kemudian Petang)"
                  >
                    <span>Sesi</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-black tracking-normal ${
                      sortBy === 'sesi_alphabet'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      Pagi/Ptg
                    </span>
                  </button>
                </th>
                <th className="py-4 px-3 min-w-[190px]">
                  <div className="flex items-center gap-1.5">
                    <span>🛡️</span>
                    <span>Unit Beruniform</span>
                  </div>
                </th>
                <th className="py-4 px-3 min-w-[190px]">
                  <div className="flex items-center gap-1.5">
                    <span>🎨</span>
                    <span>Kelab &amp; Persatuan</span>
                  </div>
                </th>
                <th className="py-4 px-3 min-w-[190px]">
                  <div className="flex items-center gap-1.5">
                    <span>⚽</span>
                    <span>Sukan &amp; Permainan</span>
                  </div>
                </th>
                <th className="py-4 px-3 min-w-[190px]">
                  <div className="flex items-center gap-1.5">
                    <span>🏆</span>
                    <span>Rumah Sukan</span>
                  </div>
                </th>
                {hasPembangunanData && (
                  <th className="py-4 px-3 min-w-[190px]">
                    <div className="flex items-center gap-1.5">
                      <span>🚀</span>
                      <span>Pembangunan / Khas</span>
                    </div>
                  </th>
                )}
                <th className="py-4 px-3 text-center min-w-[120px]">Status</th>
                <th className="py-4 px-3 text-center w-24">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={hasPembangunanData ? 10 : 9} className="py-20 text-center">
                    <div className="max-w-md mx-auto px-4">
                      <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-800 shadow-xs">
                        <UserPlus className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
                        Pangkalan Data Guru Sekolah
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                        Data telah sedia untuk rekod guru sebenar sekolah anda. Anda boleh memasukkan senarai guru melalui import fail Excel atau tambah secara manual.
                      </p>
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        {onOpenImport && (
                          <button
                            type="button"
                            onClick={onOpenImport}
                            className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>Import Guru Dari Excel / CSV</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={onAddTeacher}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 border border-slate-300 dark:border-slate-700 transition-all cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          <span>+ Tambah Guru Manual</span>
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={hasPembangunanData ? 10 : 9} className="py-16 text-center text-slate-400">
                    Tiada maklumat guru ditemui yang sepadan dengan carian atau tapisan.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, index) => {
                  const teacherAssigns = assignments.filter(a => a.teacherId === teacher.id);
                  const teacherCoords = (categoryCoordinators || []).filter(c => c.teacherId === teacher.id);
                  const teacherExecRoles = (executiveLeaders || []).filter(e => e.teacherId === teacher.id);
                  const tConflicts = conflictMap.get(teacher.id) || [];
                  const hasSevereConflict = tConflicts.some(c => c.severity === 'error');
                  const hasWarning = tConflicts.some(c => c.severity === 'warning');

                  const uniformAssign = teacherAssigns.find(a => unitMap.get(a.unitId)?.category === 'BERUNIFORM');
                  const clubAssign = teacherAssigns.find(a => unitMap.get(a.unitId)?.category === 'KELAB');
                  const sportAssign = teacherAssigns.find(a => unitMap.get(a.unitId)?.category === 'SUKAN');
                  const houseAssign = teacherAssigns.find(a => unitMap.get(a.unitId)?.category === 'RUMAH_SUKAN');
                  const specialAssigns = teacherAssigns.filter(a => unitMap.get(a.unitId)?.category === 'PEMBANGUNAN');

                  const uniformCoord = teacherCoords.find(c => c.category === 'BERUNIFORM');
                  const clubCoord = teacherCoords.find(c => c.category === 'KELAB');
                  const sportCoord = teacherCoords.find(c => c.category === 'SUKAN');
                  const houseCoord = teacherCoords.find(c => c.category === 'RUMAH_SUKAN');
                  const devCoord = teacherCoords.find(c => c.category === 'PEMBANGUNAN');

                  // Core completion
                  const isFullyAssigned = uniformAssign && clubAssign && sportAssign && houseAssign && !hasSevereConflict;

                  return (
                    <tr 
                      key={`${teacher.id || 'teacher'}-${index}`} 
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${
                        hasSevereConflict 
                          ? 'bg-rose-50/40 dark:bg-rose-950/20' 
                          : index % 2 === 0 
                          ? 'bg-white dark:bg-slate-900' 
                          : 'bg-slate-50/40 dark:bg-slate-900/60'
                      }`}
                    >
                      {/* Bil */}
                      <td className="py-4 px-3 text-center font-bold text-slate-400">
                        {index + 1}
                      </td>

                      {/* Maklumat Guru */}
                      <td className="py-4 px-4">
                        <div className="font-extrabold text-slate-900 dark:text-slate-100 text-sm hover:text-emerald-600 transition-colors">
                          {teacher.name}
                        </div>
                        <div className="flex items-center flex-wrap gap-2 text-xs mt-1">
                          <span className={`inline-flex items-center gap-1 font-semibold ${
                            teacher.gender === 'L' ? 'text-blue-600 dark:text-blue-400' : 'text-pink-600 dark:text-pink-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${teacher.gender === 'L' ? 'bg-blue-500' : 'bg-pink-500'}`} />
                            {teacher.gender === 'L' ? 'Lelaki' : 'Perempuan'}
                          </span>
                          {teacher.grade && (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800 tracking-tight">
                              {formatTeacherGrade(teacher.grade)}
                            </span>
                          )}
                          {teacher.staffId && !teacher.staffId.startsWith('G1') && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              IC: {teacher.staffId}
                            </span>
                          )}
                        </div>

                        {/* Executive Leadership Badges (Setiausaha Kokurikulum, Naib SU, SU Sukan, Naib SU Sukan) */}
                        {teacherExecRoles.length > 0 && (
                          <div className="flex items-center flex-wrap gap-1 mt-1.5">
                            {teacherExecRoles.map(er => (
                              <span 
                                key={er.id} 
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-sky-700 text-white shadow-xs ring-1 ring-blue-300 dark:ring-blue-500"
                                title={`Jawatankuasa Eksekutif Kokurikulum: ${er.role} (${er.session})`}
                              >
                                <span>🏛️</span> {er.role} ({er.session})
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Coordinator Badges (Penyelaras Unit Besar) */}
                        {teacherCoords.length > 0 && (
                          <div className="flex items-center flex-wrap gap-1 mt-1.5">
                            {teacherCoords.map(tc => (
                              <span 
                                key={tc.id} 
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-xs ring-1 ring-purple-300 dark:ring-purple-500"
                                title={`Penyelaras ${getCategoryTitle(tc.category)} (${tc.session})`}
                              >
                                <span>⭐</span> {tc.roleTitle || 'Penyelaras'} {getCategoryTitle(tc.category).replace('Unit ', '').replace(' dan ', ' & ')} ({tc.session})
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Sesi Bertugas Hakiki */}
                      <td className="py-4 px-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                          teacher.session === 'Pagi'
                            ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/80 dark:text-indigo-300'
                        }`}>
                          {teacher.session === 'Pagi' ? <Sun className="w-3.5 h-3.5 text-amber-600" /> : <Sunset className="w-3.5 h-3.5 text-indigo-600" />}
                          {teacher.session}
                        </span>
                      </td>

                      {/* Unit Beruniform (Hanya unit Unit Beruniform) */}
                      <td className="py-4 px-3">
                        {renderSlotCell(
                          uniformAssign, 
                          unitMap, 
                          () => handleOpenCategoryPicker(teacher, 'BERUNIFORM'), 
                          onRemoveAssignment,
                          'Unit Beruniform',
                          uniformCoord
                        )}
                      </td>

                      {/* Kelab & Persatuan (Hanya unit Kelab & Persatuan) */}
                      <td className="py-4 px-3">
                        {renderSlotCell(
                          clubAssign, 
                          unitMap, 
                          () => handleOpenCategoryPicker(teacher, 'KELAB'), 
                          onRemoveAssignment,
                          'Kelab & Persatuan',
                          clubCoord
                        )}
                      </td>

                      {/* Sukan & Permainan (Hanya unit Sukan & Permainan) */}
                      <td className="py-4 px-3">
                        {renderSlotCell(
                          sportAssign, 
                          unitMap, 
                          () => handleOpenCategoryPicker(teacher, 'SUKAN'), 
                          onRemoveAssignment,
                          'Sukan & Permainan',
                          sportCoord
                        )}
                      </td>

                      {/* Rumah Sukan (Hanya unit Rumah Sukan) */}
                      <td className="py-4 px-3">
                        {renderSlotCell(
                          houseAssign, 
                          unitMap, 
                          () => handleOpenCategoryPicker(teacher, 'RUMAH_SUKAN'), 
                          onRemoveAssignment,
                          'Rumah Sukan',
                          houseCoord
                        )}
                      </td>

                      {/* Unit Pembangunan (Hanya jika sekolah mempunyai unit / agihan Pembangunan) */}
                      {hasPembangunanData && (
                        <td className="py-4 px-3">
                          {devCoord && (
                            <div className="mb-2 p-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-md ring-2 ring-purple-300 dark:ring-purple-500 border border-purple-200">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-black tracking-wide flex items-center gap-1 truncate">
                                  <span>⭐</span>
                                  <span className="truncate">{devCoord.roleTitle || 'PENYELARAS'}</span>
                                </span>
                                <span className="text-[9px] font-black bg-white/25 px-1.5 py-0.5 rounded shrink-0">
                                  {devCoord.session}
                                </span>
                              </div>
                            </div>
                          )}
                          {specialAssigns.length > 0 ? (
                            <div className="space-y-1.5">
                              {specialAssigns.map(sp => {
                                const unit = unitMap.get(sp.unitId);
                                const roleBadge = getRoleColorBadge(sp.role);
                                return (
                                  <div key={sp.id} className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs">
                                    <div className="flex items-center justify-between gap-1">
                                      <span 
                                        className="font-extrabold text-purple-950 dark:text-purple-200 truncate cursor-pointer hover:underline"
                                        onClick={() => handleOpenCategoryPicker(teacher, 'PEMBANGUNAN')}
                                        title={unit?.name}
                                      >
                                        {unit?.name}
                                      </span>
                                      <div className="flex items-center gap-0.5 shrink-0">
                                        <button 
                                          type="button"
                                          onClick={() => handleOpenCategoryPicker(teacher, 'PEMBANGUNAN')}
                                          className="text-slate-400 hover:text-purple-600 p-0.5 rounded cursor-pointer"
                                          title="Tukar unit / jawatan"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                        <button 
                                          type="button"
                                          onClick={() => onRemoveAssignment(sp.id)}
                                          className="text-slate-400 hover:text-rose-600 font-black p-0.5 text-sm cursor-pointer"
                                          title="Gugurkan dari unit ini"
                                        >
                                          ×
                                        </button>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-1 mt-1.5">
                                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${roleBadge.bg}`}>
                                        {sp.role}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded">
                                        {sp.session}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                              <button
                                type="button"
                                onClick={() => handleOpenCategoryPicker(teacher, 'PEMBANGUNAN')}
                                className="w-full py-1.5 px-2 rounded-lg border border-dashed border-purple-300 dark:border-purple-700 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-[11px] font-bold transition-all text-center cursor-pointer"
                              >
                                + Tambah Unit Pembangunan
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenCategoryPicker(teacher, 'PEMBANGUNAN')}
                              className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-purple-600 hover:border-purple-300 dark:hover:border-purple-700 text-xs font-bold transition-all text-center cursor-pointer hover:bg-purple-50/30"
                            >
                              + Pilih Pembangunan
                            </button>
                          )}
                        </td>
                      )}

                      {/* Status / Pertindihan */}
                      <td className="py-4 px-3 text-center">
                        {hasSevereConflict ? (
                          <button
                            type="button"
                            onClick={() => onSelectTeacherConflict(teacher.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-black text-xs hover:bg-rose-200 transition-colors animate-pulse cursor-pointer shadow-xs"
                            title={tConflicts.map(c => c.message).join(' | ')}
                          >
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            <span>Konflik!</span>
                          </button>
                        ) : hasWarning ? (
                          <button
                            type="button"
                            onClick={() => onSelectTeacherConflict(teacher.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-xs cursor-pointer"
                            title={tConflicts.map(c => c.message).join(' | ')}
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Semak</span>
                          </button>
                        ) : isFullyAssigned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Lengkap</span>
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">
                            {teacherAssigns.length}/4 Teras
                          </span>
                        )}
                      </td>

                      {/* Tindakan Guru */}
                      <td className="py-4 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {onPrintAppointmentLetter && (
                            <button
                              type="button"
                              onClick={() => onPrintAppointmentLetter(teacher)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 rounded-lg transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800"
                              title={`Jana & Cetak Surat Pelantikan untuk Cikgu ${teacher.name}`}
                            >
                              <FileCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenTeacherUnitsManager(teacher)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Urus Semua Agihan Unit Guru Ini"
                          >
                            <Layers className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditTeacher(teacher)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title="Edit Maklumat Guru"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTeacherPendingDelete(teacher)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                            title={`Padam Maklumat Cikgu ${teacher.name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info / Legend */}
        <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Menunjukkan <b>{filteredTeachers.length}</b> daripada <b>{teachers.length}</b> orang guru sekolah
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Lengkap 4 Teras
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Pertindihan Jawatan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span> Belum Lengkap
            </span>
          </div>
        </div>
      </div>

      {/* Modal Pemilihan Unit Khusus Mengikut Kategori (Hanya Senarai Unit Berkaitan Sahaja Dipaparkan) */}
      {pickerModalState && (
        <CategoryUnitPickerModal
          teacher={pickerModalState.teacher}
          initialCategory={pickerModalState.category}
          isCategoryLocked={pickerModalState.isCategoryLocked}
          units={units}
          assignments={assignments}
          customRoles={customRoles}
          onAddCustomRole={onAddCustomRole}
          onClose={() => setPickerModalState(null)}
          onAssign={(unitId, role, session) => {
            onAssignTeacherToUnit(pickerModalState.teacher.id, unitId, role, session);
            setPickerModalState(null);
          }}
          onRemoveAssignment={onRemoveAssignment}
        />
      )}

      {/* Modal Pelantikan Pegawai Eksekutif Kokurikulum */}
      {executiveModalState && executiveModalState.isOpen && (
        <ExecutiveAppointmentModal
          isOpen={executiveModalState.isOpen}
          role={executiveModalState.role}
          leaderIdToEdit={executiveModalState.leaderIdToEdit}
          initialTeacherId={executiveModalState.initialTeacherId}
          initialSession={executiveModalState.initialSession}
          teachers={teachers}
          onClose={() => setExecutiveModalState(null)}
          onSave={(role, teacherId, session, leaderIdToEdit) => {
            onSetExecutiveLeader?.(role, teacherId, session, leaderIdToEdit);
            setExecutiveModalState(null);
          }}
        />
      )}

      {/* Modal Sahkan Padam Guru */}
      {teacherPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-rose-200 dark:border-rose-900/50">
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Sahkan Padam Guru
                </h3>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  Tindakan Kekal
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Adakah anda pasti mahu memadam <b className="text-rose-600 dark:text-rose-400">Cikgu {teacherPendingDelete.name}</b> ({teacherPendingDelete.session}) daripada senarai guru sekolah?
              </p>

              {assignments.filter(a => a.teacherId === teacherPendingDelete.id).length > 0 ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Guru ini mempunyai <b>{assignments.filter(a => a.teacherId === teacherPendingDelete.id).length} agihan unit</b>. Memadam guru ini akan menggugurkan semua jawatan dan unit yang dipegangnya.
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Guru ini belum memegang sebarang unit kokurikulum.
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setTeacherPendingDelete(null)}
                className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteTeacher(teacherPendingDelete.id);
                  setTeacherPendingDelete(null);
                }}
                className="px-5 py-2.5 text-white bg-rose-600 hover:bg-rose-700 rounded-xl font-black text-xs shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Padam Guru</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper: Slot Cell Renderer dengan fungsi Pilih & Tukar Unit Kategori Berkenaan
function renderSlotCell(
  assign: UnitAssignment | undefined,
  unitMap: Map<string, KokuUnit>,
  onAddOrChangeClick: () => void,
  onRemove: (id: string) => void,
  categoryLabel: string,
  categoryCoordinator?: CategoryCoordinator
) {
  return (
    <div className="space-y-1.5">
      {/* Penyelaras Unit Besar Banner (Jika guru adalah Penyelaras bagi kategori unit ini) */}
      {categoryCoordinator && (
        <div className="p-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white shadow-md ring-2 ring-purple-300 dark:ring-purple-500 border border-purple-200">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-black tracking-wide flex items-center gap-1 truncate">
              <span>⭐</span>
              <span className="truncate">{categoryCoordinator.roleTitle || 'PENYELARAS'}</span>
            </span>
            <span className="text-[9px] font-black bg-white/25 px-1.5 py-0.5 rounded shrink-0">
              {categoryCoordinator.session}
            </span>
          </div>
        </div>
      )}

      {/* Sub-Unit Assignment Card (Jika ada) */}
      {!assign ? (
        <button
          type="button"
          onClick={onAddOrChangeClick}
          className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-emerald-600 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors text-center text-xs font-bold cursor-pointer group hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20"
          title={`Pilih ${categoryLabel} untuk guru ini`}
        >
          <span className="group-hover:scale-105 inline-block transition-transform">+ Pilih {categoryLabel}</span>
        </button>
      ) : (
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-slate-300 transition-all">
          <div className="font-extrabold text-slate-800 dark:text-slate-100 text-xs truncate flex items-center justify-between gap-1">
            <span 
              title={`${unitMap.get(assign.unitId)?.name || assign.unitId} (Klik untuk tukar unit)`}
              onClick={onAddOrChangeClick}
              className="cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate"
            >
              {unitMap.get(assign.unitId)?.name || assign.unitId}
            </span>
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={onAddOrChangeClick}
                className="text-slate-400 hover:text-blue-600 p-0.5 rounded cursor-pointer transition-colors"
                title="Tukar unit / jawatan"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(assign.id)}
                className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer font-black text-sm transition-colors"
                title="Gugurkan daripada unit ini"
              >
                ×
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between gap-1.5 mt-1.5">
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black truncate max-w-[120px] ${getRoleColorBadge(assign.role).bg}`}>
              {assign.role}
            </span>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded">
              {assign.session}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Modal Komponen: Pilih Unit Kokurikulum (Dikhaskan Mengikut Kategori Sahaja)
interface CategoryUnitPickerModalProps {
  teacher: Teacher;
  initialCategory: UnitCategory;
  isCategoryLocked?: boolean;
  units: KokuUnit[];
  assignments: UnitAssignment[];
  customRoles?: string[];
  onAddCustomRole?: (role: string) => void;
  onClose: () => void;
  onAssign: (unitId: string, role: RoleType, session: SessionType) => void;
  onRemoveAssignment: (assignmentId: string) => void;
}

const CategoryUnitPickerModal: React.FC<CategoryUnitPickerModalProps> = ({
  teacher,
  initialCategory,
  isCategoryLocked = false,
  units,
  assignments,
  customRoles = [],
  onAddCustomRole,
  onClose,
  onAssign,
  onRemoveAssignment,
}) => {
  const [activeCategory, setActiveCategory] = useState<UnitCategory>(initialCategory);
  const [selectedRole, setSelectedRole] = useState<RoleType>('AJK');
  const [isCustomRole, setIsCustomRole] = useState(false);
  const [customRoleInput, setCustomRoleInput] = useState('');
  const [selectedSession, setSelectedSession] = useState<SessionType>(teacher.session);

  // PENTING: Hanya senarai unit dalam kategori yang sedang aktif SAHAJA ditapis dan dipaparkan!
  const categoryUnits = useMemo(() => {
    return units
      .filter(u => u.category === activeCategory)
      .sort((a, b) => a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' }));
  }, [units, activeCategory]);

  const [selectedUnitId, setSelectedUnitId] = useState<string>(categoryUnits[0]?.id || '');

  // Kemaskini selectedUnitId jika kategori bertukar
  React.useEffect(() => {
    if (categoryUnits.length > 0) {
      if (!categoryUnits.some(u => u.id === selectedUnitId)) {
        setSelectedUnitId(categoryUnits[0].id);
      }
    } else {
      setSelectedUnitId('');
    }
  }, [categoryUnits, selectedUnitId]);

  const teacherAssigns = assignments.filter(a => a.teacherId === teacher.id);
  const currentCategoryAssigns = teacherAssigns.filter(a => {
    const u = units.find(unit => unit.id === a.unitId);
    return u?.category === activeCategory;
  });

  const catMeta = CATEGORY_META[activeCategory];
  const unitMap = useMemo(() => new Map(units.map(u => [u.id, u])), [units]);

  // Senarai jawatan: Piawai (termasuk Jurulatih, Pengurus, Ketua Panitia) + Jawatan Tersuai
  const rolesList: string[] = useMemo(() => {
    const list: string[] = [
      'Ketua Guru Penasihat',
      'Jurulatih',
      'Pengurus',
      'Ketua Panitia',
      'Setiausaha',
      'Penolong Ketua Guru Penasihat',
      'Bendahari',
      'AJK',
    ];
    // Tambah jawatan tersuai sedia ada
    (customRoles || []).forEach(r => {
      if (r && !list.includes(r)) list.push(r);
    });
    // Tambah jawatan yang digunakan dalam agihan sedia ada
    assignments.forEach(a => {
      if (a.role && !list.includes(a.role) && a.role !== '__CUSTOM__' && a.role !== '__ADD_NEW__') {
        list.push(a.role);
      }
    });
    return list;
  }, [customRoles, assignments]);

  const categoryList: UnitCategory[] = [
    'BERUNIFORM',
    'KELAB',
    'SUKAN',
    'RUMAH_SUKAN',
    'PEMBANGUNAN',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-black border ${catMeta.badgeClass}`}>
                {catMeta.icon} {catMeta.title}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1.5">
              Pilih Unit: Cikgu {teacher.name}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Sesi Bertugas Hakiki: <b>{teacher.session}</b> • {teacher.gender === 'L' ? 'Guru Lelaki' : 'Guru Perempuan'}
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-lg font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto py-3 space-y-4 text-xs">
          {/* Category Tabs jika kategori TIDAK dikunci (Urus Semua Unit) */}
          {!isCategoryLocked && (
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Pilih Kategori Unit
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {categoryList.map(cat => {
                  const meta = CATEGORY_META[cat];
                  const isCurrent = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`p-2 rounded-xl text-left border font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <span>{meta.icon}</span>
                      <span className="truncate">{meta.shortTitle}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unit yang Sedang Dipegang dalam Kategori Ini */}
          {currentCategoryAssigns.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Unit Semasa Bagi Kategori {catMeta.shortTitle}
                </span>
                <span className="text-[10px] text-emerald-600 font-bold">Telah Didaftarkan</span>
              </div>
              <div className="space-y-2">
                {currentCategoryAssigns.map((a, aIdx) => {
                  const u = unitMap.get(a.unitId);
                  const roleBadge = getRoleColorBadge(a.role);
                  return (
                    <div key={`${a.id || 'assign'}-${aIdx}`} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                      <div>
                        <div className="font-black text-slate-900 dark:text-white text-xs">
                          {u?.name || a.unitId}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.2 rounded font-bold text-[10px] ${roleBadge.bg}`}>
                            {a.role}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            Sesi {a.session}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveAssignment(a.id)}
                        className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg cursor-pointer"
                        title="Gugurkan unit ini"
                      >
                        Gugurkan
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form Pemilihan Unit Baharu (Hanya Kategori Ini) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                Pilih Unit Dalam Kategori {catMeta.title} *
              </label>
              <span className="text-[11px] font-semibold text-slate-400">
                {categoryUnits.length} pilihan unit
              </span>
            </div>

            {categoryUnits.length === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-center font-medium">
                Tiada unit kokurikulum didaftarkan dalam kategori <b>{catMeta.title}</b> lagi. Sila daftar unit dalam tab <b>{catMeta.title}</b> terlebih dahulu.
              </div>
            ) : (
              <select
                value={selectedUnitId}
                onChange={e => setSelectedUnitId(e.target.value)}
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer shadow-xs focus:ring-2 focus:ring-emerald-500"
              >
                {categoryUnits.map(u => {
                  // Elakkan pengulangan akronim atau warna jika nama unit sudah mengandungi kurungan (cth: BSMM atau Merah)
                  const hasParenthesis = u.name.includes('(') && u.name.includes(')');
                  const displayName = hasParenthesis || !u.code ? u.name : `${u.name} (${u.code})`;
                  return (
                    <option key={u.id} value={u.id}>
                      {displayName}
                    </option>
                  );
                })}
              </select>
            )}

            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                    Jawatan Guru *
                  </label>
                  <select
                    value={isCustomRole ? '__CUSTOM__' : selectedRole}
                    onChange={e => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomRole(true);
                      } else {
                        setIsCustomRole(false);
                        setSelectedRole(e.target.value as RoleType);
                      }
                    }}
                    className="w-full text-xs font-extrabold px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer shadow-xs focus:ring-2 focus:ring-purple-500"
                  >
                    {rolesList.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                    <option value="__CUSTOM__">➕ + Tambah Jawatan Lain...</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                    Sesi Tugas Unit *
                  </label>
                  <select
                    value={selectedSession}
                    onChange={e => setSelectedSession(e.target.value as SessionType)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer shadow-xs focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Pagi">Sesi Pagi</option>
                    <option value="Petang">Sesi Petang</option>
                  </select>
                </div>
              </div>

              {/* Ruang input jika memilih Tambah Jawatan Lain */}
              {isCustomRole && (
                <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-black text-purple-900 dark:text-purple-200">
                      Nama Jawatan Guru Baharu *
                    </label>
                    <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">
                      Akan ditambah ke senarai jawatan sekolah
                    </span>
                  </div>
                  <input
                    type="text"
                    value={customRoleInput}
                    onChange={e => setCustomRoleInput(e.target.value)}
                    placeholder="Contoh: Penyelaras Teknikal, Fasilitator, Warden..."
                    className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            disabled={!selectedUnitId || (isCustomRole && !customRoleInput.trim())}
            onClick={() => {
              if (selectedUnitId) {
                let finalRole: RoleType = selectedRole;
                if (isCustomRole) {
                  const trimmed = customRoleInput.trim();
                  if (trimmed) {
                    finalRole = trimmed;
                    onAddCustomRole?.(trimmed);
                  } else {
                    finalRole = 'AJK';
                  }
                }
                onAssign(selectedUnitId, finalRole, selectedSession);
              }
            }}
            className="px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Simpan Agihan Unit</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Modal Komponen: Lantik / Kemaskini Pegawai Eksekutif Kokurikulum
interface ExecutiveAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: ExecutiveRoleType;
  leaderIdToEdit?: string;
  initialTeacherId?: string;
  initialSession?: CoordinatorSessionType;
  teachers: Teacher[];
  onSave: (role: ExecutiveRoleType, teacherId: string, session: CoordinatorSessionType, leaderIdToEdit?: string) => void;
}

const ExecutiveAppointmentModal: React.FC<ExecutiveAppointmentModalProps> = ({
  isOpen,
  onClose,
  role: defaultRole,
  leaderIdToEdit,
  initialTeacherId,
  initialSession,
  teachers,
  onSave,
}) => {
  const [selectedRole, setSelectedRole] = useState<ExecutiveRoleType>(defaultRole);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(initialTeacherId || (teachers[0]?.id || ''));
  const [selectedSession, setSelectedSession] = useState<CoordinatorSessionType>(initialSession || 'Kedua-dua Sesi');
  const [searchTeacher, setSearchTeacher] = useState('');

  if (!isOpen) return null;

  // Filter teachers by search and valid name
  const availableTeachers = teachers
    .filter(t => isValidTeacherName(t.name))
    .sort((a, b) => a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' }))
    .filter(t => t.name.toLowerCase().includes(searchTeacher.toLowerCase()) || (t.staffId && t.staffId.includes(searchTeacher)));

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-xl shadow-inner">
              🏛️
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                {leaderIdToEdit ? 'Kemas Kini Pelantikan' : 'Pelantikan Jawatankuasa Pengurusan Kokurikulum Sekolah'}
              </h3>
              <p className="text-[11px] text-blue-200/80">
                Lantik pegawai bagi jawatan pengurusan kokurikulum sekolah
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs font-sans">
          {/* Pilih Jawatan Pengurusan Kokurikulum */}
          <div>
            <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
              Jawatan Pengurusan Kokurikulum *
            </label>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value as ExecutiveRoleType)}
              className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Setiausaha Kokurikulum">📋 Setiausaha Kokurikulum</option>
              <option value="Naib Setiausaha Kokurikulum">📑 Naib Setiausaha Kokurikulum</option>
              <option value="Setiausaha Sukan">⚡ Setiausaha Sukan</option>
              <option value="Naib Setiausaha Sukan">🏃 Naib Setiausaha Sukan</option>
            </select>
          </div>

          {/* Pilih Guru */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                Pilih Nama Guru *
              </label>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {availableTeachers.length} guru tersenarai
              </span>
            </div>

            {/* Quick search input */}
            <div className="mb-2">
              <input
                type="text"
                value={searchTeacher}
                onChange={e => setSearchTeacher(e.target.value)}
                placeholder="Taip untuk cari nama guru..."
                className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <select
              value={selectedTeacherId}
              onChange={e => setSelectedTeacherId(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 max-h-36"
              size={5}
            >
              {availableTeachers.map(t => (
                <option key={t.id} value={t.id} className="py-1 px-2 cursor-pointer">
                  {t.name} (Sesi {t.session} • {formatTeacherGrade(t.grade)})
                </option>
              ))}
            </select>

            {selectedTeacher && (
              <div className="mt-2.5 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
                <div>
                  <p className="font-black text-xs text-indigo-950 dark:text-indigo-200">{selectedTeacher.name}</p>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">
                    Sesi Asal: <b>{selectedTeacher.session}</b> | Gred: <b>{formatTeacherGrade(selectedTeacher.grade)}</b> | No. Fail / KP: <b>{selectedTeacher.staffId || '-'}</b>
                  </p>
                </div>
                <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              </div>
            )}
          </div>

          {/* Pilihan Sesi Bertugas */}
          <div>
            <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1.5">
              Pilihan Sesi Pelantikan Bertugas *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Kedua-dua Sesi', 'Pagi', 'Petang'] as CoordinatorSessionType[]).map(sess => (
                <button
                  key={sess}
                  type="button"
                  onClick={() => setSelectedSession(sess)}
                  className={`p-2.5 rounded-xl text-center border text-xs font-black transition-all cursor-pointer ${
                    selectedSession === sess
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300 dark:ring-indigo-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="text-sm">{sess === 'Kedua-dua Sesi' ? '⭐' : sess === 'Pagi' ? '☀️' : '🌙'}</div>
                  <div className="mt-1">{sess}</div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5">
              * Setiausaha Kokurikulum dan Setiausaha Sukan lazimnya memegang <b>Kedua-dua Sesi</b>, manakala jawatan Naib Setiausaha boleh diselaraskan mengikut sesi persekolahan.
            </p>
          </div>

          {/* Official Letter Notice */}
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-2.5">
            <FileCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-emerald-900 dark:text-emerald-200 font-medium leading-relaxed">
              <b>Integrasi Surat Pelantikan:</b> Nama guru dan jawatan eksekutif ini akan dimuatkan secara automatik ke dalam <b>Surat Pelantikan Rasmi</b> (pada tajuk surat, petak maklumat jawatan pentadbiran utama sekolah, dan jadual agihan tugas kokurikulum).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5 bg-slate-50 dark:bg-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!selectedTeacherId}
            onClick={() => {
              if (selectedTeacherId) {
                onSave(selectedRole, selectedTeacherId, selectedSession, leaderIdToEdit);
                onClose();
              }
            }}
            className="px-5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>{leaderIdToEdit ? 'Simpan Perubahan' : 'Sahkan Pelantikan'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
