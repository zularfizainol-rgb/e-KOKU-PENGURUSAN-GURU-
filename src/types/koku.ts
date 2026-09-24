export type UnitCategory = 'BERUNIFORM' | 'KELAB' | 'SUKAN' | 'RUMAH_SUKAN' | 'PEMBANGUNAN';

export type SessionType = 'Pagi' | 'Petang';

export type RoleType = 
  | 'Ketua Guru Penasihat'
  | 'Setiausaha'
  | 'AJK';

export interface Teacher {
  id: string;
  name: string;
  staffId: string;
  gender: 'L' | 'P';
  session: SessionType;
  phone?: string;
  email?: string;
  grade?: string; // e.g. DG41, DG44, DG48, DG52
  isAdmin?: boolean; // GPK, Pentadbir
}

export interface KokuUnit {
  id: string;
  name: string;
  code: string;
  category: UnitCategory;
  color: string;
  iconName?: string;
  description?: string;
  targetMorning?: number;
  targetAfternoon?: number;
}

export interface UnitAssignment {
  id: string;
  teacherId: string;
  unitId: string;
  role: RoleType;
  session: SessionType;
}

export interface ConflictIssue {
  teacherId: string;
  teacherName: string;
  type: 'DUPLICATE_CATEGORY' | 'DUPLICATE_LEADERSHIP' | 'INCOMPLETE_ASSIGNMENT' | 'SESSION_MISMATCH';
  severity: 'error' | 'warning' | 'info';
  message: string;
  details: string[];
}

export interface SchoolSettings {
  schoolName: string;
  schoolCode: string;
  academicYear: string;
  principalName: string;
  gpkKokuName: string;
  state: string;
  district: string;
  schoolLogo?: string;
  ts25Logo?: string;
}

export interface GoogleSheetConfig {
  sheetId: string;
  sheetName: string;
  lastSyncedAt?: string;
  syncStatus?: 'synced' | 'unsaved' | 'error' | 'idle';
}
