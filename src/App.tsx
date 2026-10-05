/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User } from 'firebase/auth';
import { 
  DEFAULT_TEACHERS, 
  DEFAULT_UNITS, 
  DEFAULT_ASSIGNMENTS, 
  DEFAULT_SCHOOL_SETTINGS,
  SAMPLE_TEACHERS,
  SAMPLE_ASSIGNMENTS
} from './data/defaultData';
import { 
  Teacher, 
  KokuUnit, 
  UnitAssignment, 
  SchoolSettings, 
  RoleType, 
  SessionType, 
  UnitCategory, 
  ConflictIssue,
  CategoryCoordinator,
  CoordinatorSessionType,
  ExecutiveRoleType,
  ExecutiveLeader
} from './types/koku';
import { detectTeacherConflicts, exportMatrixToExcel, isValidTeacherName } from './utils/kokuHelpers';
import { initAuth } from './services/auth';
import { saveAllToGoogleSheet, fetchFromGoogleSheet, extractSheetId } from './services/googleSheets';

import { Navbar } from './components/Navbar';
import { MasterTableView } from './components/MasterTableView';
import { UnitManagerView } from './components/UnitManagerView';
import { SessionStatsView } from './components/SessionStatsView';
import { ConflictModal } from './components/ConflictModal';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { PrintReportModal } from './components/PrintReportModal';
import { AppointmentLetterModal } from './components/AppointmentLetterModal';
import { EditTeacherModal } from './components/EditTeacherModal';
import { Trash2, Sparkles, Smartphone } from 'lucide-react';

interface InitialDataShape {
  teachers?: Teacher[];
  assignments?: UnitAssignment[];
  units?: KokuUnit[];
  settings?: SchoolSettings;
  sheetId?: string;
  categoryCoordinators?: CategoryCoordinator[];
  customRoles?: string[];
  executiveLeaders?: ExecutiveLeader[];
}

const getInitialCloudData = (): InitialDataShape | null => {
  if (typeof window !== 'undefined' && (window as unknown as { __INITIAL_DATA__?: InitialDataShape }).__INITIAL_DATA__) {
    return (window as unknown as { __INITIAL_DATA__: InitialDataShape }).__INITIAL_DATA__;
  }
  return null;
};

