import React, { useState } from 'react';
import { 
  Printer, 
  X, 
  FileText, 
  CheckCircle2, 
  Download,
  School,
  Sun,
  Sunset
} from 'lucide-react';
import { Teacher, KokuUnit, UnitAssignment, SchoolSettings, RoleType, SessionType, UnitCategory } from '../types/koku';
import { sortTeachersBySessionAndAlphabet } from '../utils/kokuHelpers';
import { OFFICIAL_TS25_LOGO_SVG } from '../utils/logoHelpers';

const CATEGORY_CONFIG: {
  category: UnitCategory;
  title: string;
  order: number;
}[] = [
  { category: 'BERUNIFORM', title: 'Unit Beruniform', order: 1 },
  { category: 'KELAB', title: 'Kelab dan Persatuan', order: 2 },
  { category: 'SUKAN', title: 'Sukan dan Permainan', order: 3 },
  { category: 'RUMAH_SUKAN', title: 'Rumah Sukan', order: 4 },
  { category: 'PEMBANGUNAN', title: 'Pembangunan & Khas', order: 5 },
];

interface PrintReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: Teacher[];
  units: KokuUnit[];
  assignments: UnitAssignment[];
  settings: SchoolSettings;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  isOpen,
  onClose,
  teachers,
  units,
  assignments,
  settings,
}) => {
  const [reportType, setReportType] = useState<'MASTER' | 'UNITS' | 'STATS'>('MASTER');
  const [sessionFilter, setSessionFilter] = useState<'Semua' | 'Pagi' | 'Petang'>('Semua');
  const [categoryFilter, setCategoryFilter] = useState<string>('Semua');

  if (!isOpen) return null;

  const unitMap = new Map(units.map(u => [u.id, u]));
  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  const filteredTeachers = sortTeachersBySessionAndAlphabet(
    teachers.filter(t => {
      if (sessionFilter !== 'Semua' && t.session !== sessionFilter) return false;
      return true;
    })
  );

  const categoriesToDisplay = CATEGORY_CONFIG.filter(
    cat => categoryFilter === 'Semua' || cat.category === categoryFilter
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full h-[95vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/80 no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Pratonton Cetakan Rasmi / Muat Turun PDF
            </h3>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Report Type Selector */}
            <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setReportType('MASTER')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  reportType === 'MASTER' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Jadual Induk Agihan
              </button>
              <button
                onClick={() => setReportType('UNITS')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  reportType === 'UNITS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Senarai Jawatankuasa Unit
              </button>
              <button
                onClick={() => setReportType('STATS')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  reportType === 'STATS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                Analisis Sesi
              </button>
            </div>

            {/* Sesi Filter */}
            <select
              value={sessionFilter}
              onChange={e => setSessionFilter(e.target.value as any)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
            >
              <option value="Semua">Semua Sesi</option>
              <option value="Pagi">Sesi Pagi Sahaja</option>
              <option value="Petang">Sesi Petang Sahaja</option>
            </select>

            {/* Kategori Filter (Untuk Jawatankuasa Unit & Analisis Sesi) */}
            {reportType !== 'MASTER' && (
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white font-semibold"
              >
                <option value="Semua">Semua Kategori</option>
                <option value="BERUNIFORM">1. Unit Beruniform</option>
                <option value="KELAB">2. Kelab & Persatuan</option>
                <option value="SUKAN">3. Sukan & Permainan</option>
                <option value="RUMAH_SUKAN">4. Rumah Sukan</option>
                <option value="PEMBANGUNAN">5. Pembangunan & Khas</option>
              </select>
            )}

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area (A4 layout styling) */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-100 dark:bg-slate-950 flex justify-center print:p-0 print:bg-white">
          <div className="bg-white text-slate-900 w-full max-w-[210mm] min-h-[297mm] p-8 sm:p-12 shadow-md print:shadow-none print:p-6 print:m-0 rounded-xl print:rounded-none text-xs">
            {/* Official School Letterhead */}
            <div className="flex items-center justify-between pb-4 border-b-2 border-black mb-6 gap-4">
              {/* Left Column: School Logo */}
              <div className="w-20 shrink-0 flex items-center justify-start">
                {settings.schoolLogo ? (
                  <img
                    src={settings.schoolLogo}
                    alt="Logo Sekolah"
                    className="max-h-20 max-w-[80px] object-contain"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-300 print:hidden text-[9px] text-center p-1">
                    <School className="w-5 h-5 opacity-40 mb-0.5" />
                    <span>Logo</span>
                  </div>
                )}
              </div>

              {/* Center Column: Official Institution Info */}
              <div className="text-center flex-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  KEMENTERIAN PENDIDIKAN MALAYSIA • JABATAN PENDIDIKAN NEGERI {(settings.state || 'MALAYSIA').toUpperCase()}
                </div>
                {settings.district && (
                  <div className="text-[12px] font-bold text-slate-700">
                    PEJABAT PENDIDIKAN DAERAH {settings.district.toUpperCase()}
                  </div>
                )}
                <h1 className="text-base sm:text-lg font-black uppercase text-slate-900 mt-0.5">
                  {settings.schoolName}
                </h1>
                <div className="text-[11px] text-slate-600 font-medium">
                  KOD SEKOLAH: <b>{settings.schoolCode}</b> • SESI PERSEKOLAHAN: <b>{settings.academicYear}</b>
                </div>
              </div>

              {/* Right Column: TS25 Logo */}
              <div className="w-20 shrink-0 flex items-center justify-end">
                {settings.ts25Logo !== 'NONE' && (settings.ts25Logo || OFFICIAL_TS25_LOGO_SVG) ? (
                  <img
                    src={settings.ts25Logo || OFFICIAL_TS25_LOGO_SVG}
                    alt="Logo TS25"
                    className="max-h-20 max-w-[80px] object-contain"
                  />
                ) : (
                  <div className="w-20" />
                )}
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center mb-6">
              <h2 className="text-sm font-extrabold uppercase underline tracking-wide">
                {reportType === 'MASTER' && 'JADUAL INDUK AGIHAN TUGAS GURU KOKURIKULUM'}
                {reportType === 'UNITS' && 'SENARAI JAWATANKUASA GURU PENASIHAT MENGIKUT UNIT KOKURIKULUM'}
                {reportType === 'STATS' && 'LAPORAN STATISTIK DAN ANALISIS AGIHAN GURU SESI PAGI & PETANG'}
              </h2>
              <div className="text-[10px] text-slate-500 mt-1">
                Tarikh Cetakan: {new Date().toLocaleDateString('ms-MY', { day: 'numeric', month: 'long', year: 'numeric' })} • Tapis Sesi: {sessionFilter} {categoryFilter !== 'Semua' ? `• Kategori: ${CATEGORY_CONFIG.find(c => c.category === categoryFilter)?.title}` : '• Semua Kategori'}
              </div>
            </div>

            {/* REPORT TYPE 1: MASTER TABLE */}
            {reportType === 'MASTER' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-400 text-[10px]">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900 uppercase font-bold text-center">
                      <th className="border border-slate-400 py-2 px-1 w-7">Bil</th>
                      <th className="border border-slate-400 py-2 px-2 text-left">Nama Guru</th>
                      <th className="border border-slate-400 py-2 px-1 w-12">Sesi</th>
                      <th className="border border-slate-400 py-2 px-2 text-left">Unit Beruniform</th>
                      <th className="border border-slate-400 py-2 px-2 text-left">Kelab & Persatuan</th>
                      <th className="border border-slate-400 py-2 px-2 text-left">Sukan & Permainan</th>
                      <th className="border border-slate-400 py-2 px-2 text-left">Rumah Sukan</th>
                      <th className="border border-slate-400 py-2 px-1 text-center w-12">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTeachers.map((t, idx) => {
                      const tAssigns = assignments.filter(a => a.teacherId === t.id);
                      const uniform = tAssigns.find(a => unitMap.get(a.unitId)?.category === 'BERUNIFORM');
                      const club = tAssigns.find(a => unitMap.get(a.unitId)?.category === 'KELAB');
                      const sport = tAssigns.find(a => unitMap.get(a.unitId)?.category === 'SUKAN');
                      const house = tAssigns.find(a => unitMap.get(a.unitId)?.category === 'RUMAH_SUKAN');

                      const formatCell = (assign?: UnitAssignment) => {
                        if (!assign) return <span className="text-slate-300 italic">-</span>;
                        const u = unitMap.get(assign.unitId);
                        const isLeader = assign.role.includes('Ketua');
                        const isSU = assign.role === 'Setiausaha';

                        return (
                          <div>
                            <div className="font-semibold text-slate-900 leading-tight">{u?.name}</div>
                            <div className={`text-[9px] ${isLeader ? 'font-bold text-red-700' : isSU ? 'font-semibold text-blue-800' : 'text-slate-600'}`}>
                              ({assign.role} - {assign.session})
                            </div>
                          </div>
                        );
                      };

                      return (
                        <tr key={t.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                          <td className="border border-slate-300 py-1.5 px-1 text-center font-bold">{idx + 1}</td>
                          <td className="border border-slate-300 py-1.5 px-2">
                            <div className="font-bold text-slate-900">{t.name}</div>
                            <div className="text-[9px] text-slate-500">
                              {t.gender === 'L' ? 'Lelaki' : 'Perempuan'}
                            </div>
                          </td>
                          <td className="border border-slate-300 py-1.5 px-1 text-center font-semibold">{t.session}</td>
                          <td className="border border-slate-300 py-1.5 px-2">{formatCell(uniform)}</td>
                          <td className="border border-slate-300 py-1.5 px-2">{formatCell(club)}</td>
                          <td className="border border-slate-300 py-1.5 px-2">{formatCell(sport)}</td>
                          <td className="border border-slate-300 py-1.5 px-2">{formatCell(house)}</td>
                          <td className="border border-slate-300 py-1.5 px-1 text-center font-bold">{tAssigns.length}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* REPORT TYPE 2: SENARAI JAWATANKUASA MENGIKUT KATEGORI & UNIT */}
            {reportType === 'UNITS' && (
              <div className="space-y-8">
                {categoriesToDisplay.map((catConfig, catIdx) => {
                  const catUnits = units
                    .filter(u => u.category === catConfig.category)
                    .sort((a, b) => a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' }));

                  if (catUnits.length === 0) return null;

                  return (
                    <div key={catConfig.category} className="space-y-4">
                      {/* Category Header Banner */}
                      <div className="bg-slate-800 text-white px-4 py-2.5 rounded-lg font-black text-xs uppercase flex items-center justify-between border-l-4 border-indigo-500 shadow-xs print:bg-slate-800 print:text-white page-break-after-avoid">
                        <span className="tracking-wide">
                          BAHAGIAN {catIdx + 1}.0: {catConfig.title.toUpperCase()}
                        </span>
                        <span className="text-[10px] font-medium bg-slate-700/80 px-2.5 py-0.5 rounded-full">
                          {catUnits.length} Unit Berdaftar
                        </span>
                      </div>

                      <div className="space-y-4">
                        {catUnits.map((unit, unitIdx) => {
                          const uAssigns = assignments.filter(a => a.unitId === unit.id);
                          const morningAssigns = uAssigns
                            .filter(a => a.session === 'Pagi')
                            .sort((a, b) => (teacherMap.get(a.teacherId)?.name || '').localeCompare(teacherMap.get(b.teacherId)?.name || '', 'ms', { sensitivity: 'base' }));
                          const afternoonAssigns = uAssigns
                            .filter(a => a.session === 'Petang')
                            .sort((a, b) => (teacherMap.get(a.teacherId)?.name || '').localeCompare(teacherMap.get(b.teacherId)?.name || '', 'ms', { sensitivity: 'base' }));

                          const ketua = uAssigns.find(a => a.role === 'Ketua Guru Penasihat');
                          const su = uAssigns.find(a => a.role === 'Setiausaha');

                          return (
                            <div key={unit.id} className="border border-slate-400 p-3.5 rounded-lg page-break-inside-avoid shadow-2xs">
                              {/* Header Unit */}
                              <div className="flex justify-between items-center bg-slate-100 p-2 rounded font-bold text-xs uppercase mb-2 border border-slate-300">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: unit.color || '#4f46e5' }} />
                                  <span className="text-slate-900">{catIdx + 1}.{unitIdx + 1} {unit.name} ({unit.code})</span>
                                </div>
                                <span className="text-[10px] text-slate-700 font-extrabold">
                                  Jumlah Guru: {uAssigns.length} (Pagi: {morningAssigns.length}, Petang: {afternoonAssigns.length})
                                </span>
                              </div>

                              {/* Leadership Line */}
                              <div className="grid grid-cols-2 gap-2 text-[10px] mb-2 px-1">
                                <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                                  <b>Ketua Guru Penasihat:</b>{' '}
                                  {ketua ? (
                                    <span className="font-bold text-slate-900">
                                      {teacherMap.get(ketua.teacherId)?.name} ({ketua.session})
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Belum dilantik</span>
                                  )}
                                </div>
                                <div className="bg-slate-50 p-1.5 rounded border border-slate-200">
                                  <b>Setiausaha:</b>{' '}
                                  {su ? (
                                    <span className="font-bold text-slate-900">
                                      {teacherMap.get(su.teacherId)?.name} ({su.session})
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Belum dilantik</span>
                                  )}
                                </div>
                              </div>

                              {/* Members lists */}
                              <div className="grid grid-cols-2 gap-3 text-[10px] pt-2 border-t border-slate-200">
                                <div>
                                  <div className="font-bold underline text-amber-800 mb-1">
                                    Guru Sesi Pagi ({morningAssigns.length})
                                  </div>
                                  {morningAssigns.length === 0 ? (
                                    <div className="text-slate-400 italic text-[9px]">Tiada guru sesi pagi</div>
                                  ) : (
                                    <ol className="list-decimal list-inside space-y-0.5 text-slate-700">
                                      {morningAssigns.map(a => (
                                        <li key={a.id}>
                                          <span className="font-semibold text-slate-900">{teacherMap.get(a.teacherId)?.name}</span> - <i>{a.role}</i>
                                        </li>
                                      ))}
                                    </ol>
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold underline text-indigo-800 mb-1">
                                    Guru Sesi Petang ({afternoonAssigns.length})
                                  </div>
                                  {afternoonAssigns.length === 0 ? (
                                    <div className="text-slate-400 italic text-[9px]">Tiada guru sesi petang</div>
                                  ) : (
                                    <ol className="list-decimal list-inside space-y-0.5 text-slate-700">
                                      {afternoonAssigns.map(a => (
                                        <li key={a.id}>
                                          <span className="font-semibold text-slate-900">{teacherMap.get(a.teacherId)?.name}</span> - <i>{a.role}</i>
                                        </li>
                                      ))}
                                    </ol>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* REPORT TYPE 3: ANALISIS & STATISTIK MENGIKUT KATEGORI */}
            {reportType === 'STATS' && (
              <div className="space-y-6">
                {categoriesToDisplay.map((catConfig, catIdx) => {
                  const catUnits = units
                    .filter(u => u.category === catConfig.category)
                    .sort((a, b) => a.name.localeCompare(b.name, 'ms', { sensitivity: 'base' }));

                  if (catUnits.length === 0) return null;

                  let catMorningTotal = 0;
                  let catMorningMale = 0;
                  let catMorningFemale = 0;

                  let catAfternoonTotal = 0;
                  let catAfternoonMale = 0;
                  let catAfternoonFemale = 0;

                  let catGrandTotal = 0;

                  return (
                    <div key={catConfig.category} className="space-y-1.5 page-break-inside-avoid">
                      <div className="bg-slate-800 text-white px-3 py-1.5 rounded-t-md font-black text-xs uppercase flex items-center justify-between border-l-4 border-indigo-500 print:bg-slate-800 print:text-white">
                        <span>BAHAGIAN {catIdx + 1}.0: {catConfig.title.toUpperCase()}</span>
                        <span className="text-[10px] font-normal">({catUnits.length} Unit)</span>
                      </div>

                      <table className="w-full text-left border-collapse border border-slate-400 text-[10px]">
                        <thead>
                          <tr className="bg-slate-200 text-slate-900 font-bold uppercase text-center">
                            <th className="border border-slate-400 py-1.5 px-2 w-8">Bil</th>
                            <th className="border border-slate-400 py-1.5 px-3 text-left">Nama Unit Kokurikulum</th>
                            <th className="border border-slate-400 py-1.5 px-2 w-14">Kod</th>
                            <th className="border border-slate-400 py-1.5 px-2 w-20">Guru Pagi (L/P)</th>
                            <th className="border border-slate-400 py-1.5 px-2 w-20">Guru Petang (L/P)</th>
                            <th className="border border-slate-400 py-1.5 px-2 w-20">Jumlah (L/P)</th>
                            <th className="border border-slate-400 py-1.5 px-2 text-left">Ketua Guru Penasihat</th>
                            <th className="border border-slate-400 py-1.5 px-2 text-left">Setiausaha</th>
                          </tr>
                        </thead>
                        <tbody>
                          {catUnits.map((u, i) => {
                            const uAssigns = assignments.filter(a => a.unitId === u.id);
                            const morningAssigns = uAssigns.filter(a => a.session === 'Pagi');
                            const afternoonAssigns = uAssigns.filter(a => a.session === 'Petang');

                            const m = morningAssigns.length;
                            const mL = morningAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'L').length;
                            const mP = morningAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'P').length;

                            const a = afternoonAssigns.length;
                            const aL = afternoonAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'L').length;
                            const aP = afternoonAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'P').length;

                            const totalL = uAssigns.filter(asg => teacherMap.get(asg.teacherId)?.gender === 'L').length;
                            const totalP = uAssigns.filter(asg => teacherMap.get(asg.teacherId)?.gender === 'P').length;

                            const ketua = uAssigns.find(asg => asg.role === 'Ketua Guru Penasihat');
                            const su = uAssigns.find(asg => asg.role === 'Setiausaha');

                            catMorningTotal += m;
                            catMorningMale += mL;
                            catMorningFemale += mP;

                            catAfternoonTotal += a;
                            catAfternoonMale += aL;
                            catAfternoonFemale += aP;

                            catGrandTotal += uAssigns.length;

                            return (
                              <tr key={u.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="border border-slate-300 py-1.5 px-2 text-center font-bold">{i + 1}</td>
                                <td className="border border-slate-300 py-1.5 px-3 font-semibold text-slate-900">{u.name}</td>
                                <td className="border border-slate-300 py-1.5 px-2 text-center font-mono font-bold text-slate-600">{u.code}</td>
                                <td className="border border-slate-300 py-1.5 px-2 text-center font-bold text-amber-900">
                                  {m} <span className="text-[9px] font-normal text-slate-500">({mL}L/{mP}P)</span>
                                </td>
                                <td className="border border-slate-300 py-1.5 px-2 text-center font-bold text-indigo-900">
                                  {a} <span className="text-[9px] font-normal text-slate-500">({aL}L/{aP}P)</span>
                                </td>
                                <td className="border border-slate-300 py-1.5 px-2 text-center font-black text-slate-900">
                                  {uAssigns.length} <span className="text-[9px] font-normal text-slate-500">({totalL}L/{totalP}P)</span>
                                </td>
                                <td className="border border-slate-300 py-1.5 px-2">
                                  {ketua ? (
                                    <span className="font-semibold text-slate-800">
                                      {teacherMap.get(ketua.teacherId)?.name} <span className="text-[9px] text-slate-500">({ketua.session})</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">-</span>
                                  )}
                                </td>
                                <td className="border border-slate-300 py-1.5 px-2">
                                  {su ? (
                                    <span className="font-semibold text-slate-800">
                                      {teacherMap.get(su.teacherId)?.name} <span className="text-[9px] text-slate-500">({su.session})</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}

                          {/* Subtotal Row for this Category */}
                          <tr className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
                            <td colSpan={3} className="border border-slate-300 py-1.5 px-3 text-right uppercase text-[10px]">
                              Subjumlah {catConfig.title}:
                            </td>
                            <td className="border border-slate-300 py-1.5 px-2 text-center font-black text-amber-900 text-[10px]">
                              {catMorningTotal} <span className="text-[9px] font-normal">({catMorningMale}L/{catMorningFemale}P)</span>
                            </td>
                            <td className="border border-slate-300 py-1.5 px-2 text-center font-black text-indigo-900 text-[10px]">
                              {catAfternoonTotal} <span className="text-[9px] font-normal">({catAfternoonMale}L/{catAfternoonFemale}P)</span>
                            </td>
                            <td className="border border-slate-300 py-1.5 px-2 text-center font-black text-slate-900 text-[10px]">
                              {catGrandTotal}
                            </td>
                            <td colSpan={2} className="border border-slate-300 py-1.5 px-2 text-slate-500 italic text-[9px]">
                              {catUnits.length} unit berdaftar
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })}

                {/* Overall Summary Row / Table when viewing all categories */}
                {categoryFilter === 'Semua' && (
                  <div className="mt-6 border-2 border-slate-700 rounded-lg overflow-hidden page-break-inside-avoid">
                    <div className="bg-slate-800 text-white px-3 py-2 font-black text-xs uppercase flex items-center justify-between">
                      <span>RINGKASAN KESELURUHAN AGIHAN KOKURIKULUM MENGIKUT KATEGORI</span>
                      <span className="text-[10px] font-normal">{units.length} Unit Keseluruhan</span>
                    </div>
                    <table className="w-full text-left border-collapse text-[10px]">
                      <thead>
                        <tr className="bg-slate-200 text-slate-900 font-bold uppercase text-center border-b border-slate-300">
                          <th className="py-1.5 px-2 w-8 border-r border-slate-300">Bil</th>
                          <th className="py-1.5 px-3 text-left border-r border-slate-300">Kategori Unit</th>
                          <th className="py-1.5 px-2 w-20 border-r border-slate-300">Bilangan Unit</th>
                          <th className="py-1.5 px-2 w-28 border-r border-slate-300">Guru Sesi Pagi</th>
                          <th className="py-1.5 px-2 w-28 border-r border-slate-300">Guru Sesi Petang</th>
                          <th className="py-1.5 px-2 w-24">Jumlah Agihan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {CATEGORY_CONFIG.map((cat, idx) => {
                          const catUnits = units.filter(u => u.category === cat.category);
                          const catUnitIds = new Set(catUnits.map(u => u.id));
                          const catAssigns = assignments.filter(a => catUnitIds.has(a.unitId));
                          const mAssigns = catAssigns.filter(a => a.session === 'Pagi');
                          const aAssigns = catAssigns.filter(a => a.session === 'Petang');

                          const mCount = mAssigns.length;
                          const mLCount = mAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'L').length;
                          const mPCount = mAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'P').length;

                          const aCount = aAssigns.length;
                          const aLCount = aAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'L').length;
                          const aPCount = aAssigns.filter(a => teacherMap.get(a.teacherId)?.gender === 'P').length;

                          return (
                            <tr key={cat.category} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                              <td className="py-1.5 px-2 text-center font-bold border-r border-slate-300 border-b border-slate-200">{idx + 1}</td>
                              <td className="py-1.5 px-3 font-semibold text-slate-900 border-r border-slate-300 border-b border-slate-200">{cat.title}</td>
                              <td className="py-1.5 px-2 text-center font-bold text-slate-700 border-r border-slate-300 border-b border-slate-200">{catUnits.length}</td>
                              <td className="py-1.5 px-2 text-center font-bold text-amber-900 border-r border-slate-300 border-b border-slate-200">
                                {mCount} <span className="text-[9px] font-normal text-slate-500">({mLCount}L/{mPCount}P)</span>
                              </td>
                              <td className="py-1.5 px-2 text-center font-bold text-indigo-900 border-r border-slate-300 border-b border-slate-200">
                                {aCount} <span className="text-[9px] font-normal text-slate-500">({aLCount}L/{aPCount}P)</span>
                              </td>
                              <td className="py-1.5 px-2 text-center font-black text-slate-900 border-b border-slate-200">{catAssigns.length}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-slate-100 text-slate-900 font-black border-t-2 border-slate-400">
                          <td colSpan={2} className="py-2 px-3 text-right uppercase border-r border-slate-300">JUMLAH KESELURUHAN:</td>
                          <td className="py-2 px-2 text-center border-r border-slate-300">{units.length}</td>
                          <td className="py-2 px-2 text-center text-amber-900 border-r border-slate-300">
                            {assignments.filter(a => a.session === 'Pagi').length}
                          </td>
                          <td className="py-2 px-2 text-center text-indigo-900 border-r border-slate-300">
                            {assignments.filter(a => a.session === 'Petang').length}
                          </td>
                          <td className="py-2 px-2 text-center text-emerald-800 text-xs">{assignments.length}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Official Signatures Section */}
            <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 page-break-inside-avoid text-[11px]">
              <div>
                <div className="text-slate-500 mb-1">Disediakan oleh:</div>
                <div className="h-16 border-b border-dashed border-slate-400 mb-2"></div>
                <div className="font-bold uppercase text-slate-900">{settings.gpkKokuName}</div>
                <div className="text-slate-600 font-medium">Guru Penolong Kanan Kokurikulum</div>
                <div className="text-slate-500">{settings.schoolName}</div>
                <div className="text-slate-400 text-[10px] mt-1">Tarikh: .......................................</div>
              </div>

              <div>
                <div className="text-slate-500 mb-1">Disahkan dan Diluluskan oleh:</div>
                <div className="h-16 border-b border-dashed border-slate-400 mb-2"></div>
                <div className="font-bold uppercase text-slate-900">{settings.principalName}</div>
                <div className="text-slate-600 font-medium">Pengetua / Guru Besar</div>
                <div className="text-slate-500">{settings.schoolName}</div>
                <div className="text-slate-400 text-[10px] mt-1">Tarikh: .......................................</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
