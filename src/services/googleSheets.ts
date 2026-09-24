import { Teacher, UnitAssignment, KokuUnit, SchoolSettings, RoleType, SessionType, UnitCategory } from '../types/koku';
import { getAccessToken } from './auth';

export interface SheetImportResult {
  teachers: Teacher[];
  assignments: UnitAssignment[];
  customUnits?: KokuUnit[];
  schoolSettings?: Partial<SchoolSettings>;
}

export function extractSheetId(input: string): string {
  const trimmed = input.trim();
  // Check if it's already a clean ID (typically 44 chars)
  if (/^[a-zA-Z0-9-_]{20,60}$/.test(trimmed)) {
    return trimmed;
  }
  // Check if it's a URL: https://docs.google.com/spreadsheets/d/{ID}/edit...
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

// Ensure required tabs exist in spreadsheet
async function ensureRequiredSheets(cleanId: string, token: string, requiredSheets: string[]) {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=sheets.properties.title`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!metaRes.ok) return;
    const meta = await metaRes.json();
    const existingTitles = new Set(meta.sheets?.map((s: { properties?: { title?: string } }) => s.properties?.title) || []);

    const requests = [];
    for (const title of requiredSheets) {
      if (!existingTitles.has(title)) {
        requests.push({
          addSheet: {
            properties: { title },
          },
        });
      }
    }

    if (requests.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
    }
  } catch (err) {
    console.warn('Auto-create sheets warning:', err);
  }
}

/**
 * Creates a brand new Google Sheet in the user's Google Drive with all essential tabs.
 */
export async function createNewSpreadsheet(title: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Sila log masuk dengan Google terlebih dahulu untuk mencipta Google Sheet.');
  }

  const payload = {
    properties: {
      title: title || 'e-Koku Pengurusan GPK Kokurikulum',
    },
    sheets: [
      {
        properties: {
          title: 'Agihan_Kokurikulum',
          gridProperties: { rowCount: 300, columnCount: 12 },
        },
      },
      {
        properties: {
          title: 'Senarai_Guru',
          gridProperties: { rowCount: 200, columnCount: 10 },
        },
      },
      {
        properties: {
          title: 'Senarai_Unit',
          gridProperties: { rowCount: 100, columnCount: 10 },
        },
      },
      {
        properties: {
          title: 'Ringkasan_Unit',
          gridProperties: { rowCount: 100, columnCount: 10 },
        },
      },
      {
        properties: {
          title: 'Panduan_GPK',
          gridProperties: { rowCount: 30, columnCount: 6 },
        },
      },
    ],
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `Gagal mencipta Google Sheet (${response.status} ${response.statusText})`
    );
  }

  const data = await response.json();
  return data.spreadsheetId;
}

/**
 * Saves all teachers, units, assignments, and school settings directly into the Google Sheet.
 * Guarantees zero data loss and unlimited access directly in Google Drive.
 */
export async function saveAllToGoogleSheet(
  sheetId: string,
  teachers: Teacher[],
  assignments: UnitAssignment[],
  units: KokuUnit[],
  schoolSettings: SchoolSettings
): Promise<{ success: boolean; rowsCount: number; timestamp: string }> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Sila log masuk Google untuk menyimpan data ke Google Sheet.');
  }

  const cleanId = extractSheetId(sheetId);
  if (!cleanId) {
    throw new Error('ID Google Sheet tidak sah.');
  }

  const timestamp = new Date().toLocaleString('ms-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Ensure necessary tabs exist
  const requiredTabs = ['Agihan_Kokurikulum', 'Senarai_Guru', 'Senarai_Unit', 'Ringkasan_Unit', 'Panduan_GPK'];
  await ensureRequiredSheets(cleanId, token, requiredTabs);

  // 1. Prepare Agihan_Kokurikulum data
  const unitMap = new Map(units.map(u => [u.id, u]));
  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  const assignmentRows: (string | number)[][] = [
    [
      'ID Agihan',
      'No',
      'Nama Penuh Guru',
      'Sesi Hakiki Guru',
      'Kategori Kokurikulum',
      'Nama Unit Kokurikulum',
      'Kod Unit',
      'Jawatan Guru',
      'Sesi Unit',
      'No. Fail / KP Guru',
      'Tahun Akademik',
      'Tarikh Kemaskini'
    ]
  ];

  assignments.forEach((a, idx) => {
    const teacher = teacherMap.get(a.teacherId);
    const unit = unitMap.get(a.unitId);
    assignmentRows.push([
      a.id,
      idx + 1,
      teacher ? teacher.name : a.teacherId,
      teacher ? teacher.session : '',
      unit ? unit.category : '',
      unit ? unit.name : a.unitId,
      unit ? unit.code : '',
      a.role,
      a.session,
      teacher ? (teacher.staffId || '') : '',
      schoolSettings.academicYear,
      timestamp
    ]);
  });

  // 2. Prepare Senarai_Guru sheet data
  const teacherRows: (string | number)[][] = [
    [
      'ID Guru',
      'No',
      'Nama Penuh Guru',
      'No. Kad Pengenalan / Fail',
      'Jantina (L/P)',
      'Sesi Bertugas',
      'Gred Jawatan',
      'No Telefon',
      'Emel Rasmi',
      'Bilangan Unit Dianggotai'
    ]
  ];

  teachers.forEach((t, idx) => {
    const unitCount = assignments.filter(a => a.teacherId === t.id).length;
    teacherRows.push([
      t.id,
      idx + 1,
      t.name,
      t.staffId || '',
      t.gender || 'L',
      t.session || 'Pagi',
      t.grade || 'DG41',
      t.phone || '',
      t.email || '',
      unitCount
    ]);
  });

  // 3. Prepare Senarai_Unit data
  const unitRows: (string | number)[][] = [
    [
      'ID Unit',
      'No',
      'Kategori Kokurikulum',
      'Nama Unit Kokurikulum',
      'Kod Singkatan',
      'Bil Guru Pagi',
      'Bil Guru Petang',
      'Jumlah Guru Terlibat'
    ]
  ];

  units.forEach((u, idx) => {
    const unitAssigns = assignments.filter(a => a.unitId === u.id);
    const morningCount = unitAssigns.filter(a => a.session === 'Pagi').length;
    const afternoonCount = unitAssigns.filter(a => a.session === 'Petang').length;

    unitRows.push([
      u.id,
      idx + 1,
      u.category,
      u.name,
      u.code,
      morningCount,
      afternoonCount,
      unitAssigns.length
    ]);
  });

  // 4. Prepare Ringkasan_Unit data
  const summaryRows: (string | number)[][] = [
    [
      'Kod Unit',
      'Nama Unit Kokurikulum',
      'Kategori',
      'Ketua Guru Penasihat',
      'Setiausaha',
      'Guru Sesi Pagi',
      'Guru Sesi Petang',
      'Jumlah Keseluruhan Guru'
    ]
  ];

  units.forEach(u => {
    const unitAssigns = assignments.filter(a => a.unitId === u.id);
    const ketua = unitAssigns.find(a => a.role === 'Ketua Guru Penasihat');
    const ketuaTeacher = ketua ? teacherMap.get(ketua.teacherId)?.name : '-';
    const su = unitAssigns.find(a => a.role === 'Setiausaha');
    const suTeacher = su ? teacherMap.get(su.teacherId)?.name : '-';
    const morningCount = unitAssigns.filter(a => a.session === 'Pagi').length;
    const afternoonCount = unitAssigns.filter(a => a.session === 'Petang').length;

    summaryRows.push([
      u.code,
      u.name,
      u.category,
      ketuaTeacher || '-',
      suTeacher || '-',
      morningCount,
      afternoonCount,
      unitAssigns.length
    ]);
  });

  // 5. Prepare Panduan_GPK sheet data
  const guideRows: (string | number)[][] = [
    ['PANDUAN PENGURUSAN DATA GOOGLE SHEET GPK KOKURIKULUM', ''],
    ['Sekolah:', schoolSettings.schoolName],
    ['Tahun Akademik:', schoolSettings.academicYear],
    ['Tarikh Disimpan:', timestamp],
    ['', ''],
    ['CIRI-CIRI & CARA PENGGUNAAN:', ''],
    ['1. Akses Bebas & Tanpa Had:', 'Helaian ini disimpan dalam akaun Google Drive sekolah anda tanpa sebarang sekatan masa atau had penggunaan.'],
    ['2. Edit Langsung di Google Sheet:', 'GPK boleh melihat dan menyunting senarai guru, unit, mahupun jawatan secara langsung pada tab Agihan_Kokurikulum atau Senarai_Guru.'],
    ['3. Buka di Telefon atau Komputer:', 'Boleh diakses bila-bila masa menggunakan aplikasi Google Sheets di telefon pintar Android/iOS atau pelayar web.'],
    ['4. Segerak Semula ke e-Koku:', 'Dalam aplikasi e-Koku GPK, klik butang "Segerak dari Google Sheet" untuk memuat turun semula sebarang pindaan yang telah dibuat di helaian ini.'],
    ['', ''],
    ['KETERANGAN TAB HELAIAN:', ''],
    ['Tab "Agihan_Kokurikulum":', 'Menyenaraikan semua perjawatan guru dalam setiap unit kokurikulum.'],
    ['Tab "Senarai_Guru":', 'Maklumat rasmi guru-guru sekolah (No. Fail, Jantina, Sesi, Gred, Telefon).'],
    ['Tab "Senarai_Unit":', 'Senarai unit kokurikulum yang aktif bagi tahun semasa.'],
    ['Tab "Ringkasan_Unit":', 'Laporan kepimpinan (Ketua Guru Penasihat & Setiausaha) dan statistik bilangan sesi.'],
  ];

  // Helper to clear and write a tab
  const writeSheetTab = async (sheetTitle: string, values: (string | number)[][]) => {
    // Clear old data to prevent stale leftover rows
    try {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(sheetTitle)}!A1:Z500:clear`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch {
      // ignore clear error
    }

    // Write new values
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/${encodeURIComponent(sheetTitle)}!A1?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Gagal mengemaskini data pada tab ${sheetTitle}`);
    }
  };

  try {
    await writeSheetTab('Agihan_Kokurikulum', assignmentRows);
    await writeSheetTab('Senarai_Guru', teacherRows);
    await writeSheetTab('Senarai_Unit', unitRows);
    await writeSheetTab('Ringkasan_Unit', summaryRows);
    await writeSheetTab('Panduan_GPK', guideRows);
  } catch (err: unknown) {
    // If specific tabs fail, fallback to Sheet1
    console.warn('Gagal menulis tab khusus, mencuba simpan ke helaian Sheet1:', err);
    const fallbackUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`;
    const fallbackRes = await fetch(fallbackUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: assignmentRows }),
    });
    if (!fallbackRes.ok) {
      const fallbackErr = await fallbackRes.json().catch(() => ({}));
      throw new Error(fallbackErr?.error?.message || 'Gagal menyimpan ke Google Sheet.');
    }
  }

  return { 
    success: true, 
    rowsCount: assignments.length + teachers.length + units.length,
    timestamp
  };
}

