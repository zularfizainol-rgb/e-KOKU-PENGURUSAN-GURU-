import React from 'react';
import { 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  FileSpreadsheet, 
  Upload, 
  Printer, 
  Sun, 
  Sunset, 
  RefreshCw,
  Sparkles,
  School,
  ExternalLink,
  Trash2,
  AlertCircle,
  Image as ImageIcon
} from 'lucide-react';
import { SchoolSettings, ConflictIssue, Teacher, SessionType } from '../types/koku';
import { User } from 'firebase/auth';
import { processImageUpload, OFFICIAL_TS25_LOGO_SVG } from '../utils/logoHelpers';

interface NavbarProps {
  settings: SchoolSettings;
  onUpdateSettings: (settings: SchoolSettings) => void;
  teachers: Teacher[];
  conflicts: ConflictIssue[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenConflicts: () => void;
  onOpenGoogleSheet: () => void;
  onOpenImport: () => void;
  onExportExcel: () => void;
  onOpenPrint: () => void;
  googleUser: User | null;
  sheetId: string;
  isSyncing: boolean;
  syncStatus?: 'idle' | 'saving' | 'saved' | 'error';
  lastSyncTime?: string | null;
  onManualSyncNow?: () => void;
  onClearAllData?: () => void;
  onResetToSample?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  settings,
  onUpdateSettings,
  teachers,
  conflicts,
  activeTab,
  setActiveTab,
  onOpenConflicts,
  onOpenGoogleSheet,
  onOpenImport,
  onExportExcel,
  onOpenPrint,
  googleUser,
  sheetId,
  isSyncing,
  syncStatus = 'idle',
  lastSyncTime,
  onManualSyncNow,
  onClearAllData,
  onResetToSample,
}) => {
  const [showSettingsModal, setShowSettingsModal] = React.useState(false);
  const [tempSettings, setTempSettings] = React.useState(settings);
  const [isUploadingLogo, setIsUploadingLogo] = React.useState(false);
  const [logoErrorMessage, setLogoErrorMessage] = React.useState<string | null>(null);

  const schoolLogoInputRef = React.useRef<HTMLInputElement>(null);
  const ts25LogoInputRef = React.useRef<HTMLInputElement>(null);

  // Sync tempSettings whenever modal opens
  const handleOpenSettingsModal = () => {
    setTempSettings(settings);
    setLogoErrorMessage(null);
    setShowSettingsModal(true);
  };

  const handleSchoolLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingLogo(true);
      setLogoErrorMessage(null);
      const dataUrl = await processImageUpload(file, 400, 400);
      setTempSettings(prev => ({ ...prev, schoolLogo: dataUrl }));
    } catch (err: any) {
      setLogoErrorMessage(err?.message || 'Gagal memproses gambar logo sekolah');
    } finally {
      setIsUploadingLogo(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleTs25LogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingLogo(true);
      setLogoErrorMessage(null);
      const dataUrl = await processImageUpload(file, 400, 400);
      setTempSettings(prev => ({ ...prev, ts25Logo: dataUrl }));
    } catch (err: any) {
      setLogoErrorMessage(err?.message || 'Gagal memproses gambar logo TS25');
    } finally {
      setIsUploadingLogo(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleApplyOfficialTs25Logo = () => {
    setTempSettings(prev => ({ ...prev, ts25Logo: OFFICIAL_TS25_LOGO_SVG }));
    setLogoErrorMessage(null);
  };

  const handleRemoveSchoolLogo = () => {
    setTempSettings(prev => ({ ...prev, schoolLogo: undefined }));
  };

  const handleRemoveTs25Logo = () => {
    setTempSettings(prev => ({ ...prev, ts25Logo: undefined }));
  };

  const morningTeachers = teachers.filter(t => t.session === 'Pagi').length;
  const afternoonTeachers = teachers.filter(t => t.session === 'Petang').length;
  const errorConflicts = conflicts.filter(c => c.severity === 'error');

  const navTabs = [
    { id: 'master', label: 'Jadual Keseluruhan', icon: '📊', shortLabel: 'Keseluruhan' },
    { id: 'BERUNIFORM', label: 'Unit Beruniform', icon: '🛡️', shortLabel: 'Beruniform' },
    { id: 'KELAB', label: 'Kelab & Persatuan', icon: '🎨', shortLabel: 'Kelab' },
    { id: 'SUKAN', label: 'Sukan & Permainan', icon: '⚽', shortLabel: 'Sukan' },
    { id: 'RUMAH_SUKAN', label: 'Rumah Sukan', icon: '🏆', shortLabel: 'Rumah' },
    { id: 'PEMBANGUNAN', label: 'Pembangunan & Khas', icon: '🚀', shortLabel: 'Pembangunan' },
    { id: 'statistik', label: 'Statistik & Analisis Sesi', icon: '📈', shortLabel: 'Statistik' },
  ];

  return (
    <>
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        {/* Top Info Bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          {/* Logo & School Title */}
          <div className="flex items-center gap-3">
            {settings.schoolLogo ? (
              <img
                src={settings.schoolLogo}
                alt="Logo Sekolah"
                onClick={handleOpenSettingsModal}
                className="w-10 h-10 sm:w-11 sm:h-11 object-contain rounded-xl bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700 shadow-md shadow-emerald-500/10 cursor-pointer shrink-0 hover:scale-105 transition-transform"
                title="Klik untuk ubah maklumat & muat naik logo sekolah"
              />
            ) : (
              <div 
                onClick={handleOpenSettingsModal}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0 cursor-pointer hover:scale-105 transition-transform"
                title="Klik untuk ubah maklumat sekolah & muat naik logo"
              >
                <School className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs px-2 py-0.5 rounded-full font-bold tracking-wide">
                  e-KOKU GPK
                </span>
                {settings.ts25Logo && (
                  <span 
                    onClick={handleOpenSettingsModal}
                    className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-bold border border-amber-200 dark:border-amber-800/60 cursor-pointer hover:bg-amber-100 transition-colors"
                    title="Sekolah TS25 (Klik untuk urus)"
                  >
                    <img src={settings.ts25Logo} alt="TS25" className="w-3.5 h-3.5 object-contain rounded-xs" />
                    <span>TS25</span>
                  </span>
                )}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {settings.academicYear}
                </span>
              </div>
              <h1 
                onClick={handleOpenSettingsModal}
                className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-slate-100 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer flex items-center gap-1.5 transition-colors"
                title="Klik untuk ubah maklumat sekolah"
              >
                <span>{settings.schoolName}</span>
                <span className="text-xs text-slate-400 font-normal hidden md:inline">✎ Kemaskini</span>
              </h1>
            </div>
          </div>

          {/* Quick Metrics & Action Controls */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Quick Sesi Badges */}
            <div className="hidden lg:flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Sun className="w-3.5 h-3.5" />
                <span>Pagi: <b>{morningTeachers}</b></span>
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                <Sunset className="w-3.5 h-3.5" />
                <span>Petang: <b>{afternoonTeachers}</b></span>
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-200">
                <Users className="w-3.5 h-3.5" />
                <span>Jumlah: <b>{teachers.length}</b></span>
              </span>
            </div>

            {/* Conflict Alert Button */}
            <button
              onClick={onOpenConflicts}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                errorConflicts.length > 0
                  ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse shadow-xs shadow-rose-500/20'
                  : conflicts.length > 0
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              }`}
            >
              {errorConflicts.length > 0 ? (
                <>
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorConflicts.length} Pertindihan!</span>
                </>
              ) : conflicts.length > 0 ? (
                <>
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{conflicts.length} Semakan</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Tiada Pertindihan</span>
                </>
              )}
            </button>

            {/* Google Sheet Cloud Sync Button with Live Status */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenGoogleSheet}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  sheetId
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 shadow-xs'
                    : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 shadow-xs'
                }`}
                title={
                  sheetId 
                    ? `Google Sheet Tersambung (ID: ${sheetId})${lastSyncTime ? ` - Kemaskini: ${lastSyncTime}` : ''}`
                    : 'Sambungkan Google Sheet untuk simpanan kekal & tiada had'
                }
              >
                <FileSpreadsheet className={`w-4 h-4 ${sheetId ? 'text-emerald-600 dark:text-emerald-400' : 'text-white'} ${syncStatus === 'saving' || isSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {sheetId 
                    ? (syncStatus === 'saving' ? 'Menyimpan...' : 'Google Sheet')
                    : 'Sambung Google Sheet'}
                </span>
                {sheetId ? (
                  <span className={`w-2 h-2 rounded-full ${syncStatus === 'saving' ? 'bg-amber-500 animate-ping' : 'bg-emerald-500'}`} />
                ) : (
                  <span className="hidden sm:inline text-[10px] bg-emerald-500/80 px-1.5 py-0.2 rounded-full">Awan</span>
                )}
              </button>

              {sheetId && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-400 bg-slate-100 dark:bg-slate-800/90 hover:bg-emerald-50 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  title="Buka Google Sheet di tab baharu untuk lihat dan sunting"
                >
                  <span>Buka Sheet</span>
                  <ExternalLink className="w-3 h-3 text-slate-400" />
                </a>
              )}
            </div>

            {/* Import Button */}
            <button
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
              title="Import senarai guru daripada Excel atau CSV"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import Excel</span>
            </button>

            {/* Export Excel Button */}
            <button
              onClick={onExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors"
              title="Muat turun fail Excel agihan penuh"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Eksport Excel</span>
            </button>

            {/* Print / PDF Button */}
            <button
              onClick={onOpenPrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
              title="Cetak Laporan Rasmi / Muat Turun PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / PDF</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 flex items-center overflow-x-auto no-scrollbar gap-1 border-t border-slate-100 dark:border-slate-800/80">
          {navTabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* School Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/80 dark:bg-slate-800/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold shrink-0">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Maklumat Sekolah &amp; Pengurusan
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Konfigurasi logo sekolah, lencana TS25, maklumat institusi &amp; pentadbiran kokurikulum
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-sm">
              {/* Alert / Error message */}
              {logoErrorMessage && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{logoErrorMessage}</span>
                </div>
              )}

              {/* 1. SEKSYEN LOGO SEKOLAH & TS25 */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    1. Logo &amp; Lencana Rasmi Sekolah
                  </span>
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card 1: Upload Logo Sekolah */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <School className="w-4 h-4 text-emerald-600" />
                          <span>Logo Rasmi Sekolah</span>
                        </span>
                        {tempSettings.schoolLogo ? (
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800">
                            Aktif
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Belum dimuat naik</span>
                        )}
                      </div>

                      {/* Logo Preview Frame */}
                      <div className="flex items-center gap-3.5 mb-3">
                        <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center p-1.5 shrink-0 shadow-xs overflow-hidden">
                          {tempSettings.schoolLogo ? (
                            <img
                              src={tempSettings.schoolLogo}
                              alt="Logo Sekolah"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-center text-slate-400 p-1">
                              <School className="w-7 h-7 mx-auto mb-0.5 opacity-40 text-emerald-600" />
                              <span className="text-[9px] font-medium leading-none block">Tiada Logo</span>
                            </div>
                          )}
                        </div>

                        <div className="text-xs space-y-1">
                          <p className="text-slate-700 dark:text-slate-300 font-semibold leading-tight">
                            {tempSettings.schoolLogo ? 'Lencana sekolah anda siap dipaparkan.' : 'Muat naik fail logo / lencana sekolah.'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Disyorkan: Format PNG lutsinar atau JPG (saiz automatik diselaraskan).
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center gap-2">
                      <input
                        type="file"
                        ref={schoolLogoInputRef}
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={handleSchoolLogoUpload}
                      />
                      <button
                        type="button"
                        onClick={() => schoolLogoInputRef.current?.click()}
                        disabled={isUploadingLogo}
                        className="flex-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{tempSettings.schoolLogo ? 'Tukar Logo' : 'Upload Logo Sekolah'}</span>
                      </button>

                      {tempSettings.schoolLogo && (
                        <button
                          type="button"
                          onClick={handleRemoveSchoolLogo}
                          className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                          title="Padam logo sekolah"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card 2: Upload Logo TS25 */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-amber-500" />
                          <span>Logo TS25 (Transformasi)</span>
                        </span>
                        {tempSettings.ts25Logo ? (
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800">
                            Aktif
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Pilihan</span>
                        )}
                      </div>

                      {/* Logo Preview Frame */}
                      <div className="flex items-center gap-3.5 mb-3">
                        <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center p-1.5 shrink-0 shadow-xs overflow-hidden">
                          {tempSettings.ts25Logo ? (
                            <img
                              src={tempSettings.ts25Logo}
                              alt="Logo TS25"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="text-center text-slate-400 p-1">
                              <Sparkles className="w-7 h-7 mx-auto mb-0.5 opacity-40 text-amber-500" />
                              <span className="text-[9px] font-medium leading-none block">Tiada TS25</span>
                            </div>
                          )}
                        </div>

                        <div className="text-xs space-y-1">
                          <p className="text-slate-700 dark:text-slate-300 font-semibold leading-tight">
                            {tempSettings.ts25Logo ? 'Lencana TS25 aktif pada laporan cetakan.' : 'Program Transformasi Sekolah 2025.'}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Upload logo sekolah anda atau guna logo rasmi KPM.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={ts25LogoInputRef}
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="hidden"
                          onChange={handleTs25LogoUpload}
                        />
                        <button
                          type="button"
                          onClick={() => ts25LogoInputRef.current?.click()}
                          disabled={isUploadingLogo}
                          className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{tempSettings.ts25Logo ? 'Tukar Logo' : 'Upload Logo TS25'}</span>
                        </button>

                        {tempSettings.ts25Logo && (
                          <button
                            type="button"
                            onClick={handleRemoveTs25Logo}
                            className="p-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer"
                            title="Padam logo TS25"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleApplyOfficialTs25Logo}
                        className="w-full px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 border border-amber-200 dark:border-amber-800/70 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Gunakan Logo Rasmi TS25 KPM</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. SEKSYEN MAKLUMAT SEKOLAH & SESI */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    2. Butiran Institusi Sekolah
                  </span>
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Nama Rasmi Sekolah
                    </label>
                    <input
                      type="text"
                      value={tempSettings.schoolName}
                      onChange={e => setTempSettings({ ...tempSettings, schoolName: e.target.value })}
                      placeholder="Contoh: SK TAMAN INDAH"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Kod Sekolah
                      </label>
                      <input
                        type="text"
                        value={tempSettings.schoolCode}
                        onChange={e => setTempSettings({ ...tempSettings, schoolCode: e.target.value })}
                        placeholder="Contoh: WBA0001"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Sesi Persekolahan
                      </label>
                      <input
                        type="text"
                        value={tempSettings.academicYear}
                        onChange={e => setTempSettings({ ...tempSettings, academicYear: e.target.value })}
                        placeholder="Contoh: 2026/2027"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Negeri
                      </label>
                      <input
                        type="text"
                        value={tempSettings.state}
                        onChange={e => setTempSettings({ ...tempSettings, state: e.target.value })}
                        placeholder="Contoh: Selangor"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Daerah / PPD
                      </label>
                      <input
                        type="text"
                        value={tempSettings.district}
                        onChange={e => setTempSettings({ ...tempSettings, district: e.target.value })}
                        placeholder="Contoh: Petaling Perdana"
                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. SEKSYEN PENTADBIRAN KOKURIKULUM */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    3. Pengurusan &amp; Pentadbir
                  </span>
                  <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Nama Pengetua / Guru Besar
                    </label>
                    <input
                      type="text"
                      value={tempSettings.principalName}
                      onChange={e => setTempSettings({ ...tempSettings, principalName: e.target.value })}
                      placeholder="Nama penuh Pengetua / Guru Besar"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Nama GPK Kokurikulum
                    </label>
                    <input
                      type="text"
                      value={tempSettings.gpkKokuName}
                      onChange={e => setTempSettings({ ...tempSettings, gpkKokuName: e.target.value })}
                      placeholder="Nama penuh GPK Kokurikulum"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* 4. SEKSYEN PENGURUSAN DATA SEKOLAH */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  4. Tetapan Data
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  {onClearAllData && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsModal(false);
                        onClearAllData();
                      }}
                      className="flex-1 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 rounded-xl border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer text-center"
                    >
                      Kosongkan Data (Mula Data Sebenar)
                    </button>
                  )}
                  {onResetToSample && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowSettingsModal(false);
                        onResetToSample();
                      }}
                      className="px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer text-center"
                    >
                      Muat Semula Contoh
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5 bg-slate-50/80 dark:bg-slate-800/60 shrink-0">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateSettings(tempSettings);
                  setShowSettingsModal(false);
                }}
                className="px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
