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
  X
} from 'lucide-react';
import { Teacher, KokuUnit, UnitAssignment, ConflictIssue, RoleType, SessionType, UnitCategory } from '../types/koku';
import { getRoleColorBadge, getCategoryBadge, sortTeachersBySessionAndAlphabet } from '../utils/kokuHelpers';

interface MasterTableViewProps {
  teachers: Teacher[];
  units: KokuUnit[];
  assignments: UnitAssignment[];
  conflicts: ConflictIssue[];
  onAddTeacher: () => void;
  onEditTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onAssignTeacherToUnit: (teacherId: string, unitId: string, role: RoleType, session: SessionType) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  onSelectTeacherConflict: (teacherId: string) => void;
  onOpenImport?: () => void;
  filterConflictTeacherId?: string | null;
  onClearConflictFilter?: () => void;
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

export const MasterTableView: React.FC<MasterTableViewProps> = ({
  teachers,
  units,
  assignments,
  conflicts,
  onAddTeacher,
  onEditTeacher,
  onDeleteTeacher,
  onAssignTeacherToUnit,
  onRemoveAssignment,
  onSelectTeacherConflict,
  onOpenImport,
  filterConflictTeacherId,
  onClearConflictFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sessionFilter, setSessionFilter] = useState<'Semua' | 'Pagi' | 'Petang'>('Semua');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Konflik' | 'Lengkap' | 'Belum Lengkap'>('Semua');
  const [sortBy, setSortBy] = useState<'sesi_alphabet' | 'alphabet' | 'assignments'>('sesi_alphabet');
  
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

  const filteredTeachers = useMemo(() => {
    const list = teachers.filter(teacher => {
      // Tapisan konflik khusus jika dipilih
      if (filterConflictTeacherId && teacher.id !== filterConflictTeacherId) {
        return false;
      }

      // Carian nama guru
      const search = searchTerm.toLowerCase();
      const matchSearch = 
        teacher.name.toLowerCase().includes(search) || 
        teacher.staffId.toLowerCase().includes(search) ||
        (teacher.phone && teacher.phone.includes(search));

      if (!matchSearch) return false;

      // Tapisan sesi
      if (sessionFilter !== 'Semua' && teacher.session !== sessionFilter) {
        return false;
      }

      // Tapisan status
      const tConflicts = conflictMap.get(teacher.id) || [];
      const hasErrorOrWarning = tConflicts.some(c => c.severity === 'error' || c.severity === 'warning');
      const tAssigns = assignments.filter(a => a.teacherId === teacher.id);
      
      const hasUniform = tAssigns.some(a => unitMap.get(a.unitId)?.category === 'BERUNIFORM');
      const hasClub = tAssigns.some(a => unitMap.get(a.unitId)?.category === 'KELAB');
      const hasSport = tAssigns.some(a => unitMap.get(a.unitId)?.category === 'SUKAN');
      const hasHouse = tAssigns.some(a => unitMap.get(a.unitId)?.category === 'RUMAH_SUKAN');
      const isComplete = hasUniform && hasClub && hasSport && hasHouse && !hasErrorOrWarning;

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
  }, [teachers, searchTerm, sessionFilter, statusFilter, sortBy, filterConflictTeacherId, conflictMap, assignments, unitMap]);

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

      {/* Control Bar: Search, Filters & Action Buttons */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3.5">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Cari nama guru..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/80 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
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
                <th className="py-4 px-3 min-w-[190px]">
                  <div className="flex items-center gap-1.5">
                    <span>🚀</span>
                    <span>Pembangunan / Khas</span>
                  </div>
                </th>
                <th className="py-4 px-3 text-center min-w-[120px]">Status</th>
                <th className="py-4 px-3 text-center w-24">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center">
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
                  <td colSpan={10} className="py-16 text-center text-slate-400">
                    Tiada maklumat guru ditemui yang sepadan dengan carian atau tapisan.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, index) => {
                  const teacherAssigns = assignments.filter(a => a.teacherId === teacher.id);
                  const tConflicts = conflictMap.get(teacher.id) || [];
                  const hasSevereConflict = tConflicts.some(c => c.severity === 'error');
                  const hasWarning = tConflicts.some(c => c.severity === 'warning');

                  const uniformAssign = teacherAssigns.find(a => unitMap.get(a.unitId)?.category === 'BERUNIFORM');
                  const clubAssign = teacherAssigns.find(a => unitMap.get(a.unitId)?.category === 'KELAB');
                  const sportAssign = teacherAssigns.find(a => unitMap.get(a.unitId)?.category === 'SUKAN');
                  const houseAssign = teacherAssigns.find(a => unitMap.get(a.unitId)?.category === 'RUMAH_SUKAN');
                  const specialAssigns = teacherAssigns.filter(a => unitMap.get(a.unitId)?.category === 'PEMBANGUNAN');

                  // Core completion
                  const isFullyAssigned = uniformAssign && clubAssign && sportAssign && houseAssign && !hasSevereConflict;

                  return (
                    <tr 
                      key={teacher.id} 
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
                        <div className="flex items-center gap-2 text-xs mt-0.5">
                          <span className={`inline-flex items-center gap-1 font-semibold ${
                            teacher.gender === 'L' ? 'text-blue-600 dark:text-blue-400' : 'text-pink-600 dark:text-pink-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${teacher.gender === 'L' ? 'bg-blue-500' : 'bg-pink-500'}`} />
                            {teacher.gender === 'L' ? 'Guru Lelaki' : 'Guru Perempuan'}
                          </span>
                        </div>
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
                          'Unit Beruniform'
                        )}
                      </td>

                      {/* Kelab & Persatuan (Hanya unit Kelab & Persatuan) */}
                      <td className="py-4 px-3">
                        {renderSlotCell(
                          clubAssign, 
                          unitMap, 
                          () => handleOpenCategoryPicker(teacher, 'KELAB'), 
                          onRemoveAssignment,
                          'Kelab & Persatuan'
                        )}
                      </td>

                      {/* Sukan & Permainan (Hanya unit Sukan & Permainan) */}
                      <td className="py-4 px-3">
                        {renderSlotCell(
                          sportAssign, 
                          unitMap, 
                          () => handleOpenCategoryPicker(teacher, 'SUKAN'), 
                          onRemoveAssignment,
                          'Sukan & Permainan'
                        )}
                      </td>

                      {/* Rumah Sukan (Hanya unit Rumah Sukan) */}
                      <td className="py-4 px-3">
                        {renderSlotCell(
                          houseAssign, 
                          unitMap, 
                          () => handleOpenCategoryPicker(teacher, 'RUMAH_SUKAN'), 
                          onRemoveAssignment,
                          'Rumah Sukan'
                        )}
                      </td>

                      {/* Unit Pembangunan (Hanya unit Pembangunan) */}
                      <td className="py-4 px-3">
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
          onClose={() => setPickerModalState(null)}
          onAssign={(unitId, role, session) => {
            onAssignTeacherToUnit(pickerModalState.teacher.id, unitId, role, session);
            setPickerModalState(null);
          }}
          onRemoveAssignment={onRemoveAssignment}
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
  categoryLabel: string
) {
  if (!assign) {
    return (
      <button
        type="button"
        onClick={onAddOrChangeClick}
        className="w-full py-2.5 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-400 hover:text-emerald-600 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors text-center text-xs font-bold cursor-pointer group hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20"
        title={`Pilih ${categoryLabel} untuk guru ini`}
      >
        <span className="group-hover:scale-105 inline-block transition-transform">+ Pilih {categoryLabel}</span>
      </button>
    );
  }

  const unit = unitMap.get(assign.unitId);
  const roleBadge = getRoleColorBadge(assign.role);

  return (
    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-slate-300 transition-all">
      <div className="font-extrabold text-slate-800 dark:text-slate-100 text-xs truncate flex items-center justify-between gap-1">
        <span 
          title={`${unit?.name || assign.unitId} (Klik untuk tukar unit)`}
          onClick={onAddOrChangeClick}
          className="cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate"
        >
          {unit?.name || assign.unitId}
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
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black truncate max-w-[120px] ${roleBadge.bg}`}>
          {assign.role}
        </span>
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.2 rounded">
          {assign.session}
        </span>
      </div>
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
  onClose,
  onAssign,
  onRemoveAssignment,
}) => {
  const [activeCategory, setActiveCategory] = useState<UnitCategory>(initialCategory);
  const [selectedRole, setSelectedRole] = useState<RoleType>('AJK');
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

  const rolesList: RoleType[] = [
    'Ketua Guru Penasihat',
    'Setiausaha',
    'AJK',
  ];

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
                {currentCategoryAssigns.map(a => {
                  const u = unitMap.get(a.unitId);
                  const roleBadge = getRoleColorBadge(a.role);
                  return (
                    <div key={a.id} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
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

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                  Jawatan Guru *
                </label>
                <select
                  value={selectedRole}
                  onChange={e => setSelectedRole(e.target.value as RoleType)}
                  className="w-full text-xs font-extrabold px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer shadow-xs"
                >
                  {rolesList.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200 mb-1">
                  Sesi Tugas Unit *
                </label>
                <select
                  value={selectedSession}
                  onChange={e => setSelectedSession(e.target.value as SessionType)}
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer shadow-xs"
                >
                  <option value="Pagi">Sesi Pagi</option>
                  <option value="Petang">Sesi Petang</option>
                </select>
              </div>
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
            disabled={!selectedUnitId}
            onClick={() => {
              if (selectedUnitId) {
                onAssign(selectedUnitId, selectedRole, selectedSession);
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
