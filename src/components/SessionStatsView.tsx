import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Sun, 
  Sunset, 
  Users, 
  Award, 
  CheckCircle2, 
  School,
  FileSpreadsheet,
  Filter
} from 'lucide-react';
import { Teacher, KokuUnit, UnitAssignment, SchoolSettings, ConflictIssue, UnitCategory } from '../types/koku';
import { getCategoryBadge } from '../utils/kokuHelpers';

interface SessionStatsViewProps {
  teachers: Teacher[];
  units: KokuUnit[];
  assignments: UnitAssignment[];
  settings: SchoolSettings;
  conflicts: ConflictIssue[];
  onExportExcel: () => void;
  onOpenPrint: () => void;
}

// Susunan rasmi kategori kokurikulum mengikut ketetapan:
// 1. Unit Beruniform
// 2. Kelab dan Persatuan
// 3. Sukan dan Permainan
// 4. Rumah Sukan
// 5. Pembangunan
export const CATEGORY_STAT_SEQUENCE: {
  category: UnitCategory;
  name: string;
  shortName: string;
  icon: string;
  colorClass: string;
  badgeBg: string;
}[] = [
  { 
    category: 'BERUNIFORM', 
    name: 'Unit Beruniform', 
    shortName: 'Beruniform',
    icon: '🛡️', 
    colorClass: 'text-amber-700 dark:text-amber-300',
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800'
  },
  { 
    category: 'KELAB', 
    name: 'Kelab dan Persatuan', 
    shortName: 'Kelab & Persatuan',
    icon: '🎨', 
    colorClass: 'text-emerald-700 dark:text-emerald-300',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800'
  },
  { 
    category: 'SUKAN', 
    name: 'Sukan dan Permainan', 
    shortName: 'Sukan & Permainan',
    icon: '⚽', 
    colorClass: 'text-blue-700 dark:text-blue-300',
    badgeBg: 'bg-blue-100 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800'
  },
  { 
    category: 'RUMAH_SUKAN', 
    name: 'Rumah Sukan', 
    shortName: 'Rumah Sukan',
    icon: '🏆', 
    colorClass: 'text-rose-700 dark:text-rose-300',
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800'
  },
  { 
    category: 'PEMBANGUNAN', 
    name: 'Pembangunan', 
    shortName: 'Pembangunan',
    icon: '🚀', 
    colorClass: 'text-purple-700 dark:text-purple-300',
    badgeBg: 'bg-purple-100 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800'
  },
];

const CATEGORY_PRIORITY_MAP: Record<UnitCategory, number> = {
  BERUNIFORM: 1,
  KELAB: 2,
  SUKAN: 3,
  RUMAH_SUKAN: 4,
  PEMBANGUNAN: 5,
};

