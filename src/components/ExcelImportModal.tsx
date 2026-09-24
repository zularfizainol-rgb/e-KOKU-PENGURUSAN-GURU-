import React, { useState } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Users,
  Sun,
  Sunset
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Teacher } from '../types/koku';
import { parseTeacherImportFile } from '../utils/kokuHelpers';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportTeachers: (newTeachers: Teacher[], mode: 'merge' | 'replace') => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  isOpen,
  onClose,
  onImportTeachers,
}) => {
  const [parsedTeachers, setParsedTeachers] = useState<Teacher[]>([]);
  const [fileName, setFileName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const { teachers: rawTeachers, errors } = parseTeacherImportFile(buffer);
        if (errors.length > 0) {
          setErrorMsg(errors.join(', '));
          return;
        }

        const validTeachers: Teacher[] = rawTeachers.map((t, idx) => ({
          id: t.id || `imp-${Date.now()}-${idx}`,
          name: t.name || 'Guru Baharu',
          staffId: t.staffId || `G${1000 + idx}`,
          gender: t.gender || 'L',
          session: t.session || 'Pagi',
          grade: t.grade || 'DG41',
          phone: t.phone || '',
          email: t.email || '',
        }));

        setParsedTeachers(validTeachers);
      } catch (err: unknown) {
        console.error(err);
        setErrorMsg('Gagal membaca fail Excel/CSV. Sila pastikan format fail betul.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const templateData = [
      {
        'Nama Guru': 'Ahmad Zaki bin Sulaiman',
        'No. KP / Fail': '880315-10-5231',
        'Sesi': 'Pagi',
        'Jantina': 'L',
        'Gred': 'DG44',
        'No Telefon': '012-3456789',
        'Emel': 'zaki@moe.edu.my'
      },
      {
        'Nama Guru': 'Nurul Hanim binti Roslan',
        'No. KP / Fail': '920722-08-5432',
        'Sesi': 'Petang',
        'Jantina': 'P',
        'Gred': 'DG41',
        'No Telefon': '019-8765432',
        'Emel': 'nurulhanim@moe.edu.my'
      },
      {
        'Nama Guru': 'Chong Siew Ling',
        'No. KP / Fail': '850104-14-5112',
        'Sesi': 'Pagi',
        'Jantina': 'P',
        'Gred': 'DG48',
        'No Telefon': '016-2233445',
        'Emel': 'chong.siewling@moe.edu.my'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, 'Templat_Senarai_Guru');
    XLSX.writeFile(wb, 'Templat_Import_Guru_Kokurikulum.xlsx');
  };

  const handleConfirmImport = () => {
    if (parsedTeachers.length === 0) return;
    onImportTeachers(parsedTeachers, importMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Import Senarai Guru Sekolah
              </h3>
              <p className="text-xs text-slate-500">
                Muat naik fail Excel (.xlsx, .xls) atau CSV untuk memasukkan senarai guru secara pukal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 w-8 h-8 rounded-full flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Template Download Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-white">
                Perlukan Contoh Format?
              </div>
              <div className="text-[11px] text-slate-500">
                Muat turun templat rasmi sedia ada dengan lajur nama, sesi, gred & No. KP
              </div>
            </div>
            <button
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Muat Turun Templat</span>
            </button>
          </div>

          {/* Upload Drop Area */}
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 rounded-2xl p-6 text-center transition-colors">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
              id="excel-file-input"
            />
            <label
              htmlFor="excel-file-input"
              className="cursor-pointer flex flex-col items-center justify-center"
            >
              <FileSpreadsheet className="w-10 h-10 text-emerald-600 mb-2" />
              <div className="text-xs font-bold text-slate-800 dark:text-white">
                {fileName ? fileName : 'Klik di sini untuk pilih fail Excel atau CSV'}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Menyokong format .xlsx, .xls dan .csv
              </div>
            </label>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Parsed Teachers Preview Table */}
          {parsedTeachers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Dijumpai {parsedTeachers.length} Rekod Guru</span>
                </div>
                
                {/* Import Mode Selector */}
                <div className="flex items-center gap-2 text-xs">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="merge"
                      checked={importMode === 'merge'}
                      onChange={() => setImportMode('merge')}
                      className="text-emerald-600"
                    />
                    <span>Gabung (Tambah Sahaja)</span>
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer ml-2">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-emerald-600"
                    />
                    <span>Ganti Semua Guru</span>
                  </label>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 sticky top-0">
                    <tr>
                      <th className="py-2 px-3">Bil</th>
                      <th className="py-2 px-3">Nama Guru</th>
                      <th className="py-2 px-3">No. KP / Fail</th>
                      <th className="py-2 px-3">Sesi</th>
                      <th className="py-2 px-3">Gred</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {parsedTeachers.slice(0, 50).map((t, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-1.5 px-3 text-slate-400">{i + 1}</td>
                        <td className="py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-200">{t.name}</td>
                        <td className="py-1.5 px-3 font-mono text-slate-500">{t.staffId}</td>
                        <td className="py-1.5 px-3">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            t.session === 'Pagi' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {t.session}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-slate-500">{t.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Batal
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={parsedTeachers.length === 0}
            className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs"
          >
            Sahkan & Import {parsedTeachers.length > 0 ? `(${parsedTeachers.length} Guru)` : ''}
          </button>
        </div>
      </div>
    </div>
  );
};
