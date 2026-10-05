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
    if (settings.schoolCode === 'WBA0053' || settings.schoolName?.toUpperCase().includes('AU KERAMAT')) {
      return 'SKAUK';
    }
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

  // Kumpulkan semua tugasan & jawatan pengurusan kokurikulum ke dalam satu jadual rasmi terus tanpa diasingkan
  const allTableRows: {
    bidang: string;
    unitName: string;
    role: string;
    isManagement?: boolean;
  }[] = [];

  // 1. Jawatan Pengurusan Kokurikulum Sekolah (SU Koku, Naib SU, SU Sukan, Naib SU Sukan)
  teacherExecRoles.forEach(er => {
    allTableRows.push({
      bidang: 'Pengurusan Kokurikulum Sekolah',
      unitName: er.role.toLowerCase().includes('sukan')
        ? 'Majlis Pembangunan Sukan Sekolah'
        : 'Jawatankuasa Pengurusan Kokurikulum Sekolah',
      role: `${er.role} (${er.session})`,
      isManagement: true,
    });
  });

  // 2. Penyelaras Bidang / Kategori (jika ada)
  teacherCoords.forEach(tc => {
    allTableRows.push({
      bidang: 'Penyelaras Bidang Kokurikulum',
      unitName: getCategoryTitle(tc.category),
      role: `${tc.roleTitle || 'Penyelaras'} (${tc.session})`,
      isManagement: true,
    });
  });

  // 3. Pasukan Badan Beruniform
  allTableRows.push({
    bidang: 'Pasukan Badan Beruniform',
    unitName: beruniform ? (unitMap.get(beruniform.unitId)?.name || '-') : 'Tiada Agihan',
    role: beruniform ? beruniform.role : '-',
  });

  // 4. Kelab & Persatuan
  allTableRows.push({
    bidang: 'Kelab & Persatuan',
    unitName: kelab ? (unitMap.get(kelab.unitId)?.name || '-') : 'Tiada Agihan',
    role: kelab ? kelab.role : '-',
  });

  // 5. Sukan & Permainan
  allTableRows.push({
    bidang: 'Sukan & Permainan',
    unitName: sukan ? (unitMap.get(sukan.unitId)?.name || '-') : 'Tiada Agihan',
    role: sukan ? sukan.role : '-',
  });

  // 6. Rumah Sukan
  allTableRows.push({
    bidang: 'Rumah Sukan',
    unitName: rumahSukan ? (unitMap.get(rumahSukan.unitId)?.name || '-') : 'Tiada Agihan',
    role: rumahSukan ? rumahSukan.role : '-',
  });

  // 7. Tugas Khas / Pembangunan (jika ada)
  pembangunan.forEach(p => {
    allTableRows.push({
      bidang: 'Tugas Khas / Pembangunan',
      unitName: unitMap.get(p.unitId)?.name || '-',
      role: p.role,
    });
  });

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
              {/* Kepala Surat Rasmi (Letterhead Standard KPM / Sekolah) */}
              <div className="border-b-2 border-black pb-3 mb-5">
                <div className="flex items-center gap-4 sm:gap-6">
                  {/* Logo Sekolah */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 flex items-center justify-center">
                    {effectiveSchoolLogo ? (
                      <img 
                        src={effectiveSchoolLogo} 
                        alt="Logo Sekolah" 
                        className="max-h-24 max-w-24 object-contain"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full border-2 border-slate-800 flex items-center justify-center font-bold text-xs uppercase">
                        LOGO
                      </div>
                    )}
                  </div>

                  {/* Butiran Rasmi Sekolah (Nama, Alamat di Kiri, No Tel & Email di Kanan) */}
                  <div className="flex-1 font-sans text-slate-900">
                    <h1 className="text-base sm:text-lg font-black uppercase tracking-wide leading-tight text-black mb-1">
                      {settings.schoolName || 'SEKOLAH KEBANGSAAN AU KERAMAT'}
                    </h1>

                    <div className="flex justify-between items-start text-xs leading-snug">
                      {/* Alamat Sekolah */}
                      <div className="font-bold text-slate-900 uppercase whitespace-pre-line max-w-[62%]">
                        {settings.schoolAddress ? (
                          settings.schoolAddress
                        ) : (
                          <>
                            <div>JALAN 5/56 AU3</div>
                            <div>54200 KUALA LUMPUR</div>
                          </>
                        )}
                      </div>

                      {/* No. Tel & Email Sekolah */}
                      <div className="text-right font-medium text-xs space-y-0.5 shrink-0 pl-3">
                        <div className="font-bold">
                          <span className="inline-block text-left">No. <span className="underline">Tel</span> :</span>{' '}
                          <span className="font-sans font-bold">{settings.schoolPhone || '03-41079639'}</span>
                        </div>
                        <div className="font-bold">
                          <span className="inline-block text-left">Email <span className="underline">&nbsp;</span> :</span>{' '}
                          <a 
                            href={`mailto:${settings.schoolEmail || 'wba0053@moe.edu.my'}`} 
                            className="text-blue-700 underline font-sans"
                          >
                            {settings.schoolEmail || 'wba0053@moe.edu.my'}
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rujukan & Tarikh */}
              <div className="flex justify-between items-start text-xs font-sans mb-6">
                <div>
                  <p><span className="font-bold">Kepada:</span></p>
                  <p className="font-bold text-sm uppercase mt-0.5 text-black">{currentTeacher.name}</p>
                  <p className="text-slate-600">No. Fail / KP: <span className="font-semibold">{currentTeacher.staffId || '-'}</span></p>
                  <p className="text-slate-600">Gred Jawatan: <span className="font-semibold">{formatTeacherGrade(currentTeacher.grade)}</span></p>
                  <p className="text-slate-600">Sesi: <span className="font-semibold">Guru Sesi {currentTeacher.session}</span></p>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-1.5 font-bold">
                    <span>Ruj <span className="underline">Kami</span> :</span>
                    <input
                      type="text"
                      value={refNumber}
                      onChange={(e) => setRefNumber(e.target.value)}
                      className="font-bold text-xs text-right bg-transparent border-b border-dashed border-slate-300 hover:border-slate-500 focus:border-slate-800 focus:outline-hidden px-1 py-0.5 max-w-[200px] print:border-none print:p-0"
                      title="Klik untuk sunting No. Rujukan"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-1.5 font-bold">
                    <span>Tarikh <span className="underline">&nbsp;</span> :</span>
                    <input
                      type="text"
                      value={letterDate}
                      onChange={(e) => setLetterDate(e.target.value)}
                      className="font-bold text-xs text-right bg-transparent border-b border-dashed border-slate-300 hover:border-slate-500 focus:border-slate-800 focus:outline-hidden px-1 py-0.5 max-w-[180px] print:border-none print:p-0"
                      title="Klik untuk sunting Tarikh Surat"
                    />
                  </div>
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

                {/* Jadual Agihan Tugas Kokurikulum Bersepadu */}
                <div className="my-3 overflow-hidden rounded-xl border border-slate-300">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                        <th className="py-2 px-3 border-r border-slate-300 w-12 text-center">BIL</th>
                        <th className="py-2 px-3 border-r border-slate-300 w-48">BIDANG / KOMPONEN</th>
                        <th className="py-2 px-3 border-r border-slate-300">NAMA UNIT / BIDANG TUGAS</th>
                        <th className="py-2 px-3 w-48 text-center">JAWATAN DILANTIK</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {allTableRows.map((row, idx) => (
                        <tr 
                          key={idx} 
                          className={row.isManagement ? 'bg-amber-50/50 font-semibold' : 'hover:bg-slate-50'}
                        >
                          <td className="py-2 px-3 text-center font-bold border-r border-slate-300 text-slate-900">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-3 font-semibold border-r border-slate-300 text-slate-900">
                            {row.bidang}
                          </td>
                          <td className="py-2 px-3 border-r border-slate-300 font-bold text-slate-900">
                            {row.unitName === 'Tiada Agihan' ? (
                              <span className="text-slate-400 italic font-normal">Tiada Agihan</span>
                            ) : (
                              row.unitName
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-bold">
                            {row.role === '-' ? (
                              <span className="text-slate-400 font-normal">-</span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded text-xs inline-block ${
                                row.isManagement 
                                  ? 'bg-amber-100 text-amber-950 border border-amber-300 font-black' 
                                  : 'bg-slate-100 text-slate-800 border border-slate-200'
                              }`}>
                                {row.role}
                              </span>
                            )}
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

                <div className="pt-2 font-bold font-sans text-xs space-y-0.5 text-black">
                  <p>"MALAYSIA MADANI"</p>
                  <p>"BERKHIDMAT UNTUK NEGARA"</p>
                </div>
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
