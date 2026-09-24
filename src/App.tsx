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
  ConflictIssue 
} from './types/koku';
import { detectTeacherConflicts, exportMatrixToExcel } from './utils/kokuHelpers';
import { initAuth } from './services/auth';
import { saveAllToGoogleSheet } from './services/googleSheets';

import { Navbar } from './components/Navbar';
import { MasterTableView } from './components/MasterTableView';
import { UnitManagerView } from './components/UnitManagerView';
import { SessionStatsView } from './components/SessionStatsView';
import { ConflictModal } from './components/ConflictModal';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { PrintReportModal } from './components/PrintReportModal';
import { EditTeacherModal } from './components/EditTeacherModal';
import { Trash2, Sparkles } from 'lucide-react';

export default function App() {
  // State from LocalStorage or Defaults (Cleaned for real data)
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    const isCleaned = localStorage.getItem('ekoku_data_cleared_for_real_v1');
    if (!isCleaned) {
      localStorage.setItem('ekoku_data_cleared_for_real_v1', 'true');
      localStorage.removeItem('ekoku_teachers');
      localStorage.removeItem('ekoku_assignments');
      return [];
    }
    const saved = localStorage.getItem('ekoku_teachers');
    return saved ? JSON.parse(saved) : DEFAULT_TEACHERS;
  });

  const [units, setUnits] = useState<KokuUnit[]>(() => {
    const saved = localStorage.getItem('ekoku_units');
    return saved ? JSON.parse(saved) : DEFAULT_UNITS;
  });

  const [assignments, setAssignments] = useState<UnitAssignment[]>(() => {
    const isCleaned = localStorage.getItem('ekoku_data_cleared_for_real_v1');
    if (!isCleaned) {
      return [];
    }
    const saved = localStorage.getItem('ekoku_assignments');
    return saved ? JSON.parse(saved) : DEFAULT_ASSIGNMENTS;
  });

  const [settings, setSettings] = useState<SchoolSettings>(() => {
    const saved = localStorage.getItem('ekoku_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SCHOOL_SETTINGS;
  });

  const [sheetId, setSheetId] = useState<string>(() => {
    return localStorage.getItem('ekoku_sheet_id') || '';
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
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
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
      showToast(msg, 'warning');
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
    showToast('Guru telah dipadam daripada senarai sekolah.', 'info');
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
    exportMatrixToExcel(teachers, units, assignments, settings.schoolName, settings.academicYear);
    showToast('Fail Excel agihan kokurikulum berjaya dimuat turun.');
  };

  // Handler: Clear all data to start fresh with real school data
  const handleClearAllData = () => {
    setIsClearConfirmOpen(true);
  };

  const handleConfirmClearAll = () => {
    setTeachers([]);
    setAssignments([]);
    localStorage.removeItem('ekoku_teachers');
    localStorage.removeItem('ekoku_assignments');
    setIsClearConfirmOpen(false);
    showToast('Semua data contoh guru dan agihan telah dikosongkan. Sedia untuk data sekolah sebenar.', 'info');
  };

  // Reset to full sample data
  const handleResetToSample = () => {
    setIsResetConfirmOpen(true);
  };

  const handleConfirmResetSample = () => {
    setTeachers(SAMPLE_TEACHERS);
    setAssignments(SAMPLE_ASSIGNMENTS);
    setUnits(DEFAULT_UNITS);
    setIsResetConfirmOpen(false);
    showToast('Data contoh berjaya dimuatkan semula ke dalam sistem.');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Navbar with stats, tabs, quick buttons */}
      <Navbar
        settings={settings}
        onUpdateSettings={setSettings}
        teachers={teachers}
        conflicts={conflicts}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenConflicts={() => setIsConflictModalOpen(true)}
        onOpenGoogleSheet={() => setIsGoogleSheetModalOpen(true)}
        onOpenImport={() => setIsImportModalOpen(true)}
        onExportExcel={handleExportExcel}
        onOpenPrint={() => setIsPrintModalOpen(true)}
        googleUser={googleUser}
        sheetId={sheetId}
        isSyncing={isSyncing}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        onManualSyncNow={handleManualSyncNow}
        onClearAllData={handleClearAllData}
        onResetToSample={handleResetToSample}
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
        {/* TAB 1: MASTER TABLE VIEW */}
        {activeTab === 'master' && (
          <MasterTableView
            teachers={teachers}
            units={units}
            assignments={assignments}
            conflicts={conflicts}
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
            filterConflictTeacherId={filterConflictTeacherId}
            onClearConflictFilter={() => setFilterConflictTeacherId(null)}
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
        googleUser={googleUser}
        onUserChange={setGoogleUser}
        sheetId={sheetId}
        onSetSheetId={setSheetId}
        teachers={teachers}
        units={units}
        assignments={assignments}
        schoolSettings={settings}
        lastSyncTime={lastSyncTime}
        autoSyncEnabled={autoSyncEnabled}
        onToggleAutoSync={setAutoSyncEnabled}
        onManualSyncNow={handleManualSyncNow}
        isSyncing={isSyncing}
        onImportSheetData={(newTeachers, newAssignments, newCustomUnits) => {
          if (newTeachers && newTeachers.length > 0) {
            setTeachers(newTeachers);
          }
          if (newAssignments && newAssignments.length > 0) {
            setAssignments(newAssignments);
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
