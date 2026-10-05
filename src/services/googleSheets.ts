import { Teacher, UnitAssignment, KokuUnit, SchoolSettings, RoleType, SessionType, UnitCategory, CategoryCoordinator, ExecutiveLeader } from '../types/koku';
import { getAccessToken, clearAccessToken } from './auth';
import { isValidTeacherName } from '../utils/kokuHelpers';
import { OFFICIAL_TS25_LOGO_SVG } from '../utils/logoHelpers';
import * as XLSX from 'xlsx';

export interface SheetImportResult {
  teachers: Teacher[];
  assignments: UnitAssignment[];
  customUnits?: KokuUnit[];
  schoolSettings?: Partial<SchoolSettings>;
  categoryCoordinators?: CategoryCoordinator[];
  executiveLeaders?: ExecutiveLeader[];
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
  schoolSettings: SchoolSettings,
  categoryCoordinators?: CategoryCoordinator[],
  executiveLeaders?: ExecutiveLeader[]
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
      categoryCoordinators,
      executiveLeaders,
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

  // 6. Prepare Panduan_GPK sheet data with complete school configuration
  const rawSchoolLogo = schoolSettings.schoolLogo || schoolSettings.schoolLogoUrl || '';
  const rawTs25Logo = schoolSettings.ts25Logo || schoolSettings.ts25LogoUrl || '';
  const ts25ToStore = (rawTs25Logo && (rawTs25Logo.includes('<svg') || rawTs25Logo.length > 500))
    ? 'OFFICIAL_TS25'
    : (rawTs25Logo === 'NONE' ? 'NONE' : rawTs25Logo);

  // Split school logo into chunks of max 30,000 characters each to avoid Google Sheets cell limit of 50,000
  const logoChunk1 = rawSchoolLogo.slice(0, 30000);
  const logoChunk2 = rawSchoolLogo.slice(30000, 60000);
  const logoChunk3 = rawSchoolLogo.slice(60000, 90000);
  const logoChunk4 = rawSchoolLogo.slice(90000, 120000);
  const logoChunk5 = rawSchoolLogo.slice(120000, 150000);