export const SessionStatsView: React.FC<SessionStatsViewProps> = ({
  teachers,
  units,
  assignments,
  settings,
  conflicts,
  onExportExcel,
  onOpenPrint,
}) => {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'SEMUA' | UnitCategory>('SEMUA');

  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);

  // Overall metrics
  const totalTeachers = teachers.length;
  const morningTeachers = teachers.filter(t => t.session === 'Pagi').length;
  const morningMaleTeachers = teachers.filter(t => t.session === 'Pagi' && t.gender === 'L').length;
  const morningFemaleTeachers = teachers.filter(t => t.session === 'Pagi' && t.gender === 'P').length;

  const afternoonTeachers = teachers.filter(t => t.session === 'Petang').length;
  const afternoonMaleTeachers = teachers.filter(t => t.session === 'Petang' && t.gender === 'L').length;
  const afternoonFemaleTeachers = teachers.filter(t => t.session === 'Petang' && t.gender === 'P').length;

  const totalMaleTeachers = teachers.filter(t => t.gender === 'L').length;
  const totalFemaleTeachers = teachers.filter(t => t.gender === 'P').length;

  // Fully assigned check (4 core units complete)
  const completeTeachersCount = useMemo(() => {
    let count = 0;
    teachers.forEach(t => {
      const tAssigns = assignments.filter(a => a.teacherId === t.id);
      const unitMap = new Map(units.map(u => [u.id, u]));
      const hasUniform = tAssigns.some(a => unitMap.get(a.unitId)?.category === 'BERUNIFORM');
      const hasClub = tAssigns.some(a => unitMap.get(a.unitId)?.category === 'KELAB');
      const hasSport = tAssigns.some(a => unitMap.get(a.unitId)?.category === 'SUKAN');
      const hasHouse = tAssigns.some(a => unitMap.get(a.unitId)?.category === 'RUMAH_SUKAN');
      const hasSevere = conflicts.some(c => c.teacherId === t.id && c.severity === 'error');
      if (hasUniform && hasClub && hasSport && hasHouse && !hasSevere) {
        count++;
      }
    });
    return count;
  }, [teachers, assignments, units, conflicts]);

  const percentageComplete = totalTeachers > 0 ? Math.round((completeTeachersCount / totalTeachers) * 100) : 0;

  // Leadership count
  const ketuaCount = assignments.filter(a => a.role === 'Ketua Guru Penasihat').length;
  const suCount = assignments.filter(a => a.role === 'Setiausaha').length;

  // Susun senarai unit mengikut urutan kategori yang ditetapkan:
  // Unit Beruniform -> Kelab dan Persatuan -> Sukan dan Permainan -> Rumah Sukan -> Pembangunan
  const sortedUnits = useMemo(() => {
    return [...units].sort((a, b) => {
      const pA = CATEGORY_PRIORITY_MAP[a.category] || 99;
      const pB = CATEGORY_PRIORITY_MAP[b.category] || 99;
      if (pA !== pB) return pA - pB;
      return a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' });
    });
  }, [units]);

  // Unit yang ditapis mengikut kategori terpilih (jika ada)
  const filteredUnits = useMemo(() => {
    if (selectedCategoryFilter === 'SEMUA') {
      return sortedUnits;
    }
    return sortedUnits.filter(u => u.category === selectedCategoryFilter);
  }, [sortedUnits, selectedCategoryFilter]);

  // Statistik pecahan mengikut setiap kategori (dalam turutan yang betul)
  const categoryStats = useMemo(() => {
    return CATEGORY_STAT_SEQUENCE.map(cat => {
      const catUnits = units.filter(u => u.category === cat.category);
      const catUnitIds = new Set(catUnits.map(u => u.id));
      const catAssigns = assignments.filter(a => catUnitIds.has(a.unitId));

      const morningAssigns = catAssigns.filter(a => a.session === 'Pagi');
      const afternoonAssigns = catAssigns.filter(a => a.session === 'Petang');

      const morning = morningAssigns.length;
      const morningMale = morningAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'L').length;
      const morningFemale = morningAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'P').length;

      const afternoon = afternoonAssigns.length;
      const afternoonMale = afternoonAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'L').length;
      const afternoonFemale = afternoonAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'P').length;

      const ketua = catAssigns.filter(a => a.role === 'Ketua Guru Penasihat').length;
      const su = catAssigns.filter(a => a.role === 'Setiausaha').length;

      return {
        ...cat,
        totalUnits: catUnits.length,
        totalTeachers: catAssigns.length,
        morningTeachers: morning,
        morningMale,
        morningFemale,
        afternoonTeachers: afternoon,
        afternoonMale,
        afternoonFemale,
        ketuaCount: ketua,
        suCount: su,
      };
    });
  }, [units, assignments, teacherMap]);

  return (
    <div className="space-y-6">
      {/* Management Header Info Card */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-semibold uppercase tracking-wider">
              <School className="w-4 h-4" />
              <span>Laporan Eksekutif Pengurusan Kokurikulum</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black mt-1">
              Statistik &amp; Analisis Agihan Guru {settings.academicYear}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-2xl">
              {settings.schoolName} • Disediakan untuk rujukan Pengetua/Guru Besar &amp; Pegawai Pendidikan Daerah
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={onExportExcel}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold backdrop-blur-xs flex items-center gap-1.5 transition-colors border border-white/20 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Eksport Excel</span>
            </button>
            <button
              type="button"
              onClick={onOpenPrint}
              className="px-3.5 py-2 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Jana Laporan Rasmi</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Teachers & Sesi */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jumlah Guru</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 flex items-baseline gap-2">
            <span>{totalTeachers}</span>
            <span className="text-xs font-bold text-slate-400">
              ({totalMaleTeachers}L • {totalFemaleTeachers}P)
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-0.5">
              <Sun className="w-3 h-3" /> Pagi: <b>{morningTeachers}</b> ({morningMaleTeachers}L/{morningFemaleTeachers}P)
            </span>
            <span>•</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
              <Sunset className="w-3 h-3" /> Petang: <b>{afternoonTeachers}</b> ({afternoonMaleTeachers}L/{afternoonFemaleTeachers}P)
            </span>
          </div>
        </div>

        {/* Completion Progress */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lengkap 4 Teras</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {percentageComplete}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <b>{completeTeachersCount}</b> daripada {totalTeachers} guru telah lengkap 4 unit
          </div>
        </div>

        {/* Leadership Appointments */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Jawatan Utama</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {ketuaCount + suCount}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            <b>{ketuaCount}</b> Ketua Unit • <b>{suCount}</b> Setiausaha
          </div>
        </div>

        {/* Total Registered Units */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit Kokurikulum</span>
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {units.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Merangkumi 5 kategori utama sekolah
          </div>
        </div>
      </div>

      {/* SUSUNAN 5 UNIT KATEGORI: Ringkasan Terperinci */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <span>Ringkasan Mengikut Kategori Unit</span>
            <span className="text-[11px] font-bold text-slate-400 normal-case">
              (Disusun: Unit Beruniform, Kelab &amp; Persatuan, Sukan &amp; Permainan, Rumah Sukan, Pembangunan)
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {categoryStats.map((cat, idx) => (
            <div
              key={cat.category}
              onClick={() => setSelectedCategoryFilter(prev => prev === cat.category ? 'SEMUA' : cat.category)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                selectedCategoryFilter === cat.category
                  ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-lg">{cat.icon}</span>
                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                  #{idx + 1}
                </span>
              </div>
              <div className="mt-2 font-black text-xs text-slate-900 dark:text-white truncate" title={cat.name}>
                {cat.name}
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-lg font-black text-slate-900 dark:text-white">
                  {cat.totalUnits}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">Unit</span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {cat.totalTeachers} Slot
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] font-semibold text-slate-500">
                <span className="text-amber-600 dark:text-amber-400">
                  Pagi: <b>{cat.morningTeachers}</b> ({cat.morningMale}L/{cat.morningFemale}P)
                </span>
                <span className="text-indigo-600 dark:text-indigo-400">
                  Ptg: <b>{cat.afternoonTeachers}</b> ({cat.afternoonMale}L/{cat.afternoonFemale}P)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Table: Bilangan Guru Sesi Pagi & Petang Mengikut Susunan Kategori */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              <span>Jadual Bilangan Guru Sesi Pagi &amp; Petang Mengikut Unit</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Unit disusun mengikut turutan kategori: <b>Unit Beruniform</b> ➔ <b>Kelab dan Persatuan</b> ➔ <b>Sukan dan Permainan</b> ➔ <b>Rumah Sukan</b> ➔ <b>Pembangunan</b>
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center flex-wrap gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedCategoryFilter('SEMUA')}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedCategoryFilter === 'SEMUA'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Semua ({sortedUnits.length})
            </button>
            {CATEGORY_STAT_SEQUENCE.map(cat => (
              <button
                key={cat.category}
                type="button"
                onClick={() => setSelectedCategoryFilter(cat.category)}
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  selectedCategoryFilter === cat.category
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-black'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={cat.name}
              >
                <span>{cat.icon}</span>
                <span className="hidden sm:inline">{cat.shortName}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase tracking-wider font-extrabold border-b border-slate-200 dark:border-slate-700 text-[11px]">
                <th className="py-3 px-3 w-12 text-center">Bil</th>
                <th className="py-3 px-4 min-w-[220px]">Nama Unit &amp; Kod</th>
                <th className="py-3 px-3 min-w-[150px]">Kategori Unit</th>
                <th className="py-3 px-3 text-center min-w-[110px] bg-amber-50/50 dark:bg-amber-950/20">
                  <div className="flex items-center justify-center gap-1">
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                    <span>Guru Pagi</span>
                  </div>
                  <div className="text-[9px] font-bold text-amber-700/80 dark:text-amber-400 mt-0.5 normal-case">
                    (Lelaki / Perempuan)
                  </div>
                </th>
                <th className="py-3 px-3 text-center min-w-[110px] bg-indigo-50/50 dark:bg-indigo-950/20">
                  <div className="flex items-center justify-center gap-1">
                    <Sunset className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Guru Petang</span>
                  </div>
                  <div className="text-[9px] font-bold text-indigo-700/80 dark:text-indigo-400 mt-0.5 normal-case">
                    (Lelaki / Perempuan)
                  </div>
                </th>
                <th className="py-3 px-3 text-center min-w-[90px]">
                  <div>Jumlah</div>
                  <div className="text-[9px] font-bold text-slate-400 mt-0.5 normal-case">
                    (L / P)
                  </div>
                </th>
                <th className="py-3 px-3 min-w-[180px]">Ketua Guru Penasihat</th>
                <th className="py-3 px-3 min-w-[180px]">Setiausaha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Tiada unit dijumpai dalam kategori ini.
                  </td>
                </tr>
              ) : (
                filteredUnits.map((unit, idx) => {
                  const uAssigns = assignments.filter(a => a.unitId === unit.id);
                  const morningAssigns = uAssigns.filter(a => a.session === 'Pagi');
                  const morning = morningAssigns.length;
                  const morningMale = morningAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'L').length;
                  const morningFemale = morningAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'P').length;

                  const afternoonAssigns = uAssigns.filter(a => a.session === 'Petang');
                  const afternoon = afternoonAssigns.length;
                  const afternoonMale = afternoonAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'L').length;
                  const afternoonFemale = afternoonAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'P').length;

                  const total = uAssigns.length;
                  const totalMale = uAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'L').length;
                  const totalFemale = uAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'P').length;

                  const ketua = uAssigns.find(a => a.role === 'Ketua Guru Penasihat');
                  const ketuaTeacher = ketua ? teacherMap.get(ketua.teacherId) : null;

                  const su = uAssigns.find(a => a.role === 'Setiausaha');
                  const suTeacher = su ? teacherMap.get(su.teacherId) : null;

                  const badge = getCategoryBadge(unit.category);

                  // Semak sama ada perlu render tajuk kategori pembahagi (jika paparan semua kategori)
                  const isFirstOfCategory = selectedCategoryFilter === 'SEMUA' && (
                    idx === 0 || filteredUnits[idx - 1].category !== unit.category
                  );
                  const catMeta = CATEGORY_STAT_SEQUENCE.find(c => c.category === unit.category);

                  return (
                    <React.Fragment key={unit.id}>
                      {isFirstOfCategory && catMeta && (
                        <tr className="bg-slate-100/70 dark:bg-slate-800/60 border-y border-slate-200 dark:border-slate-700">
                          <td colSpan={8} className="py-2.5 px-4 font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider text-xs">
                            <span className="mr-2 text-sm">{catMeta.icon}</span>
                            <span>{catMeta.name}</span>
                            <span className="ml-2 font-normal text-slate-500 text-[11px] normal-case">
                              ({sortedUnits.filter(u => u.category === unit.category).length} unit berdaftar)
                            </span>
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 px-3 text-center font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                            {unit.name}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                            {unit.code}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-black border ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </td>

                        {/* Sesi Pagi */}
                        <td className="py-3 px-3 text-center bg-amber-50/30 dark:bg-amber-950/10">
                          <div className="font-black text-amber-900 dark:text-amber-200 text-sm">
                            {morning}
                          </div>
                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold mt-0.5">
                            <span className="text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/80 px-1.5 py-0.2 rounded" title={`${morningMale} Guru Lelaki Sesi Pagi`}>
                              {morningMale}L
                            </span>
                            <span className="text-rose-700 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950/80 px-1.5 py-0.2 rounded" title={`${morningFemale} Guru Perempuan Sesi Pagi`}>
                              {morningFemale}P
                            </span>
                          </div>
                        </td>

                        {/* Sesi Petang */}
                        <td className="py-3 px-3 text-center bg-indigo-50/30 dark:bg-indigo-950/10">
                          <div className="font-black text-indigo-900 dark:text-indigo-200 text-sm">
                            {afternoon}
                          </div>
                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold mt-0.5">
                            <span className="text-blue-700 dark:text-blue-300 bg-blue-100/70 dark:bg-blue-950/80 px-1.5 py-0.2 rounded" title={`${afternoonMale} Guru Lelaki Sesi Petang`}>
                              {afternoonMale}L
                            </span>
                            <span className="text-rose-700 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950/80 px-1.5 py-0.2 rounded" title={`${afternoonFemale} Guru Perempuan Sesi Petang`}>
                              {afternoonFemale}P
                            </span>
                          </div>
                        </td>

                        {/* Jumlah */}
                        <td className="py-3 px-3 text-center">
                          <div className="font-black text-slate-900 dark:text-white text-sm">
                            {total}
                          </div>
                          <div className="flex items-center justify-center gap-1 text-[10px] font-bold mt-0.5">
                            <span className="text-blue-700 dark:text-blue-300" title={`${totalMale} Guru Lelaki`}>
                              {totalMale}L
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-rose-700 dark:text-rose-300" title={`${totalFemale} Guru Perempuan`}>
                              {totalFemale}P
                            </span>
                          </div>
                        </td>

                        {/* Ketua Guru Penasihat */}
                        <td className="py-3 px-3">
                          {ketuaTeacher ? (
                            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                              {ketuaTeacher.name}
                              <span className="text-[10px] text-slate-400 font-normal ml-1">
                                ({ketua?.session})
                              </span>
                            </div>
                          ) : (
                            <span className="text-rose-500 font-bold text-[11px] italic">
                              Belum dilantik
                            </span>
                          )}
                        </td>

                        {/* Setiausaha */}
                        <td className="py-3 px-3">
                          {suTeacher ? (
                            <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                              {suTeacher.name}
                              <span className="text-[10px] text-slate-400 font-normal ml-1">
                                ({su?.session})
                              </span>
                            </div>
                          ) : (
                            <span className="text-amber-500 font-bold text-[11px] italic">
                              Belum dilantik
                            </span>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
