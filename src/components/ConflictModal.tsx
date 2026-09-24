import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  X, 
  ArrowRight, 
  ShieldAlert, 
  Search,
  Filter
} from 'lucide-react';
import { ConflictIssue } from '../types/koku';

interface ConflictModalProps {
  conflicts: ConflictIssue[];
  isOpen: boolean;
  onClose: () => void;
  onSelectTeacher: (teacherId: string) => void;
}

export const ConflictModal: React.FC<ConflictModalProps> = ({
  conflicts,
  isOpen,
  onClose,
  onSelectTeacher,
}) => {
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const errorCount = conflicts.filter(c => c.severity === 'error').length;
  const warningCount = conflicts.filter(c => c.severity === 'warning').length;
  const infoCount = conflicts.filter(c => c.severity === 'info').length;

  const filteredConflicts = conflicts.filter(c => {
    if (filterType !== 'ALL' && c.type !== filterType) return false;
    if (searchTerm && !c.teacherName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white ${
              errorCount > 0 ? 'bg-rose-500 shadow-md shadow-rose-500/20' : 'bg-emerald-500'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Penyemak Pertindihan & Pematuhan Kokurikulum
              </h3>
              <p className="text-xs text-slate-500">
                Sistem mengesan pertindihan jawatan utama dan keseimbangan beban tugas guru
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Severity Metrics Bar */}
        <div className="grid grid-cols-3 gap-2 p-3 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 text-xs">
          <button
            onClick={() => setFilterType('DUPLICATE_LEADERSHIP')}
            className={`p-2 rounded-xl text-center transition-all ${
              filterType === 'DUPLICATE_LEADERSHIP'
                ? 'bg-rose-100 dark:bg-rose-950/60 ring-2 ring-rose-500 font-bold text-rose-800 dark:text-rose-200'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="font-extrabold text-rose-600 text-base">{errorCount}</div>
            <div className="text-[11px]">Pertindihan Jawatan</div>
          </button>

          <button
            onClick={() => setFilterType('INCOMPLETE_ASSIGNMENT')}
            className={`p-2 rounded-xl text-center transition-all ${
              filterType === 'INCOMPLETE_ASSIGNMENT'
                ? 'bg-amber-100 dark:bg-amber-950/60 ring-2 ring-amber-500 font-bold text-amber-800 dark:text-amber-200'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="font-extrabold text-amber-600 text-base">{warningCount}</div>
            <div className="text-[11px]">Beban Belum Cukup</div>
          </button>

          <button
            onClick={() => setFilterType('ALL')}
            className={`p-2 rounded-xl text-center transition-all ${
              filterType === 'ALL'
                ? 'bg-emerald-100 dark:bg-emerald-950/60 ring-2 ring-emerald-500 font-bold text-emerald-800 dark:text-emerald-200'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="font-extrabold text-emerald-600 text-base">{conflicts.length}</div>
            <div className="text-[11px]">Semua Semakan</div>
          </button>
        </div>

        {/* Filter & Search */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari guru yang terlibat..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>
          <button
            onClick={() => { setFilterType('ALL'); setSearchTerm(''); }}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Reset
          </button>
        </div>

        {/* Conflict Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredConflicts.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                Syabas! Tiada Pertindihan Dikesan
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Semua agihan jawatan mengikut kriteria yang ditetapkan dan tiada pertindihan kuasa.
              </p>
            </div>
          ) : (
            filteredConflicts.map((issue, idx) => {
              const isError = issue.severity === 'error';
              const isWarning = issue.severity === 'warning';

              return (
                <div
                  key={`${issue.teacherId}-${idx}`}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isError
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                      : isWarning
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                      : 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">
                        {isError ? (
                          <AlertTriangle className="w-4 h-4 text-rose-600" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-4 h-4 text-amber-600" />
                        ) : (
                          <Info className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-slate-900 dark:text-white">
                          {issue.teacherName}
                        </div>
                        <div className={`text-xs font-bold mt-0.5 ${
                          isError ? 'text-rose-700 dark:text-rose-300' : isWarning ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'
                        }`}>
                          {issue.message}
                        </div>

                        {/* Bullet Details */}
                        {issue.details.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {issue.details.map((d, dIdx) => (
                              <li key={dIdx} className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                <span>{d}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => {
                        onSelectTeacher(issue.teacherId);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-700 text-xs font-bold shrink-0 flex items-center gap-1 transition-colors shadow-xs"
                    >
                      <span>Baiki</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>Menyenaraikan peraturan: 1 Ketua/Guru, 1 SU/Guru, 1 Unit/Kategori, 4 Teras Lengkap.</span>
          <button
            onClick={onClose}
            className="px-4 py-2 font-bold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 rounded-xl"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