export default function App() {
  const initialData = getInitialCloudData();

  // State from Server Injected Data, LocalStorage, or Defaults
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    if (initialData?.teachers && Array.isArray(initialData.teachers) && initialData.teachers.length > 0) {
      const cleaned = initialData.teachers.filter(t => t && t.name && isValidTeacherName(t.name));
      if (cleaned.length > 0) return cleaned;
    }
    const saved = localStorage.getItem('ekoku_teachers');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter(t => t && t.name && isValidTeacherName(t.name));
          if (cleaned.length > 0) return cleaned;
        }
      } catch (e) {
        console.warn('Gagal membaca teachers tempatan:', e);
      }
    }
    return DEFAULT_TEACHERS;
  });

  const [units, setUnits] = useState<KokuUnit[]>(() => {
    let baseUnits = DEFAULT_UNITS;
    if (initialData?.units && Array.isArray(initialData.units) && initialData.units.length > 0) {
      baseUnits = initialData.units;
    } else {
      const saved = localStorage.getItem('ekoku_units');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            baseUnits = parsed;
          }
        } catch (e) {
          console.warn('Gagal membaca ekoku_units:', e);
        }
      }
    }

    // 1. Sanitasi Mutlak: Pastikan sebarang unit Rumah Sukan TIDAK masuk ke dalam PEMBANGUNAN
    const sanitized = baseUnits.map(u => {
      const isHouseUnit = 
        /rumah\s*(sukan|merah|biru|hijau|kuning|bendahara|temenggung|laksamana|syahbandar)/i.test(u.name) ||
        ['MERAH', 'HIJAU', 'BIRU', 'KUNING'].includes(u.code) ||
        /^(r-|rumah-)/i.test(u.id);
      if (isHouseUnit && u.category === 'PEMBANGUNAN') {
        return { ...u, category: 'RUMAH_SUKAN' as UnitCategory };
      }
      return u;
    });

    // PENTING: Tiada sebarang senarai unit standard dipaksa untuk PEMBANGUNAN.
    // GPK Kokurikulum sendiri yang bebas menentukan dan menamakan unit pembangunan mengikut keperluan sekolah.
    return sanitized;
  });

  const [assignments, setAssignments] = useState<UnitAssignment[]>(() => {
    if (initialData?.assignments && Array.isArray(initialData.assignments) && initialData.assignments.length > 0) {
      return initialData.assignments;
    }
    const saved = localStorage.getItem('ekoku_assignments');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Gagal membaca assignments tempatan:', e);
      }
    }
    return DEFAULT_ASSIGNMENTS;
  });

  const [settings, setSettings] = useState<SchoolSettings>(() => {
    if (initialData?.settings && initialData.settings.schoolName) {
      const s = initialData.settings;
      const logo = s.schoolLogo || s.schoolLogoUrl;
      return { 
        ...DEFAULT_SCHOOL_SETTINGS, 
        ...s,
        schoolLogo: logo,
        schoolLogoUrl: logo,
      };
    }
    const saved = localStorage.getItem('ekoku_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const logo = parsed.schoolLogo || parsed.schoolLogoUrl;
        return {
          ...DEFAULT_SCHOOL_SETTINGS,
          ...parsed,
          schoolLogo: logo,
          schoolLogoUrl: logo,
        };
      } catch (e) {
        console.warn('Gagal membaca ekoku_settings tempatan:', e);
      }
    }
    return DEFAULT_SCHOOL_SETTINGS;
  });

  const [sheetId, setSheetId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlSheet = params.get('sheet') || params.get('sheetId');
      if (urlSheet) {
        const cleaned = extractSheetId(urlSheet);
        localStorage.setItem('ekoku_sheet_id', cleaned);
        return cleaned;
      }
    }
    if (initialData?.sheetId) {
      return initialData.sheetId;
    }
    return localStorage.getItem('ekoku_sheet_id') || '';
  });

  // Penyelaras Kategori Unit Besar (Unit Beruniform, Kelab, Sukan, Rumah Sukan)
  const [categoryCoordinators, setCategoryCoordinators] = useState<CategoryCoordinator[]>(() => {
    if (initialData?.categoryCoordinators && Array.isArray(initialData.categoryCoordinators)) {
      return initialData.categoryCoordinators;
    }
    const saved = localStorage.getItem('ekoku_category_coordinators');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.warn('Gagal membaca category_coordinators tempatan:', e);
      }
    }
    return [];
  });

  // Jawatan Guru Tersuai Sistem (Selain jawatan standard seperti Ketua, Jurulatih, Pengurus, Ketua Panitia)
  const [customRoles, setCustomRoles] = useState<string[]>(() => {
    if (initialData?.customRoles && Array.isArray(initialData.customRoles)) {
      return initialData.customRoles;
    }
    const saved = localStorage.getItem('ekoku_custom_roles');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.warn('Gagal membaca custom_roles tempatan:', e);
      }
    }
    return [];
  });

  // Kepimpinan Eksekutif Kokurikulum Sekolah (SU Kokurikulum, Naib SU Kokurikulum, SU Sukan, Naib SU Sukan)
  const [executiveLeaders, setExecutiveLeaders] = useState<ExecutiveLeader[]>(() => {
    if (initialData?.executiveLeaders && Array.isArray(initialData.executiveLeaders)) {
      return initialData.executiveLeaders;
    }
    const saved = localStorage.getItem('ekoku_executive_leaders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.warn('Gagal membaca executive_leaders tempatan:', e);
      }
    }
    return [];
  });

  // Active view tab
  const [activeTab, setActiveTab] = useState<string>('master');

  // Google user auth & Cloud Sync states
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('ekoku_autosync') !== 'false';
  });
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('ekoku_last_sync_time') || null;
  });
  const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Modals state
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [isGoogleSheetModalOpen, setIsGoogleSheetModalOpen] = useState(false);
  const [googleSheetInitialTab, setGoogleSheetInitialTab] = useState<'qr' | 'sheet' | 'help'>('sheet');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isAppointmentLetterOpen, setIsAppointmentLetterOpen] = useState(false);
  const [teacherForLetter, setTeacherForLetter] = useState<Teacher | null>(null);
  const [isEditTeacherModalOpen, setIsEditTeacherModalOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
  const [filterConflictTeacherId, setFilterConflictTeacherId] = useState<string | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Toast alert
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Sync to LocalStorage (Layer 1 offline persistence)
  useEffect(() => {
    localStorage.setItem('ekoku_teachers', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('ekoku_units', JSON.stringify(units));
  }, [units]);

  useEffect(() => {
    localStorage.setItem('ekoku_assignments', JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem('ekoku_category_coordinators', JSON.stringify(categoryCoordinators));
  }, [categoryCoordinators]);

  useEffect(() => {
    localStorage.setItem('ekoku_custom_roles', JSON.stringify(customRoles));
  }, [customRoles]);

  useEffect(() => {
    localStorage.setItem('ekoku_executive_leaders', JSON.stringify(executiveLeaders));
  }, [executiveLeaders]);

  useEffect(() => {
    localStorage.setItem('ekoku_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('ekoku_sheet_id', sheetId);
  }, [sheetId]);

  useEffect(() => {
    localStorage.setItem('ekoku_autosync', String(autoSyncEnabled));
  }, [autoSyncEnabled]);

  useEffect(() => {
    if (lastSyncTime) {
      localStorage.setItem('ekoku_last_sync_time', lastSyncTime);
    }
  }, [lastSyncTime]);

  // Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setGoogleUser(user);
      },
      () => {
        setGoogleUser(null);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // 1. Initial Mount: Load Shared Cloud Database across devices
  const hasLoadedFromCloudRef = useRef(false);
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch('/api/cloud-database');
        if (res.ok) {
          const json = await res.json();
          if (json.exists && json.data && isMounted) {
            const { 
              teachers: cloudTeachers, 
              assignments: cloudAssignments, 
              units: cloudUnits, 
              settings: cloudSettings, 
              sheetId: cloudSheetId,
              categoryCoordinators: cloudCoords,
              customRoles: cloudRoles,
              executiveLeaders: cloudExecs
            } = json.data;
            if (Array.isArray(cloudTeachers) && cloudTeachers.length > 0) {
              const cleanTeachers = cloudTeachers.filter(t => t && t.name && isValidTeacherName(t.name));
              if (cleanTeachers.length > 0) {
                setTeachers(cleanTeachers);
              }
            }
            if (Array.isArray(cloudAssignments) && cloudAssignments.length > 0) {
              setAssignments(cloudAssignments);
            }
            if (Array.isArray(cloudUnits) && cloudUnits.length > 0) {
              setUnits(cloudUnits);
            }
            if (Array.isArray(cloudCoords)) {
              setCategoryCoordinators(cloudCoords);
            }
            if (Array.isArray(cloudRoles)) {
              setCustomRoles(cloudRoles);
            }
            if (Array.isArray(cloudExecs)) {
              setExecutiveLeaders(cloudExecs);
            }
            if (cloudSettings) {
              const cloudLogo = cloudSettings.schoolLogo || cloudSettings.schoolLogoUrl;
              setSettings(prev => ({ 
                ...prev, 
                ...cloudSettings,
                schoolLogo: cloudLogo || prev.schoolLogo,
                schoolLogoUrl: cloudLogo || prev.schoolLogoUrl,
              }));
            }
            if (cloudSheetId) {
              setSheetId(cloudSheetId);
            }
          }
        }
      } catch (err) {
        console.warn('Gagal memuat turun data dari pelayan awan:', err);
      } finally {
        hasLoadedFromCloudRef.current = true;
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Debounced save to shared cloud database whenever data changes
  const cloudSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isCloudDataHydratedRef = useRef(false);

  useEffect(() => {
    // Jangan simpan data sebelum pangkalan data awan selesai dimuat turun
    if (!hasLoadedFromCloudRef.current) {
      return;
    }
    // Langkau kitaran simpanan pertama sebaik sahaja muat turun awan selesai untuk mengelakkan peranti baharu menimpa data
    if (!isCloudDataHydratedRef.current) {
      isCloudDataHydratedRef.current = true;
      return;
    }

    // Safeguard: Jangan sekali-kali menimpa pangkalan data pelayan jika peranti ini hanya memegang data contoh lalai!
    const isOnlyDefault = 
      settings.schoolName === 'SEKOLAH SAYA' && 
      teachers.length <= 15 && 
      teachers.every(t => DEFAULT_TEACHERS.some(dt => dt.name === t.name));
    if (isOnlyDefault) {
      return;
    }

    if (cloudSaveTimerRef.current) {
      clearTimeout(cloudSaveTimerRef.current);
    }
    cloudSaveTimerRef.current = setTimeout(async () => {
      try {
        await fetch('/api/cloud-database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teachers,
            assignments,
            units,
            settings,
            sheetId,
            categoryCoordinators,
            customRoles,
            executiveLeaders,
          }),
        });
      } catch (err) {
        console.warn('Gagal menyimpan ke pangkalan data awan:', err);
      }
    }, 1500);

    return () => {
      if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current);
    };
  }, [teachers, assignments, units, settings, sheetId, categoryCoordinators, customRoles, executiveLeaders]);

  // Multi-device synchronization:
  // If user opens a shared link (?sheet=...) or this device has sheetId, load from Google Sheet!
  const hasAttemptedSheetSync = useRef(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlSheet = params.get('sheet') || params.get('sheetId');
    const targetSheetId = urlSheet ? extractSheetId(urlSheet) : sheetId;

    if (targetSheetId && (!hasAttemptedSheetSync.current || urlSheet)) {
      hasAttemptedSheetSync.current = true;
      (async () => {
        try {
          setIsSyncing(true);
          const data = await fetchFromGoogleSheet(targetSheetId, units);
          if (data.teachers.length > 0 || data.assignments.length > 0) {
            setTeachers(data.teachers);
            setAssignments(data.assignments);
            if (data.customUnits && data.customUnits.length > 0) {
              setUnits(data.customUnits);
            }
            if (data.categoryCoordinators && data.categoryCoordinators.length > 0) {
              setCategoryCoordinators(data.categoryCoordinators);
            }
            if (data.executiveLeaders && data.executiveLeaders.length > 0) {
              setExecutiveLeaders(data.executiveLeaders);
            }
            if (data.schoolSettings) {
              const sheetLogo = data.schoolSettings.schoolLogo || data.schoolSettings.schoolLogoUrl;
              setSettings(prev => ({ 
                ...prev, 
                ...data.schoolSettings,
                schoolLogo: sheetLogo || prev.schoolLogo,
                schoolLogoUrl: sheetLogo || prev.schoolLogoUrl,
              }));
            }
            // Simpan serta-merta ke storan tempatan peranti untuk kegunaan luar talian telefon
            try {
              localStorage.setItem('ekoku_teachers', JSON.stringify(data.teachers));
              localStorage.setItem('ekoku_assignments', JSON.stringify(data.assignments));
              if (data.customUnits) localStorage.setItem('ekoku_units', JSON.stringify(data.customUnits));
              if (data.categoryCoordinators) localStorage.setItem('ekoku_category_coordinators', JSON.stringify(data.categoryCoordinators));
              if (data.executiveLeaders) localStorage.setItem('ekoku_executive_leaders', JSON.stringify(data.executiveLeaders));
              if (data.schoolSettings) localStorage.setItem('ekoku_settings', JSON.stringify(data.schoolSettings));
            } catch {}
            showToast(`Pangkalan data sekolah (${data.teachers.length} guru) berjaya dimuatkan ke peranti ini!`);
          }
        } catch (err: unknown) {
          console.warn('Auto-sync dari Google Sheet pada peranti ini:', err);
          const msg = err instanceof Error ? err.message : '';
          if (msg.includes('Anyone with the link') || msg.includes('kebenaran') || msg.includes('401') || msg.includes('403')) {
            showToast('Google Sheet dikesan, tetapi fail perlu disetkan kepada "Anyone with link can view" di Drive atau log masuk.', 'warning');
          }
        } finally {
          setIsSyncing(false);
        }
      })();
    }
  }, [sheetId]);

  // Background Debounced Auto-Save to Google Sheet (Layer 2 unlimited cloud persistence)
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!autoSyncEnabled || !googleUser || !sheetId) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    setSyncStatus('saving');
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const res = await saveAllToGoogleSheet(sheetId, teachers, assignments, units, settings);
        setLastSyncTime(res.timestamp);
        setSyncStatus('saved');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (err) {
        console.warn('Auto-save ke Google Sheet ralat:', err);
        setSyncStatus('error');
      }
    }, 2500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [teachers, units, assignments, settings, autoSyncEnabled, googleUser, sheetId]);

  // Manual Sync trigger
  const handleManualSyncNow = async () => {
    if (!googleUser || !sheetId) {
      setIsGoogleSheetModalOpen(true);
      return;
    }
    setIsSyncing(true);
    setSyncStatus('saving');
    try {
      const res = await saveAllToGoogleSheet(sheetId, teachers, assignments, units, settings);
      setLastSyncTime(res.timestamp);
      setSyncStatus('saved');
      showToast(`Data kokurikulum berjaya disimpan ke Google Sheet pada ${res.timestamp}!`);
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err: unknown) {
      setSyncStatus('error');
      const msg = err instanceof Error ? err.message : 'Ralat semasa menyimpan ke Google Sheet';
      if (msg.includes('AUTH_EXPIRED') || msg.includes('401')) {
        showToast('Sesi Google telah tamat tempoh. Tetingkap penyegerakan dibuka untuk memperbaharui sambungan.', 'warning');
        setIsGoogleSheetModalOpen(true);
      } else {
        showToast(msg, 'warning');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Refresh / Pull data directly from Google Sheet into App
  const handleRefreshFromSheet = async () => {
    if (!sheetId) {
      setIsGoogleSheetModalOpen(true);
      return;
    }
    setIsSyncing(true);
    showToast('Sedang memuat turun perubahan terkini dari Google Sheet...', 'info');
    try {
      const data = await fetchFromGoogleSheet(sheetId, units);
      if (data.teachers.length > 0 || data.assignments.length > 0) {
        if (data.teachers.length > 0) {
          setTeachers(data.teachers);
        }
        if (Array.isArray(data.assignments)) {
          setAssignments([...data.assignments]);
        }
        if (data.customUnits && data.customUnits.length > 0) {
          setUnits(prev => {
            const prevMap = new Map(prev.map(u => [u.id, u]));
            data.customUnits!.forEach(u => prevMap.set(u.id, u));
            return Array.from(prevMap.values());
          });
        }
        if (data.schoolSettings) {
          setSettings(prev => ({ ...prev, ...data.schoolSettings }));
        }

        // Also persist to cloud-database for cross-device consistency
        fetch('/api/cloud-database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teachers: data.teachers,
            assignments: data.assignments,
            units: data.customUnits || units,
            settings: data.schoolSettings || settings,
            sheetId,
          }),
        }).catch(() => {});

        showToast(`Berjaya! Data dikemaskini dari Google Sheet (${data.teachers.length} guru, ${data.assignments.length} agihan).`, 'success');
      } else {
        showToast('Google Sheet tersambung, tetapi tiada rekod guru atau agihan ditemui.', 'warning');
      }
    } catch (err: unknown) {
      console.warn('Refresh dari Google Sheet gagal:', err);
      const msg = err instanceof Error ? err.message : 'Ralat semasa memuat turun dari Google Sheet';
      if (msg.includes('AUTH_EXPIRED') || msg.includes('401')) {
        showToast('Sesi Google tamat tempoh. Sila sambung semula akaun Google.', 'warning');
        setIsGoogleSheetModalOpen(true);
      } else {
        showToast(msg, 'warning');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Compute Conflicts in real-time
  const conflicts: ConflictIssue[] = useMemo(() => {
    return detectTeacherConflicts(teachers, assignments, units);
  }, [teachers, assignments, units]);

  // Handler: Assign teacher to unit
  const handleAssignTeacher = (
    teacherId: string,
    unitId: string,
    role: RoleType,
    session: SessionType
  ) => {
    const existingIndex = assignments.findIndex(
      a => a.teacherId === teacherId && a.unitId === unitId
    );

    let updated: UnitAssignment[];
    if (existingIndex >= 0) {
      // Update existing role/session in this unit
      updated = [...assignments];
      updated[existingIndex] = {
        ...updated[existingIndex],
        role,
        session,
      };
      showToast('Jawatan guru dalam unit ini berjaya dikemaskini.');
    } else {
      // Add new assignment
      const newAssign: UnitAssignment = {
        id: `a-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        teacherId,
        unitId,
        role,
        session,
      };
      updated = [...assignments, newAssign];
      showToast('Guru berjaya diagihkan ke dalam unit.');
    }

    setAssignments(updated);
  };

  // Handler: Update role directly
  const handleUpdateRole = (assignmentId: string, newRole: RoleType) => {
    setAssignments(prev =>
      prev.map(a => (a.id === assignmentId ? { ...a, role: newRole } : a))
    );
    showToast(`Jawatan ditukar kepada "${newRole}".`);
  };

  // Handler: Update session
  const handleUpdateSession = (assignmentId: string, newSession: SessionType) => {
    setAssignments(prev =>
      prev.map(a => (a.id === assignmentId ? { ...a, session: newSession } : a))
    );
    showToast(`Sesi unit ditukar kepada Sesi ${newSession}.`);
  };

  // Handler: Remove assignment
  const handleRemoveAssignment = (assignmentId: string) => {
    setAssignments(prev => prev.filter(a => a.id !== assignmentId));
    showToast('Guru digugurkan daripada unit.', 'info');
  };

  // Handler: Save teacher (Add / Edit)
  const handleSaveTeacher = (teacher: Teacher) => {
    const index = teachers.findIndex(t => t.id === teacher.id);
    if (index >= 0) {
      setTeachers(prev => prev.map(t => (t.id === teacher.id ? teacher : t)));
      showToast(`Maklumat Cikgu ${teacher.name} berjaya dikemaskini.`);
    } else {
      setTeachers(prev => [teacher, ...prev]);
      showToast(`Cikgu ${teacher.name} berjaya didaftarkan ke dalam sistem.`);
    }
  };

  // Handler: Delete teacher
  const handleDeleteTeacher = (teacherId: string) => {
    setTeachers(prev => prev.filter(t => t.id !== teacherId));
    setAssignments(prev => prev.filter(a => a.teacherId !== teacherId));
    setCategoryCoordinators(prev => prev.filter(c => c.teacherId !== teacherId));
    setExecutiveLeaders(prev => prev.filter(l => l.teacherId !== teacherId));
    showToast('Guru telah dipadam daripada senarai sekolah.', 'info');
  };

  // Handler: Lantik / Kemaskini Jawatan Eksekutif (Setiausaha Kokurikulum, Naib SU, SU Sukan, Naib SU Sukan)
  const handleSetExecutiveLeader = (
    role: ExecutiveRoleType,
    teacherId: string,
    session: CoordinatorSessionType,
    leaderIdToEdit?: string
  ) => {
    setExecutiveLeaders(prev => {
      let filtered = prev;
      if (leaderIdToEdit) {
        filtered = prev.filter(l => l.id !== leaderIdToEdit);
      } else {
        // Gantikan jika jawatan & sesi yang sama sudah wujud, atau jika guru yang sama dilantik semula
        filtered = prev.filter(l => !(l.role === role && (l.session === session || l.teacherId === teacherId)));
      }
      const newLeader: ExecutiveLeader = {
        id: leaderIdToEdit || `exec_${role.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
        role,
        teacherId,
        session,
        appointedAt: new Date().toISOString(),
      };
      return [...filtered, newLeader];
    });
    const teacher = teachers.find(t => t.id === teacherId);
    showToast(`Berjaya melantik Cikgu ${teacher?.name || 'Guru'} sebagai ${role} (${session})!`, 'success');
  };

  // Handler: Gugurkan Jawatan Eksekutif
  const handleRemoveExecutiveLeader = (leaderId: string) => {
    const leader = executiveLeaders.find(l => l.id === leaderId);
    const teacher = leader ? teachers.find(t => t.id === leader.teacherId) : null;
    setExecutiveLeaders(prev => prev.filter(l => l.id !== leaderId));
    showToast(`Jawatan ${leader?.role || 'Eksekutif'} bagi Cikgu ${teacher?.name || 'Guru'} telah digugurkan.`, 'info');
  };

  // Handler: Lantik Penyelaras Unit Besar (Unit Beruniform, Kelab, Sukan, Rumah Sukan)
  const handleAddCategoryCoordinator = (
    category: UnitCategory,
    teacherId: string,
    session: CoordinatorSessionType,
    roleTitle?: string
  ) => {
    const newCoord: CategoryCoordinator = {
      id: `coord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      category,
      teacherId,
      session,
      roleTitle: roleTitle?.trim() || 'Penyelaras',
      appointedAt: new Date().toISOString(),
    };
    setCategoryCoordinators(prev => [...prev, newCoord]);
    const teacher = teachers.find(t => t.id === teacherId);
    showToast(`Berjaya melantik Cikgu ${teacher?.name || 'Guru'} sebagai Penyelaras ${category} (${session})!`, 'success');
  };

  // Handler: Gugurkan Penyelaras Unit Besar
  const handleRemoveCategoryCoordinator = (coordId: string) => {
    const coord = categoryCoordinators.find(c => c.id === coordId);
    const teacher = coord ? teachers.find(t => t.id === coord.teacherId) : null;
    setCategoryCoordinators(prev => prev.filter(c => c.id !== coordId));
    showToast(`Jawatan Penyelaras bagi Cikgu ${teacher?.name || 'Guru'} telah digugurkan.`, 'info');
  };

  // Handler: Tambah Jawatan Tersuai Baharu ke Sistem
  const handleAddCustomRole = (newRole: string) => {
    const trimmed = newRole.trim();
    if (!trimmed) return;
    setCustomRoles(prev => {
      if (prev.includes(trimmed)) return prev;
      return [...prev, trimmed];
    });
    showToast(`Jawatan baharu "${trimmed}" telah ditambah ke dalam senarai sistem.`, 'success');
  };

  // Handler: Import teachers from Excel
  const handleImportTeachers = (newTeachers: Teacher[], mode: 'merge' | 'replace') => {
    if (mode === 'replace') {
      setTeachers(newTeachers);
      setAssignments([]);
      showToast(`Berjaya menggantikan senarai dengan ${newTeachers.length} orang guru baharu.`);
    } else {
      // Merge unique by staffId or name
      const existingIds = new Set(teachers.map(t => t.staffId.toLowerCase()));
      const filteredNew = newTeachers.filter(t => !existingIds.has(t.staffId.toLowerCase()));
      setTeachers(prev => [...prev, ...filteredNew]);
      showToast(`Berjaya menambah ${filteredNew.length} orang guru baharu (${newTeachers.length - filteredNew.length} rekod sedia ada dikekalkan).`);
    }
  };

  // Handler: Add Unit (e.g. for Pembangunan)
  const handleAddUnit = (newUnit: KokuUnit) => {
    setUnits(prev => [...prev, newUnit]);
    showToast(`Unit pembangunan "${newUnit.name}" berjaya ditambah.`);
  };

  // Handler: Edit Unit (e.g. for Pembangunan)
  const handleEditUnit = (updatedUnit: KokuUnit) => {
    setUnits(prev => prev.map(u => u.id === updatedUnit.id ? updatedUnit : u));
    showToast(`Maklumat unit "${updatedUnit.name}" berjaya dikemaskini.`);
  };

  // Handler: Delete Unit (e.g. for Pembangunan)
  const handleDeleteUnit = (unitId: string) => {
    const unitToDelete = units.find(u => u.id === unitId);
    setUnits(prev => prev.filter(u => u.id !== unitId));
    setAssignments(prev => prev.filter(a => a.unitId !== unitId));
    showToast(`Unit "${unitToDelete?.name || ''}" telah dipadam.`);
  };

  // Handler: Export to Excel
  const handleExportExcel = () => {
    exportMatrixToExcel(teachers, units, assignments, settings.schoolName, settings.academicYear, categoryCoordinators, executiveLeaders);
    showToast('Fail Excel agihan kokurikulum berjaya dimuat turun.');
  };

  // Handler: Clear all data to start fresh with real school data
  const handleClearAllData = () => {
    setIsClearConfirmOpen(true);
  };

  const handleConfirmClearAll = async () => {
    setTeachers([]);
    setAssignments([]);
    setCategoryCoordinators([]);
    setExecutiveLeaders([]);
    localStorage.removeItem('ekoku_teachers');
    localStorage.removeItem('ekoku_assignments');
    localStorage.removeItem('ekoku_category_coordinators');
    localStorage.removeItem('ekoku_executive_leaders');
    
    // Also remove redundant cloud database records
    try {
      await fetch('/api/cloud-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teachers: [],
          assignments: [],
          units,
          settings,
          sheetId: '',
          categoryCoordinators: [],
          customRoles,
          executiveLeaders: [],
        }),
      });
    } catch (e) {
      console.warn('Gagal mengosongkan pangkalan data awan:', e);
    }

    setIsClearConfirmOpen(false);
    showToast('Pangkalan data telah dikosongkan sepenuhnya. Sedia untuk data sekolah sebenar.', 'info');
  };

  // Reset to full sample data
  const handleResetToSample = () => {
    setIsResetConfirmOpen(true);
  };

  const handleConfirmResetSample = () => {
    setTeachers(SAMPLE_TEACHERS);
    setAssignments(SAMPLE_ASSIGNMENTS);
    setUnits(DEFAULT_UNITS);
    setCategoryCoordinators([]);
    setExecutiveLeaders([]);
    localStorage.removeItem('ekoku_category_coordinators');
    localStorage.removeItem('ekoku_executive_leaders');
    setIsResetConfirmOpen(false);
    showToast('Data contoh berjaya dimuatkan semula ke dalam sistem.');
  };

  // Buang semua data yang bukan nama guru (ID rujukan, nombor, baris kosong, tajuk)
  const handleCleanInvalidData = () => {
    const valid = teachers.filter(t => t && t.name && isValidTeacherName(t.name));
    const validIds = new Set(valid.map(t => t.id));
    const validAssigns = assignments.filter(a => validIds.has(a.teacherId));
    const removedCount = teachers.length - valid.length;
    setTeachers(valid);
    setAssignments(validAssigns);

    // Kemaskini juga ke pelayan awan
    fetch('/api/cloud-database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teachers: valid,
        assignments: validAssigns,
        units,
        settings,
        sheetId,
      }),
    }).catch(() => {});

    showToast(`Pembersihan selesai! ${removedCount > 0 ? `${removedCount} rekod bukan nama guru telah disingkirkan.` : 'Semua rekod guru dalam jadual adalah sah.'}`);
  };

  // Jalankan pembersihan automatik sekali pada peringkat awal jika terdapat data bukan guru atau ID berganda
  useEffect(() => {
    // 1. Singkirkan rekod bukan guru
    const valid = teachers.filter(t => t && t.name && isValidTeacherName(t.name));
    
    // 2. Singkirkan ID pendua jika wujud (Pastikan setiap guru ada ID unik)
    const seenIds = new Set<string>();
    const deduplicated: Teacher[] = [];
    let hadDuplicates = false;

    valid.forEach(t => {
      if (!seenIds.has(t.id)) {
        seenIds.add(t.id);
        deduplicated.push(t);
      } else {
        hadDuplicates = true;
        const newUniqueId = `t-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        seenIds.add(newUniqueId);
        deduplicated.push({ ...t, id: newUniqueId });
      }
    });

    if (hadDuplicates || valid.length !== teachers.length) {
      const validIds = new Set(deduplicated.map(t => t.id));
      const validAssigns = assignments.filter(a => validIds.has(a.teacherId));
      setTeachers(deduplicated);
      setAssignments(validAssigns);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-slate-50 to-teal-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans relative selection:bg-emerald-500 selection:text-white">
      {/* Cheerful & Professional Ambient Background Accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-32 -left-32 w-[30rem] h-[30rem] bg-emerald-300/20 dark:bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -right-32 w-[32rem] h-[32rem] bg-teal-300/20 dark:bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-[34rem] h-[34rem] bg-amber-200/20 dark:bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      {/* Navbar with stats, tabs, quick buttons */}
      <Navbar
        settings={settings}
        onUpdateSettings={setSettings}
        teachers={teachers}
        conflicts={conflicts}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenConflicts={() => setIsConflictModalOpen(true)}
        onOpenGoogleSheet={() => {
          setGoogleSheetInitialTab('sheet');
          setIsGoogleSheetModalOpen(true);
        }}
        onOpenQr={() => {
          setGoogleSheetInitialTab('qr');
          setIsGoogleSheetModalOpen(true);
        }}
        onOpenImport={() => setIsImportModalOpen(true)}
        onExportExcel={handleExportExcel}
        onOpenPrint={() => setIsPrintModalOpen(true)}
        googleUser={googleUser}
        sheetId={sheetId}
        isSyncing={isSyncing}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        onManualSyncNow={handleManualSyncNow}
        onRefreshFromSheet={handleRefreshFromSheet}
        onClearAllData={handleClearAllData}
        onResetToSample={handleResetToSample}
        onCleanInvalidData={handleCleanInvalidData}
      />

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 border ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20'
              : toastMessage.type === 'warning'
              ? 'bg-amber-600 text-white border-amber-500 shadow-amber-500/20'
              : 'bg-slate-800 text-white border-slate-700'
          }`}>
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Main Container Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {/* Multi-Device / Smartphone Sync Helper Banner */}
        {!sheetId && (
          <div className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-200 dark:border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-100 block text-xs">
                  Buka di telefon atau peranti lain?
                </span>
                <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                  Imbas Kod QR atau sambungkan Google Sheet sekolah untuk membuka data kokurikulum di telefon anda tanpa kehilangan sebarang rekod.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setGoogleSheetInitialTab('qr');
                  setIsGoogleSheetModalOpen(true);
                }}
                className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
              >
                <span>📱 Imbas Telefon</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setGoogleSheetInitialTab('sheet');
                  setIsGoogleSheetModalOpen(true);
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer transition-colors"
              >
                <span>Sambung Sheet</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: MASTER TABLE VIEW */}
        {activeTab === 'master' && (
          <MasterTableView
            teachers={teachers}
            units={units}
            assignments={assignments}
            conflicts={conflicts}
            categoryCoordinators={categoryCoordinators}
            executiveLeaders={executiveLeaders}
            onSetExecutiveLeader={handleSetExecutiveLeader}
            onRemoveExecutiveLeader={handleRemoveExecutiveLeader}
            customRoles={customRoles}
            onAddCustomRole={handleAddCustomRole}
            onAddTeacher={() => {
              setTeacherToEdit(null);
              setIsEditTeacherModalOpen(true);
            }}
            onEditTeacher={teacher => {
              setTeacherToEdit(teacher);
              setIsEditTeacherModalOpen(true);
            }}
            onDeleteTeacher={handleDeleteTeacher}
            onAssignTeacherToUnit={handleAssignTeacher}
            onRemoveAssignment={handleRemoveAssignment}
            onSelectTeacherConflict={teacherId => {
              setFilterConflictTeacherId(teacherId);
            }}
            onOpenImport={() => setIsImportModalOpen(true)}
            onPrintAppointmentLetter={teacher => {
              setTeacherForLetter(teacher);
              setIsAppointmentLetterOpen(true);
            }}
            filterConflictTeacherId={filterConflictTeacherId}
            onClearConflictFilter={() => setFilterConflictTeacherId(null)}
            onCleanInvalidData={handleCleanInvalidData}
          />
        )}

        {/* TAB 2, 3, 4, 5, 6: UNIT CATEGORY VIEWS */}
        {(activeTab === 'BERUNIFORM' ||
          activeTab === 'KELAB' ||
          activeTab === 'SUKAN' ||
          activeTab === 'RUMAH_SUKAN' ||
          activeTab === 'PEMBANGUNAN') && (
          <UnitManagerView
            category={activeTab as UnitCategory}
            units={units}
            teachers={teachers}
            assignments={assignments}
            conflicts={conflicts}
            categoryCoordinators={categoryCoordinators}
            onAddCategoryCoordinator={handleAddCategoryCoordinator}
            onRemoveCategoryCoordinator={handleRemoveCategoryCoordinator}
            customRoles={customRoles}
            onAddCustomRole={handleAddCustomRole}
            onAssignTeacher={handleAssignTeacher}
            onUpdateRole={handleUpdateRole}
            onUpdateSession={handleUpdateSession}
            onRemoveAssignment={handleRemoveAssignment}
            onSelectTeacherConflict={teacherId => {
              setFilterConflictTeacherId(teacherId);
              setActiveTab('master');
            }}
            onAddUnit={handleAddUnit}
            onEditUnit={handleEditUnit}
            onDeleteUnit={handleDeleteUnit}
            onEditTeacher={teacher => {
              setTeacherToEdit(teacher);
              setIsEditTeacherModalOpen(true);
            }}
            onPrintAppointmentLetter={teacher => {
              setTeacherForLetter(teacher);
              setIsAppointmentLetterOpen(true);
            }}
          />
        )}

        {/* TAB 7: STATISTIK & ANALISIS SESI */}
        {activeTab === 'statistik' && (
          <SessionStatsView
            teachers={teachers}
            units={units}
            assignments={assignments}
            settings={settings}
            conflicts={conflicts}
            onExportExcel={handleExportExcel}
            onOpenPrint={() => setIsPrintModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-6 text-xs text-slate-500 no-print mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-700 dark:text-slate-300">
              e-KOKU GPK Kokurikulum
            </span>
            <span>•</span>
            <span>Sistem Agihan Guru & Pangkalan Data Google Sheet Sekolah</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleResetToSample}
              className="text-xs text-slate-400 hover:text-emerald-600 transition-colors"
              title="Reset kepada data contoh asal"
            >
              Muat Semula Data Contoh
            </button>
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              Cetak Laporan Rasmi
            </button>
          </div>
        </div>
      </footer>

      {/* MODALS */}
      {/* 1. Conflict Modal */}
      <ConflictModal
        conflicts={conflicts}
        isOpen={isConflictModalOpen}
        onClose={() => setIsConflictModalOpen(false)}
        onSelectTeacher={teacherId => {
          setFilterConflictTeacherId(teacherId);
          setActiveTab('master');
        }}
      />

      {/* 2. Google Sheet Sync Modal */}
      <GoogleSheetSyncModal
        isOpen={isGoogleSheetModalOpen}
        onClose={() => setIsGoogleSheetModalOpen(false)}
        initialTab={googleSheetInitialTab}
        googleUser={googleUser}
        onUserChange={setGoogleUser}
        sheetId={sheetId}
        onSetSheetId={setSheetId}
        teachers={teachers}
        units={units}
        assignments={assignments}
        schoolSettings={settings}
        categoryCoordinators={categoryCoordinators}
        executiveLeaders={executiveLeaders}
        customRoles={customRoles}
        lastSyncTime={lastSyncTime}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={setAutoSyncEnabled}
        onManualSyncNow={handleManualSyncNow}
        isSyncing={isSyncing}
        onClearAllData={handleClearAllData}
        onImportSheetData={(newTeachers, newAssignments, newCustomUnits) => {
          if (newTeachers && newTeachers.length > 0) {
            setTeachers(newTeachers);
          }
          // Sentiasa kemas kini senarai agihan walaupun berkurang atau bertukar
          if (Array.isArray(newAssignments)) {
            setAssignments([...newAssignments]);
          }
          if (newCustomUnits && newCustomUnits.length > 0) {
            setUnits(prev => {
              const prevMap = new Map(prev.map(u => [u.id, u]));
              newCustomUnits.forEach(u => prevMap.set(u.id, u));
              return Array.from(prevMap.values());
            });
          }
          showToast(`Data daripada Google Sheet berjaya disegerakkan (${newTeachers.length} guru, ${newAssignments.length} agihan)!`);
        }}
      />

      {/* 3. Excel Import Modal */}
      <ExcelImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportTeachers={handleImportTeachers}
      />

      {/* 4. Print / PDF Official Report Modal */}
      <PrintReportModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        teachers={teachers}
        units={units}
        assignments={assignments}
        settings={settings}
      />

      {/* 4b. Surat Pelantikan Guru Modal */}
      <AppointmentLetterModal
        isOpen={isAppointmentLetterOpen}
        onClose={() => {
          setIsAppointmentLetterOpen(false);
          setTeacherForLetter(null);
        }}
        teacher={teacherForLetter}
        allTeachers={teachers}
        units={units}
        assignments={assignments}
        settings={settings}
        executiveLeaders={executiveLeaders}
        categoryCoordinators={categoryCoordinators}
        onSelectTeacher={t => setTeacherForLetter(t)}
      />

      {/* 5. Add / Edit Teacher Modal */}
      <EditTeacherModal
        isOpen={isEditTeacherModalOpen}
        onClose={() => {
          setIsEditTeacherModalOpen(false);
          setTeacherToEdit(null);
        }}
        onSaveTeacher={handleSaveTeacher}
        teacherToEdit={teacherToEdit}
      />

      {/* 6. Modal Sahkan Kosongkan Semua Data */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-rose-200 dark:border-rose-900/50">
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/70 text-rose-600 flex items-center justify-center font-bold shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Kosongkan Semua Data
                </h3>
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  Untuk Mulakan Data Sekolah Sebenar
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Adakah anda pasti mahu <b>MENGOSONGKAN SEMUA</b> senarai guru dan agihan kokurikulum?
              </p>
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-300">
                Semua {teachers.length} rekod guru dan {assignments.length} rekod agihan akan dipadam bagi membolehkan anda memuat naik atau mendaftar senarai guru sekolah yang sebenar.
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="px-5 py-2.5 text-white bg-rose-600 hover:bg-rose-700 rounded-xl font-black text-xs shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Kosongkan Semua</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal Sahkan Muat Semula Data Contoh */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3.5 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  Muat Semula Data Contoh
                </h3>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  Untuk Rujukan &amp; Latihan
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-700 dark:text-slate-300">
                Muat semula set data contoh guru dan agihan jawatan kokurikulum untuk rujukan atau latihan?
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmResetSample}
                className="px-5 py-2.5 text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl font-black text-xs shadow-md shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Ya, Muat Semula Contoh</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
