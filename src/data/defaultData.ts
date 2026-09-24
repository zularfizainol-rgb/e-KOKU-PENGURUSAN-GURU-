import { Teacher, KokuUnit, UnitAssignment, SchoolSettings } from '../types/koku';

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  schoolName: 'SEKOLAH SAYA',
  schoolCode: 'KOD_SEKOLAH',
  academicYear: '2026/2027',
  principalName: 'Pengetua / Guru Besar',
  gpkKokuName: 'Encik Zularfi bin Zainol',
  state: '',
  district: '',
};

export const DEFAULT_UNITS: KokuUnit[] = [
  // 1. UNIT BERUNIFORM
  {
    id: 'u-pengakap',
    name: 'Persekutuan Pengakap Malaysia',
    code: 'PENGAKAP',
    category: 'BERUNIFORM',
    color: '#D97706', // amber
    iconName: 'Compass',
    description: 'Unit pengakap kanak-kanak/muda sekolah',
    targetMorning: 4,
    targetAfternoon: 3,
  },
  {
    id: 'u-bsmm',
    name: 'Bulan Sabit Merah Malaysia (BSMM)',
    code: 'BSMM',
    category: 'BERUNIFORM',
    color: '#DC2626', // red
    iconName: 'HeartPulse',
    description: 'Unit pertolongan cemas dan bantuan kecemasan',
    targetMorning: 4,
    targetAfternoon: 3,
  },
  {
    id: 'u-krs',
    name: 'Kadet Remaja Sekolah (KRS / TKRS)',
    code: 'KRS',
    category: 'BERUNIFORM',
    color: '#059669', // emerald
    iconName: 'Shield',
    description: 'Unit disiplin dan ketahanan diri KPM',
    targetMorning: 4,
    targetAfternoon: 3,
  },
  {
    id: 'u-pandu-puteri',
    name: 'Pandu Puteri Malaysia',
    code: 'PANDU',
    category: 'BERUNIFORM',
    color: '#0284C7', // sky
    iconName: 'Award',
    description: 'Unit kepimpinan pandu puteri remaja',
    targetMorning: 3,
    targetAfternoon: 3,
  },
  {
    id: 'u-ppim',
    name: 'Pergerakan Puteri Islam Malaysia (PPIM)',
    code: 'PPIM',
    category: 'BERUNIFORM',
    color: '#DB2777', // pink
    iconName: 'BookmarkHeart',
    description: 'Unit pembangunan sahsiah dan keperibadian Islamiah',
    targetMorning: 3,
    targetAfternoon: 3,
  },
  {
    id: 'u-kadet-polis',
    name: 'Kor Kadet Polis Diraja Malaysia',
    code: 'POLIS',
    category: 'BERUNIFORM',
    color: '#1E3A8A', // dark blue
    iconName: 'BadgeAlert',
    description: 'Unit kerjasama polis pencegahan jenayah',
    targetMorning: 3,
    targetAfternoon: 2,
  },

  // 2. KELAB & PERSATUAN
  {
    id: 'k-bm',
    name: 'Persatuan Bahasa Melayu & Kebudayaan',
    code: 'PBM',
    category: 'KELAB',
    color: '#7C3AED', // purple
    iconName: 'BookOpen',
    description: 'Memperkasa kemahiran berbahasa dan sastera Melayu',
    targetMorning: 3,
    targetAfternoon: 2,
  },
  {
    id: 'k-bi',
    name: 'English Language & Debate Society',
    code: 'ENG',
    category: 'KELAB',
    color: '#2563EB', // blue
    iconName: 'Languages',
    description: 'English communication and debate skills',
    targetMorning: 3,
    targetAfternoon: 2,
  },
  {
    id: 'k-stem',
    name: 'Kelab STEM, Robotik & Inovasi',
    code: 'STEM',
    category: 'KELAB',
    color: '#0D9488', // teal
    iconName: 'Cpu',
    description: 'Pendedahan teknologi kod, robotik dan sains terapan',
    targetMorning: 4,
    targetAfternoon: 3,
  },
  {
    id: 'k-pai',
    name: 'Persatuan Agama Islam & J-QAF',
    code: 'PAI',
    category: 'KELAB',
    color: '#16A34A', // green
    iconName: 'MoonStar',
    description: 'Aktiviti kerohanian, tilawah dan dakwah sekolah',
    targetMorning: 3,
    targetAfternoon: 2,
  },
  {
    id: 'k-doktor-muda',
    name: 'Kelab Doktor Muda & Gaya Hidup Sihat',
    code: 'DRMUDA',
    category: 'KELAB',
    color: '#EA580C', // orange
    iconName: 'Stethoscope',
    description: 'Pendidikan kesihatan dan amalan pemakanan sihat',
    targetMorning: 3,
    targetAfternoon: 2,
  },
  {
    id: 'k-kesenian',
    name: 'Kelab Kesenian, Muzik & Kompang',
    code: 'SENI',
    category: 'KELAB',
    color: '#C026D3', // fuchsia
    iconName: 'Music',
    description: 'Mencungkil bakat seni persembahan, nyanyian dan kompang',
    targetMorning: 3,
    targetAfternoon: 2,
  },

  // 3. SUKAN & PERMAINAN
  {
    id: 's-bola-sepak',
    name: 'Kelab Bola Sepak & Futsal',
    code: 'BSEPAK',
    category: 'SUKAN',
    color: '#15803D', // green
    iconName: 'Activity',
    description: 'Latihan kemahiran dan taktik bola sepak',
    targetMorning: 4,
    targetAfternoon: 3,
  },
  {
    id: 's-bola-jaring',
    name: 'Kelab Bola Jaring',
    code: 'BJLN',
    category: 'SUKAN',
    color: '#E11D48', // rose
    iconName: 'Target',
    description: 'Sukan bola jaring peringkat MSSD',
    targetMorning: 3,
    targetAfternoon: 2,
  },
  {
    id: 's-badminton',
    name: 'Kelab Badminton',
    code: 'BDM',
    category: 'SUKAN',
    color: '#0284C7', // sky
    iconName: 'Crosshair',
    description: 'Latihan servis, pukulan kilas dan stamina pemain',
    targetMorning: 3,
    targetAfternoon: 2,
  },
  {
    id: 's-sepak-takraw',
    name: 'Kelab Sepak Takraw',
    code: 'TKRAW',
    category: 'SUKAN',
    color: '#D97706', // amber
    iconName: 'CircleDot',
    description: 'Permainan tradisi warisan negara',
    targetMorning: 3,
    targetAfternoon: 2,
  },
  {
    id: 's-bola-tampar',
    name: 'Kelab Bola Tampar',
    code: 'BTMPR',
    category: 'SUKAN',
    color: '#4F46E5', // indigo
    iconName: 'Volleyball',
    description: 'Kemahiran smesy, sangga dan hantaran tepat',
    targetMorning: 3,
    targetAfternoon: 2,
  },
  {
    id: 's-olahraga',
    name: 'Kelab Olahraga & Merentas Desa',
    code: 'OLAH',
    category: 'SUKAN',
    color: '#B45309', // amber dark
    iconName: 'Flame',
    description: 'Pembangunan atlet larian pecut, jarak jauh dan padang',
    targetMorning: 4,
    targetAfternoon: 3,
  },
  {
    id: 's-catur',
    name: 'Kelab Catur & Permainan Minda',
    code: 'CATUR',
    category: 'SUKAN',
    color: '#475569', // slate
    iconName: 'Crown',
    description: 'Asah fokus, strategi dan catur MSSD',
    targetMorning: 2,
    targetAfternoon: 2,
  },

  // 4. RUMAH SUKAN
  {
    id: 'r-bendahara',
    name: 'Rumah Bendahara (Merah)',
    code: 'MERAH',
    category: 'RUMAH_SUKAN',
    color: '#EF4444', // red
    iconName: 'Flag',
    description: 'Rumah Sukan Bendahara - Semangat Merah Menyala',
    targetMorning: 6,
    targetAfternoon: 5,
  },
  {
    id: 'r-temenggung',
    name: 'Rumah Temenggung (Hijau)',
    code: 'HIJAU',
    category: 'RUMAH_SUKAN',
    color: '#10B981', // green
    iconName: 'Flag',
    description: 'Rumah Sukan Temenggung - Gagah Perkasa Hijau',
    targetMorning: 6,
    targetAfternoon: 5,
  },
  {
    id: 'r-laksamana',
    name: 'Rumah Laksamana (Biru)',
    code: 'BIRU',
    category: 'RUMAH_SUKAN',
    color: '#3B82F6', // blue
    iconName: 'Flag',
    description: 'Rumah Sukan Laksamana - Lautan Biru Berwibawa',
    targetMorning: 6,
    targetAfternoon: 5,
  },
  {
    id: 'r-syahbandar',
    name: 'Rumah Syahbandar (Kuning)',
    code: 'KUNING',
    category: 'RUMAH_SUKAN',
    color: '#F59E0B', // yellow
    iconName: 'Flag',
    description: 'Rumah Sukan Syahbandar - Kilauan Emas Diraja',
    targetMorning: 6,
    targetAfternoon: 5,
  },

  // 5. UNIT PEMBANGUNAN & KHAS
  {
    id: 'p-elit-sukan',
    name: 'Jawatankuasa Pembangunan Sukan Elit',
    code: 'ELIT',
    category: 'PEMBANGUNAN',
    color: '#8B5CF6',
    iconName: 'Trophy',
    description: 'Memantau dan melatih bakat murid untuk MSSD/MSSK/MSSM',
    targetMorning: 3,
    targetAfternoon: 2,
  },
  {
    id: 'p-inovasi',
    name: 'Jawatankuasa Inovasi & Kebitaraan Sekolah',
    code: 'INOVASI',
    category: 'PEMBANGUNAN',
    color: '#EC4899',
    iconName: 'Sparkles',
    description: 'Penyertaan pertandingan inovasi peringkat negeri & kebangsaan',
    targetMorning: 3,
    targetAfternoon: 2,
  },
  {
    id: 'p-rimup',
    name: 'Jawatankuasa RIMUP & Integrasi Kaum',
    code: 'RIMUP',
    category: 'PEMBANGUNAN',
    color: '#06B6D4',
    iconName: 'Users',
    description: 'Program Rancangan Integrasi Murid Untuk Perpaduan',
    targetMorning: 2,
    targetAfternoon: 2,
  },
];

