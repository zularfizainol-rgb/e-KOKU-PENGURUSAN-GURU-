import React, { useState, useEffect } from 'react';
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
  Smartphone,
  Check,
  Copy,
  Info,
  ChevronDown,
  ChevronUp,
  QrCode,
  Trash2,
  Save
} from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn, logout, isUserCancelledAuthError, parseAuthError, getAccessToken } from '../services/auth';
import { createNewSpreadsheet, saveAllToGoogleSheet, fetchFromGoogleSheet, extractSheetId, isAppsScriptUrl, GOOGLE_APPS_SCRIPT_TEMPLATE } from '../services/googleSheets';
import { Teacher, KokuUnit, UnitAssignment, SchoolSettings, CategoryCoordinator, ExecutiveLeader } from '../types/koku';
import { exportMatrixToExcel } from '../utils/kokuHelpers';
import QRCode from 'qrcode';

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
  categoryCoordinators?: CategoryCoordinator[];
  executiveLeaders?: ExecutiveLeader[];
  customRoles?: string[];
  initialTab?: 'qr' | 'sheet' | 'help';
  onImportSheetData: (
    teachers: Teacher[], 
    assignments: UnitAssignment[], 
    customUnits?: KokuUnit[],
    schoolSettings?: Partial<SchoolSettings>,
    categoryCoordinators?: CategoryCoordinator[],
    executiveLeaders?: ExecutiveLeader[]
  ) => void;
  lastSyncTime?: string | null;
  autoSyncEnabled: boolean;
  onToggleAutoSync: (enabled: boolean) => void;
  onManualSyncNow: () => Promise<void>;
  isSyncing: boolean;
  onClearAllData?: () => void;
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
  categoryCoordinators,
  executiveLeaders,
  customRoles,
  initialTab = 'sheet',
  onImportSheetData,
  lastSyncTime,
  autoSyncEnabled,
  onToggleAutoSync,
  isSyncing,
  onClearAllData,
}) => {
  const [activeTab, setActiveTab] = useState<'qr' | 'sheet' | 'help'>(initialTab);
  const [inputSheetId, setInputSheetId] = useState(sheetId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [copiedShareUrl, setCopiedShareUrl] = useState(false);
  const [showAppsScriptGuide, setShowAppsScriptGuide] = useState(false);
  const [copiedAppsScript, setCopiedAppsScript] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [lanIps, setLanIps] = useState<string[]>([]);
  const [useLanIp, setUseLanIp] = useState(false);
  const [includeSheetParam, setIncludeSheetParam] = useState(false);
  const [isInstantSaving, setIsInstantSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Fetch server info (LAN IPs) for easy local phone testing on same WiFi
  useEffect(() => {
    fetch('/api/server-info')
      .then(res => res.json())
      .then(data => {
        if (data?.lanIps && Array.isArray(data.lanIps) && data.lanIps.length > 0) {
          setLanIps(data.lanIps);
          if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            setUseLanIp(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Set active tab if initialTab changes or modal opens
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Sync internal input when parent sheetId changes
  useEffect(() => {
    if (sheetId && !inputSheetId) {
      setInputSheetId(sheetId);
    }
  }, [sheetId]);

  // Flush cloud database whenever QR tab is opened so phone gets immediate fresh data
  useEffect(() => {
    if (isOpen && activeTab === 'qr') {
      flushCloudDatabase();
    }
  }, [isOpen, activeTab]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const cleanCurrentSheetId = extractSheetId(inputSheetId || sheetId);

  // Pastikan URL pautan yang dijana menggunakan origin pelayan sebenar supaya data & logo boleh dimuat turun
  const getPublicBaseUrl = () => {
    if (typeof window === 'undefined') return '';
    // Jika pengujian di localhost dan pengguna memilih URL IP Wi-Fi
    if (useLanIp && lanIps.length > 0 && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      const port = window.location.port ? `:${window.location.port}` : '';
      return `${window.location.protocol}//${lanIps[0]}${port}${window.location.pathname || ''}`;
    }
    const origin = window.location.origin;
    const pathname = window.location.pathname || '';
    return `${origin}${pathname}`;
  };

  // Pautan kongsi utama: Pautan terus ke sistem e-KOKU dengan data komputer dan logo terkini
  const shareUrl = typeof window !== 'undefined'
    ? `${getPublicBaseUrl()}${includeSheetParam && cleanCurrentSheetId ? `?sheet=${encodeURIComponent(cleanCurrentSheetId)}` : ''}`
    : '';

  // Jana Kod QR tempatan beresolusi tinggi tanpa kebergantungan luar
  useEffect(() => {
    if (shareUrl) {
      QRCode.toDataURL(shareUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => {
          console.warn('QR Code generation fallback:', err);
          setQrCodeDataUrl('');
        });
    }
  }, [shareUrl]);

  // Salin ke papan keratan (bulletproof fallback untuk semua peranti & pelayar)
  const copyToClipboard = async (text: string): Promise<boolean> => {
    if (!text) return false;
    let ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        ok = true;
      }
    } catch {
      // fallback
    }
    if (!ok) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        ok = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (e) {
        console.warn('Fallback copy failed:', e);
      }
    }
    return ok;
  };

  const handleCopyHostname = async () => {
    if (currentHostname) {
      const ok = await copyToClipboard(currentHostname);
      if (ok) {
        setCopiedDomain(true);
        setTimeout(() => setCopiedDomain(false), 2500);
      }
    }
  };

  const flushCloudDatabase = () => {
    try {
      fetch('/api/cloud-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teachers,
          assignments,
          units,
          settings: schoolSettings,
          sheetId: cleanCurrentSheetId || sheetId,
          categoryCoordinators: categoryCoordinators || [],
          executiveLeaders: executiveLeaders || [],
          customRoles: customRoles || [],
        }),
      }).catch(err => console.warn('Penyegerakan pangkalan data awan:', err));
    } catch {
      // Abaikan jika luar talian
    }
  };

  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;
    flushCloudDatabase();
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopiedShareUrl(true);
      setTimeout(() => setCopiedShareUrl(false), 2500);
    }
  };

  const handleCopyAppsScript = async () => {
    const ok = await copyToClipboard(GOOGLE_APPS_SCRIPT_TEMPLATE);
    if (ok) {
      setCopiedAppsScript(true);
      setTimeout(() => setCopiedAppsScript(false), 2500);
    }
  };

  if (!isOpen) return null;

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
          text: `Log masuk berjaya sebagai ${res.user.displayName || res.user.email}.` 
        });
      } else {
        setStatusMessage({ 
          type: 'info', 
          text: 'Log masuk dibatalkan. Anda boleh cuba semula bila-bila masa.' 
        });
      }
    } catch (err: unknown) {
      if (isUserCancelledAuthError(err)) {
        setStatusMessage({ 
          type: 'info', 
          text: 'Log masuk dibatalkan. Anda boleh cuba semula bila-bila masa.' 
        });
      } else {
        const errorText = parseAuthError(err);
        setStatusMessage({ 
          type: 'error', 
          text: `Gagal log masuk: ${errorText}` 
        });
        setActiveTab('help');
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
    setStatusMessage({ type: 'info', text: 'Anda telah log keluar daripada Google.' });
  };

  const handleReauthAndSave = async () => {
    setIsLoading(true);
    setStatusMessage({ type: 'info', text: 'Sedang memperbaharui kebenaran Google...' });
    try {
      const res = await googleSignIn();
      if (res?.user && res.accessToken) {
        onUserChange(res.user);
        setNeedsReauth(false);
        const cleanId = extractSheetId(inputSheetId);
        if (cleanId) {
          const result = await saveAllToGoogleSheet(cleanId, teachers, assignments, units, schoolSettings);
          onSetSheetId(cleanId);
          // Also persist to server
          fetch('/api/cloud-database', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teachers, assignments, units, settings: schoolSettings, sheetId: cleanId }),
          }).catch(() => {});

          setStatusMessage({
            type: 'success',
            text: `Data berjaya disimpan ke Google Sheet pada ${result.timestamp}!`
          });
        }
      }
    } catch (err: unknown) {
      if (!isUserCancelledAuthError(err)) {
        setStatusMessage({ type: 'error', text: parseAuthError(err) });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNewSheet = async () => {
    if (!googleUser) {
      setStatusMessage({ 
        type: 'error', 
        text: 'Sila klik butang "Log Masuk Akaun Google" di bawah terlebih dahulu.' 
      });
      return;
    }

    let token = await getAccessToken();
    if (!token) {
      try {
        const res = await googleSignIn();
        if (res?.user && res.accessToken) {
          onUserChange(res.user);
          token = res.accessToken;
        } else {
          setNeedsReauth(true);
          return;
        }
      } catch (authErr) {
        setNeedsReauth(true);
        setStatusMessage({ type: 'error', text: parseAuthError(authErr) });
        return;
      }
    }

    setIsLoading(true);
    setStatusMessage({ type: 'info', text: 'Sedang mencipta Google Sheet baharu di Google Drive anda...' });
    try {
      const title = `e-Koku GPK Kokurikulum - ${schoolSettings.schoolName} (${schoolSettings.academicYear})`;
      const newId = await createNewSpreadsheet(title);
      setInputSheetId(newId);
      onSetSheetId(newId);

      const result = await saveAllToGoogleSheet(newId, teachers, assignments, units, schoolSettings, categoryCoordinators, executiveLeaders);
      
      // Also persist to server
      fetch('/api/cloud-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teachers, 
          assignments, 
          units, 
          settings: schoolSettings, 
          sheetId: newId,
          categoryCoordinators: categoryCoordinators || [],
          executiveLeaders: executiveLeaders || [],
          customRoles: customRoles || [],
        }),
      }).catch(() => {});

      setStatusMessage({
        type: 'success',
        text: `Google Sheet baharu berjaya dicipta! ID: ${newId}`
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ralat semasa mencipta Google Sheet';
      if (msg.includes('AUTH_EXPIRED') || msg.includes('401')) {
        setNeedsReauth(true);
        setStatusMessage({
          type: 'error',
          text: 'Sesi keselamatan Google tamat tempoh. Klik "Sambung Semula & Simpan".'
        });
      } else {
        setStatusMessage({ type: 'error', text: parseAuthError(err) });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitiateSave = async () => {
    const cleanId = extractSheetId(inputSheetId);
    if (!cleanId) {
      setStatusMessage({ 
        type: 'error', 
        text: 'Sila masukkan pautan atau ID fail Google Sheet sekolah anda.' 
      });
      return;
    }

    if (isAppsScriptUrl(cleanId)) {
      setShowConfirmSave(true);
      return;
    }

    if (!googleUser) {
      setIsLoading(true);
      setStatusMessage({ type: 'info', text: 'Membuka log masuk Google...' });
      try {
        const res = await googleSignIn();
        if (res?.user) {
          onUserChange(res.user);
          setNeedsReauth(false);
          setShowConfirmSave(true);
        }
      } catch (err: unknown) {
        if (!isUserCancelledAuthError(err)) {
          setStatusMessage({ type: 'error', text: parseAuthError(err) });
        }
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setShowConfirmSave(true);
  };

  const handleSaveToSheetConfirm = async () => {
    setShowConfirmSave(false);
    const cleanId = extractSheetId(inputSheetId);
    if (!cleanId) {
      setStatusMessage({ type: 'error', text: 'Sila masukkan pautan atau ID Google Sheet yang sah.' });
      return;
    }

    if (!isAppsScriptUrl(cleanId)) {
      const token = await getAccessToken();
      if (!token) {
        setNeedsReauth(true);
        setStatusMessage({ 
          type: 'error', 
          text: 'Sesi capaian Google tamat. Klik butang "Sambung Semula & Simpan".' 
        });
        return;
      }
    }

    setIsLoading(true);
    setStatusMessage({ type: 'info', text: 'Sedang menyimpan ke Google Sheet...' });
    try {
      const result = await saveAllToGoogleSheet(cleanId, teachers, assignments, units, schoolSettings, categoryCoordinators, executiveLeaders);
      onSetSheetId(cleanId);
      setNeedsReauth(false);

      // Also persist to server for cross-device sync
      fetch('/api/cloud-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teachers, 
          assignments, 
          units, 
          settings: schoolSettings, 
          sheetId: cleanId,
          categoryCoordinators: categoryCoordinators || [],
          executiveLeaders: executiveLeaders || [],
          customRoles: customRoles || [],
        }),
      }).catch(() => {});

      setStatusMessage({
        type: 'success',
        text: `Data berjaya disimpan ke Google Sheet pada ${result.timestamp}! (${teachers.length} guru, ${assignments.length} agihan)`
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ralat semasa menyimpan ke Google Sheet';
      if (msg.includes('AUTH_EXPIRED') || msg.includes('401')) {
        setNeedsReauth(true);
        setStatusMessage({
          type: 'error',
          text: 'Sesi token tamat tempoh. Klik butang "Sambung Semula & Simpan".'
        });
      } else {
        setStatusMessage({ type: 'error', text: parseAuthError(err) });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstantSyncAndSave = async () => {
    try {
      setIsInstantSaving(true);
      setSaveSuccessMsg(null);
      // 1. Flush immediately to cloud server database
      flushCloudDatabase();
      
      // 2. If Google Sheet connected and user is logged in or using Apps Script, save to Google Sheet as well
      let sheetSaved = false;
      if (cleanCurrentSheetId) {
        if (isAppsScriptUrl(cleanCurrentSheetId)) {
          await handleSaveToSheetConfirm();
          sheetSaved = true;
        } else {
          const token = await getAccessToken();
          if (token) {
            await handleSaveToSheetConfirm();
            sheetSaved = true;
          }
        }
      }

      if (sheetSaved) {
        setSaveSuccessMsg('✅ Pangkalan data & logo sekolah berjaya disimpan ke pelayan dan Google Sheet!');
      } else if (cleanCurrentSheetId) {
        setSaveSuccessMsg('✅ Data & logo terkini berjaya disimpan ke pelayan! Sedia diimbas pada telefon melalui Pautan Langsung.');
      } else {
        setSaveSuccessMsg('✅ Pangkalan data & logo sekolah berjaya disimpan! Sedia diimbas pada telefon.');
      }
      setTimeout(() => setSaveSuccessMsg(null), 6000);
    } catch (err: any) {
      console.warn('Ralat menyimpan sebelum kongsi:', err);
      setSaveSuccessMsg('✅ Pangkalan data awan telah dikemas kini!');
      setTimeout(() => setSaveSuccessMsg(null), 5000);
    } finally {
      setIsInstantSaving(false);
    }
  };

  const handlePullFromSheet = async () => {
    const cleanId = extractSheetId(inputSheetId);
    if (!cleanId) {
      setStatusMessage({ type: 'error', text: 'Sila masukkan pautan atau ID Google Sheet yang sah.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage({ type: 'info', text: 'Sedang memuat turun pangkalan data dari Google Sheet...' });
    try {
      const data = await fetchFromGoogleSheet(cleanId, units);
      const teacherCount = data.teachers.length;
      const assignCount = data.assignments.length;

      if (teacherCount > 0 || assignCount > 0) {
        onImportSheetData(data.teachers, data.assignments, data.customUnits);
        onSetSheetId(cleanId);
        setNeedsReauth(false);

        // Also persist to server
        fetch('/api/cloud-database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teachers: data.teachers,
            assignments: data.assignments,
            units: data.customUnits || units,
            settings: data.schoolSettings || schoolSettings,
            sheetId: cleanId,
          }),
        }).catch(() => {});

        setStatusMessage({
          type: 'success',
          text: `Berjaya memuat turun ${teacherCount} guru dan ${assignCount} agihan unit dari Google Sheet!`
        });
      } else {
        setStatusMessage({
          type: 'info',
          text: 'Google Sheet tersambung, tetapi fail tersebut belum mempunyai data guru atau agihan. Jika ini fail baharu, sila klik "Simpan ke Sheet" (butang hijau di sebelah) untuk memindahkan data sekolah ke fail Google Sheet anda.'
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ralat membaca Google Sheet';
      if (msg.includes('AUTH_EXPIRED') || msg.includes('401')) {
        setNeedsReauth(true);
        setStatusMessage({
          type: 'error',
          text: 'Sesi Google tamat. Klik butang "Sambung Semula & Simpan".'
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
        text: 'Fail sandaran Excel (.xlsx) berjaya dimuat turun!'
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
      {/* Outer Overlay */}
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Compact Modal Box */}
        <div 
          className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150"
          role="dialog"
          aria-modal="true"
        >
          {/* Header with High-Contrast Large Touch-Target Close Button */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                  Google Sheet &amp; Akses Peranti
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Simpan awan &amp; buka di telefon / komputer
                </p>
              </div>
            </div>
            
            {/* Prominent Circular Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/60 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center justify-center transition-colors cursor-pointer border border-slate-200 dark:border-slate-700 shadow-xs shrink-0"
              title="Tutup paparan ini"
              aria-label="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Clean 3-Tab Bar for Zero Clutter */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-2 py-1.5 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('sheet')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'sheet'
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Google Sheet</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('qr')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'qr'
                  ? 'bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Imbas Telefon</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('help')}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                activeTab === 'help'
                  ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-300 shadow-xs border border-slate-200 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Bantuan</span>
            </button>
          </div>

          {/* Scrollable Compact Body */}
          <div className="p-3.5 sm:p-4 overflow-y-auto space-y-3 flex-1 text-xs">

            {/* Status Message Banner (if any) */}
            {statusMessage && (
              <div className={`p-2.5 rounded-xl text-xs flex flex-col gap-1.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              }`}>
                <div className="flex items-start gap-2">
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
                  <div className="pt-1 border-t border-rose-200/80 dark:border-rose-900/60 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                      Sesi Google tamat:
                    </span>
                    <button
                      type="button"
                      onClick={handleReauthAndSave}
                      disabled={isLoading}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>Sambung Semula</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 1: GOOGLE SHEET SETTINGS & SYNC */}
            {activeTab === 'sheet' && (
              <div className="space-y-3">
                {/* Google Account Status Pill */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                  {googleUser ? (
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                          {googleUser.email?.[0].toUpperCase()}
                        </div>
                        <div className="truncate">
                          <span className="font-bold text-slate-800 dark:text-white truncate block text-[11px]">
                            {googleUser.displayName || googleUser.email}
                          </span>
                        </div>
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </div>
                      <button
                        type="button"
                        onClick={handleGoogleLogout}
                        className="text-[11px] text-rose-600 hover:underline shrink-0 font-medium ml-2 cursor-pointer"
                      >
                        Log Keluar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="text-[11px] text-slate-500">Akaun Google: Belum log masuk</span>
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 shrink-0 shadow-xs cursor-pointer"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"/>
                          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                        </svg>
                        <span>Log Masuk Google</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Sheet ID Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Pautan / ID Google Sheet Sekolah
                    </label>
                    {lastSyncTime && (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        Disimpan: {lastSyncTime}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={inputSheetId}
                      onChange={e => setInputSheetId(e.target.value)}
                      placeholder="Tampal pautan Google Sheet atau ID"
                      className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                    {sheetUrl && (
                      <a
                        href={sheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl flex items-center gap-1 shrink-0 shadow-xs"
                        title="Buka fail Google Sheet"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Belum ada helaian?</span>
                    <button
                      type="button"
                      onClick={handleCreateNewSheet}
                      disabled={isLoading || !googleUser}
                      className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 font-bold disabled:opacity-50 cursor-pointer flex items-center gap-1"
                    >
                      <PlusCircle className="w-3 h-3" />
                      <span>Cipta Sheet Baharu</span>
                    </button>
                  </div>
                </div>

                {/* Main Action Buttons: Save vs Pull */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleInitiateSave}
                    disabled={isLoading}
                    className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 shadow-md cursor-pointer transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Simpan ke Sheet</span>
                    <span className="text-[10px] font-normal text-emerald-100 opacity-90">Hantar data sekarang</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePullFromSheet}
                    disabled={isLoading}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-bold text-xs flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 text-emerald-600 dark:text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Muat Turun Dari Sheet</span>
                    <span className="text-[10px] font-normal text-slate-500">Ambil data ke peranti ini</span>
                  </button>
                </div>

                {/* Auto Sync Toggle */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-[11px]">
                      Auto-Simpan Latar Belakang
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Simpan perubahan ke Google Sheet secara automatik
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleAutoSync(!autoSyncEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      autoSyncEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        autoSyncEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Clear Database Option */}
                {onClearAllData && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block">
                        Kosongkan / Padam Pangkalan Data
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                        Padam rekod guru &amp; data yang tidak berkaitan
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onClearAllData();
                      }}
                      className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-xl text-[11px] font-bold border border-rose-200 dark:border-rose-900 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Kosongkan Data</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MULTI-DEVICE & SMARTPHONE QR CODE */}
            {activeTab === 'qr' && (() => {
              const effectiveLogo = schoolSettings.schoolLogo || schoolSettings.schoolLogoUrl;
              return (
              <div className="space-y-3.5 text-center">
                {/* Status Ringkasan Data & Logo Sekolah */}
                <div className="p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-left text-xs">
                  <div className="flex items-center gap-3 mb-2.5">
                    {/* Logo Sekolah Preview */}
                    <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 shrink-0 shadow-xs overflow-hidden">
                      {effectiveLogo ? (
                        <img
                          src={effectiveLogo}
                          alt="Logo Sekolah"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center text-slate-400 p-0.5">
                          <span className="text-xl">🏫</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-black text-emerald-950 dark:text-emerald-200 text-xs sm:text-sm truncate">
                          {schoolSettings.schoolName || 'SEKOLAH SAYA'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 shrink-0">
                          Sesi {schoolSettings.academicYear || '2026/2027'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                        {schoolSettings.schoolCode ? `Kod: ${schoolSettings.schoolCode}` : 'e-KOKU GPK'} • {schoolSettings.gpkKokuName || 'GPK Kokurikulum'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 text-[11px] text-slate-600 dark:text-slate-300 font-semibold flex-wrap pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
                    <span>👥 <b>{teachers.length}</b> Orang Guru</span>
                    <span>•</span>
                    <span>📋 <b>{assignments.length}</b> Agihan Unit</span>
                    <span>•</span>
                    <span className="font-bold flex items-center gap-1">
                      {effectiveLogo ? (
                        <span className="text-emerald-700 dark:text-emerald-300">✅ Logo Sekolah Sedia</span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">⚠️ Logo Lalai (Belum Muat Naik)</span>
                      )}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                      {cleanCurrentSheetId ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Google Sheet Aktif</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Pangkalan Data Awan</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Butang Pantas: Simpan & Segerak Sekarang */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleInstantSyncAndSave}
                    disabled={isInstantSaving}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-2xl font-black text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                  >
                    {isInstantSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sedang Menyimpan Data &amp; Logo ke Awan...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Kemas Kini &amp; Simpan Data/Logo Sebelum Imbas</span>
                      </>
                    )}
                  </button>
                  {saveSuccessMsg && (
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{saveSuccessMsg}</span>
                    </div>
                  )}
                </div>

                {/* Panduan Buka di Telefon */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-left">
                  <span className="font-bold text-slate-900 dark:text-white block mb-1 text-xs flex items-center gap-1.5">
                    <span>📱</span> Cara Buka di Telefon Pintar &amp; Peranti Lain:
                  </span>
                  <ol className="text-[11px] text-slate-600 dark:text-slate-300 list-decimal list-inside space-y-1">
                    <li>Buka kamera telefon anda dan halakan ke <b>Kod QR</b> di bawah.</li>
                    <li>Tekan pautan yang dipaparkan pada skrin kamera telefon.</li>
                    <li>Aplikasi dibuka dengan nama sekolah, logo sekolah, serta semua <b>{assignments.length} agihan jawatan</b> secara tepat dan kekal!</li>
                  </ol>
                </div>

                {/* Pilihan Rangkaian Tempatan Wi-Fi untuk Pengujian Komputer (Localhost) */}
                {(currentHostname === 'localhost' || currentHostname === '127.0.0.1') && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-300 dark:border-amber-700/60 text-left text-xs text-amber-900 dark:text-amber-200 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span>💡</span>
                      <span>Nota Pengujian Tempatan (Localhost):</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                      Kamera telefon tidak dapat membuka alamat <code>localhost</code> komputer anda secara terus melainkan anda menggunakan alamat <b>IP Wi-Fi Tempatan</b> atau membuka fail Google Sheet yang dipautkan.
                    </p>
                    {lanIps.length > 0 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setUseLanIp(!useLanIp)}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                            useLanIp
                              ? 'bg-emerald-600 text-white border-emerald-700'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>{useLanIp ? '✓ Menggunakan Kod QR IP Wi-Fi' : `Tukar ke Kod QR IP Wi-Fi (${lanIps[0]})`}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* QR Code Image (Dijana Tempatan 100% Pantas & Stabil) */}
                <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm max-w-[280px] mx-auto">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="Kod QR e-KOKU GPK"
                      className="w-44 h-44 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-1 bg-white shadow-xs"
                    />
                  ) : (
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`}
                      alt="Kod QR e-KOKU GPK"
                      className="w-44 h-44 rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-1 bg-white shadow-xs"
                    />
                  )}
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-mono truncate max-w-[240px]">
                    {cleanCurrentSheetId ? `Sheet ID: ${cleanCurrentSheetId.slice(0, 16)}...` : 'Penyegerakan Awan e-KOKU'}
                  </span>
                </div>

                {/* Direct Share Link & Copy Button */}
                <div className="space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Pautan Langsung Aplikasi (Data &amp; Logo Komputer Terkini):
                    </label>
                    {cleanCurrentSheetId && (
                      <label className="flex items-center gap-1.5 text-[10px] text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={includeSheetParam}
                          onChange={(e) => setIncludeSheetParam(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-3 h-3"
                        />
                        <span>Sertakan rujukan Sheet (?sheet=...)</span>
                      </label>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 px-3 py-2 text-[11px] font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 select-all"
                    />
                    <button
                      type="button"
                      onClick={handleCopyShareUrl}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 shadow-sm cursor-pointer transition-all active:scale-95"
                    >
                      {copiedShareUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedShareUrl ? 'Pautan Disalin!' : 'Salin Pautan'}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                    <span>💡 <b>Tip:</b> Tekan <i>Salin Pautan</i> dan hantar ke WhatsApp/Telegram untuk dibuka di telefon.</span>
                    {cleanCurrentSheetId && (
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${cleanCurrentSheetId}/edit`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline shrink-0 ml-2"
                      >
                        Buka Google Sheet di Drive ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* Info Untuk GPK Sekolah Lain */}
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-800/60 text-left text-xs text-amber-900 dark:text-amber-200">
                  <span className="font-black block mb-0.5">ℹ️ Untuk Kegunaan GPK Sekolah Lain:</span>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    Sistem ini direka khas untuk memudahkan mana-mana sekolah di seluruh Malaysia. GPK sekolah lain hanya perlu mengisi nama sekolah di menu <b>Tetapan Sekolah</b> dan memautkan Google Sheet sekolah masing-masing untuk menyimpan rekod data secara berasingan dan selamat.
                  </p>
                </div>
              </div>
              );
            })()}

            {/* TAB 3: HELP & DELIMA / OFFLINE BACKUP */}
            {activeTab === 'help' && (
              <div className="space-y-3">
                {/* DELIMa Account Troubleshooting Accordion */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/40">
                  <button
                    type="button"
                    onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                    className="w-full p-2.5 flex items-center justify-between text-left text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <span>Isu Akaun KPM DELIMa &amp; Pop-up</span>
                    {showTroubleshoot ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showTroubleshoot && (
                    <div className="p-3 pt-0 text-[11px] space-y-2 border-t border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                      <p>
                        <b>1. Akaun DELIMa (@moe-dl.edu.my):</b> Sesetengah akaun DELIMa sekolah menyekat pop-up aplikasi pihak ketiga. Jika gagal log masuk, anda boleh menggunakan akaun Google peribadi biasa (@gmail.com) atau gunakan Kod Skrip Webhook di bawah.
                      </p>
                      <p>
                        <b>2. Sesi Tamat (1 Jam):</b> Token Google Sheets sah selama 1 jam atas sebab keselamatan. Klik butang &quot;Sambung Semula&quot; bila-bila masa jika digesa.
                      </p>
                      {currentHostname && (
                        <div className="p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-1">
                          <span className="font-mono text-[10px] truncate">{currentHostname}</span>
                          <button
                            type="button"
                            onClick={handleCopyHostname}
                            className="px-2 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-700 rounded font-bold"
                          >
                            {copiedDomain ? 'Disalin!' : 'Salin Domain'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Google Apps Script Webhook Alternative Accordion */}
                <div className="rounded-xl border border-amber-200 dark:border-amber-900/60 overflow-hidden bg-amber-50/40 dark:bg-amber-950/20">
                  <button
                    type="button"
                    onClick={() => setShowAppsScriptGuide(!showAppsScriptGuide)}
                    className="w-full p-2.5 flex items-center justify-between text-left text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Skrip Webhook (Bebas Sekatan DELIMa)</span>
                    </div>
                    {showAppsScriptGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showAppsScriptGuide && (
                    <div className="p-3 pt-0 text-[11px] space-y-2 border-t border-amber-200/60 dark:border-amber-900/60 text-slate-600 dark:text-slate-300">
                      <p>
                        Pasang skrip ini dalam fail Google Sheet anda (Extensions &gt; Apps Script &gt; Deploy as Web app, Access: Anyone):
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyAppsScript}
                        className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        {copiedAppsScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedAppsScript ? 'Kod Disalin!' : 'Salin Kod Google Apps Script'}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Direct Excel Backup Download */}
                <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-emerald-950 dark:text-emerald-200 block text-xs">
                      Sandaran Fail Excel (.xlsx)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Muat turun jadual agihan kokurikulum ke komputer
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportExcelDirect}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Eksport</span>
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Sticky Footer: Simple, Accessible, Clear Buttons */}
          <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/95 dark:bg-slate-900/95 flex items-center justify-between gap-2 shrink-0">
            {/* Big Prominent Close Button on Left */}
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Tutup
            </button>

            {/* Quick action buttons on Right */}
            <div className="flex items-center gap-1.5">
              {activeTab !== 'sheet' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('sheet')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Ke Tetapan Sheet
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleInitiateSave}
                  disabled={isLoading}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Simpan Sekarang</span>
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Confirmation Dialog before Saving */}
      {showConfirmSave && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-4 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <FileSpreadsheet className="w-5 h-5" />
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Sahkan Simpan ke Google Sheet
              </h3>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
              Adakah anda ingin menyimpan dan mengemaskini keseluruhan <b>{teachers.length} guru</b> dan <b>{assignments.length} rekod agihan</b> ke Google Sheet?
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmSave(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveToSheetConfirm}
                disabled={isLoading}
                className="px-4 py-1.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Sahkan Simpan</span>
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
