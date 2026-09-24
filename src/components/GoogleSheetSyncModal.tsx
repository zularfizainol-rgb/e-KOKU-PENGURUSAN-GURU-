import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  Upload, 
  Download, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  LogOut, 
  ShieldCheck, 
  RefreshCw,
  Sparkles,
  Database,
  Lock,
  Smartphone,
  Layers,
  Check
} from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn, logout, isUserCancelledAuthError, parseAuthError, getAccessToken } from '../services/auth';
import { createNewSpreadsheet, saveAllToGoogleSheet, fetchFromGoogleSheet, extractSheetId } from '../services/googleSheets';
import { Teacher, KokuUnit, UnitAssignment, SchoolSettings } from '../types/koku';
import { exportMatrixToExcel } from '../utils/kokuHelpers';
import { Copy, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface GoogleSheetSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleUser: User | null;
  onUserChange: (user: User | null) => void;
  sheetId: string;
  onSetSheetId: (id: string) => void;
  teachers: Teacher[];
  units: KokuUnit[];
  assignments: UnitAssignment[];
  schoolSettings: SchoolSettings;
  onImportSheetData: (teachers: Teacher[], assignments: UnitAssignment[], customUnits?: KokuUnit[]) => void;
  lastSyncTime?: string | null;
  autoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  onManualSyncNow: () => Promise<void>;
  isSyncing: boolean;
}

