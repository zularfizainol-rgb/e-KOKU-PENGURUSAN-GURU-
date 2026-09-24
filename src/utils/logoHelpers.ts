/**
 * Helper utility for handling School Logo & TS25 Logo uploads, compression, and presets.
 */

// Official TS25 Vector Emblem Data URL
export const OFFICIAL_TS25_LOGO_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e3a8a"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </linearGradient>
    <linearGradient id="redGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#b91c1c"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Outer Circle Border -->
  <circle cx="200" cy="200" r="190" fill="#ffffff" stroke="url(#goldGrad)" stroke-width="8" filter="url(#shadow)"/>
  <circle cx="200" cy="200" r="178" fill="none" stroke="#1e3a8a" stroke-width="3"/>

  <!-- Top Ribbon Banner Text Arc (TS25 Full Title) -->
  <path id="topArc" d="M 45,200 A 155,155 0 0,1 355,200" fill="none"/>
  <text font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="16.5" fill="#1e3a8a" letter-spacing="1.2">
    <textPath href="#topArc" startOffset="50%" text-anchor="middle">
      PROGRAM TRANSFORMASI SEKOLAH 2025
    </textPath>
  </text>

  <!-- Bottom Ribbon Text Arc -->
  <path id="bottomArc" d="M 355,200 A 155,155 0 0,1 45,200" fill="none"/>
  <text font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="14" fill="#b91c1c" letter-spacing="1">
    <textPath href="#bottomArc" startOffset="50%" text-anchor="middle">
      PENGGERAK PEMBELAJARAN BERMAKNA
    </textPath>
  </text>

  <!-- Central Crest / Badge Shield -->
  <g transform="translate(200, 195) scale(0.95)">
    <!-- Emblem Shield Base -->
    <path d="M -80,-80 L 80,-80 L 80,10 C 80,75 0,105 0,105 C 0,105 -80,75 -80,10 Z" fill="url(#blueGrad)" stroke="url(#goldGrad)" stroke-width="4" filter="url(#shadow)"/>
    
    <!-- Sunburst / Rays of Knowledge -->
    <circle cx="0" cy="-25" r="42" fill="url(#goldGrad)" opacity="0.3"/>
    
    <!-- Open Book / Pages of Learning -->
    <path d="M 0,-15 C 20,-30 50,-25 65,-20 L 65,30 C 50,25 20,20 0,35 C -20,20 -50,25 -65,30 L -65,-20 C -50,-25 -20,-30 0,-15 Z" fill="#ffffff" opacity="0.95"/>
    <path d="M 0,-15 L 0,35" stroke="#1e3a8a" stroke-width="2.5"/>

    <!-- Stylized TS25 Typography -->
    <!-- 'T' & 'S' -->
    <text x="-48" y="24" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="38" fill="url(#redGrad)" stroke="#ffffff" stroke-width="1.5">T</text>
    <text x="-20" y="24" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="38" fill="url(#redGrad)" stroke="#ffffff" stroke-width="1.5">S</text>
    
    <!-- '2' & '5' -->
    <text x="6" y="24" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="38" fill="url(#goldGrad)" stroke="#1e3a8a" stroke-width="1.5">2</text>
    <text x="32" y="24" font-family="'Arial Black', Impact, sans-serif" font-weight="900" font-size="38" fill="url(#goldGrad)" stroke="#1e3a8a" stroke-width="1.5">5</text>

    <!-- Star of Excellence -->
    <polygon points="0,-48 3.5,-38 14,-38 5.5,-32 9,-22 0,-28 -9,-22 -5.5,-32 -14,-38 -3.5,-38" fill="url(#goldGrad)"/>

    <!-- Lower Banner with KPM Blue / Red Stripe -->
    <rect x="-60" y="52" width="120" height="18" rx="5" fill="#ffffff" stroke="#1e3a8a" stroke-width="2"/>
    <text x="0" y="65" font-family="Arial, sans-serif" font-weight="900" font-size="11" fill="#1e3a8a" text-anchor="middle" letter-spacing="1">
      KPM • MALAYSIA
    </text>
  </g>
</svg>
`)}`;

/**
 * Resizes and compresses an uploaded image file into a Data URL (base64).
 * This ensures the image stays well within localStorage quotas and loads swiftly.
 */
export function processImageUpload(file: File, maxWidth = 360, maxHeight = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Sila muat naik fail gambar (PNG, JPG, atau WebP) sahaja.'));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Ralat membaca fail gambar.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Gambar tidak sah atau rosak.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve(event.target?.result as string);
        }

        // Draw image onto canvas
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // For PNG or files with transparency, preserve PNG; otherwise JPEG 0.9
        const isPng = file.type === 'image/png';
        const dataUrl = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', 0.9);
        resolve(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