export const DEFAULT_TEACHERS: Teacher[] = [];

export const SAMPLE_TEACHERS: Teacher[] = [
  { id: 't1', name: 'Ahmad Farhan bin Mohd Yusof', staffId: '860512-14-5541', gender: 'L', session: 'Pagi', grade: 'DG44', phone: '012-3456789', email: 'farhan@moe.edu.my' },
  { id: 't2', name: 'Siti Nur Aishah binti Zakaria', staffId: '890123-10-6042', gender: 'P', session: 'Pagi', grade: 'DG44', phone: '013-8899123', email: 'nur.aishah@moe.edu.my' },
  { id: 't3', name: 'Tan Mei Ling', staffId: '840718-08-5432', gender: 'P', session: 'Pagi', grade: 'DG48', phone: '016-2244551', email: 'tan.meiling@moe.edu.my' },
  { id: 't4', name: 'Muthusamy a/l Subramaniam', staffId: '821104-05-5987', gender: 'L', session: 'Pagi', grade: 'DG48', phone: '017-9988776', email: 'muthu@moe.edu.my' },
  { id: 't5', name: 'Khairul Anuar bin Basir', staffId: '910305-01-5231', gender: 'L', session: 'Pagi', grade: 'DG41', phone: '019-4567812', email: 'khairul.anuar@moe.edu.my' },
  { id: 't6', name: 'Norazlina binti Che Hassan', staffId: '880621-03-5120', gender: 'P', session: 'Pagi', grade: 'DG44', phone: '011-2345678', email: 'norazlina@moe.edu.my' },
  { id: 't7', name: 'Mohd Ridzuan bin Abdullah', staffId: '850914-11-5343', gender: 'L', session: 'Pagi', grade: 'DG44', phone: '014-5566778', email: 'ridzuan@moe.edu.my' },
  { id: 't8', name: 'Fatimah Az-Zahra binti Daud', staffId: '931210-06-5894', gender: 'P', session: 'Pagi', grade: 'DG41', phone: '018-7766554', email: 'fatimah.daud@moe.edu.my' },
  { id: 't9', name: 'Lee Chong Wai', staffId: '870420-14-5665', gender: 'L', session: 'Pagi', grade: 'DG44', phone: '016-3322119', email: 'leechongwai@moe.edu.my' },
  { id: 't10', name: 'Saraswathy a/p Krishnan', staffId: '900215-08-6228', gender: 'P', session: 'Pagi', grade: 'DG41', phone: '017-4433221', email: 'saras@moe.edu.my' },
  { id: 't11', name: 'Muhammad Haziq bin Ismail', staffId: '940825-10-5819', gender: 'L', session: 'Pagi', grade: 'DG41', phone: '013-4455667', email: 'haziq.ismail@moe.edu.my' },
  { id: 't12', name: 'Wan Noraini binti Wan Alias', staffId: '830909-03-5778', gender: 'P', session: 'Pagi', grade: 'DG48', phone: '019-8877665', email: 'wnoraini@moe.edu.my' },
  { id: 't13', name: 'Chong Wei Jian', staffId: '920707-14-6123', gender: 'L', session: 'Pagi', grade: 'DG41', phone: '012-7788990', email: 'weijian@moe.edu.my' },
  { id: 't14', name: 'Zalina binti Mohd Kassim', staffId: '810130-10-5344', gender: 'P', session: 'Pagi', grade: 'DG52', phone: '019-1122334', email: 'zalina@moe.edu.my' },
  { id: 't15', name: 'Mohd Hafizuddin bin Omar', staffId: '890503-02-5441', gender: 'L', session: 'Pagi', grade: 'DG44', phone: '013-6655443', email: 'hafizuddin@moe.edu.my' },

  // Sesi Petang
  { id: 't16', name: 'Muhammad Syafiq bin Rosli', staffId: '950618-05-5331', gender: 'L', session: 'Petang', grade: 'DG41', phone: '011-8899001', email: 'syafiq.rosli@moe.edu.my' },
  { id: 't17', name: 'Nurul Fatin binti Kamaruddin', staffId: '960412-14-5226', gender: 'P', session: 'Petang', grade: 'DG41', phone: '012-9988771', email: 'fatin.kamaruddin@moe.edu.my' },
  { id: 't18', name: 'Vickneswaran a/l Ramasamy', staffId: '930811-08-5431', gender: 'L', session: 'Petang', grade: 'DG41', phone: '017-6655442', email: 'vickneswaran@moe.edu.my' },
  { id: 't19', name: 'Goh Suet Yee', staffId: '941120-10-5884', gender: 'P', session: 'Petang', grade: 'DG41', phone: '016-5544332', email: 'goh.suetyee@moe.edu.my' },
  { id: 't20', name: 'Nur Farahana binti Azman', staffId: '920317-03-5912', gender: 'P', session: 'Petang', grade: 'DG41', phone: '013-2211445', email: 'farahana@moe.edu.my' },
  { id: 't21', name: 'Azlan bin Shaharuddin', staffId: '880129-06-5339', gender: 'L', session: 'Petang', grade: 'DG44', phone: '019-3344556', email: 'azlan.shah@moe.edu.my' },
  { id: 't22', name: 'Masyitah binti Abdul Wahab', staffId: '910908-01-5764', gender: 'P', session: 'Petang', grade: 'DG41', phone: '018-9900112', email: 'masyitah@moe.edu.my' },
  { id: 't23', name: 'Kavitha a/p Balan', staffId: '891014-07-5536', gender: 'P', session: 'Petang', grade: 'DG44', phone: '014-2233445', email: 'kavitha@moe.edu.my' },
  { id: 't24', name: 'Tengku Amirul bin Tengku Zaki', staffId: '930204-11-5121', gender: 'L', session: 'Petang', grade: 'DG41', phone: '011-5544332', email: 'amirul.tengku@moe.edu.my' },
  { id: 't25', name: 'Dayang Mastura binti Abang Ali', staffId: '900531-13-5890', gender: 'P', session: 'Petang', grade: 'DG44', phone: '012-6677889', email: 'dayang.mastura@moe.edu.my' },
  { id: 't26', name: 'Faizal bin Mohd Nor', staffId: '940402-08-5775', gender: 'L', session: 'Petang', grade: 'DG41', phone: '017-1122998', email: 'faizal.nor@moe.edu.my' },
  { id: 't27', name: 'Lim Shu Xian', staffId: '951203-14-5338', gender: 'P', session: 'Petang', grade: 'DG41', phone: '016-8877665', email: 'lim.shuxian@moe.edu.my' },
  { id: 't28', name: 'Mohd Shahril bin Ramli', staffId: '870814-02-5441', gender: 'L', session: 'Petang', grade: 'DG44', phone: '013-9988112', email: 'shahril.ramli@moe.edu.my' },
];

