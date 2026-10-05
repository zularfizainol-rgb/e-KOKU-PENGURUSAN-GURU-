import React, { useState } from 'react';
import { 
  Printer, 
  X, 
  FileCheck, 
  Download, 
  School, 
  Calendar, 
  Check, 
  User as UserIcon,
  ChevronDown,
  Layers,
  Sparkles
} from 'lucide-react';
import { Teacher, KokuUnit, UnitAssignment, SchoolSettings, ExecutiveLeader, CategoryCoordinator } from '../types/koku';
import { OFFICIAL_TS25_LOGO_SVG } from '../utils/logoHelpers';
import { formatTeacherGrade, getCategoryTitle } from '../utils/kokuHelpers';

interface AppointmentLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: Teacher | null;
  allTeachers: Teacher[];
  units: KokuUnit[];
  assignments: UnitAssignment[];
  settings: SchoolSettings;
  executiveLeaders?: ExecutiveLeader[];
  categoryCoordinators?: CategoryCoordinator[];
  onSelectTeacher?: (teacher: Teacher) => void;
}

export const AppointmentLetterModal: React.FC<AppointmentLetterModalProps> = ({
  isOpen,
  onClose,
  teacher,
  allTeachers,
  units,
  assignments,
  settings,
  executiveLeaders = [],
  categoryCoordinators = [],
  onSelectTeacher
}) => {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(teacher?.id || '');
  const [letterDate, setLetterDate] = useState<string>(() => {
    return new Date().toLocaleDateString('ms-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  });
  const [refNumber, setRefNumber] = useState<string>(() => {
    const code = settings.schoolCode || 'KOKU';
    const year = settings.academicYear ? settings.academicYear.split('/')[0].trim() : new Date().getFullYear();
    return `${code}/600-4/1/1(${year})`;
  });

  if (!isOpen) return null;

  const effectiveSchoolLogo = settings.schoolLogo || settings.schoolLogoUrl;

  // Active teacher
  const currentTeacher = allTeachers.find(t => t.id === (selectedTeacherId || teacher?.id)) || teacher || allTeachers[0];
  if (!currentTeacher) return null;

  const unitMap = new Map(units.map(u => [u.id, u]));

  // Get all assignments for this teacher
  const teacherAssignments = assignments.filter(a => a.teacherId === currentTeacher.id);

  // Group by category
  const beruniform = teacherAssignments.find(a => unitMap.get(a.unitId)?.category === 'BERUNIFORM');
  const kelab = teacherAssignments.find(a => unitMap.get(a.unitId)?.category === 'KELAB');
  const sukan = teacherAssignments.find(a => unitMap.get(a.unitId)?.category === 'SUKAN');
  const rumahSukan = teacherAssignments.find(a => unitMap.get(a.unitId)?.category === 'RUMAH_SUKAN');
  const pembangunan = teacherAssignments.filter(a => unitMap.get(a.unitId)?.category === 'PEMBANGUNAN');

  // Executive Leadership Roles (Setiausaha Kokurikulum, Naib SU, Setiausaha Sukan, Naib SU Sukan)
  const teacherExecRoles = executiveLeaders.filter(e => e.teacherId === currentTeacher.id);
  // Category Coordinator Roles (Penyelaras Unit Beruniform, Kelab, Sukan, Rumah Sukan, Pembangunan)
  const teacherCoords = categoryCoordinators.filter(c => c.teacherId === currentTeacher.id);

  const handlePrint = () => {
    window.print();
  };

  const handleTeacherChange = (id: string) => {
    setSelectedTeacherId(id);
    const found = allTeachers.find(t => t.id === id);
    if (found && onSelectTeacher) {
      onSelectTeacher(found);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full h-[95vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header Bar (Hidden during print) */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/80 no-print shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Surat Pelantikan Tugas Kokurikulum
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Jana dan cetak surat pelantikan rasmi bagi tahun persekolahan {settings.academicYear}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Teacher selector dropdown */}
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">Pilih Guru:</label>
              <select
                value={currentTeacher.id}
                onChange={(e) => handleTeacherChange(e.target.value)}
                className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white max-w-[200px] truncate"
              >
                {allTeachers.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.session})
                  </option>
                ))}
              </select>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Letter Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 dark:bg-slate-950 flex justify-center">
          <div className="w-full max-w-[210mm] bg-white text-slate-900 p-8 sm:p-12 shadow-lg border border-slate-200 min-h-[297mm] flex flex-col justify-between font-serif text-[13px] leading-relaxed">
            
            {/* Top Section */}
            <div>
              {/* Kepala Surat (Header Surat Rasmi KPM / Sekolah) */}
              <div className="flex items-center gap-5 border-b-2 border-slate-900 pb-5 mb-6">
                {/* Logo Sekolah */}
                <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                  {effectiveSchoolLogo ? (
                    <img 
                      src={effectiveSchoolLogo} 
                      alt="Logo Sekolah" 
                      className="max-h-20 max-w-20 object-contain"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full border-2 border-slate-800 flex items-center justify-center font-bold text-xs uppercase">
                      LOGO
                    </div>
                  )}
                </div>

                {/* Butiran Rasmi Sekolah */}
                <div className="flex-1 text-center font-sans">
                  <h1 className="text-base sm:text-lg font-black uppercase tracking-wide text-slate-900 leading-tight">
                    {settings.schoolName || 'NAMA SEKOLAH'}
                  </h1>
                  <p className="text-xs text-slate-700 font-medium mt-0.5">
                    {settings.schoolAddress || 'KOD SEKOLAH: ' + (settings.schoolCode || '-')}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    KOD SEKOLAH: <span className="font-bold">{settings.schoolCode || '-'}</span> | NEGERI: <span className="font-bold uppercase">{settings.schoolState || 'MALAYSIA'}</span>
                  </p>
                </div>

                {/* Logo TS25 / Kanan */}
                <div className="w-20 h-20 shrink-0 flex items-center justify-center">
                  {settings.ts25Logo ? (
                    <img 
                      src={settings.ts25Logo} 
                      alt="Logo TS25" 
                      className="max-h-20 max-w-20 object-contain"
                    />
                  ) : (
                    <div 
                      className="w-16 h-16 shrink-0 flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: OFFICIAL_TS25_LOGO_SVG }}
                    />
                  )}
                </div>
              </div>

              {/* Rujukan & Tarikh */}
              <div className="flex justify-between items-start text-xs font-sans mb-6">
                <div>
                  <p><span className="font-bold">Kepada:</span></p>
                  <p className="font-bold text-sm uppercase mt-0.5">{currentTeacher.name}</p>
                  <p className="text-slate-600">No. Fail / KP: {currentTeacher.staffId || '-'}</p>
                  <p className="text-slate-600">Gred Jawatan: {formatTeacherGrade(currentTeacher.grade)}</p>
                  <p className="text-slate-600">Sesi: Guru Sesi {currentTeacher.session}</p>
                </div>
                <div className="text-right space-y-1">
                  <p><span className="font-bold">Ruj. Kami:</span> {refNumber}</p>
                  <p><span className="font-bold">Tarikh:</span> {letterDate}</p>
                </div>
              </div>

              {/* Tajuk Surat */}
              <div className="mb-4 font-sans">
                <p className="text-xs mb-1.5">Tuan / Puan,</p>
                <h2 className="text-sm font-black uppercase text-slate-900 border-b-2 border-slate-900 pb-1.5 leading-snug">
                  {teacherExecRoles.length > 0 
                    ? `PELANTIKAN RASMI SEBAGAI ${teacherExecRoles.map(r => r.role.toUpperCase()).join(' & ')} SERTA TUGAS KOKURIKULUM SESI PERSEKOLAHAN ${settings.academicYear || '2026/2027'}`
                    : `PELANTIKAN TUGAS RASMI KOKURIKULUM DAN KO-AKADEMIK SESI PERSEKOLAHAN ${settings.academicYear || '2026/2027'}`
                  }
                </h2>
              </div>

              {/* Isi Surat */}
              <div className="space-y-3 text-justify text-slate-800 font-sans text-xs">
                <p>
                  Dengan hormatnya perkara di atas adalah dirujuk.
                </p>
                <p>
                  2. Sukacita dimaklumkan bahawa pihak Pengurusan Kokurikulum sekolah ini dengan rasminya melantik tuan/puan bagi menjalankan amanah dan tanggungjawab kokurikulum bagi sesi persekolahan <b>{settings.academicYear || '2026/2027'}</b> seperti butiran di bawah:
                </p>

                {/* Seksyen Khas: Pelantikan Eksekutif Utama (Jika Berkenaan) */}
                {teacherExecRoles.length > 0 && (
                  <div className="my-3 p-3.5 rounded-xl border-2 border-slate-900 bg-slate-50 space-y-1.5">
                    <div className="flex items-center gap-1.5 font-black text-xs uppercase text-slate-900 tracking-wide">
                      <span>🏛️</span>
                      <span>JAWATAN UTAMA PENGURUSAN KOKURIKULUM SEKOLAH:</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 mt-1">
                      {teacherExecRoles.map(er => (
                        <div key={er.id} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-300">
                          <span className="font-black text-xs text-slate-900">
                            ★ {er.role.toUpperCase()}
                          </span>
                          <span className="text-[11px] font-extrabold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                            SESI {er.session.toUpperCase()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Jadual Agihan Tugas Kokurikulum */}
                <div className="my-3 overflow-hidden rounded-xl border border-slate-300">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                        <th className="py-2 px-3 border-r border-slate-300 w-12 text-center">BIL</th>
                        <th className="py-2 px-3 border-r border-slate-300 w-44">BIDANG / KOMPONEN</th>
                        <th className="py-2 px-3 border-r border-slate-300">NAMA UNIT / BIDANG TUGAS</th>
                        <th className="py-2 px-3 w-48 text-center">JAWATAN DILANTIK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {/* 0. Jawatan Pengurusan Kokurikulum (SU Koku, Naib SU Koku, SU Sukan, Naib SU Sukan) */}
                      {teacherExecRoles.map((er, idx) => (
                        <tr key={`exec-${er.id || idx}`} className="bg-blue-50/70 font-semibold">
                          <td className="py-2 px-3 text-center font-black border-r border-slate-300 text-blue-900">★</td>
                          <td className="py-2 px-3 font-bold border-r border-slate-300 text-blue-950">
                            Jawatankuasa Pengurusan Kokurikulum Sekolah
                          </td>
                          <td className="py-2 px-3 border-r border-slate-300 font-black text-blue-900">
                            {er.role.includes('Sukan') ? 'Majlis Pembangunan Sukan Sekolah' : 'Jawatankuasa Pengurusan Kokurikulum Sekolah'}
                          </td>
                          <td className="py-2 px-3 text-center font-black">
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300 text-xs">
                              {er.role} ({er.session})
                            </span>
                          </td>
                        </tr>
                      ))}

                      {/* Penyelaras Unit Besar (Jika Ada) */}
                      {teacherCoords.map((tc, idx) => (
                        <tr key={`coord-${tc.id || idx}`} className="bg-purple-50/70 font-semibold">
                          <td className="py-2 px-3 text-center font-black border-r border-slate-300 text-purple-900">⭐</td>
                          <td className="py-2 px-3 font-bold border-r border-slate-300 text-purple-950">
                            Penyelaras Unit Besar
                          </td>
                          <td className="py-2 px-3 border-r border-slate-300 font-black text-purple-900">
                            {getCategoryTitle(tc.category)}
                          </td>
                          <td className="py-2 px-3 text-center font-black">
                            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300 text-xs">
                              {tc.roleTitle || 'Penyelaras'} ({tc.session})
                            </span>
                          </td>
                        </tr>
                      ))}

                      {/* 1. Beruniform */}
                      <tr>
                        <td className="py-2 px-3 text-center font-bold border-r border-slate-300">1</td>
                        <td className="py-2 px-3 font-semibold border-r border-slate-300">Pasukan Badan Beruniform</td>
                        <td className="py-2 px-3 border-r border-slate-300 font-bold text-emerald-950">
                          {beruniform ? (unitMap.get(beruniform.unitId)?.name || '-') : <span className="text-slate-400 italic">Tiada Agihan</span>}
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          {beruniform ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {beruniform.role}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>

                      {/* 2. Kelab & Persatuan */}
                      <tr>
                        <td className="py-2 px-3 text-center font-bold border-r border-slate-300">2</td>
                        <td className="py-2 px-3 font-semibold border-r border-slate-300">Kelab &amp; Persatuan</td>
                        <td className="py-2 px-3 border-r border-slate-300 font-bold text-blue-950">
                          {kelab ? (unitMap.get(kelab.unitId)?.name || '-') : <span className="text-slate-400 italic">Tiada Agihan</span>}
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          {kelab ? (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                              {kelab.role}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>

                      {/* 3. Sukan & Permainan */}
                      <tr>
                        <td className="py-2 px-3 text-center font-bold border-r border-slate-300">3</td>
                        <td className="py-2 px-3 font-semibold border-r border-slate-300">Sukan &amp; Permainan</td>
                        <td className="py-2 px-3 border-r border-slate-300 font-bold text-amber-950">
                          {sukan ? (unitMap.get(sukan.unitId)?.name || '-') : <span className="text-slate-400 italic">Tiada Agihan</span>}
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          {sukan ? (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              {sukan.role}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>

                      {/* 4. Rumah Sukan */}
                      <tr>
                        <td className="py-2 px-3 text-center font-bold border-r border-slate-300">4</td>
                        <td className="py-2 px-3 font-semibold border-r border-slate-300">Rumah Sukan</td>
                        <td className="py-2 px-3 border-r border-slate-300 font-bold text-rose-950">
                          {rumahSukan ? (unitMap.get(rumahSukan.unitId)?.name || '-') : <span className="text-slate-400 italic">Tiada Agihan</span>}
                        </td>
                        <td className="py-2 px-3 text-center font-bold">
                          {rumahSukan ? (
                            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                              {rumahSukan.role}
                            </span>
                          ) : '-'}
                        </td>
                      </tr>

                      {/* 5. Tugas Pembangunan & Khas (Jika Ada) */}
                      {pembangunan.length > 0 && pembangunan.map((p, idx) => (
                        <tr key={p.id}>
                          <td className="py-2 px-3 text-center font-bold border-r border-slate-300">{5 + idx}</td>
                          <td className="py-2 px-3 font-semibold border-r border-slate-300">Tugas Khas / Pembangunan</td>
                          <td className="py-2 px-3 border-r border-slate-300 font-bold text-purple-950">
                            {unitMap.get(p.unitId)?.name || '-'}
                          </td>
                          <td className="py-2 px-3 text-center font-bold">
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                              {p.role}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p>
                  3. Pihak sekolah amat yakin dan percaya bahawa tuan/puan dapat melaksanakan tugas ini dengan penuh komitmen, dedikasi, serta berintegriti tinggi demi kecemerlangan sahsiah dan bakat murid serta mengharumkan nama sekolah.
                </p>
                <p>
                  4. Pelantikan ini berkuat kuasa sepanjang sesi persekolahan <b>{settings.academicYear || '2026/2027'}</b> sehingga dimaklumkan kelak. Segala kerjasama dan komitmen tuan/puan didahului dengan ucapan setinggi-tinggi terima kasih.
                </p>

                <p className="pt-2 font-bold">
                  "BERKHIDMAT UNTUK NEGARA"
                </p>
              </div>
            </div>

            {/* Bottom Signatures Section */}
            <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 font-sans text-xs page-break-inside-avoid">
              <div>
                <p className="text-slate-500 mb-1">Saya yang menjalankan amanah,</p>
                <div className="h-14 border-b border-dashed border-slate-400 mb-2"></div>
                <p className="font-black uppercase text-slate-900">{settings.principalName || 'PENGETUA / GURU BESAR'}</p>
                <p className="text-slate-600 font-medium">Pengetua / Guru Besar</p>
                <p className="text-slate-500">{settings.schoolName}</p>
              </div>

              <div>
                <p className="text-slate-500 mb-1">Perakuan Penerimaan Pelantikan:</p>
                <div className="h-14 border-b border-dashed border-slate-400 mb-2"></div>
                <p className="font-black uppercase text-slate-900">{currentTeacher.name}</p>
                <p className="text-slate-600 font-medium">Tandatangan Guru Dilantik</p>
                <p className="text-slate-400 text-[10px] mt-1">Tarikh: .......................................</p>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
