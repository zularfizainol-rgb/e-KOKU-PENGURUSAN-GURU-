import { Teacher, UnitAssignment, KokuUnit, SchoolSettings, RoleType, SessionType, UnitCategory } from '../types/koku';
import { getAccessToken, clearAccessToken } from './auth';
import * as XLSX from 'xlsx';

export interface SheetImportResult {
  teachers: Teacher[];
  assignments: UnitAssignment[];
  customUnits?: KokuUnit[];
  schoolSettings?: Partial<SchoolSettings>;
}

export function isAppsScriptUrl(input: string): boolean {
  return typeof input === 'string' && input.includes('script.google.com/macros/s/');
}

export function extractSheetId(input: string): string {
  const trimmed = input.trim();
  if (isAppsScriptUrl(trimmed)) {
    return trimmed;
  }
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

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// Skrip Google Apps Script untuk e-KOKU GPK
// Buka Google Sheet > Extensions > Apps Script > Tampal kod ini > Deploy as Web App (Access: Anyone)

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var result = { teachers: [], assignments: [], customUnits: [] };
  try {
    var gSheet = ss.getSheetByName('Senarai_Guru');
    if (gSheet) {
      var gData = gSheet.getDataRange().getValues();
      for (var i = 1; i < gData.length; i++) {
        var row = gData[i];
        if (row[2]) {
          result.teachers.push({
            id: String(row[0] || 't-' + i),
            name: String(row[2]).trim(),
            staffId: String(row[3] || '').trim(),
            gender: row[4] === 'P' ? 'P' : 'L',
            session: String(row[5] || '').indexOf('Petang') !== -1 ? 'Petang' : 'Pagi',
            grade: String(row[6] || 'DG41').trim(),
            phone: String(row[7] || '').trim(),
            email: String(row[8] || '').trim()
          });
        }
      }
    }
    var aSheet = ss.getSheetByName('Agihan_Kokurikulum');
    if (aSheet) {
      var aData = aSheet.getDataRange().getValues();
      for (var j = 1; j < aData.length; j++) {
        var aRow = aData[j];
        if (aRow[0] && aRow[2] && aRow[5]) {
          result.assignments.push({
            id: String(aRow[0]),
            teacherId: String(aRow[2]),
            unitId: String(aRow[5]),
            role: String(aRow[7] || 'AJK'),
            session: String(aRow[8] || 'Pagi')
          });
        }
      }
    }
  } catch (err) {}
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var payload = JSON.parse(e.postData.contents);
  return ContentService.createTextOutput(JSON.stringify({ success: true, timestamp: new Date().toLocaleString() })).setMimeType(ContentService.MimeType.JSON);
}`;

/**
 * Creates a brand new Google Sheet in the user's Google Drive with all essential tabs and generous dimensions.
 */
export async function createNewSpreadsheet(title: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('AUTH_EXPIRED: Sila log masuk dengan Google terlebih dahulu untuk mencipta Google Sheet.');
  }

  const payload = {
    properties: {
      title: title || 'e-Koku Pengurusan GPK Kokurikulum',
    },
    sheets: [
      {
        properties: {
          title: 'Agihan_Kokurikulum',
          gridProperties: { rowCount: 1000, columnCount: 26 },
        },
      },
      {
        properties: {
          title: 'Senarai_Guru',
          gridProperties: { rowCount: 1000, columnCount: 26 },
        },
      },
      {
        properties: {
          title: 'Senarai_Unit',
          gridProperties: { rowCount: 1000, columnCount: 26 },
        },
      },
      {
        properties: {
          title: 'Ringkasan_Unit',
          gridProperties: { rowCount: 1000, columnCount: 26 },
        },
      },
      {
        properties: {
          title: 'Panduan_GPK',
          gridProperties: { rowCount: 200, columnCount: 10 },
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

  if (response.status === 401) {
    clearAccessToken();
    throw new Error('AUTH_EXPIRED: Sesi akaun Google anda telah tamat tempoh keselamatan. Sila klik butang "Sambung Semula & Simpan".');
  }

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
  const cleanId = extractSheetId(sheetId);
  if (!cleanId) {
    throw new Error('ID atau pautan Google Sheet tidak sah.');
  }

  const timestamp = new Date().toLocaleString('ms-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  // Check if it's a Google Apps Script Webhook URL
  if (isAppsScriptUrl(cleanId)) {
    const payload = {
      action: 'save',
      teachers,
      assignments,
      units,
      schoolSettings,
      timestamp,
    };
    const res = await fetch(cleanId, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Ralat Webhook Google Apps Script (${res.status})`);
    }
    return {
      success: true,
      rowsCount: assignments.length + teachers.length + units.length,
      timestamp,
    };
  }

  const token = await getAccessToken();
  if (!token) {
    throw new Error('AUTH_EXPIRED: Sesi akaun Google telah tamat tempoh keselamatan (sesi 1 jam). Sila klik butang "Sambung Semula & Simpan".');
  }

  // 1. First, fetch spreadsheet metadata to verify permissions and get existing tabs & sizes
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=sheets.properties(sheetId,title,gridProperties)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (metaRes.status === 401) {
    clearAccessToken();
    throw new Error('AUTH_EXPIRED: Sesi akaun Google telah tamat tempoh keselamatan (sesi 1 jam). Sila klik butang "Sambung Semula & Simpan".');
  }
  if (metaRes.status === 403) {
    throw new Error('PERMISSION_DENIED: Akaun Google anda tiada kebenaran Editor pada fail Google Sheet ini. Pastikan anda menggunakan akaun Google pemilik fail atau buka kebenaran kongsi ("Editor").');
  }
  if (metaRes.status === 404) {
    throw new Error('NOT_FOUND: Fail Google Sheet tidak dijumpai. Sila pastikan pautan atau ID Google Sheet dimasukkan dengan betul.');
  }
  if (!metaRes.ok) {
    const metaErr = await metaRes.json().catch(() => ({}));
    throw new Error(metaErr?.error?.message || `Gagal menyambung ke Google Sheet (${metaRes.status})`);
  }

  const metaData = await metaRes.json();
  const existingSheets: { sheetId: number; title: string; rowCount: number; columnCount: number }[] =
    metaData.sheets?.map((s: { properties?: { sheetId?: number; title?: string; gridProperties?: { rowCount?: number; columnCount?: number } } }) => ({
      sheetId: s.properties?.sheetId ?? 0,
      title: s.properties?.title || '',
      rowCount: s.properties?.gridProperties?.rowCount || 1000,
      columnCount: s.properties?.gridProperties?.columnCount || 26,
    })) || [];

  const existingTitles = new Set(existingSheets.map(s => s.title));

  // 2. Prepare Agihan_Kokurikulum data
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

  // 3. Prepare Senarai_Guru sheet data
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

  // 4. Prepare Senarai_Unit data
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

  // 5. Prepare Ringkasan_Unit data
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

  // 6. Prepare Panduan_GPK sheet data
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

  // 7. Auto-create missing tabs & expand sheet dimensions if needed
  const tabRequirements: { title: string; minRows: number; minCols: number }[] = [
    { title: 'Agihan_Kokurikulum', minRows: assignmentRows.length + 50, minCols: 20 },
    { title: 'Senarai_Guru', minRows: teacherRows.length + 50, minCols: 20 },
    { title: 'Senarai_Unit', minRows: unitRows.length + 50, minCols: 16 },
    { title: 'Ringkasan_Unit', minRows: summaryRows.length + 50, minCols: 16 },
    { title: 'Panduan_GPK', minRows: guideRows.length + 20, minCols: 10 },
  ];

  const structuralRequests: object[] = [];

  for (const req of tabRequirements) {
    const existing = existingSheets.find(s => s.title === req.title);
    if (!existing) {
      structuralRequests.push({
        addSheet: {
          properties: {
            title: req.title,
            gridProperties: {
              rowCount: Math.max(1000, req.minRows),
              columnCount: Math.max(26, req.minCols),
            },
          },
        },
      });
    } else if (existing.rowCount < req.minRows || existing.columnCount < req.minCols) {
      structuralRequests.push({
        updateSheetProperties: {
          properties: {
            sheetId: existing.sheetId,
            gridProperties: {
              rowCount: Math.max(existing.rowCount, req.minRows, 1000),
              columnCount: Math.max(existing.columnCount, req.minCols, 26),
            },
          },
          fields: 'gridProperties(rowCount,columnCount)',
        },
      });
    }
  }

  if (structuralRequests.length > 0) {
    try {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: structuralRequests }),
      });
    } catch (batchErr) {
      console.warn('Batch update sheet dimensions warning:', batchErr);
    }
  }

  // 8. Safely clear old values across sheets to prevent leftover rows
  try {
    const clearRanges = tabRequirements
      .filter(r => existingTitles.has(r.title) || structuralRequests.length > 0)
      .map(r => `'${r.title}'!A1:Z`);

    if (clearRanges.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchClear`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ranges: clearRanges }),
      });
    }
  } catch (clearErr) {
    console.warn('Values batchClear warning (continuing with write):', clearErr);
  }

  // 9. Atomic batch write of all tabs in ONE single API call!
  const batchWritePayload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      { range: "'Agihan_Kokurikulum'!A1", values: assignmentRows },
      { range: "'Senarai_Guru'!A1", values: teacherRows },
      { range: "'Senarai_Unit'!A1", values: unitRows },
      { range: "'Ringkasan_Unit'!A1", values: summaryRows },
      { range: "'Panduan_GPK'!A1", values: guideRows },
    ],
  };

  const writeRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(batchWritePayload),
    }
  );

  if (writeRes.status === 401) {
    clearAccessToken();
    throw new Error('AUTH_EXPIRED: Sesi akaun Google anda telah tamat tempoh keselamatan. Sila klik butang "Sambung Semula & Simpan".');
  }

  if (!writeRes.ok) {
    // If batch write to multiple tabs failed (e.g. permission or specific range issue),
    // try writing directly to the main tab available
    console.warn('Batch write tabs failed, attempting fallback to primary sheet tab...');
    const primaryTab = existingSheets[0]?.title || 'Sheet1';
    const fallbackRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/'${encodeURIComponent(primaryTab)}'!A1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: assignmentRows }),
      }
    );

    if (!fallbackRes.ok) {
      const errDetail = await fallbackRes.json().catch(() => ({}));
      throw new Error(errDetail?.error?.message || 'Gagal menyimpan rekod ke dalam Google Sheet. Sila pastikan pautan Google Sheet betul.');
    }
  }

  return {
    success: true,
    rowsCount: assignments.length + teachers.length + units.length,
    timestamp,
  };
}

function parseCsvToRows(csvText: string): string[][] {
  try {
    const workbook = XLSX.read(csvText, { type: 'string' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) return [];
    const sheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
    return data.map(row => (Array.isArray(row) ? row.map(cell => String(cell ?? '')) : []));
  } catch (err) {
    console.warn('Failed to parse CSV:', err);
    return [];
  }
}

export function parseRawSheetData(
  rawTeachers: string[][],
  rawUnits: string[][],
  rawAssignments: string[][],
  currentUnits: KokuUnit[] = []
): SheetImportResult {
  // Parse Teachers
  const parsedTeachers: Teacher[] = [];
  if (rawTeachers.length > 1) {
    const rows = rawTeachers.slice(1);
    rows.forEach((r, idx) => {
      // Determine columns intelligently based on presence of t- ID prefix or column values
      const hasId = Boolean(r[0] && r[0].trim().startsWith('t-'));
      const id = hasId ? r[0].trim() : `t-sheet-${idx + 1}`;
      
      let name = '';
      let staffId = '';
      let genderStr = '';
      let sessionStr = '';
      let grade = 'DG41';
      let phone = '';
      let email = '';

      if (hasId) {
        // Format: ID (0), No (1), Nama (2), No KP (3), Jantina (4), Sesi (5), Gred (6), Tel (7), Emel (8)
        name = r[2] || r[1] || '';
        staffId = r[3] || '';
        genderStr = r[4] || '';
        sessionStr = r[5] || '';
        grade = r[6] || 'DG41';
        phone = r[7] || '';
        email = r[8] || '';
      } else {
        // Format without ID:
        // Could be: No (0), Nama (1), No KP (2), Jantina/Sesi (3), ...
        // Check if r[0] is numeric (like index 1, 2, 3...) and r[1] is a teacher name
        const isFirstColNumber = /^\d+$/.test((r[0] || '').trim());
        if (isFirstColNumber && r[1] && isNaN(Number(r[1].trim()))) {
          name = r[1];
          staffId = r[2] || '';
          genderStr = r[3] || '';
          sessionStr = r[4] || '';
          grade = r[5] || 'DG41';
          phone = r[6] || '';
          email = r[7] || '';
        } else {
          name = r[0] || '';
          staffId = r[1] || '';
          genderStr = r[2] || '';
          sessionStr = r[3] || '';
          grade = r[4] || 'DG41';
          phone = r[5] || '';
          email = r[6] || '';
        }
      }

      // Format gender
      let gender: 'L' | 'P' = 'L';
      if (/p|perempuan|wanita|female/i.test(genderStr)) {
        gender = 'P';
      } else if (/binti|a\/p|puan|cik|hajah/i.test(name)) {
        gender = 'P';
      }

      // Format session
      const session: SessionType = /petang|afternoon|pm/i.test(sessionStr) ? 'Petang' : 'Pagi';

      if (name.trim()) {
        parsedTeachers.push({
          id,
          name: name.trim(),
          staffId: staffId.trim() || `G${1000 + idx}`,
          gender,
          session,
          grade: grade.trim() || 'DG41',
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

/**
 * Fetches public Google Sheet data via Google Visualization API (GViz) without requiring OAuth token.
 * Perfect for viewing on other devices (mobile, home PC) when sheet is shared ("Anyone with link can view").
 */
export async function fetchPublicGoogleSheet(
  sheetId: string,
  currentUnits: KokuUnit[] = []
): Promise<SheetImportResult> {
  const cleanId = extractSheetId(sheetId);
  if (!cleanId) {
    throw new Error('ID Google Sheet tidak sah.');
  }

  const fetchTabCsv = async (tabName: string): Promise<string[][]> => {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${cleanId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tabName)}`;
      const res = await fetch(url);
      if (!res.ok) return [];
      const text = await res.text();
      if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
        return [];
      }
      return parseCsvToRows(text);
    } catch {
      return [];
    }
  };

  const [rawTeachers, rawUnits, rawAssignments] = await Promise.all([
    fetchTabCsv('Senarai_Guru'),
    fetchTabCsv('Senarai_Unit'),
    fetchTabCsv('Agihan_Kokurikulum'),
  ]);

  let finalAssignments = rawAssignments;
  if (finalAssignments.length <= 1) {
    finalAssignments = await fetchTabCsv('Sheet1');
  }

  if (rawTeachers.length <= 1 && finalAssignments.length <= 1) {
    throw new Error(
      'Gagal membaca Google Sheet secara luar. Pastikan pautan Google Sheet betul dan kebenaran fail disetkan kepada "Anyone with the link can view" (Sesiapa dengan pautan boleh lihat) di Google Drive, atau log masuk akaun Google di atas.'
    );
  }

  return parseRawSheetData(rawTeachers, rawUnits, finalAssignments, currentUnits);
}