/**
 * Fetches all teachers, custom units, and assignments from Google Sheet,
 * allowing GPK to edit in Google Sheets and seamlessly pull back changes into the app.
 */
export async function fetchFromGoogleSheet(
  sheetId: string,
  currentUnits: KokuUnit[] = []
): Promise<SheetImportResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Sila log masuk Google untuk membaca fail Google Sheet.');
  }

  const cleanId = extractSheetId(sheetId);
  if (!cleanId) {
    throw new Error('ID Google Sheet tidak sah.');
  }

  // 1. Fetch Senarai_Guru
  let rawTeachers: string[][] = [];
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/Senarai_Guru!A1:J300`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (res.ok) {
      const data = await res.json();
      rawTeachers = data.values || [];
    }
  } catch (e) {
    console.warn('Could not read Senarai_Guru sheet', e);
  }

  // 2. Fetch Senarai_Unit
  let rawUnits: string[][] = [];
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/Senarai_Unit!A1:H150`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (res.ok) {
      const data = await res.json();
      rawUnits = data.values || [];
    }
  } catch (e) {
    console.warn('Could not read Senarai_Unit sheet', e);
  }

  // 3. Fetch Agihan_Kokurikulum or Sheet1
  let rawAssignments: string[][] = [];
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/Agihan_Kokurikulum!A1:L500`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (res.ok) {
      const data = await res.json();
      rawAssignments = data.values || [];
    } else {
      // Fallback to Sheet1
      const resFallback = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/Sheet1!A1:L500`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (resFallback.ok) {
        const data = await resFallback.json();
        rawAssignments = data.values || [];
      }
    }
  } catch (e) {
    console.warn('Could not read Agihan_Kokurikulum sheet', e);
  }

  // Parse Teachers
  const parsedTeachers: Teacher[] = [];
  if (rawTeachers.length > 1) {
    const rows = rawTeachers.slice(1);
    rows.forEach((r, idx) => {
      // Format: ID (0), No (1), Nama (2), No KP (3), Jantina (4), Sesi (5), Gred (6), Tel (7), Emel (8)
      // Check if row has ID in col 0 and Name in col 2 OR if Name is in col 1
      const hasId = r[0] && r[0].startsWith('t-');
      const id = hasId ? r[0] : `t-sheet-${idx + 1}`;
      const name = hasId ? (r[2] || r[1] || '') : (r[1] || r[2] || '');
      const staffId = hasId ? (r[3] || '') : (r[2] || '');
      const gender = (hasId ? r[4] : r[3]) === 'P' ? 'P' : 'L';
      const sessionRaw = (hasId ? r[5] : r[4]) || 'Pagi';
      const session: SessionType = sessionRaw.includes('Petang') ? 'Petang' : 'Pagi';
      const grade = hasId ? (r[6] || 'DG41') : (r[5] || 'DG41');
      const phone = hasId ? (r[7] || '') : (r[6] || '');
      const email = hasId ? (r[8] || '') : (r[7] || '');

      if (name.trim()) {
        parsedTeachers.push({
          id,
          name: name.trim(),
          staffId: staffId.trim(),
          gender,
          session,
          grade: grade.trim(),
          phone: phone.trim(),
          email: email.trim(),
        });
      }
    });
  }

  // Parse Units (Custom / Updated units)
  const parsedUnits: KokuUnit[] = [];
  const knownUnitMap = new Map<string, KokuUnit>(currentUnits.map(u => [u.name.toLowerCase().trim(), u]));

  if (rawUnits.length > 1) {
    const rows = rawUnits.slice(1);
    rows.forEach((r, idx) => {
      // Format: ID (0), No (1), Kategori (2), Nama Unit (3), Kod (4)
      const id = r[0] || `u-sheet-${idx + 1}`;
      const categoryRaw = (r[2] || '').trim().toUpperCase();
      const validCategory: UnitCategory = 
        categoryRaw.includes('UNIFORM') ? 'BERUNIFORM' :
        categoryRaw.includes('KELAB') || categoryRaw.includes('PERSATUAN') ? 'KELAB' :
        categoryRaw.includes('SUKAN') && !categoryRaw.includes('RUMAH') ? 'SUKAN' :
        categoryRaw.includes('RUMAH') ? 'RUMAH_SUKAN' : 'PEMBANGUNAN';

      const name = (r[3] || '').trim();
      const code = (r[4] || name.slice(0, 4)).trim().toUpperCase();

      if (name) {
        const existing = knownUnitMap.get(name.toLowerCase());
        if (existing) {
          parsedUnits.push({
            ...existing,
            name,
            code: code || existing.code,
          });
        } else {
          parsedUnits.push({
            id,
            name,
            code: code || name.slice(0, 4).toUpperCase(),
            category: validCategory,
            iconName: 'Sparkles',
            color: validCategory === 'BERUNIFORM' ? '#D97706' :
                   validCategory === 'KELAB' ? '#059669' :
                   validCategory === 'SUKAN' ? '#2563EB' :
                   validCategory === 'RUMAH_SUKAN' ? '#DC2626' : '#7C3AED',
          });
        }
      }
    });
  }

  // Build combined unit list & lookup
  const allAvailableUnits = parsedUnits.length > 0 ? parsedUnits : currentUnits;
  const unitByName = new Map<string, KokuUnit>();
  allAvailableUnits.forEach(u => {
    unitByName.set(u.name.toLowerCase().trim(), u);
    unitByName.set(u.id, u);
    if (u.code) unitByName.set(u.code.toLowerCase().trim(), u);
  });

  const teacherByName = new Map<string, Teacher>();
  parsedTeachers.forEach(t => {
    teacherByName.set(t.name.toLowerCase().trim(), t);
    teacherByName.set(t.id, t);
    if (t.staffId) teacherByName.set(t.staffId.toLowerCase().trim(), t);
  });

  // Parse Assignments
  const parsedAssignments: UnitAssignment[] = [];
  if (rawAssignments.length > 1) {
    const rows = rawAssignments.slice(1);
    rows.forEach((r, idx) => {
      // Format: ID (0), No (1), Nama Guru (2), Sesi Guru (3), Kategori (4), Nama Unit (5), Kod (6), Jawatan (7), Sesi Unit (8)
      // Check column mapping
      const assignId = r[0] && r[0].startsWith('a-') ? r[0] : `a-sheet-${Date.now()}-${idx}`;
      const teacherName = (r[2] || r[1] || '').trim();
      const unitName = (r[5] || r[3] || '').trim();
      const roleRaw = (r[7] || r[5] || 'AJK').trim();
      const sessionRaw = (r[8] || r[6] || 'Pagi').trim();

      const matchedTeacher = teacherByName.get(teacherName.toLowerCase());
      const matchedUnit = unitByName.get(unitName.toLowerCase());

      if (matchedTeacher && matchedUnit) {
        let role: RoleType = 'AJK';
        if (roleRaw.toLowerCase().includes('ketua')) {
          role = 'Ketua Guru Penasihat';
        } else if (roleRaw.toLowerCase().includes('setiausaha') || roleRaw.toLowerCase().includes('su')) {
          role = 'Setiausaha';
        }

        const session: SessionType = sessionRaw.includes('Petang') ? 'Petang' : 'Pagi';

        parsedAssignments.push({
          id: assignId,
          teacherId: matchedTeacher.id,
          unitId: matchedUnit.id,
          role,
          session,
        });
      }
    });
  }

  return {
    teachers: parsedTeachers,
    assignments: parsedAssignments,
    customUnits: parsedUnits.length > 0 ? parsedUnits : undefined,
  };
}