export const DEFAULT_ASSIGNMENTS: UnitAssignment[] = [];

export const SAMPLE_ASSIGNMENTS: UnitAssignment[] = [
  // 1. UNIT BERUNIFORM
  // Pengakap (t1, t2, t16)
  { id: 'a1', teacherId: 't1', unitId: 'u-pengakap', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a2', teacherId: 't2', unitId: 'u-pengakap', role: 'Setiausaha', session: 'Pagi' },
  { id: 'a3', teacherId: 't16', unitId: 'u-pengakap', role: 'AJK', session: 'Petang' },

  // BSMM (t6, t7, t17)
  { id: 'a4', teacherId: 't6', unitId: 'u-bsmm', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a5', teacherId: 't7', unitId: 'u-bsmm', role: 'Setiausaha', session: 'Pagi' },
  { id: 'a6', teacherId: 't17', unitId: 'u-bsmm', role: 'AJK', session: 'Petang' },

  // KRS (t5, t8, t18, t21)
  { id: 'a7', teacherId: 't5', unitId: 'u-krs', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a8', teacherId: 't8', unitId: 'u-krs', role: 'Setiausaha', session: 'Pagi' },
  { id: 'a9', teacherId: 't21', unitId: 'u-krs', role: 'AJK', session: 'Petang' },
  { id: 'a10', teacherId: 't18', unitId: 'u-krs', role: 'AJK', session: 'Petang' },

  // Pandu Puteri (t3, t12, t19)
  { id: 'a11', teacherId: 't3', unitId: 'u-pandu-puteri', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a12', teacherId: 't12', unitId: 'u-pandu-puteri', role: 'Setiausaha', session: 'Pagi' },
  { id: 'a13', teacherId: 't19', unitId: 'u-pandu-puteri', role: 'AJK', session: 'Petang' },

  // PPIM (t14, t20, t22)
  { id: 'a14', teacherId: 't14', unitId: 'u-ppim', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a15', teacherId: 't20', unitId: 'u-ppim', role: 'AJK', session: 'Petang' },
  { id: 'a16', teacherId: 't22', unitId: 'u-ppim', role: 'Setiausaha', session: 'Petang' },

  // Kadet Polis (t4, t9, t24)
  { id: 'a17', teacherId: 't4', unitId: 'u-kadet-polis', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a18', teacherId: 't9', unitId: 'u-kadet-polis', role: 'Setiausaha', session: 'Pagi' },
  { id: 'a19', teacherId: 't24', unitId: 'u-kadet-polis', role: 'AJK', session: 'Petang' },

  // 2. KELAB & PERSATUAN
  // Persatuan Bahasa Melayu (t1, t8, t16)
  { id: 'a20', teacherId: 't8', unitId: 'k-bm', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a21', teacherId: 't1', unitId: 'k-bm', role: 'AJK', session: 'Pagi' },
  { id: 'a22', teacherId: 't16', unitId: 'k-bm', role: 'Setiausaha', session: 'Petang' },

  // English Language Club (t3, t10, t19)
  { id: 'a23', teacherId: 't3', unitId: 'k-bi', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a24', teacherId: 't10', unitId: 'k-bi', role: 'Setiausaha', session: 'Pagi' },
  { id: 'a25', teacherId: 't19', unitId: 'k-bi', role: 'AJK', session: 'Petang' },

  // Kelab STEM & Robotik (t5, t9, t18, t27)
  { id: 'a26', teacherId: 't9', unitId: 'k-stem', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a27', teacherId: 't5', unitId: 'k-stem', role: 'Setiausaha', session: 'Pagi' },
  { id: 'a28', teacherId: 't18', unitId: 'k-stem', role: 'AJK', session: 'Petang' },
  { id: 'a29', teacherId: 't27', unitId: 'k-stem', role: 'AJK', session: 'Petang' },

  // Persatuan Agama Islam (t2, t14, t22)
  { id: 'a30', teacherId: 't2', unitId: 'k-pai', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a31', teacherId: 't14', unitId: 'k-pai', role: 'AJK', session: 'Pagi' },
  { id: 'a32', teacherId: 't22', unitId: 'k-pai', role: 'Setiausaha', session: 'Petang' },

  // Kelab Doktor Muda (t6, t11, t23)
  { id: 'a33', teacherId: 't11', unitId: 'k-doktor-muda', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a34', teacherId: 't6', unitId: 'k-doktor-muda', role: 'Setiausaha', session: 'Pagi' },
  { id: 'a35', teacherId: 't23', unitId: 'k-doktor-muda', role: 'AJK', session: 'Petang' },

  // Kelab Kesenian & Muzik (t12, t15, t25)
  { id: 'a36', teacherId: 't12', unitId: 'k-kesenian', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a37', teacherId: 't15', unitId: 'k-kesenian', role: 'Setiausaha', session: 'Pagi' },
  { id: 'a38', teacherId: 't25', unitId: 'k-kesenian', role: 'AJK', session: 'Petang' },

  // 3. SUKAN & PERMAINAN
  // Bola Sepak (t7, t11, t21, t26)
  { id: 'a39', teacherId: 't7', unitId: 's-bola-sepak', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a40', teacherId: 't11', unitId: 's-bola-sepak', role: 'Setiausaha', session: 'Pagi' },
  { id: 'a41', teacherId: 't21', unitId: 's-bola-sepak', role: 'AJK', session: 'Petang' },
  { id: 'a42', teacherId: 't26', unitId: 's-bola-sepak', role: 'AJK', session: 'Petang' },

  // Bola Jaring (t2, t6, t17, t20)
  { id: 'a43', teacherId: 't2', unitId: 's-bola-jaring', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a44', teacherId: 't6', unitId: 's-bola-jaring', role: 'AJK', session: 'Pagi' },
  { id: 'a45', teacherId: 't17', unitId: 's-bola-jaring', role: 'Setiausaha', session: 'Petang' },
  { id: 'a46', teacherId: 't20', unitId: 's-bola-jaring', role: 'AJK', session: 'Petang' },

  // Badminton (t9, t13, t19, t28)
  { id: 'a47', teacherId: 't13', unitId: 's-badminton', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a48', teacherId: 't9', unitId: 's-badminton', role: 'AJK', session: 'Pagi' },
  { id: 'a49', teacherId: 't28', unitId: 's-badminton', role: 'AJK', session: 'Petang' },
  { id: 'a50', teacherId: 't19', unitId: 's-badminton', role: 'Setiausaha', session: 'Petang' },

  // Sepak Takraw (t4, t5, t24)
  { id: 'a51', teacherId: 't4', unitId: 's-sepak-takraw', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a52', teacherId: 't5', unitId: 's-sepak-takraw', role: 'Setiausaha', session: 'Pagi' },
  { id: 'a53', teacherId: 't24', unitId: 's-sepak-takraw', role: 'AJK', session: 'Petang' },

  // Olahraga & Merentas Desa (t1, t15, t16, t25)
  { id: 'a54', teacherId: 't15', unitId: 's-olahraga', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a55', teacherId: 't1', unitId: 's-olahraga', role: 'Setiausaha', session: 'Pagi' },
  { id: 'a56', teacherId: 't16', unitId: 's-olahraga', role: 'AJK', session: 'Petang' },
  { id: 'a57', teacherId: 't25', unitId: 's-olahraga', role: 'AJK', session: 'Petang' },

  // Catur (t3, t10, t18)
  { id: 'a58', teacherId: 't10', unitId: 's-catur', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a59', teacherId: 't3', unitId: 's-catur', role: 'AJK', session: 'Pagi' },
  { id: 'a60', teacherId: 't18', unitId: 's-catur', role: 'Setiausaha', session: 'Petang' },

  // 4. RUMAH SUKAN
  // Bendahara (Merah)
  { id: 'a61', teacherId: 't1', unitId: 'r-bendahara', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a62', teacherId: 't7', unitId: 'r-bendahara', role: 'AJK', session: 'Pagi' },
  { id: 'a63', teacherId: 't12', unitId: 'r-bendahara', role: 'Setiausaha', session: 'Pagi' },
  { id: 'a64', teacherId: 't16', unitId: 'r-bendahara', role: 'AJK', session: 'Petang' },
  { id: 'a65', teacherId: 't21', unitId: 'r-bendahara', role: 'AJK', session: 'Petang' },

  // Temenggung (Hijau)
  { id: 'a66', teacherId: 't2', unitId: 'r-temenggung', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a67', teacherId: 't6', unitId: 'r-temenggung', role: 'Setiausaha', session: 'Pagi' },
  { id: 'a68', teacherId: 't11', unitId: 'r-temenggung', role: 'AJK', session: 'Pagi' },
  { id: 'a69', teacherId: 't17', unitId: 'r-temenggung', role: 'AJK', session: 'Petang' },
  { id: 'a70', teacherId: 't22', unitId: 'r-temenggung', role: 'Setiausaha', session: 'Petang' },

  // Laksamana (Biru)
  { id: 'a71', teacherId: 't3', unitId: 'r-laksamana', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a72', teacherId: 't8', unitId: 'r-laksamana', role: 'Setiausaha', session: 'Pagi' },
  { id: 'a73', teacherId: 't13', unitId: 'r-laksamana', role: 'AJK', session: 'Pagi' },
  { id: 'a74', teacherId: 't18', unitId: 'r-laksamana', role: 'AJK', session: 'Petang' },
  { id: 'a75', teacherId: 't24', unitId: 'r-laksamana', role: 'AJK', session: 'Petang' },

  // Syahbandar (Kuning)
  { id: 'a76', teacherId: 't4', unitId: 'r-syahbandar', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a77', teacherId: 't5', unitId: 'r-syahbandar', role: 'AJK', session: 'Pagi' },
  { id: 'a78', teacherId: 't9', unitId: 'r-syahbandar', role: 'AJK', session: 'Pagi' },
  { id: 'a79', teacherId: 't19', unitId: 'r-syahbandar', role: 'AJK', session: 'Petang' },
  { id: 'a80', teacherId: 't25', unitId: 'r-syahbandar', role: 'Setiausaha', session: 'Petang' },

  // 5. PEMBANGUNAN & KHAS
  { id: 'a81', teacherId: 't7', unitId: 'p-elit-sukan', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a82', teacherId: 't15', unitId: 'p-elit-sukan', role: 'AJK', session: 'Pagi' },
  { id: 'a83', teacherId: 't26', unitId: 'p-elit-sukan', role: 'AJK', session: 'Petang' },
  { id: 'a84', teacherId: 't9', unitId: 'p-inovasi', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a85', teacherId: 't27', unitId: 'p-inovasi', role: 'Setiausaha', session: 'Petang' },
  { id: 'a86', teacherId: 't4', unitId: 'p-rimup', role: 'Ketua Guru Penasihat', session: 'Pagi' },
  { id: 'a87', teacherId: 't23', unitId: 'p-rimup', role: 'AJK', session: 'Petang' },
];
