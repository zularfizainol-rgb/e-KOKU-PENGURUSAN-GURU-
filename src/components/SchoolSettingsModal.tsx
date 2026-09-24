import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Trash2, 
  Image as ImageIcon, 
  School, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Link as LinkIcon,
  Award,
  Settings as SettingsIcon,
  RefreshCw,
  Eye
} from 'lucide-react';
import { SchoolSettings } from '../types/koku';
import { 
  OFFICIAL_TS25_DATA_URI, 
  DEFAULT_SCHOOL_CREST_DATA_URI, 
  resizeImageToBase64 
} from '../utils/logoAssets';

interface SchoolSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SchoolSettings;
  onSave: (updatedSettings: SchoolSettings) => void;
  onClearAllData?: () => void;
  onResetToSample?: () => void;
}

export const SchoolSettingsModal: React.FC<SchoolSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onClearAllData,
  onResetToSample,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'logo' | 'ts25' | 'data'>('profile');
  const [formData, setFormData] = useState<SchoolSettings>({
    ...settings,
    showTs25Logo: settings.showTs25Logo ?? false,
    schoolLogoUrl: settings.schoolLogoUrl ?? '',
    ts25LogoUrl: settings.ts25LogoUrl ?? '',
    ts25Cohort: settings.ts25Cohort ?? '',
  });

  const [isProcessingSchoolLogo, setIsProcessingSchoolLogo] = useState(false);
  const [isProcessingTs25Logo, setIsProcessingTs25Logo] = useState(false);
  const [urlInputOpen, setUrlInputOpen] = useState(false);
  const [logoUrlTemp, setLogoUrlTemp] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const schoolFileInputRef = useRef<HTMLInputElement>(null);
  const ts25FileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle School Logo file upload
  const handleSchoolLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Sila pilih fail imej yang sah (PNG, JPG, SVG, atau WebP).');
      return;
    }

    try {
      setIsProcessingSchoolLogo(true);
      setUploadError(null);
      const base64 = await resizeImageToBase64(file, 400, 400);
      setFormData(prev => ({ ...prev, schoolLogoUrl: base64 }));
    } catch (err: any) {
      setUploadError(err.message || 'Gagal memproses fail imej');
    } finally {
      setIsProcessingSchoolLogo(false);
      if (schoolFileInputRef.current) schoolFileInputRef.current.value = '';
    }
  };

  // Handle TS25 Logo file upload (custom school TS25 badge)
  const handleTs25LogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Sila pilih fail imej yang sah (PNG, JPG, SVG, atau WebP).');
      return;
    }

    try {
      setIsProcessingTs25Logo(true);
      setUploadError(null);
      const base64 = await resizeImageToBase64(file, 400, 400);
      setFormData(prev => ({ 
        ...prev, 
        ts25LogoUrl: base64,
        showTs25Logo: true 
      }));
    } catch (err: any) {
      setUploadError(err.message || 'Gagal memproses fail imej TS25');
    } finally {
      setIsProcessingTs25Logo(false);
      if (ts25FileInputRef.current) ts25FileInputRef.current.value = '';
    }
  };

  const handleApplyLogoUrl = () => {
    if (!logoUrlTemp.trim()) return;
    setFormData(prev => ({ ...prev, schoolLogoUrl: logoUrlTemp.trim() }));
    setLogoUrlTemp('');
    setUrlInputOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  // Active TS25 logo effective URL: if user uploaded custom logo, use it; otherwise use official TS25 SVG
  const effectiveTs25Logo = formData.ts25LogoUrl || OFFICIAL_TS25_DATA_URI;
  const effectiveSchoolLogo = formData.schoolLogoUrl || DEFAULT_SCHOOL_CREST_DATA_URI;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full my-6 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                Tetapan Sekolah &amp; Identiti Logo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ubah suai profil sekolah, logo rasmi &amp; lencana TS25
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 bg-white dark:bg-slate-900 overflow-x-auto gap-2 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-3 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'profile'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <School className="w-4 h-4" />
            <span>Profil Sekolah</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logo')}
            className={`pb-2.5 px-3 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'logo'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Logo Sekolah</span>
            {formData.schoolLogoUrl && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ts25')}
            className={`pb-2.5 px-3 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'ts25'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Program TS25</span>
            {formData.showTs25Logo && (
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-black">
                AKTIF
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`pb-2.5 px-3 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'data'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Pengurusan Data</span>
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {uploadError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-2xl border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* TAB 1: PROFIL SEKOLAH */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Penuh Sekolah
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: SMK SERI BINTANG UTARA"
                  value={formData.schoolName}
                  onChange={e => setFormData({ ...formData, schoolName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden uppercase"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Kod Sekolah
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: BEA1234"
                    value={formData.schoolCode}
                    onChange={e => setFormData({ ...formData, schoolCode: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Sesi Persekolahan / Tahun
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 2026/2027"
                    value={formData.academicYear}
                    onChange={e => setFormData({ ...formData, academicYear: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama Pengetua / Guru Besar
                </label>
                <input
                  type="text"
                  placeholder="Nama Pengetua / Guru Besar"
                  value={formData.principalName}
                  onChange={e => setFormData({ ...formData, principalName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nama GPK Kokurikulum
                </label>
                <input
                  type="text"
                  placeholder="Nama GPK Kokurikulum"
                  value={formData.gpkKokuName}
                  onChange={e => setFormData({ ...formData, gpkKokuName: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Negeri (JPN)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: SELANGOR / KEDAH / KUALA LUMPUR"
                    value={formData.state}
                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Daerah / Pejabat Pendidikan Daerah (PPD)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: PETALING PERDANA / KOTA SETAR"
                    value={formData.district}
                    onChange={e => setFormData({ ...formData, district: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LOGO SEKOLAH */}
          {activeTab === 'logo' && (
            <div className="space-y-5">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-5">
                {/* Logo Preview Box */}
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 shadow-sm overflow-hidden">
                    <img
                      src={effectiveSchoolLogo}
                      alt="Logo Sekolah"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                  {formData.schoolLogoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, schoolLogoUrl: '' })}
                      className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-1 shadow-md hover:bg-rose-700 transition-colors"
                      title="Padam Logo Khas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {formData.schoolLogoUrl ? 'Logo Khas Sekolah Telah Dimuat Naik' : 'Logo Lalai (Pratetap Lambang Sekolah)'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Logo sekolah akan dipaparkan pada bar navigasi atas, laporan cetakan rasmi A4, serta fail dokumen PDF.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                    {/* Hidden file input */}
                    <input
                      ref={schoolFileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                      onChange={handleSchoolLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => schoolFileInputRef.current?.click()}
                      disabled={isProcessingSchoolLogo}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      <span>{isProcessingSchoolLogo ? 'Memproses Imej...' : 'Pilih Fail Gambar Logo'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUrlInputOpen(!urlInputOpen)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-300 dark:border-slate-700 cursor-pointer transition-colors"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      <span>Masukkan Pautan URL</span>
                    </button>

                    {formData.schoolLogoUrl && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, schoolLogoUrl: '' })}
                        className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Gunakan Lambang Asas</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* URL Input Box if open */}
              {urlInputOpen && (
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex gap-2">
                  <input
                    type="url"
                    placeholder="https://contoh.edu.my/logo-sekolah.png"
                    value={logoUrlTemp}
                    onChange={e => setLogoUrlTemp(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleApplyLogoUrl}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
                  >
                    Guna URL
                  </button>
                </div>
              )}

              {/* Panduan Format Logo */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-300 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Tips Untuk Logo Sekolah Yang Jelas &amp; Cantik:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-emerald-900 dark:text-emerald-200">
                  <li>Gunakan format <b>PNG tanpa latar belakang (transparent background)</b> untuk paparan yang kemas.</li>
                  <li>Sistem akan mengoptimumkan saiz fail secara automatik supaya pantas dan disimpan kekal di peranti anda.</li>
                  <li>Sekolah lain yang ingin menggunakan sistem ini hanya perlu memuat naik logo sekolah masing-masing di bahagian ini.</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: PROGRAM TS25 */}
          {activeTab === 'ts25' && (
            <div className="space-y-5">
              {/* Toggle Switch */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                      Aktifkan Identiti Sekolah TS25
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                      KPM TS25
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Papar logo Program Transformasi Sekolah 2025 di bar navigasi dan kepala surat (letterhead) cetakan rasmi.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={formData.showTs25Logo}
                    onChange={e => setFormData({ ...formData, showTs25Logo: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6.5 bg-slate-300 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {formData.showTs25Logo && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* TS25 Badge & Details */}
                  <div className="bg-indigo-50/60 dark:bg-indigo-950/30 rounded-2xl p-4 border border-indigo-200 dark:border-indigo-900/50 flex flex-col sm:flex-row items-center gap-5">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-800 flex items-center justify-center p-2 shadow-sm shrink-0 overflow-hidden">
                      <img
                        src={effectiveTs25Logo}
                        alt="Logo TS25"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>

                    <div className="flex-1 space-y-2 text-center sm:text-left">
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-200">
                          {formData.ts25LogoUrl ? 'Logo TS25 Khas Sekolah' : 'Logo Rasmi TS25 KPM (Pratetap Vektor)'}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {formData.ts25LogoUrl
                          ? 'Anda menggunakan fail logo TS25 khusus yang dimuat naik sendiri.'
                          : 'Vektor rasmi Program Transformasi Sekolah 2025 KPM berdefinisi tinggi digunakan secara automatik.'}
                      </p>

                      <div className="flex flex-wrap gap-2 pt-1 justify-center sm:justify-start">
                        <input
                          ref={ts25FileInputRef}
                          type="file"
                          accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                          onChange={handleTs25LogoUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => ts25FileInputRef.current?.click()}
                          disabled={isProcessingTs25Logo}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{isProcessingTs25Logo ? 'Memproses...' : 'Muat Naik Logo TS25 Sekolah'}</span>
                        </button>

                        {formData.ts25LogoUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, ts25LogoUrl: '' })}
                            className="px-3 py-1.5 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Kembalikan Logo Rasmi KPM</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cohort input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Kohort TS25 Sekolah (Pilihan)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Kohort 6 / Kohort 7 / Kohort 8"
                      value={formData.ts25Cohort || ''}
                      onChange={e => setFormData({ ...formData, ts25Cohort: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Akan dicetak bersebelahan logo TS25 pada surat dan penyata rasmi kokurikulum.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PENGURUSAN DATA SEKOLAH */}
          {activeTab === 'data' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Penyediaan Sistem Untuk Sekolah Baharu:
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Jika sistem ini ingin diserahkan atau digunakan oleh sekolah lain, gunakan butang di bawah untuk mengosongkan senarai guru contoh sebelum memuat naik data sebenar.
                </p>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  {onClearAllData && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onClearAllData();
                      }}
                      className="flex-1 px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Kosongkan Semua Data Guru (Mula Sebenar)</span>
                    </button>
                  )}
                  {onResetToSample && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onResetToSample();
                      }}
                      className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Muat Semula Data Contoh</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer Save Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Simpan Tetapan Sekolah &amp; Logo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