export const GoogleSheetSyncModal: React.FC<GoogleSheetSyncModalProps> = ({
  isOpen,
  onClose,
  googleUser,
  onUserChange,
  sheetId,
  onSetSheetId,
  teachers,
  units,
  assignments,
  schoolSettings,
  onImportSheetData,
  lastSyncTime,
  autoSyncEnabled,
  onToggleAutoSync,
  onManualSyncNow,
  isSyncing,
}) => {
  const [inputSheetId, setInputSheetId] = useState(sheetId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);

  if (!isOpen) return null;

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';

  const handleCopyHostname = () => {
    if (navigator.clipboard && currentHostname) {
      navigator.clipboard.writeText(currentHostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        onUserChange(res.user);
        setNeedsReauth(false);
        setStatusMessage({ 
          type: 'success', 
          text: `Log masuk berjaya sebagai ${res.user.displayName || res.user.email}. Akaun Google anda sedia untuk disegerak.` 
        });
      } else {
        setStatusMessage({ 
          type: 'info', 
          text: 'Log masuk dibatalkan atau tetingkap ditutup sebelum selesai. Anda boleh cuba semula bila-bila masa.' 
        });
      }
    } catch (err: unknown) {
      if (isUserCancelledAuthError(err)) {
        setStatusMessage({ 
          type: 'info', 
          text: 'Log masuk dibatalkan atau kebenaran capaian tidak diberikan. Anda boleh cuba semula bila-bila masa.' 
        });
      } else {
        const errorText = parseAuthError(err);
        setStatusMessage({ 
          type: 'error', 
          text: `Gagal log masuk Google: ${errorText}` 
        });
        // Automatically reveal troubleshooting if domain or popup error
        setShowTroubleshoot(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogout = async () => {
    await logout();
    onUserChange(null);
    setNeedsReauth(false);
    setStatusMessage({ type: 'info', text: 'Anda telah log keluar daripada akaun Google.' });
  };

  // Immediate recovery: Re-authenticate and save in one seamless step
  const handleReauthAndSave = async () => {
    setIsLoading(true);
    setStatusMessage({ type: 'info', text: 'Sedang membuka log masuk Google untuk memperbaharui kebenaran...' });
    try {
      const res = await googleSignIn();
      if (res?.user && res.accessToken) {
        onUserChange(res.user);
        setNeedsReauth(false);
        const cleanId = extractSheetId(inputSheetId);
        if (cleanId) {
          setStatusMessage({ type: 'info', text: 'Pengesahan berjaya. Sedang menyimpan data ke Google Sheet...' });
          const result = await saveAllToGoogleSheet(cleanId, teachers, assignments, units, schoolSettings);
          onSetSheetId(cleanId);
          setStatusMessage({
            type: 'success',
            text: `Berjaya! Data telah disimpan ke fail Google Sheet pada ${result.timestamp}! (${teachers.length} guru, ${assignments.length} rekod agihan)`
          });
        } else {
          setStatusMessage({
            type: 'success',
            text: `Log masuk diperbaharui sebagai ${res.user.displayName || res.user.email}. Sila klik Cipta Spreadsheet Baharu atau masukkan ID Sheet.`
          });
        }
      } else {
        setStatusMessage({ type: 'info', text: 'Pengesahan dibatalkan. Sila cuba lagi bila anda bersedia.' });
      }
    } catch (err: unknown) {
      if (!isUserCancelledAuthError(err)) {
        setStatusMessage({ type: 'error', text: parseAuthError(err) });
        setShowTroubleshoot(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!googleUser) {
      setStatusMessage({ 
        type: 'error', 
        text: 'Sila klik butang "Log Masuk Akaun Google" di atas terlebih dahulu untuk membolehkan penciptaan Google Sheet di Google Drive anda.' 
      });
      return;
    }

    let token = await getAccessToken();
    if (!token) {
      // Prompt quick sign-in
      try {
        const res = await googleSignIn();
        if (res?.user && res.accessToken) {
          onUserChange(res.user);
          token = res.accessToken;
        } else {
          setNeedsReauth(true);
          setStatusMessage({ 
            type: 'error', 
            text: 'Sesi keselamatan Google telah tamat tempoh. Sila klik butang "Sambung Semula & Simpan".' 
          });
          return;
        }
      } catch (authErr) {
        setNeedsReauth(true);
        setStatusMessage({ type: 'error', text: parseAuthError(authErr) });
        return;
      }
    }

    setIsLoading(true);
    setStatusMessage({ type: 'info', text: 'Sedang mencipta Google Sheet baharu dalam Google Drive anda...' });
    try {
      const title = `e-Koku GPK Kokurikulum - ${schoolSettings.schoolName} (${schoolSettings.academicYear})`;
      const newId = await createNewSpreadsheet(title);
      setInputSheetId(newId);
      onSetSheetId(newId);

      // Save initial data immediately
      const result = await saveAllToGoogleSheet(newId, teachers, assignments, units, schoolSettings);
      setStatusMessage({
        type: 'success',
        text: `Google Sheet baharu berjaya dicipta di Google Drive anda dan semua ${result.rowsCount} rekod telah disimpan! (ID: ${newId})`
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ralat semasa mencipta Google Sheet';
      if (msg.includes('AUTH_EXPIRED') || msg.includes('401')) {
        setNeedsReauth(true);
        setStatusMessage({
          type: 'error',
          text: 'Sesi keselamatan Google telah tamat tempoh (sesi 1 jam). Sila klik butang "Sambung Semula & Simpan" di bawah.'
        });
      } else {
        setStatusMessage({ type: 'error', text: parseAuthError(err) });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Called when user clicks "Simpan Sekarang ke Google Sheet" in modal footer
  const handleInitiateSave = () => {
    if (!googleUser) {
      setStatusMessage({ 
        type: 'error', 
        text: 'Sila klik butang "Log Masuk Akaun Google" di atas terlebih dahulu untuk menyambungkan Google Drive anda.' 
      });
      return;
    }

    const cleanId = extractSheetId(inputSheetId);
    if (!cleanId) {
      setStatusMessage({ 
        type: 'error', 
        text: 'Sila masukkan Pautan / ID fail Google Sheet sekolah anda, atau klik "+ Cipta Spreadsheet Baharu Automatik" di atas.' 
      });
      return;
    }

    setShowConfirmSave(true);
  };

  const handleSaveToSheetConfirm = async () => {
    setShowConfirmSave(false);
    if (!googleUser) {
      setStatusMessage({ type: 'error', text: 'Sila log masuk akaun Google untuk menyimpan.' });
      return;
    }

    let token = await getAccessToken();
    if (!token) {
      setNeedsReauth(true);
      setStatusMessage({ 
        type: 'error', 
        text: 'Sesi capaian Google telah tamat tempoh keselamatan (sesi 1 jam). Sila klik butang "Sambung Semula & Simpan" di bawah.' 
      });
      return;
    }

    const cleanId = extractSheetId(inputSheetId);
    if (!cleanId) {
      setStatusMessage({ type: 'error', text: 'Sila masukkan pautan atau ID Google Sheet yang sah.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ type: 'info', text: 'Sedang menyimpan dan menyelaraskan ke Google Sheet...' });
    try {
      const result = await saveAllToGoogleSheet(cleanId, teachers, assignments, units, schoolSettings);
      onSetSheetId(cleanId);
      setNeedsReauth(false);
      setStatusMessage({
        type: 'success',
        text: `Data berjaya disimpan ke Google Sheet pada ${result.timestamp}! (${teachers.length} guru, ${assignments.length} agihan unit)`
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ralat semasa menyimpan ke Google Sheet';
      if (msg.includes('AUTH_EXPIRED') || msg.includes('401')) {
        setNeedsReauth(true);
        setStatusMessage({
          type: 'error',
          text: 'Sesi token capaian Google anda telah tamat tempoh (sesi 1 jam). Sila klik butang "Sambung Semula & Simpan" di bawah.'
        });
      } else {
        setStatusMessage({ type: 'error', text: parseAuthError(err) });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePullFromSheet = async () => {
    if (!googleUser) {
      setStatusMessage({ type: 'error', text: 'Sila log masuk akaun Google untuk memuat turun data.' });
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      setNeedsReauth(true);
      setStatusMessage({ 
        type: 'error', 
        text: 'Sesi capaian Google telah tamat tempoh keselamatan (sesi 1 jam). Sila klik butang "Sambung Semula & Simpan" di bawah.' 
      });
      return;
    }

    const cleanId = extractSheetId(inputSheetId);
    if (!cleanId) {
      setStatusMessage({ type: 'error', text: 'Sila masukkan pautan atau ID Google Sheet yang sah.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ type: 'info', text: 'Sedang membaca sebarang kemaskini terbaharu dari Google Sheet...' });
    try {
      const data = await fetchFromGoogleSheet(cleanId, units);
      
      const teacherCount = data.teachers.length;
      const assignCount = data.assignments.length;
      const unitCount = data.customUnits ? data.customUnits.length : 0;

      if (teacherCount > 0 || assignCount > 0) {
        onImportSheetData(data.teachers, data.assignments, data.customUnits);
        onSetSheetId(cleanId);
        setNeedsReauth(false);
        setStatusMessage({
          type: 'success',
          text: `Berjaya memuat turun ${teacherCount} guru, ${assignCount} agihan penugasan${unitCount > 0 ? `, dan ${unitCount} unit` : ''} terus daripada Google Sheet!`
        });
      } else {
        setStatusMessage({
          type: 'info',
          text: 'Google Sheet tersambung, tetapi tiada rekod guru/agihan dijumpai dalam helaian.'
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ralat membaca Google Sheet';
      if (msg.includes('AUTH_EXPIRED') || msg.includes('401')) {
        setNeedsReauth(true);
        setStatusMessage({
          type: 'error',
          text: 'Sesi Google telah tamat tempoh keselamatan. Sila klik butang "Sambung Semula & Simpan" di bawah.'
        });
      } else {
        setStatusMessage({ type: 'error', text: parseAuthError(err) });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportExcelDirect = () => {
    try {
      exportMatrixToExcel(teachers, units, assignments, schoolSettings.schoolName, schoolSettings.academicYear);
      setStatusMessage({
        type: 'success',
        text: 'Fail sandaran Excel (.xlsx) dengan jadual induk dan senarai unit berjaya dimuat turun ke komputer anda!'
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ralat semasa memuat turun fail Excel';
      setStatusMessage({ type: 'error', text: msg });
    }
  };

  const cleanId = extractSheetId(inputSheetId);
  const sheetUrl = cleanId ? `https://docs.google.com/spreadsheets/d/${cleanId}/edit` : '';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shadow-xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Pangkalan Data Google Sheet GPK
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    Akses Kekal & Tiada Had
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Simpan, lihat dan edit data kokurikulum terus di Google Sheet sekolah anda pada bila-bila masa.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Jaminan & Kelebihan Google Sheet */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/50 flex items-start gap-2.5">
              <Database className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">Tiada Had Kuota</h4>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-400 leading-tight mt-0.5">
                  Disimpan dalam Google Drive milik sekolah. Tiada had penggunaan.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/50 flex items-start gap-2.5">
              <Smartphone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-950 dark:text-amber-200">Akses Bila-Bila Masa</h4>
                <p className="text-[11px] text-amber-800 dark:text-amber-400 leading-tight mt-0.5">
                  Buka di telefon pintar, iPad atau komputer untuk semakan & suntingan pantas.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/50 flex items-start gap-2.5">
              <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-blue-950 dark:text-blue-200">Dua Lapisan Simpanan</h4>
                <p className="text-[11px] text-blue-800 dark:text-blue-400 leading-tight mt-0.5">
                  Tersimpan di pelayar & Google Sheet awan. Sifar risiko kehilangan data.
                </p>
              </div>
            </div>
          </div>

          {/* Status Message Banner */}
          {statusMessage && (
            <div className={`mt-4 p-3.5 rounded-2xl text-xs flex flex-col gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : statusMessage.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}>
              <div className="flex items-start gap-2.5">
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                ) : statusMessage.type === 'error' ? (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                ) : (
                  <RefreshCw className="w-4 h-4 shrink-0 text-blue-600 mt-0.5 animate-spin" />
                )}
                <span className="font-medium leading-relaxed">{statusMessage.text}</span>
              </div>

              {needsReauth && (
                <div className="mt-1 pt-2 border-t border-rose-200/80 dark:border-rose-900/60 flex items-center justify-between flex-wrap gap-2">
                  <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                    Sesi token Google telah tamat tempoh keselamatan:
                  </span>
                  <button
                    type="button"
                    onClick={handleReauthAndSave}
                    disabled={isLoading}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>🔑 Sambung Semula &amp; Simpan Sekarang</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Google Auth Status Section */}
          <div className="mt-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            {googleUser ? (
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {googleUser.photoURL ? (
                    <img
                      src={googleUser.photoURL}
                      alt={googleUser.displayName || 'User'}
                      className="w-10 h-10 rounded-full ring-2 ring-emerald-500/30"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                      {googleUser.email?.[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <span>{googleUser.displayName || 'Pengguna Google'}</span>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="text-[11px] text-slate-500">{googleUser.email}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2.5 py-1 rounded-xl">
                    Tersambung
                  </span>
                  <button
                    onClick={handleGoogleLogout}
                    className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl flex items-center gap-1 font-bold cursor-pointer transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Keluar</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-white">
                      Sambungkan Akaun Google Anda
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Log masuk dengan akaun Google untuk membolehkan penyimpanan awan terus ke Google Drive anda.
                    </div>
                  </div>

                  <button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                    <span>Log Masuk Akaun Google</span>
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">💡 Tip Akses:</span> Apabila tetingkap Google dibuka, pastikan anda klik <b>&quot;Benarkan / Allow&quot;</b> untuk membenarkan sistem mencipta & menyimpan fail ke Google Sheet anda. Jika dibatalkan, data anda masih selamat disimpan secara automatik dalam pelayar ini.
                </div>
              </div>
            )}
          </div>

          {/* Bantuan & Panduan Penyelesaian Masalah Sambungan Google Sheet / Vercel */}
          <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/40">
            <button
              type="button"
              onClick={() => setShowTroubleshoot(!showTroubleshoot)}
              className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Panduan Jika Tidak Dapat Sambung ke Google Sheet (Vercel / Firebase)</span>
              </div>
              {showTroubleshoot ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showTroubleshoot && (
              <div className="p-4 pt-1 text-xs space-y-3 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                {/* Punca 1: Authorized Domains Vercel */}
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <span>1. Domain Vercel Belum Didaftarkan (auth/unauthorized-domain)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Jika anda membuka sistem ini melalui pautan Vercel (contoh: <code>https://nama-projek.vercel.app</code>), Google Authentication memerlukan domain Vercel ini dimasukkan ke dalam senarai <b>Authorized Domains</b> di Firebase.
                  </p>
                  {currentHostname && (
                    <div className="mt-2 flex items-center gap-2 flex-wrap bg-white dark:bg-slate-900 p-2 rounded-lg border border-amber-300 dark:border-amber-700">
                      <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200">
                        {currentHostname}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyHostname}
                        className="px-2.5 py-1 text-[10px] font-bold rounded bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copiedDomain ? 'Disalin!' : 'Salin Domain'}</span>
                      </button>
                    </div>
                  )}
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1">
                    Langkah mudah: Buka <b>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains</b> &gt; Klik <b>Add Domain</b> &gt; Tampal domain di atas &gt; Simpan.
                  </p>
                </div>

                {/* Punca 2: Pop-up Disekat */}
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700/50">
                  <div className="font-bold text-slate-900 dark:text-white mb-0.5">
                    2. Pop-up Log Masuk Disekat Pelayar
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Pelayar Google Chrome atau Safari kadangkala menyekat tetingkap timbul (pop-up). Sila klik ikon &quot;Pop-up blocked&quot; di penjuru bar carian pelayar anda dan pilih <b>&quot;Always allow pop-ups&quot;</b>.
                  </p>
                </div>

                {/* Punca 3: Akaun KPM DELIMa vs Akaun Biasa */}
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700/50">
                  <div className="font-bold text-slate-900 dark:text-white mb-0.5">
                    3. Akaun Rasmi KPM DELIMa (@moe-dl.edu.my)
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Sesetengah akaun DELIMa sekolah menyekat kebenaran aplikasi pihak ketiga ke Google Drive. Jika akaun DELIMa gagal, anda disyorkan menggunakan akaun Google peribadi biasa (<code>@gmail.com</code>) untuk pangkalan data Google Sheet sekolah anda.
                  </p>
                </div>

                {/* Jaminan Data Luar Talian */}
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Data Anda Sentiasa Selamat &amp; Boleh Dieksport Bila-bila Masa</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Sistem ini tidak bergantung 100% kepada Google Sheet. Semua data sekolah anda disimpan secara selamat dalam pelayar ini dan anda boleh memuat turun fail sandaran <b>Excel (.xlsx)</b> bila-bila masa melalui butang <b>Eksport Jadual Induk</b> di menu utama!
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sheet ID or URL Input */}
          <div className="mt-4 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Pautan / ID Google Sheet Sekolah
                </label>
                {lastSyncTime && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    Kemaskini terakhir: {lastSyncTime}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputSheetId}
                  onChange={e => setInputSheetId(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/... atau masukkan Sheet ID"
                  className="flex-1 px-3.5 py-2.5 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
                {sheetUrl && (
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
                    title="Buka Google Sheet di tab baharu untuk lihat dan sunting"
                  >
                    <span>Buka Sheet</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Create New Button */}
            <div className="flex items-center justify-between text-xs pt-1 flex-wrap gap-2">
              <span className="text-slate-400">Belum ada fail helaian Google Sheet?</span>
              <button
                onClick={handleCreateNewSheet}
                disabled={isLoading || !googleUser}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Cipta Spreadsheet Baharu Automatik</span>
              </button>
            </div>

            {/* Auto-Sync Toggle */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <span>Auto-Simpan Latar Belakang (Auto-Sync)</span>
                  {autoSyncEnabled && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                      Aktif
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Setiap kali anda menambah guru, unit atau menukar perjawatan, data akan disimpan secara automatik ke Google Sheet.
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleAutoSync(!autoSyncEnabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  autoSyncEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    autoSyncEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Action Buttons: Save to Sheet & Pull from Sheet & Offline Excel */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              <button
                type="button"
                onClick={handleExportExcelDirect}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Muat turun fail sandaran penuh dalam format Microsoft Excel (.xlsx) untuk simpanan luar talian"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Eksport Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={handlePullFromSheet}
                disabled={isLoading}
                className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer"
                title="Jika anda telah mengedit senarai guru atau agihan di Google Sheet, klik ini untuk menyelaraskannya ke sistem"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Segerak Dari Sheet</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleInitiateSave}
              disabled={isLoading}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Simpan Sekarang ke Google Sheet</span>
            </button>
          </div>
        </div>
      </div>

      {/* Explicit User Confirmation Modal for Destructive/Mutating Operation */}
      {showConfirmSave && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-emerald-600 mb-3">
              <FileSpreadsheet className="w-6 h-6" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Pengesahan Kemaskini Google Sheet
              </h3>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Adakah anda ingin menyimpan dan mengemaskini keseluruhan data kokurikulum sekolah ke dalam fail Google Sheet anda?
            </p>

            <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-xs space-y-1.5 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <div className="font-bold text-slate-900 dark:text-white mb-1">Butiran yang akan disimpan:</div>
              <div>• <b>{teachers.length}</b> rekod guru dalam tab <i>Senarai_Guru</i></div>
              <div>• <b>{assignments.length}</b> rekod agihan dalam tab <i>Agihan_Kokurikulum</i></div>
              <div>• <b>{units.length}</b> unit kokurikulum dalam tab <i>Senarai_Unit</i></div>
              <div>• Ringkasan kepimpinan (Ketua &amp; SU) dalam tab <i>Ringkasan_Unit</i></div>
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmSave(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveToSheetConfirm}
                disabled={isLoading}
                className="px-5 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Sahkan Simpan Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