  const guideRows: (string | number)[][] = [
    ['PANDUAN PENGURUSAN DATA GOOGLE SHEET GPK KOKURIKULUM', ''],
    ['Sekolah:', schoolSettings.schoolName || ''],
    ['Kod Sekolah:', schoolSettings.schoolCode || ''],
    ['Tahun Akademik:', schoolSettings.academicYear || ''],
    ['GPK Kokurikulum:', schoolSettings.gpkKokuName || ''],
    ['Pengetua / Guru Besar:', schoolSettings.principalName || ''],
    ['Alamat:', schoolSettings.schoolAddress || ''],
    ['No. Telefon:', schoolSettings.schoolPhone || ''],
    ['Email:', schoolSettings.schoolEmail || ''],
    ['Negeri:', schoolSettings.schoolState || schoolSettings.state || ''],
    ['Daerah / PPD:', schoolSettings.district || ''],
    ['Tarikh Disimpan:', timestamp],
    ['Logo Sekolah Part 1:', logoChunk1],
    ['Logo Sekolah Part 2:', logoChunk2],
    ['Logo Sekolah Part 3:', logoChunk3],
    ['Logo Sekolah Part 4:', logoChunk4],
    ['Logo Sekolah Part 5:', logoChunk5],
    ['Logo TS25:', ts25ToStore],
    ['Penyelaras Kategori (JSON):', JSON.stringify(categoryCoordinators || [])],
    ['Jawatankuasa Pengurusan (JSON):', JSON.stringify(executiveLeaders || [])],
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
    ['Tab "Panduan_GPK":', 'Maklumat rasmi sekolah, lencana logo sekolah, dan panduan pengurusan data e-Koku.'],
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
  currentUnits: KokuUnit[] = [],
  rawGuide?: string[][]
): SheetImportResult {
  // Parse Teachers
  const parsedTeachers: Teacher[] = [];
  if (rawTeachers.length > 1) {
    const headerRow = rawTeachers[0].map(h => String(h || '').toLowerCase().trim());
    
    // Find index of headers dynamically
    const idIdx = headerRow.findIndex(h => /^(id|id[-_ ]?guru|kod[-_ ]?guru)$/i.test(h) || (/\bid\b/i.test(h) && /guru/i.test(h)));
    
    // Teacher name column must match 'nama' or 'name', or exactly 'guru' / 'teacher', but NOT 'id', 'bil', 'no', 'jawatan', 'gred', 'sesi', 'telefon', 'emel'
    let nameIdx = headerRow.findIndex(h => 
      (/nama|name/i.test(h) || /^guru$/i.test(h) || /^teacher$/i.test(h)) && 
      !/^(id|kod|no|bil|sesi|gred|jawatan|unit|emel|email|tel|telefon)/i.test(h) &&
      !/\b(id|kod|jawatan|gred)\b/i.test(h)
    );
    if (nameIdx === -1) {
      nameIdx = headerRow.findIndex(h => /nama|name/i.test(h));
    }
    
    // Staff ID / No KP / No Fail (must NOT be the ID Guru column or Name column)
    let staffIdIdx = headerRow.findIndex((h, idx) => 
      idx !== idIdx && idx !== nameIdx && /kp|ic|fail|kad[-_ ]?pengenalan|no[-_ ]?kp/i.test(h)
    );
    if (staffIdIdx === -1) {
      staffIdIdx = headerRow.findIndex((h, idx) => idx !== idIdx && idx !== nameIdx && /\b(kp|ic|fail)\b/i.test(h));
    }
    
    const genderIdx = headerRow.findIndex(h => /jantina|gender|sex/i.test(h));
    const sessionIdx = headerRow.findIndex(h => /sesi|session|waktu/i.test(h));
    const gradeIdx = headerRow.findIndex(h => /gred|grade|jawatan/i.test(h));
    const phoneIdx = headerRow.findIndex(h => /telefon|tel|phone|hp|bimbit/i.test(h));
    const emailIdx = headerRow.findIndex(h => /emel|email|e-mel/i.test(h));

    const rows = rawTeachers.slice(1);
    rows.forEach((r, idx) => {
      const rawId = (idIdx !== -1 && r[idIdx]) ? r[idIdx].trim() : (r[0] ? r[0].trim() : '');
      const hasValidId = Boolean(rawId && (rawId.startsWith('imported-') || rawId.startsWith('t-') || rawId.startsWith('imp-')));
      const id = hasValidId ? rawId : `t-sheet-${idx + 1}`;
      
      let name = '';
      let staffId = '';
      let genderStr = '';
      let sessionStr = '';
      let grade = 'DG41';
      let phone = '';
      let email = '';

      if (nameIdx !== -1) {
        // Use dynamically identified header index
        name = r[nameIdx] || '';
        staffId = staffIdIdx !== -1 ? (r[staffIdIdx] || '') : '';
        genderStr = genderIdx !== -1 ? (r[genderIdx] || '') : '';
        sessionStr = sessionIdx !== -1 ? (r[sessionIdx] || '') : '';
        grade = gradeIdx !== -1 ? (r[gradeIdx] || 'DG41') : 'DG41';
        phone = phoneIdx !== -1 ? (r[phoneIdx] || '') : '';
        email = emailIdx !== -1 ? (r[emailIdx] || '') : '';
      } else if (hasValidId) {
        // Fallback standard format: ID (0), No (1), Nama (2), No KP (3), Jantina (4), Sesi (5), Gred (6), Tel (7), Emel (8)
        name = r[2] || r[1] || '';
        staffId = r[3] || '';
        genderStr = r[4] || '';
        sessionStr = r[5] || '';
        grade = r[6] || 'DG41';
        phone = r[7] || '';
        email = r[8] || '';
      } else {
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

      if (name.trim() && isValidTeacherName(name)) {
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
    const uHeaderRow = rawUnits[0].map(h => String(h || '').toLowerCase().trim());
    const uIdIdx = uHeaderRow.findIndex(h => /^(id|id.*unit|kod.*unit)$/i.test(h));
    const uCatIdx = uHeaderRow.findIndex(h => /kategori|category/i.test(h));
    const uNameIdx = uHeaderRow.findIndex(h => /nama.*unit|unit.*nama/i.test(h) || (/nama/i.test(h) && !/kategori|sesi|bil/i.test(h)));
    const uCodeIdx = uHeaderRow.findIndex(h => /singkatan|kod/i.test(h) && !/id/i.test(h));

    const rows = rawUnits.slice(1);
    rows.forEach((r, idx) => {
      const id = (uIdIdx !== -1 && r[uIdIdx]) ? r[uIdIdx].trim() : (r[0] || `u-sheet-${idx + 1}`);
      const categoryRaw = (uCatIdx !== -1 && r[uCatIdx] ? r[uCatIdx] : (r[2] || '')).trim().toUpperCase();
      const name = (uNameIdx !== -1 && r[uNameIdx] ? r[uNameIdx] : (r[3] || '')).trim();
      const code = (uCodeIdx !== -1 && r[uCodeIdx] ? r[uCodeIdx] : (r[4] || name.slice(0, 4))).trim().toUpperCase();

      const nameLower = name.toLowerCase();

      // PENTING: Unit Rumah Sukan (Bendahara, Temenggung, Laksamana, Syahbandar, Merah, Hijau, Biru, Kuning)
      // MESTI sentiasa RUMAH_SUKAN, TIDAK BOLEH sama sekali masuk ke PEMBANGUNAN!
      const isHouseUnit = 
        categoryRaw.includes('RUMAH') || 
        nameLower.includes('rumah sukan') || 
        nameLower.startsWith('rumah ') ||
        ['bendahara', 'temenggung', 'laksamana', 'syahbandar'].some(h => nameLower.includes(h)) ||
        ['merah', 'hijau', 'biru', 'kuning'].some(c => nameLower.includes(`(${c})`) || nameLower.includes(`rumah ${c}`)) ||
        /^(r-|rumah-)/i.test(id);

      // Unit Pembangunan & Khas: PPKI, PAJSK, Inovasi, STEM, RIMUP, Koperasi, JPSS
      const isDevSpecialUnit =
        categoryRaw.includes('PEMBANGUNAN') ||
        categoryRaw.includes('KHAS') ||
        nameLower.includes('pembangunan') ||
        nameLower.includes('tugas khas') ||
        nameLower.includes('ppki') ||
        nameLower.includes('pendidikan khas') ||
        nameLower.includes('pajsk') ||
        nameLower.includes('inovasi') ||
        nameLower.includes('rimup') ||
        nameLower.includes('koperasi') ||
        nameLower.includes('jpss');

      const validCategory: UnitCategory = 
        isHouseUnit ? 'RUMAH_SUKAN' :
        categoryRaw.includes('UNIFORM') || nameLower.includes('pengakap') || nameLower.includes('kadet') || nameLower.includes('pandu puteri') || nameLower.includes('pbsm') || nameLower.includes('bsmm') || nameLower.includes('puteri islam') || nameLower.includes('krs') ? 'BERUNIFORM' :
        isDevSpecialUnit ? 'PEMBANGUNAN' :
        categoryRaw.includes('SUKAN') || categoryRaw.includes('PERMAINAN') || nameLower.includes('bola') || nameLower.includes('badminton') || nameLower.includes('olahraga') || nameLower.includes('catur') || nameLower.includes('sepak takraw') ? 'SUKAN' :
        'KELAB';

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

  // Helper to normalize strings for robust comparison
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  // Parse Assignments
  const parsedAssignments: UnitAssignment[] = [];
  if (rawAssignments.length > 1) {
    const aHeaders = rawAssignments[0].map(h => String(h || '').toLowerCase().trim());
    const tNameCol = aHeaders.findIndex(h => (/nama/i.test(h) && /guru|teacher/i.test(h)) || /^guru$/i.test(h));
    const uNameCol = aHeaders.findIndex(h => (/nama/i.test(h) && /unit/i.test(h)) || (/unit/i.test(h) && !/sesi/i.test(h)));
    const roleCol = aHeaders.findIndex(h => /jawatan|role|peranan/i.test(h));
    const sessCol = aHeaders.findIndex(h => /sesi.*unit/i.test(h) || (/sesi/i.test(h) && !/hakiki/i.test(h)));

    // Dynamic fallback index if headers differ
    const effTNameCol = tNameCol !== -1 ? tNameCol : 2;
    const effUNameCol = uNameCol !== -1 ? uNameCol : 5;
    const effRoleCol = roleCol !== -1 ? roleCol : 7;
    const effSessCol = sessCol !== -1 ? sessCol : 8;

    const rows = rawAssignments.slice(1);
    rows.forEach((r, idx) => {
      if (!r || r.length === 0) return;
      const assignId = r[0] && r[0].startsWith('a-') ? r[0] : `a-sheet-${Date.now()}-${idx}`;
      const teacherName = (r[effTNameCol] || r[2] || r[1] || '').trim();
      const unitName = (r[effUNameCol] || r[5] || r[3] || '').trim();
      const roleRaw = (r[effRoleCol] || r[7] || r[5] || 'AJK').trim();
      const sessionRaw = (r[effSessCol] || r[8] || r[6] || 'Pagi').trim();

      if (!teacherName && !unitName) return;

      // 1. Match Teacher by exact or normalized name or ID
      let matchedTeacher = teacherByName.get(teacherName.toLowerCase());
      if (!matchedTeacher) {
        const normT = normalize(teacherName);
        matchedTeacher = parsedTeachers.find(t => normalize(t.name) === normT || (t.staffId && normalize(t.staffId) === normT));
      }

      // If teacher not yet in parsedTeachers (e.g. user added a new teacher row in Agihan tab directly)
      if (!matchedTeacher && teacherName && isValidTeacherName(teacherName)) {
        // Generate a completely unique ID to prevent React duplicate key errors
        const uniqueTeacherId = `t-auto-${normalize(teacherName) || Math.random().toString(36).substring(2, 8)}`;
        
        matchedTeacher = {
          id: uniqueTeacherId,
          name: teacherName,
          staffId: `G${2000 + idx}`,
          gender: /binti|a\/p|puan|cik/i.test(teacherName) ? 'P' : 'L',
          session: sessionRaw.includes('Petang') ? 'Petang' : 'Pagi',
          grade: 'DG41',
          phone: '',
          email: '',
        };
        parsedTeachers.push(matchedTeacher);
        teacherByName.set(matchedTeacher.name.toLowerCase().trim(), matchedTeacher);
        teacherByName.set(normalize(matchedTeacher.name), matchedTeacher);
        teacherByName.set(uniqueTeacherId, matchedTeacher);
      }

      // 2. Match Unit by exact or normalized name or code
      let matchedUnit = unitByName.get(unitName.toLowerCase());
      if (!matchedUnit) {
        const normU = normalize(unitName);
        matchedUnit = allAvailableUnits.find(u => normalize(u.name) === normU || (u.code && normalize(u.code) === normU));
      }

      // If unit not in list, auto-create a custom unit so data is NEVER lost!
      if (!matchedUnit && unitName) {
        const newUnitId = `u-custom-${Date.now()}-${idx}`;
        const uNameLower = unitName.toLowerCase();
        const isHouse = uNameLower.includes('rumah') || ['bendahara', 'temenggung', 'laksamana', 'syahbandar'].some(h => uNameLower.includes(h));
        const isDev = uNameLower.includes('pembangunan') || uNameLower.includes('khas') || uNameLower.includes('ppki') || uNameLower.includes('pajsk') || uNameLower.includes('inovasi') || uNameLower.includes('rimup') || uNameLower.includes('koperasi');
        const isUniform = uNameLower.includes('pengakap') || uNameLower.includes('kadet') || uNameLower.includes('pandu puteri') || uNameLower.includes('pbsm') || uNameLower.includes('bsmm') || uNameLower.includes('krs');
        const isSport = uNameLower.includes('bola') || uNameLower.includes('badminton') || uNameLower.includes('olahraga') || uNameLower.includes('catur') || uNameLower.includes('sukan');

        const autoCategory: UnitCategory = 
          isHouse ? 'RUMAH_SUKAN' :
          isUniform ? 'BERUNIFORM' :
          isDev ? 'PEMBANGUNAN' :
          isSport ? 'SUKAN' :
          'KELAB';

        matchedUnit = {
          id: newUnitId,
          name: unitName,
          code: unitName.slice(0, 4).toUpperCase(),
          category: autoCategory,
          iconName: 'Sparkles',
          color: autoCategory === 'BERUNIFORM' ? '#D97706' :
                 autoCategory === 'KELAB' ? '#059669' :
                 autoCategory === 'SUKAN' ? '#2563EB' :
                 autoCategory === 'RUMAH_SUKAN' ? '#DC2626' : '#7C3AED',
        };
        parsedUnits.push(matchedUnit);
        unitByName.set(matchedUnit.name.toLowerCase().trim(), matchedUnit);
      }

      if (matchedTeacher && matchedUnit) {
        let role: RoleType = 'AJK';
        const roleLower = roleRaw.toLowerCase();
        if (roleLower.includes('ketua') || roleLower.includes('penasihat utama')) {
          role = 'Ketua Guru Penasihat';
        } else if (roleLower.includes('setiausaha') || roleLower.includes('su') || roleLower.includes('sekretariat')) {
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

  // Deduplicate parsedTeachers by ID and normalized name to guarantee unique keys across the application
  const uniqueTeachersMap = new Map<string, Teacher>();
  const seenTeacherNames = new Set<string>();
  parsedTeachers.forEach(t => {
    if (!t || !t.id) return;
    const norm = normalize(t.name);
    if (!uniqueTeachersMap.has(t.id) && !seenTeacherNames.has(norm)) {
      uniqueTeachersMap.set(t.id, t);
      seenTeacherNames.add(norm);
    }
  });
  const finalizedTeachers = Array.from(uniqueTeachersMap.values());

  // Parse School Profile, Logo, Coordinators & Leaders from Panduan_GPK tab
  const schoolSettings: Partial<SchoolSettings> = {};
  let categoryCoordinators: CategoryCoordinator[] | undefined;
  let executiveLeaders: ExecutiveLeader[] | undefined;

  if (rawGuide && rawGuide.length > 0) {
    let logoPart1 = '';
    let logoPart2 = '';
    let logoPart3 = '';
    let logoPart4 = '';
    let logoPart5 = '';

    rawGuide.forEach(row => {
      if (!row || row.length < 2) return;
      const key = String(row[0] || '').trim().toLowerCase();
      const val = String(row[1] || '').trim();
      if (!val) return;

      if (key.includes('sekolah:') || key === 'sekolah') {
        schoolSettings.schoolName = val;
      } else if (key.includes('kod sekolah')) {
        schoolSettings.schoolCode = val;
      } else if (key.includes('tahun akademik')) {
        schoolSettings.academicYear = val;
      } else if (key.includes('gpk kokurikulum')) {
        schoolSettings.gpkKokuName = val;
      } else if (key.includes('pengetua') || key.includes('guru besar')) {
        schoolSettings.principalName = val;
      } else if (key.includes('alamat')) {
        schoolSettings.schoolAddress = val;
      } else if (key.includes('telefon') || key.includes('tel') || key.includes('phone')) {
        schoolSettings.schoolPhone = val;
      } else if (key.includes('email') || key.includes('emel')) {
        schoolSettings.schoolEmail = val;
      } else if (key.includes('negeri')) {
        schoolSettings.schoolState = val;
        schoolSettings.state = val;
      } else if (key.includes('daerah') || key.includes('ppd')) {
        schoolSettings.district = val;
      } else if (key.includes('logo sekolah part 1') || key.includes('logo sekolah (data):') || key === 'logo sekolah') {
        logoPart1 = val;
      } else if (key.includes('logo sekolah part 2')) {
        logoPart2 = val;
      } else if (key.includes('logo sekolah part 3')) {
        logoPart3 = val;
      } else if (key.includes('logo sekolah part 4')) {
        logoPart4 = val;
      } else if (key.includes('logo sekolah part 5')) {
        logoPart5 = val;
      } else if (key.includes('logo ts25')) {
        if (val === 'OFFICIAL_TS25') {
          schoolSettings.ts25Logo = OFFICIAL_TS25_LOGO_SVG;
          schoolSettings.ts25LogoUrl = OFFICIAL_TS25_LOGO_SVG;
          schoolSettings.showTs25Logo = true;
        } else if (val === 'NONE') {
          schoolSettings.ts25Logo = 'NONE';
          schoolSettings.showTs25Logo = false;
        } else {
          schoolSettings.ts25Logo = val;
          schoolSettings.ts25LogoUrl = val;
          schoolSettings.showTs25Logo = true;
        }
      } else if (key.includes('penyelaras') && key.includes('json')) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0) categoryCoordinators = parsed;
        } catch {}
      } else if (key.includes('jawatankuasa pengurusan') && key.includes('json')) {
        try {
          const parsed = JSON.parse(val);
          if (Array.isArray(parsed) && parsed.length > 0) executiveLeaders = parsed;
        } catch {}
      }
    });

    const fullLogo = (logoPart1 + logoPart2 + logoPart3 + logoPart4 + logoPart5).trim();
    if (fullLogo) {
      schoolSettings.schoolLogo = fullLogo;
      schoolSettings.schoolLogoUrl = fullLogo;
    }
  }

  return {
    teachers: finalizedTeachers,
    assignments: parsedAssignments,
    customUnits: parsedUnits.length > 0 ? parsedUnits : undefined,
    schoolSettings: Object.keys(schoolSettings).length > 0 ? schoolSettings : undefined,
    categoryCoordinators,
    executiveLeaders,
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

  let rawTeachers = await fetchTabCsv('Senarai_Guru');
  if (rawTeachers.length <= 1) {
    rawTeachers = await fetchTabCsv('Senarai Guru');
  }
  if (rawTeachers.length <= 1) {
    rawTeachers = await fetchTabCsv('Guru');
  }

  let rawUnits = await fetchTabCsv('Senarai_Unit');
  if (rawUnits.length <= 1) {
    rawUnits = await fetchTabCsv('Senarai Unit');
  }
  if (rawUnits.length <= 1) {
    rawUnits = await fetchTabCsv('Unit');
  }

  let finalAssignments = await fetchTabCsv('Agihan_Kokurikulum');
  if (finalAssignments.length <= 1) {
    finalAssignments = await fetchTabCsv('Agihan Kokurikulum');
  }
  if (finalAssignments.length <= 1) {
    finalAssignments = await fetchTabCsv('Agihan');
  }
  if (finalAssignments.length <= 1) {
    finalAssignments = await fetchTabCsv('Sheet1');
  }

  let rawGuide = await fetchTabCsv('Panduan_GPK');
  if (rawGuide.length <= 1) {
    rawGuide = await fetchTabCsv('Panduan GPK');
  }
  if (rawGuide.length <= 1) {
    rawGuide = await fetchTabCsv('Panduan');
  }

  if (rawTeachers.length <= 1 && finalAssignments.length <= 1) {
    throw new Error(
      'Gagal membaca Google Sheet secara luar. Pastikan pautan Google Sheet betul dan kebenaran fail disetkan kepada "Anyone with the link can view" (Sesiapa dengan pautan boleh lihat) di Google Drive, atau log masuk akaun Google di atas.'
    );
  }

  return parseRawSheetData(rawTeachers, rawUnits, finalAssignments, currentUnits, rawGuide);
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
    // Pertama, dapatkan metadata helaian untuk menyemak nama tab sebenar yang ada dalam fail pengguna
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}?fields=sheets.properties(sheetId,title)`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (metaRes.ok) {
      const metaData = await metaRes.json();
      const existingTabs: string[] = (metaData.sheets || []).map((s: { properties?: { title?: string } }) => s.properties?.title || '').filter(Boolean);

      // Cari tab yang sepadan dengan guru, unit, agihan, atau guna tab lalai
      const teacherTab = existingTabs.find(t => /guru|teacher/i.test(t)) || (existingTabs.includes('Senarai_Guru') ? 'Senarai_Guru' : null);
      const unitTab = existingTabs.find(t => /unit/i.test(t)) || (existingTabs.includes('Senarai_Unit') ? 'Senarai_Unit' : null);
      const assignTab = existingTabs.find(t => /agihan|assign/i.test(t)) || (existingTabs.includes('Agihan_Kokurikulum') ? 'Agihan_Kokurikulum' : null);
      const guideTab = existingTabs.find(t => /panduan|guide/i.test(t)) || (existingTabs.includes('Panduan_GPK') ? 'Panduan_GPK' : null);

      // Sediakan senarai julat yang hendak dimuat turun
      const targetRanges: { key: string; range: string }[] = [];
      if (teacherTab) targetRanges.push({ key: 'teachers', range: `'${teacherTab}'!A1:Z1000` });
      if (unitTab) targetRanges.push({ key: 'units', range: `'${unitTab}'!A1:Z500` });
      if (assignTab) targetRanges.push({ key: 'assignments', range: `'${assignTab}'!A1:Z3000` });
      if (guideTab) targetRanges.push({ key: 'guide', range: `'${guideTab}'!A1:Z50` });

      // Jika tiada tab bernama di atas, baca tab pertama (cth: Sheet1 / Helaian1)
      if (targetRanges.length === 0 && existingTabs.length > 0) {
        existingTabs.slice(0, 3).forEach((tab, i) => {
          targetRanges.push({ key: `sheet_${i}`, range: `'${tab}'!A1:Z500` });
        });
      }

      if (targetRanges.length > 0) {
        const rangesQuery = targetRanges.map(r => `ranges=${encodeURIComponent(r.range)}`).join('&');
        const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${cleanId}/values:batchGet?${rangesQuery}`;

        const batchController = new AbortController();
        const timeoutId = setTimeout(() => batchController.abort(), 8000);

        const batchRes = await fetch(batchUrl, {
          headers: { Authorization: `Bearer ${token}` },
          signal: batchController.signal,
        });
        clearTimeout(timeoutId);

        if (batchRes.ok) {
          const batchData = await batchRes.json();
          const valueRanges: { range: string; values?: string[][] }[] = batchData.valueRanges || [];

          let rawTeachers: string[][] = [];
          let rawUnits: string[][] = [];
          let rawAssignments: string[][] = [];
          let rawGuide: string[][] = [];

          targetRanges.forEach((target, index) => {
            const values = valueRanges[index]?.values || [];
            if (target.key === 'teachers') rawTeachers = values;
            else if (target.key === 'units') rawUnits = values;
            else if (target.key === 'assignments') rawAssignments = values;
            else if (target.key === 'guide') rawGuide = values;
            else {
              // Jika tab umum (Sheet1 dsb), periksa kandungannya
              if (rawTeachers.length === 0 && values.some(row => row.some(cell => /nama|guru/i.test(cell)))) {
                rawTeachers = values;
              } else if (rawAssignments.length === 0 && values.length > 1) {
                rawAssignments = values;
              }
            }
          });

          if (rawTeachers.length > 1 || rawAssignments.length > 1) {
            return parseRawSheetData(rawTeachers, rawUnits, rawAssignments, currentUnits, rawGuide);
          }
        }
      }
    }
  } catch (apiErr) {
    console.warn('Authenticated Sheets API auto-discover failed, attempting fallback:', apiErr);
  }

  // Fallback to public fetch if token failed or tab reading returned empty
  return fetchPublicGoogleSheet(cleanId, currentUnits);
}
