import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Sun, 
  Sunset, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Info, 
  Edit, 
  Edit3, 
  FolderPlus, 
  X, 
  Check, 
  Sparkles, 
  LayoutGrid, 
  Search, 
  FileCheck,
  Award,
  ShieldCheck
} from 'lucide-react';
import { 
  KokuUnit, 
  Teacher, 
  UnitAssignment, 
  RoleType, 
  SessionType, 
  UnitCategory, 
  ConflictIssue,
  CategoryCoordinator,
  CoordinatorSessionType
} from '../types/koku';
import { 
  getRoleColorBadge, 
  getCategoryBadge, 
  sortTeachersBySessionAndAlphabet, 
  isValidTeacherName,
  getCoordinatorSessionBadge,
  getCategoryTitle
} from '../utils/kokuHelpers';

interface UnitManagerViewProps {
  category: UnitCategory;
  units: KokuUnit[];
  teachers: Teacher[];
  assignments: UnitAssignment[];
  conflicts: ConflictIssue[];
  categoryCoordinators?: CategoryCoordinator[];
  onAddCategoryCoordinator?: (category: UnitCategory, teacherId: string, session: CoordinatorSessionType, roleTitle?: string) => void;
  onRemoveCategoryCoordinator?: (coordinatorId: string) => void;
  customRoles?: string[];
  onAddCustomRole?: (role: string) => void;
  onAssignTeacher: (teacherId: string, unitId: string, role: RoleType, session: SessionType) => void;
  onUpdateRole: (assignmentId: string, newRole: RoleType) => void;
  onUpdateSession: (assignmentId: string, newSession: SessionType) => void;
  onRemoveAssignment: (assignmentId: string) => void;
  onSelectTeacherConflict: (teacherId: string) => void;
  onAddUnit?: (unit: KokuUnit) => void;
  onEditUnit?: (unit: KokuUnit) => void;
  onDeleteUnit?: (unitId: string) => void;
  onEditTeacher?: (teacher: Teacher) => void;
  onPrintAppointmentLetter?: (teacher: Teacher) => void;
}

