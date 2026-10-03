export type UnitCategory = 'BERUNIFORM' | 'KELAB' | 'SUKAN' | 'RUMAH_SUKAN' | 'PEMBANGUNAN';

export type SessionType = 'Pagi' | 'Petang';

export type CoordinatorSessionType = 'Pagi' | 'Petang' | 'Kedua-dua Sesi';

export type ExecutiveRoleType = 
  | 'Setiausaha Kokurikulum'
  | 'Naib Setiausaha Kokurikulum'
  | 'Setiausaha Sukan'
  | 'Naib Setiausaha Sukan';

export interface ExecutiveLeader {
  id: string;
  role: ExecutiveRoleType | string;
  teacherId: string;
  session: CoordinatorSessionType;
  appointedAt?: string;
}

export interface CategoryCoordinator {
  id: string;
  category: UnitCategory; // Major unit category: 'BERUNIFORM' | 'KELAB' | 'SUKAN' | 'RUMAH_SUKAN' | 'PEMBANGUNAN'
  teacherId: string;
  session: CoordinatorSessionType; // Pilihan Sesi: 'Pagi' | 'Petang' | 'Kedua-dua Sesi'
  roleTitle?: string; // Default: 'Penyelaras', or 'Penolong Penyelaras', or custom
  appointedAt?: string;
}

export type RoleType = 
  | 'Ketua Guru Penasihat'
  | 'Penyelaras'
  | 'Setiausaha'
  | 'Jurulatih'
  | 'Pengurus'
  | 'Ketua Panitia'
  | 'Penolong Ketua Guru Penasihat'
  | 'Bendahari'
  | 'AJK'
  | string;

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
  coordinatorId?: string; // ID of Penyelaras Unit
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
  schoolAddress?: string;
  schoolState?: string;
  schoolLogo?: string;
  ts25Logo?: string;
  schoolLogoUrl?: string;
  ts25LogoUrl?: string;
  showTs25Logo?: boolean;
  ts25Cohort?: string;
}

export interface GoogleSheetConfig {
  sheetId: string;
  sheetName: string;
  lastSyncedAt?: string;
  syncStatus?: 'synced' | 'unsaved' | 'error' | 'idle';
}