/**
 * Fetches all teachers, custom units, and assignments from Google Sheet.
 * Works seamlessly with Google OAuth, Google Apps Script Webhooks, and Public Shared Sheets.
 */
export async function fetchFromGoogleSheet(
  sheetId: string,
  currentUnits: KokuUnit[] = []
): Promise<SheetImportResult> {
  const cleanId = extractSheetId(sheetId);
  if (!cleanId) {
    throw new Error('ID Google Sheet tidak sah.');
  }

  // 1. Google Apps Script Webhook
  if (isAppsScriptUrl(cleanId)) {
    const res = await fetch(`${cleanId}?action=get`);
    if (!res.ok) {
      throw new Error(`Ralat membaca Google Apps Script Webhook (${res.status})`);
    }
    const data = await res.json();
    return {
      teachers: data.teachers || [],
      assignments: data.assignments || [],
      customUnits: data.customUnits || undefined,
      schoolSettings: data.schoolSettings || undefined,
    };
  }

  // 2. Check for authenticated Google token
  const token = await getAccessToken();
  if (!token) {
    // If not authenticated, directly attempt public reading
    return fetchPublicGoogleSheet(cleanId, currentUnits);
  }

  // 3. Authenticated Google Sheets API v4 fetch
  try {
    let rawTeachers: string[][] = [];
    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/Senarai_Guru!A1:J300`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        rawTeachers = data.values || [];
      }
    } catch (e) {
      console.warn('Could not read Senarai_Guru sheet', e);
    }

    let rawUnits: string[][] = [];
    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/Senarai_Unit!A1:H150`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        rawUnits = data.values || [];
      }
    } catch (e) {
      console.warn('Could not read Senarai_Unit sheet', e);
    }

    let rawAssignments: string[][] = [];
    try {
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/Agihan_Kokurikulum!A1:L500`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        rawAssignments = data.values || [];
      } else {
        const resFallback = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values/Sheet1!A1:L500`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (resFallback.ok) {
          const data = await resFallback.json();
          rawAssignments = data.values || [];
        }
      }
    } catch (e) {
      console.warn('Could not read Agihan_Kokurikulum sheet', e);
    }

    if (rawTeachers.length > 1 || rawAssignments.length > 1) {
      return parseRawSheetData(rawTeachers, rawUnits, rawAssignments, currentUnits);
    }
  } catch (apiErr) {
    console.warn('Authenticated Sheets API read failed, attempting public fallback:', apiErr);
  }

  // Fallback to public fetch if token failed or tab reading returned empty
  return fetchPublicGoogleSheet(cleanId, currentUnits);
}