export const UnitManagerView: React.FC<UnitManagerViewProps> = ({
  category,
  units,
  teachers,
  assignments,
  conflicts,
  categoryCoordinators = [],
  onAddCategoryCoordinator,
  onRemoveCategoryCoordinator,
  customRoles: initialCustomRoles = [],
  onAddCustomRole,
  onAssignTeacher,
  onUpdateRole,
  onUpdateSession,
  onRemoveAssignment,
  onSelectTeacherConflict,
  onAddUnit,
  onEditUnit,
  onDeleteUnit,
  onEditTeacher,
  onPrintAppointmentLetter,
}) => {
  const categoryUnits = useMemo(() => {
    return units
      .filter(u => u.category === category)
      .sort((a, b) => a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' }));
  }, [units, category]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(categoryUnits[0]?.id || '');
  const [unitSearchQuery, setUnitSearchQuery] = useState('');

  // Filtered units within current category based on search query
  const filteredCategoryUnits = useMemo(() => {
    if (!unitSearchQuery.trim()) return categoryUnits;
    const q = unitSearchQuery.toLowerCase().trim();
    return categoryUnits.filter(u =>
      u.name.toLowerCase().includes(q) ||
      u.code.toLowerCase().includes(q)
    );
  }, [categoryUnits, unitSearchQuery]);

  // Keep selected unit synchronized when units change
  React.useEffect(() => {
    if (categoryUnits.length > 0 && !categoryUnits.some(u => u.id === selectedUnitId)) {
      setSelectedUnitId(categoryUnits[0].id);
    }
  }, [categoryUnits, selectedUnitId]);

  const activeUnit = useMemo(() => {
    return units.find(u => u.id === selectedUnitId) || categoryUnits[0];
  }, [units, selectedUnitId, categoryUnits]);

  // Form state for adding teacher to unit
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<RoleType>('AJK');
  const [selectedSession, setSelectedSession] = useState<SessionType>('Pagi');

  // Modal state for Add/Edit Unit (Only Unit Name required)
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [unitFormName, setUnitFormName] = useState('');

  // Modal state for Delete Unit Confirmation (Custom In-App Modal, avoid blocked window.confirm)
  const [isDeleteUnitModalOpen, setIsDeleteUnitModalOpen] = useState(false);
  const [unitPendingDelete, setUnitPendingDelete] = useState<KokuUnit | null>(null);

  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);
  
  // Sorted list of all valid teachers: Sesi (Pagi then Petang) & Alphabet (A-Z)
  const sortedTeachers = useMemo(() => {
    const valid = teachers.filter(t => t && t.name && isValidTeacherName(t.name));
    return sortTeachersBySessionAndAlphabet(valid);
  }, [teachers]);

  const conflictMap = useMemo(() => {
    const map = new Map<string, ConflictIssue[]>();
    conflicts.forEach(c => {
      const arr = map.get(c.teacherId) || [];
      arr.push(c);
      map.set(c.teacherId, arr);
    });
    return map;
  }, [conflicts]);

  // Assignments for active unit - disusun mengikut Sesi (Pagi -> Petang) dan Alphabet (A -> Z)
  const activeAssignments = useMemo(() => {
    if (!activeUnit) return [];
    return assignments
      .filter(a => a.unitId === activeUnit.id)
      .sort((a, b) => {
        // 1. Sesi: Pagi di hadapan, kemudian Petang
        if (a.session !== b.session) {
          if (a.session === 'Pagi') return -1;
          if (b.session === 'Pagi') return 1;
          return a.session.localeCompare(b.session);
        }
        // 2. Alphabet: Nama guru mengikut abjad (A-Z)
        const nameA = teacherMap.get(a.teacherId)?.name || '';
        const nameB = teacherMap.get(b.teacherId)?.name || '';
        return nameA.localeCompare(nameB, 'ms', { sensitivity: 'base' });
      });
  }, [assignments, activeUnit, teacherMap]);

  // Count by session
  const morningCount = activeAssignments.filter(a => a.session === 'Pagi').length;
  const afternoonCount = activeAssignments.filter(a => a.session === 'Petang').length;
  const totalCount = activeAssignments.length;

  // Custom roles state initialized with initialCustomRoles
  const [customRoles, setCustomRoles] = useState<string[]>(initialCustomRoles);
  const [isCustomRoleSelected, setIsCustomRoleSelected] = useState(false);
  const [newCustomRoleName, setNewCustomRoleName] = useState('');

  // Synchronize when initialCustomRoles changes
  React.useEffect(() => {
    if (initialCustomRoles && initialCustomRoles.length > 0) {
      setCustomRoles(prev => Array.from(new Set([...prev, ...initialCustomRoles])));
    }
  }, [initialCustomRoles]);

  // Row custom role modal state
  const [rowCustomRoleModal, setRowCustomRoleModal] = useState<{
    assignmentId: string;
    teacherName: string;
  } | null>(null);
  const [rowCustomRoleInput, setRowCustomRoleInput] = useState('');

  // Available roles: Standard roles + existing custom roles in system + user-added custom roles
  const rolesAvailable: string[] = useMemo(() => {
    const list = [
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
    // Collect roles currently used in assignments
    assignments.forEach(a => {
      if (a.role && !list.includes(a.role) && a.role !== '__CUSTOM__' && a.role !== '__ADD_NEW__') {
        list.push(a.role);
      }
    });
    // Collect user created custom roles
    customRoles.forEach(r => {
      if (r && !list.includes(r)) list.push(r);
    });
    return list;
  }, [assignments, customRoles]);

  // Penyelaras Kategori Unit Besar (Unit Beruniform, Kelab, Sukan, Rumah Sukan)
  const currentCategoryCoords = useMemo(() => {
    return categoryCoordinators.filter(c => c.category === category);
  }, [categoryCoordinators, category]);

  // Borang Lantik Penyelaras Baharu Bagi Unit Besar Ini
  const [selectedCoordTeacherId, setSelectedCoordTeacherId] = useState<string>('');
  const [selectedCoordSession, setSelectedCoordSession] = useState<CoordinatorSessionType>('Pagi');
  const [selectedCoordRoleTitle, setSelectedCoordRoleTitle] = useState<string>('Penyelaras');

  // Bila guru dipilih, tetapkan sesi lalai mengikut sesi hakiki guru berkenaan
  const handleCoordTeacherChange = (teacherId: string) => {
    setSelectedCoordTeacherId(teacherId);
    const teacher = teacherMap.get(teacherId);
    if (teacher) {
      setSelectedCoordSession(teacher.session as CoordinatorSessionType);
    }
  };

  const handleAddNewCategoryCoordinator = () => {
    if (!selectedCoordTeacherId || !onAddCategoryCoordinator) return;
    onAddCategoryCoordinator(
      category,
      selectedCoordTeacherId,
      selectedCoordSession,
      selectedCoordRoleTitle.trim() || 'Penyelaras'
    );
    setSelectedCoordTeacherId('');
    setSelectedCoordRoleTitle('Penyelaras');
  };

  // Handle teacher select in dropdown, auto set session to match teacher's hakiki session
  const handleTeacherSelect = (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    const t = teacherMap.get(teacherId);
    if (t) {
      setSelectedSession(t.session);
    }
  };

  const handleAddTeacherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherId || !activeUnit) return;

    let finalRole = selectedRole;
    if (isCustomRoleSelected) {
      const trimmed = newCustomRoleName.trim();
      if (!trimmed) return;
      finalRole = trimmed;
      if (!customRoles.includes(trimmed)) {
        setCustomRoles(prev => [...prev, trimmed]);
      }
      onAddCustomRole?.(trimmed);
    }

    onAssignTeacher(selectedTeacherId, activeUnit.id, finalRole, selectedSession);
    setSelectedTeacherId('');
    setIsCustomRoleSelected(false);
    setNewCustomRoleName('');
    setSelectedRole('AJK');
  };

  // Open Add Unit Modal for any category
  const openAddUnitModal = () => {
    setModalMode('add');
    setUnitFormName('');
    setIsUnitModalOpen(true);
  };

  // Open Edit Unit Modal for the active unit
  const openEditUnitModal = () => {
    if (!activeUnit) return;
    setModalMode('edit');
    setUnitFormName(activeUnit.name);
    setIsUnitModalOpen(true);
  };

  const handleSaveUnitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = unitFormName.trim();
    if (!trimmedName) return;

    const prefix = 
      category === 'BERUNIFORM' ? 'u' :
      category === 'KELAB' ? 'k' :
      category === 'SUKAN' ? 's' :
      category === 'RUMAH_SUKAN' ? 'r' : 'p';

    const defaultColors: Record<UnitCategory, string> = {
      BERUNIFORM: '#D97706',
      KELAB: '#059669',
      SUKAN: '#2563EB',
      RUMAH_SUKAN: '#DC2626',
      PEMBANGUNAN: '#7C3AED',
    };

    if (modalMode === 'add' && onAddUnit) {
      const generatedCode = trimmedName
        .split(' ')
        .filter(w => w.length > 0)
        .map(w => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 4) || trimmedName.slice(0, 4).toUpperCase();

      const newUnit: KokuUnit = {
        id: `${prefix}-${Date.now()}`,
        name: trimmedName,
        code: generatedCode,
        category: category,
        color: defaultColors[category] || '#10B981',
        iconName: 'Sparkles',
        targetMorning: 0,
        targetAfternoon: 0,
      };
      onAddUnit(newUnit);
      setSelectedUnitId(newUnit.id);
    } else if (modalMode === 'edit' && onEditUnit && activeUnit) {
      const updatedUnit: KokuUnit = {
        ...activeUnit,
        name: trimmedName,
      };
      onEditUnit(updatedUnit);
    }

    setIsUnitModalOpen(false);
  };

  const handleDeleteActiveUnit = (unitToDel?: KokuUnit) => {
    const target = (unitToDel && typeof unitToDel === 'object' && 'id' in unitToDel && 'name' in unitToDel)
      ? unitToDel
      : activeUnit;
    if (!target || !onDeleteUnit) return;
    setUnitPendingDelete(target);
    setIsDeleteUnitModalOpen(true);
  };

  const handleConfirmDeleteUnit = () => {
    if (!unitPendingDelete || !onDeleteUnit) return;
    const targetId = unitPendingDelete.id;

    // Smoothly select next unit if the deleted unit is currently active
    if (selectedUnitId === targetId) {
      const remaining = categoryUnits.filter(u => u.id !== targetId);
      if (remaining.length > 0) {
        setSelectedUnitId(remaining[0].id);
      } else {
        setSelectedUnitId('');
      }
    }

    onDeleteUnit(targetId);
    setIsDeleteUnitModalOpen(false);
    setUnitPendingDelete(null);
  };

  const categoryBadge = getCategoryBadge(category);

  const getCategoryTitle = () => {
    switch (category) {
      case 'BERUNIFORM': return 'Unit Beruniform';
      case 'KELAB': return 'Kelab & Persatuan';
      case 'SUKAN': return 'Sukan & Permainan';
      case 'RUMAH_SUKAN': return 'Rumah Sukan';
      case 'PEMBANGUNAN': return 'Pembangunan & Khas';
    }
  };

  return (
    <div className="space-y-6">
      {/* RUANG PENYELARAS UNIT BESAR (Unit Beruniform, Kelab, Sukan, Rumah Sukan) */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50/80 to-fuchsia-50 dark:from-slate-900 dark:via-purple-950/40 dark:to-slate-900 p-5 sm:p-6 rounded-3xl border-2 border-purple-200/90 dark:border-purple-800/80 shadow-xs space-y-4">
        {/* Header Ruang Penyelaras Unit Besar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-purple-200/70 dark:border-purple-800/50">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 text-white flex items-center justify-center shadow-md shrink-0 ring-2 ring-purple-300 dark:ring-purple-600">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-purple-950 dark:text-purple-200 uppercase tracking-wide">
                  Ruang Penyelaras {getCategoryTitle()}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-200/90 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200">
                  {currentCategoryCoords.length} Penyelaras Dilantik
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Lantik guru Penyelaras bagi unit yang besar ini mengikut pilihan sesi (Pagi, Petang, atau Kedua-dua Sesi). Anda boleh menambah lebih daripada seorang Penyelaras jika ramai penyelaras dilantik pada masa hadapan.
              </p>
            </div>
          </div>
        </div>

        {/* Senarai Penyelaras Yang Telah Dilantik untuk Unit Besar Ini */}
        {currentCategoryCoords.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentCategoryCoords.map(coord => {
              const teacher = teacherMap.get(coord.teacherId);
              const sessionBadge = getCoordinatorSessionBadge(coord.session);
              return (
                <div
                  key={coord.id}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white/95 dark:bg-slate-800/95 border-2 border-purple-200 dark:border-purple-800/80 shadow-xs hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0 ring-2 ring-purple-300 dark:ring-purple-600">
                      {teacher ? teacher.name.slice(0, 2).toUpperCase() : '??'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-black text-slate-900 dark:text-white text-xs sm:text-sm truncate" title={teacher?.name}>
                        {teacher?.name || 'Guru Tidak Ditemui'}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${sessionBadge.bg} ${sessionBadge.text}`}>
                          {sessionBadge.icon} {sessionBadge.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
                          {coord.roleTitle || 'Penyelaras'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                        <span>Sesi Hakiki: <b>{teacher?.session || '-'}</b></span>
                        {teacher?.phone && <span>• Tel: <b>{teacher.phone}</b></span>}
                      </div>
                    </div>
                  </div>

                  {onRemoveCategoryCoordinator && (
                    <button
                      type="button"
                      onClick={() => onRemoveCategoryCoordinator(coord.id)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 cursor-pointer shrink-0 transition-colors"
                      title={`Gugurkan Cikgu ${teacher?.name} daripada jawatan Penyelaras ${getCategoryTitle()}`}
                    >
                      Gugurkan
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-800/70 border border-purple-200/80 dark:border-purple-800/50 text-xs text-purple-900 dark:text-purple-200 flex items-center gap-2.5 font-medium">
            <Info className="w-4 h-4 text-purple-600 shrink-0" />
            <span>Belum ada guru Penyelaras dilantik bagi unit yang besar ({getCategoryTitle()}) ini. Gunakan borang di bawah untuk melantik Penyelaras Sesi Pagi, Petang, atau Kedua-dua Sesi.</span>
          </div>
        )}

        {/* Borang Tambah Penyelaras Baharu (Boleh Tambah Ramai Penyelaras) */}
        {onAddCategoryCoordinator && (
          <div className="bg-white/90 dark:bg-slate-800/90 p-4 rounded-2xl border border-dashed border-purple-300 dark:border-purple-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-purple-950 dark:text-purple-200 uppercase tracking-wide flex items-center gap-1.5">
                <span>➕</span> Lantik Penyelaras Baharu Bagi {getCategoryTitle()}
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                Boleh lantik lebih daripada 1 orang penyelaras
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Pilih Guru */}
              <div className="sm:col-span-6 lg:col-span-5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pilih Nama Guru Sekolah *
                </label>
                <select
                  value={selectedCoordTeacherId}
                  onChange={e => handleCoordTeacherChange(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Pilih Guru Sekolah (Sesi & Abjad) --</option>
                  {sortedTeachers.map(t => {
                    const isCoord = currentCategoryCoords.some(c => c.teacherId === t.id);
                    return (
                      <option key={`opt-coord-${t.id}`} value={t.id}>
                        [{t.session}] {t.name} {isCoord ? '✓ (Sudah dilantik)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Pilihan Sesi Penyelaras */}
              <div className="sm:col-span-3 lg:col-span-3">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Pilihan Sesi *
                </label>
                <select
                  value={selectedCoordSession}
                  onChange={e => setSelectedCoordSession(e.target.value as CoordinatorSessionType)}
                  className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-purple-500"
                >
                  <option value="Pagi">☀️ Sesi Pagi</option>
                  <option value="Petang">🌇 Sesi Petang</option>
                  <option value="Kedua-dua Sesi">✨ Kedua-dua Sesi (Pagi & Petang)</option>
                </select>
              </div>

              {/* Gelaran Jawatan */}
              <div className="sm:col-span-3 lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Gelaran Jawatan
                </label>
                <input
                  type="text"
                  value={selectedCoordRoleTitle}
                  onChange={e => setSelectedCoordRoleTitle(e.target.value)}
                  placeholder="Penyelaras"
                  className="w-full text-xs font-bold px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Butang Lantik */}
              <div className="sm:col-span-12 lg:col-span-2 flex items-end">
                <button
                  type="button"
                  disabled={!selectedCoordTeacherId}
                  onClick={handleAddNewCategoryCoordinator}
                  className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Award className="w-4 h-4" />
                  <span>+ Lantik Penyelaras</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Paparan Pilihan Sub-Unit Bersaiz Besar & Jelas (Grid Tanpa Perlu Slide) */}
      <div className="bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        {/* Header Seksyen Pemilihan Sub-Unit */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 shadow-xs">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Pilih Sub-Unit {getCategoryTitle()}
                </h2>
                <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${categoryBadge.bg} ${categoryBadge.text}`}>
                  {categoryUnits.length} Unit
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Klik mana-mana kad unit di bawah untuk memilih unit dan mengurus pelantikan guru jawatankuasa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            {/* Carian Pantas Unit (Jika ada lebih 3 unit) */}
            {categoryUnits.length > 3 && (
              <div className="relative flex-1 md:w-56">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={unitSearchQuery}
                  onChange={e => setUnitSearchQuery(e.target.value)}
                  placeholder="Cari nama atau kod unit..."
                  className="w-full pl-9 pr-8 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                {unitSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setUnitSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Butang Tambah Unit Baharu */}
            <button
              onClick={openAddUnitModal}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all hover:shadow-md cursor-pointer shrink-0"
              title={`Tambah unit baharu dalam ${getCategoryTitle()}`}
            >
              <FolderPlus className="w-4 h-4" />
              <span>+ Tambah Unit</span>
            </button>
          </div>
        </div>

        {/* PANDUAN UNIT PEMBANGUNAN & KHAS: DITENTUKAN SENDIRI OLEH GPK KOKURIKULUM */}
        {category === 'PEMBANGUNAN' && (
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50/70 to-purple-50 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs text-purple-950 dark:text-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <span className="text-2xl shrink-0">🏛️</span>
              <div>
                <div className="font-black text-sm flex items-center gap-2">
                  <span>Unit Pembangunan &amp; Khas Sekolah</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200">
                    Ketetapan GPK Kokurikulum
                  </span>
                </div>
                <p className="text-[11px] text-purple-800/90 dark:text-purple-300/90 mt-0.5 leading-relaxed">
                  Nama dan senarai unit dalam kategori ini ditentukan sepenuhnya oleh Guru Penolong Kanan (GPK) Kokurikulum mengikut keperluan dan struktur pentadbiran sekolah anda. Sila gunakan butang <b>"+ Tambah Unit"</b> untuk mendaftarkan unit pembangunan sekolah.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openAddUnitModal}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shrink-0 flex items-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer transition-all self-end sm:self-center"
              title="Tambah unit pembangunan baharu mengikut ketetapan sekolah"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Tambah Unit Pembangunan</span>
            </button>
          </div>
        )}

        {/* Grid Kad-Kad Sub-Unit Bersaiz Besar & Mudah Klik */}
        {categoryUnits.length === 0 ? (
          <div className="p-8 sm:p-10 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-300 flex items-center justify-center mx-auto text-xl font-bold">
              {category === 'PEMBANGUNAN' ? '🚀' : '📋'}
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {category === 'PEMBANGUNAN' 
                ? 'Belum ada unit Pembangunan & Khas didaftarkan.' 
                : `Tiada unit didaftarkan lagi dalam ${getCategoryTitle()}.`}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              {category === 'PEMBANGUNAN'
                ? 'Pihak GPK Kokurikulum bebas menentukan nama dan senarai unit pembangunan sekolah. Sila klik butang di bawah untuk mendaftarkan unit pertama anda.'
                : 'Klik butang "+ Tambah Unit" di atas untuk mendaftar unit pertama sekolah anda.'}
            </p>
            <button
              type="button"
              onClick={openAddUnitModal}
              className="mt-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>+ Tambah Unit {getCategoryTitle()}</span>
            </button>
          </div>
        ) : filteredCategoryUnits.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
              Tiada unit yang sepadan dengan carian "{unitSearchQuery}".
            </p>
            <button
              type="button"
              onClick={() => setUnitSearchQuery('')}
              className="mt-2 text-xs font-bold text-emerald-600 hover:underline"
            >
              Set semula carian
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4">
            {filteredCategoryUnits.map(unit => {
              const unitAssigns = assignments.filter(a => a.unitId === unit.id);
              const count = unitAssigns.length;
              const pagiCount = unitAssigns.filter(a => a.session === 'Pagi').length;
              const petangCount = unitAssigns.filter(a => a.session === 'Petang').length;
              const isSelected = activeUnit && unit.id === activeUnit.id;

              return (
                <div
                  key={unit.id}
                  onClick={() => setSelectedUnitId(unit.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedUnitId(unit.id);
                    }
                  }}
                  className={`group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl cursor-pointer text-left transition-all duration-200 border-2 ${
                    isSelected
                      ? 'bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white border-emerald-400 dark:border-emerald-400 shadow-lg shadow-emerald-700/25 ring-4 ring-emerald-500/25 scale-[1.02]'
                      : 'bg-slate-50/80 dark:bg-slate-800/80 hover:bg-emerald-50/40 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 shadow-xs hover:shadow-md'
                  }`}
                >
                  {/* Bahagian Atas Kad: Warna, Kod & Bilangan Guru */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full shrink-0 shadow-xs border-2 border-white/60 dark:border-slate-700"
                        style={{ backgroundColor: unit.color || '#10b981' }}
                      />
                      <span
                        className={`text-xs font-mono font-black px-2 py-0.5 rounded-lg ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {unit.code}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          isSelected
                            ? 'bg-white text-emerald-800 shadow-xs'
                            : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{count} Guru</span>
                      </span>

                      {onDeleteUnit && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteActiveUnit(unit);
                          }}
                          className={`p-1 rounded-lg text-xs transition-colors cursor-pointer ${
                            isSelected
                              ? 'text-white/70 hover:text-white hover:bg-emerald-800/60'
                              : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700'
                          }`}
                          title={`Padam unit "${unit.name}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Nama Unit Bersaiz Besar & Jelas (Mudah Dibaca Tanpa Perlu Slide) */}
                  <div className="my-3 flex-1">
                    <h3
                      className={`text-base sm:text-lg font-black tracking-tight leading-snug break-words ${
                        isSelected ? 'text-white' : 'text-slate-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-300'
                      }`}
                    >
                      {unit.name}
                    </h3>
                  </div>

                  {/* Bahagian Bawah Kad: Pecahan Sesi & Status Pemilihan */}
                  <div
                    className={`pt-2.5 border-t flex items-center justify-between text-xs font-semibold ${
                      isSelected
                        ? 'border-white/20 text-emerald-100'
                        : 'border-slate-200 dark:border-slate-700/80 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>
                        Pagi: <strong className={isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}>{pagiCount}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Petang: <strong className={isSelected ? 'text-white' : 'text-slate-800 dark:text-slate-200'}>{petangCount}</strong>
                      </span>
                    </div>

                    {isSelected ? (
                      <span className="font-extrabold flex items-center gap-1 text-white bg-white/20 px-2 py-0.5 rounded-lg text-[11px]">
                        <Check className="w-3 h-3" /> Dipilih
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] group-hover:translate-x-0.5 transition-transform">
                        Pilih Unit →
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Paparan Sub-Unit Lebih Besar & Jelas untuk GPK */}
      {activeUnit ? (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Unit Details with Edit and Delete options */}
          <div className="flex items-start gap-4 flex-1">
            <div 
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-md shrink-0 uppercase"
              style={{ backgroundColor: activeUnit.color || '#059669' }}
            >
              {activeUnit.code.slice(0, 3)}
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className={`text-xs font-extrabold px-3 py-1 rounded-xl border ${categoryBadge.bg} ${categoryBadge.text}`}>
                  {categoryBadge.label}
                </span>
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  KOD: {activeUnit.code}
                </span>

                {/* Butang Kemaskini & Padam Unit (Untuk Semua Unit Lama & Baru) */}
                <div className="flex items-center gap-1.5 ml-1">
                  <button
                    onClick={openEditUnitModal}
                    className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center gap-1.5 transition-colors border border-amber-200 dark:border-amber-800 cursor-pointer shadow-xs"
                    title="Edit nama unit ini"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Edit Nama Unit</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteActiveUnit(activeUnit)}
                    className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 flex items-center gap-1.5 transition-colors border border-rose-200 dark:border-rose-900 cursor-pointer shadow-xs"
                    title="Padam unit ini daripada sistem"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Padam Unit</span>
                  </button>
                </div>
              </div>

              {/* Tajuk Unit Yang Jelas & Besar */}
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {activeUnit.name}
              </h2>
              {activeUnit.description ? (
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                  {activeUnit.description}
                </p>
              ) : null}
            </div>
          </div>

          {/* Kad Statistik Sesi Pagi & Petang yang Jelas & Besar */}
          <div className="flex items-center gap-3 sm:gap-4 bg-slate-50 dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 self-stretch lg:self-auto justify-around shadow-inner">
            {/* Sesi Pagi */}
            <div className="text-center px-3 sm:px-4">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Guru Pagi</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {morningCount}
              </div>
            </div>

            <div className="h-12 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Sesi Petang */}
            <div className="text-center px-3 sm:px-4">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wide">
                <Sunset className="w-4 h-4 text-indigo-500" />
                <span>Guru Petang</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
                {afternoonCount}
              </div>
            </div>

            <div className="h-12 w-px bg-slate-200 dark:bg-slate-700" />

            {/* Jumlah Guru */}
            <div className="text-center px-3 sm:px-4">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                <Users className="w-4 h-4 text-emerald-500" />
                <span>Jumlah</span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {totalCount}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
          <p className="text-base font-bold text-slate-600 dark:text-slate-300">Belum ada unit dalam kategori ini.</p>
          <p className="text-sm mt-1">Sila klik butang di atas untuk mencipta unit baharu bagi sekolah anda.</p>
        </div>
      )}

      {/* Tambah Guru ke Unit Ini (Dropdown Pantas & Jelas) */}
      {activeUnit && (
        <div className="bg-gradient-to-r from-emerald-50/90 via-teal-50/90 to-blue-50/90 dark:from-slate-800/90 dark:via-slate-800/80 dark:to-slate-800/90 p-5 sm:p-6 rounded-3xl border border-emerald-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2.5 mb-3.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-emerald-950 dark:text-emerald-200">
                Lantik Guru ke dalam {activeUnit.name}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                Pilih nama guru dari drop-down, tetapkan jawatan (Ketua Guru Penasihat, Penyelaras, Jurulatih, Pengurus, Ketua Panitia, Setiausaha, AJK atau jawatan lain) dan sesi tugas.
              </p>
            </div>
          </div>

          <form onSubmit={handleAddTeacherSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Teacher Selection Dropdown */}
            <div className="lg:col-span-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Pilih Nama Guru Sekolah *
              </label>
              <select
                value={selectedTeacherId}
                onChange={e => handleTeacherSelect(e.target.value)}
                className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                required
              >
                <option value="">-- Pilih Guru Sekolah (Sesi & Abjad) --</option>
                {sortedTeachers.map((t, idx) => {
                  const isAlreadyInUnit = activeAssignments.some(a => a.teacherId === t.id);
                  const tAssigns = assignments.filter(a => a.teacherId === t.id);
                  return (
                    <option 
                      key={`${t.id || 'teacher'}-${idx}`} 
                      value={t.id}
                      disabled={isAlreadyInUnit}
                    >
                      [{t.session}] {t.name} {isAlreadyInUnit ? '✓ (Sudah dalam unit ini)' : `[${tAssigns.length} Unit Dipegang]`}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Jawatan Dropdown dengan Jurulatih, Pengurus, Ketua Panitia & Pilihan Jawatan Lain */}
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Jawatan Guru *
              </label>
              <select
                value={isCustomRoleSelected ? '__CUSTOM__' : selectedRole}
                onChange={e => {
                  const val = e.target.value;
                  if (val === '__CUSTOM__') {
                    setIsCustomRoleSelected(true);
                  } else {
                    setIsCustomRoleSelected(false);
                    setSelectedRole(val as RoleType);
                  }
                }}
                className="w-full text-sm font-extrabold px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                {rolesAvailable.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
                <option value="__CUSTOM__" className="text-purple-600 font-bold">+ Tambah Jawatan Lain...</option>
              </select>

              {isCustomRoleSelected && (
                <div className="mt-2">
                  <input
                    type="text"
                    value={newCustomRoleName}
                    onChange={e => setNewCustomRoleName(e.target.value)}
                    placeholder="Taipkan jawatan baharu..."
                    className="w-full text-xs font-bold px-3 py-1.5 rounded-lg border border-purple-400 bg-purple-50 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200 shadow-2xs outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                    required
                  />
                </div>
              )}
            </div>

            {/* Sesi Dropdown & Submit Button */}
            <div className="flex items-end gap-2.5">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Sesi Tugas Unit *
                </label>
                <select
                  value={selectedSession}
                  onChange={e => setSelectedSession(e.target.value as SessionType)}
                  className="w-full text-sm font-semibold px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                >
                  <option value="Pagi">Sesi Pagi</option>
                  <option value="Petang">Sesi Petang</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={!selectedTeacherId || (isCustomRoleSelected && !newCustomRoleName.trim())}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-extrabold text-sm shadow-md transition-all shrink-0 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>+ Lantik</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Senarai Guru Dilantik (Paparan Lebih Besar, Jelas & Berinformasi) */}
      {activeUnit && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                <span>Senarai Guru Dilantik ({activeAssignments.length} Orang)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Tukar jawatan terus melalui menu drop-down di lajur jawatan. Tiada drag-and-drop diperlukan.
              </p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap text-xs font-semibold">
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                <span>Ketua</span>
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                <span>Penyelaras</span>
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
                <span>Jurulatih</span>
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                <span>Pengurus</span>
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 inline-block" />
                <span>Ketua Panitia</span>
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                <span>SU</span>
              </span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
                <span>AJK</span>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-extrabold text-xs border-b border-slate-200 dark:border-slate-700">
                  <th className="py-4 px-4 w-12 text-center">Bil</th>
                  <th className="py-4 px-4 min-w-[220px]">Maklumat Guru</th>
                  <th className="py-4 px-4 text-center min-w-[140px]">Sesi Bertugas</th>
                  <th className="py-4 px-4 min-w-[220px]">Jawatan (Drop-down)</th>
                  <th className="py-4 px-4 min-w-[160px]">Status / Semakan</th>
                  <th className="py-4 px-4 text-center w-28">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                      <p className="text-base font-bold text-slate-600 dark:text-slate-400">Belum ada guru dilantik dalam unit ini.</p>
                      <p className="text-xs text-slate-400 mt-0.5">Sila gunakan borang di atas untuk melantik guru sekolah ke dalam unit ini.</p>
                    </td>
                  </tr>
                ) : (
                  activeAssignments.map((assign, idx) => {
                    const teacher = teacherMap.get(assign.teacherId);
                    if (!teacher) return null;

                    const tConflicts = conflictMap.get(teacher.id) || [];
                    const hasConflict = tConflicts.length > 0;
                    const sessionMismatch = teacher.session !== assign.session;

                    return (
                      <tr 
                        key={assign.id ? `${assign.id}-${idx}` : `assign-${idx}`}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        {/* Bil */}
                        <td className="py-4 px-4 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Nama Guru dengan Fungsi Edit */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2 flex-wrap group">
                            <button
                              type="button"
                              onClick={() => onEditTeacher && onEditTeacher(teacher)}
                              className="font-extrabold text-slate-900 dark:text-slate-100 text-sm hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer flex items-center gap-1.5 transition-colors text-left"
                              title="Klik untuk edit nama atau maklumat guru (jadual keseluruhan akan dikemaskini secara automatik)"
                            >
                              <span>{teacher.name}</span>
                              {onEditTeacher && (
                                <Edit3 className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 group-hover:text-emerald-600 transition-opacity" />
                              )}
                            </button>
                            <span className={`text-[11px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0 ${
                              teacher.gender === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                            }`}>
                              {teacher.gender === 'L' ? 'Lelaki' : 'Perempuan'}
                            </span>
                            {currentCategoryCoords.some(c => c.teacherId === teacher.id) && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xs shrink-0 flex items-center gap-1" title={`Penyelaras ${getCategoryTitle()}`}>
                                <Award className="w-3 h-3" />
                                <span>⭐ Penyelaras {getCategoryTitle()}</span>
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            ID: {teacher.staffId}
                          </div>
                        </td>

                        {/* Sesi Tugas dalam Unit */}
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                              type="button"
                              onClick={() => onUpdateSession(assign.id, 'Pagi')}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                assign.session === 'Pagi'
                                  ? 'bg-amber-500 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              Pagi
                            </button>
                            <button
                              type="button"
                              onClick={() => onUpdateSession(assign.id, 'Petang')}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                assign.session === 'Petang'
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                              }`}
                            >
                              Petang
                            </button>
                          </div>
                          {sessionMismatch && (
                            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold mt-1 flex items-center justify-center gap-1">
                              <Info className="w-3.5 h-3.5 shrink-0" />
                              <span>Hakiki: Sesi {teacher.session}</span>
                            </div>
                          )}
                        </td>

                        {/* Drop-down Jawatan dengan Jurulatih, Pengurus, Ketua Panitia & Jawatan Lain */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <select
                              value={assign.role}
                              onChange={e => {
                                const val = e.target.value;
                                if (val === '__ADD_NEW__') {
                                  setRowCustomRoleModal({
                                    assignmentId: assign.id,
                                    teacherName: teacher.name,
                                  });
                                  setRowCustomRoleInput('');
                                } else {
                                  onUpdateRole(assign.id, val as RoleType);
                                }
                              }}
                              className={`w-full text-xs sm:text-sm font-extrabold px-3 py-2 rounded-xl border-2 cursor-pointer shadow-xs transition-all ${
                                assign.role === 'Penyelaras'
                                  ? 'border-purple-400 bg-purple-50 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200'
                                  : assign.role === 'Ketua Guru Penasihat'
                                  ? 'border-rose-400 bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
                                  : assign.role === 'Jurulatih'
                                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                                  : assign.role === 'Pengurus'
                                  ? 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
                                  : assign.role === 'Ketua Panitia'
                                  ? 'border-cyan-400 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200'
                                  : assign.role === 'Setiausaha'
                                  ? 'border-blue-400 bg-blue-50 text-blue-800 dark:bg-blue-950/50 dark:text-blue-200'
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {rolesAvailable.map(r => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                              <option value="__ADD_NEW__" className="text-purple-600 font-bold">+ Tambah Jawatan Lain...</option>
                            </select>
                          </div>
                        </td>

                        {/* Semakan Pertindihan */}
                        <td className="py-4 px-4">
                          {hasConflict ? (
                            <button
                              onClick={() => onSelectTeacherConflict(teacher.id)}
                              className="text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1.5"
                            >
                              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                              <span className="truncate max-w-[150px]" title={tConflicts[0]?.message}>
                                {tConflicts[0]?.message}
                              </span>
                            </button>
                          ) : (
                            <span className="text-emerald-600 text-xs font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              <span>Tiada Pertindihan</span>
                            </span>
                          )}
                        </td>

                        {/* Tindakan: Surat Pelantikan, Edit Maklumat Guru & Gugur daripada Unit */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {onPrintAppointmentLetter && (
                              <button
                                type="button"
                                onClick={() => onPrintAppointmentLetter(teacher)}
                                className="px-2.5 py-1.5 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 font-bold text-xs inline-flex items-center gap-1 transition-colors border border-emerald-200 dark:border-emerald-900 cursor-pointer shadow-2xs"
                                title={`Jana & Cetak Surat Pelantikan untuk Cikgu ${teacher.name}`}
                              >
                                <FileCheck className="w-3.5 h-3.5" />
                                <span>Surat</span>
                              </button>
                            )}
                            {onEditTeacher && (
                              <button
                                type="button"
                                onClick={() => onEditTeacher(teacher)}
                                className="px-2.5 py-1.5 rounded-xl text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 font-bold text-xs inline-flex items-center gap-1 transition-colors border border-blue-200 dark:border-blue-900 cursor-pointer shadow-2xs"
                                title="Edit nama & maklumat guru ini (dikemaskini terus ke jadual keseluruhan)"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onRemoveAssignment(assign.id)}
                              className="px-2.5 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold text-xs inline-flex items-center gap-1 transition-colors border border-rose-200 dark:border-rose-900 cursor-pointer shadow-2xs"
                              title={`Gugurkan Cikgu ${teacher.name} daripada unit ini`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Gugur</span>
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
        </div>
      )}

      {/* Modal Tambah / Kemaskini Unit (Beruniform, Kelab, Sukan, Rumah Sukan & Pembangunan) */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {modalMode === 'add' ? `Tambah Unit Baharu (${categoryBadge.label})` : `Kemaskini Unit: ${activeUnit?.name}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kategori: <b>{categoryBadge.label}</b>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsUnitModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUnitForm} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                  Nama Unit Kokurikulum *
                </label>
                <input
                  type="text"
                  value={unitFormName}
                  onChange={e => setUnitFormName(e.target.value)}
                  placeholder={
                    category === 'PEMBANGUNAN' 
                      ? "Contoh: Kokurikulum Pendidikan Khas (PPKI), PAJSK, Inovasi STEM, Koperasi"
                      : category === 'RUMAH_SUKAN'
                      ? "Contoh: Rumah Panglima (Ungu), Rumah Syahbandar (Kuning)"
                      : category === 'BERUNIFORM'
                      ? "Contoh: Persekutuan Pengakap Malaysia, Kadet Remaja Sekolah"
                      : category === 'SUKAN'
                      ? "Contoh: Kelab Bola Sepak, Kelab Badminton, Kelab Catur"
                      : "Contoh: Kelab STEM & Robotik, Persatuan Bahasa Melayu"
                  }
                  className="w-full text-sm font-semibold px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  autoFocus
                  required
                />
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Masukkan nama unit kokurikulum yang hendak ditambah atau dikemaskini.
                </p>
              </div>

              <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsUnitModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{modalMode === 'add' ? 'Simpan Unit Baharu' : 'Simpan Nama Unit'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sahkan Padam Unit (Bebas daripada sekatan browser alert/confirm) */}
      {isDeleteUnitModalOpen && unitPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-rose-200 dark:border-rose-900/50">
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Sahkan Padam Unit
                </h3>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  {categoryBadge.label}
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Adakah anda pasti mahu memadam unit <b className="text-rose-600 dark:text-rose-400">&ldquo;{unitPendingDelete.name}&rdquo;</b> daripada sistem?
              </p>

              {assignments.filter(a => a.unitId === unitPendingDelete.id).length > 0 ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Terdapat <b>{assignments.filter(a => a.unitId === unitPendingDelete.id).length} orang guru</b> yang sedang dilantik dalam unit ini. Memadam unit ini akan menggugurkan lantikan guru-guru tersebut daripada unit ini.
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Tiada guru yang dilantik dalam unit ini pada masa ini.
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteUnitModalOpen(false);
                  setUnitPendingDelete(null);
                }}
                className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUnit}
                className="px-5 py-2.5 text-white bg-rose-600 hover:bg-rose-700 rounded-xl font-black text-xs shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Padam Unit Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Jawatan Khas Inline */}
      {rowCustomRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                <span>Tambah Jawatan Guru</span>
              </h4>
              <button
                type="button"
                onClick={() => setRowCustomRoleModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
              Masukkan nama jawatan baharu untuk <b>{rowCustomRoleModal.teacherName}</b> di dalam unit ini:
            </p>

            <input
              type="text"
              value={rowCustomRoleInput}
              onChange={e => setRowCustomRoleInput(e.target.value)}
              placeholder="Cth: Pegawai Teknikal / Fasilitator / Penolong Jurulatih"
              className="w-full text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white mb-4 focus:ring-2 focus:ring-purple-500 outline-none"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRowCustomRoleModal(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!rowCustomRoleInput.trim()}
                onClick={() => {
                  const role = rowCustomRoleInput.trim();
                  if (role) {
                    onUpdateRole(rowCustomRoleModal.assignmentId, role as RoleType);
                    if (!customRoles.includes(role)) {
                      setCustomRoles(prev => [...prev, role]);
                    }
                    onAddCustomRole?.(role);
                    setRowCustomRoleModal(null);
                  }
                }}
                className="px-5 py-2 text-xs font-extrabold bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Simpan Jawatan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
