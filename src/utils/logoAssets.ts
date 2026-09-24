import React from 'react';

/**
 * Official TS25 (Program Transformasi Sekolah 2025) Vector Emblem
 * Formatted cleanly with SVG pathing for crisp display at any resolution (Screen & Print).
 */
export const OFFICIAL_TS25_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="100%" height="100%">
  <defs>
    <linearGradient id="ts25_blue" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E3A8A" />
      <stop offset="100%" stop-color="#0284C7" />
    </linearGradient>
    <linearGradient id="ts25_gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F59E0B" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <linearGradient id="ts25_red" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EF4444" />
      <stop offset="100%" stop-color="#B91C1C" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15" />
    </filter>
  </defs>

  <!-- Background White Circle -->
  <circle cx="200" cy="200" r="190" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="4" filter="url(#shadow)" />

  <!-- Outer Ring with Transformational Gear / Segments -->
  <circle cx="200" cy="200" r="172" fill="none" stroke="#1E3A8A" stroke-width="6" />
  <circle cx="200" cy="200" r="162" fill="none" stroke="#F59E0B" stroke-width="3" stroke-dasharray="8 6" />

  <!-- Dynamic Transformational Ribbon Arc (Upper Blue Arc) -->
  <path d="M 55 180 A 150 150 0 0 1 345 180" fill="none" stroke="url(#ts25_blue)" stroke-width="22" stroke-linecap="round" />
  
  <!-- Text on Arc: PROGRAM TRANSFORMASI SEKOLAH -->
  <path id="textArcUpper" d="M 68 185 A 136 136 0 0 1 332 185" fill="none" />
  <text fill="#FFFFFF" font-family="'Inter', 'Arial Black', sans-serif" font-size="13" font-weight="900" letter-spacing="2.5">
    <textPath href="#textArcUpper" startOffset="50%" text-anchor="middle">
      PROGRAM TRANSFORMASI SEKOLAH
    </textPath>
  </text>

  <!-- Central Star & Growth Flourish -->
  <g transform="translate(200, 112)">
    <polygon points="0,-16 4,-4 16,-4 7,3 10,15 0,8 -10,15 -7,3 -16,-4 -4,-4" fill="#F59E0B" />
  </g>

  <!-- Main Acronym: TS 25 -->
  <!-- "TS" in Deep Royal Blue -->
  <text x="135" y="235" 
    font-family="'Arial Black', 'Montserrat', sans-serif" 
    font-size="92" 
    font-weight="900" 
    fill="url(#ts25_blue)" 
    letter-spacing="-3">
    TS
  </text>

  <!-- "25" in Dynamic Red Gradient -->
  <text x="268" y="235" 
    font-family="'Arial Black', 'Montserrat', sans-serif" 
    font-size="92" 
    font-weight="900" 
    fill="url(#ts25_red)" 
    letter-spacing="-3">
    25
  </text>

  <!-- Transformational Leaf/Swoosh Underneath 25 -->
  <path d="M 125 248 C 180 270, 240 270, 285 248 C 240 262, 175 262, 125 248 Z" fill="url(#ts25_gold)" />

  <!-- Lower Banner Arc (Red/Navy for KPM) -->
  <path d="M 75 255 A 145 145 0 0 0 325 255" fill="none" stroke="url(#ts25_blue)" stroke-width="26" stroke-linecap="round" />
  
  <path id="textArcLower" d="M 85 258 A 132 132 0 0 0 315 258" fill="none" />
  <text fill="#FFFFFF" font-family="'Inter', 'Arial', sans-serif" font-size="11.5" font-weight="800" letter-spacing="1.5">
    <textPath href="#textArcLower" startOffset="50%" text-anchor="middle">
      KEMENTERIAN PENDIDIKAN MALAYSIA
    </textPath>
  </text>

  <!-- Tagline Banner at Bottom -->
  <rect x="70" y="325" width="260" height="26" rx="13" fill="#F59E0B" />
  <text x="200" y="342" 
    font-family="'Inter', sans-serif" 
    font-size="10.5" 
    font-weight="800" 
    fill="#1E3A8A" 
    text-anchor="middle" 
    letter-spacing="0.5">
    PENGGERAK PEMBELAJARAN BERMAKNA
  </text>
</svg>`;

export const OFFICIAL_TS25_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(OFFICIAL_TS25_SVG)}`;

/**
 * Standard TS25 Logo Component
 */
export const TS25Logo: React.FC<{ className?: string; size?: number; alt?: string }> = ({ 
  className = 'w-10 h-10', 
  size, 
  alt = 'Logo TS25' 
}) => {
  return (
    <img 
      src={OFFICIAL_TS25_DATA_URI} 
      alt={alt} 
      className={`object-contain shrink-0 ${className}`} 
      style={size ? { width: size, height: size } : undefined} 
    />
  );
};

/**
 * Fallback School Crest SVG when no custom school logo is uploaded yet
 */
export const DEFAULT_SCHOOL_CREST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">
  <defs>
    <linearGradient id="crest_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="50%" stop-color="#0D9488" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
  </defs>
  <!-- Shield Outline -->
  <path d="M 100 15 C 160 15, 175 40, 175 90 C 175 145, 135 175, 100 190 C 65 175, 25 145, 25 90 C 25 40, 40 15, 100 15 Z" 
    fill="url(#crest_grad)" stroke="#FFFFFF" stroke-width="4" />
  
  <!-- Inner Shield -->
  <path d="M 100 25 C 150 25, 162 48, 162 90 C 162 136, 128 162, 100 176 C 72 162, 38 136, 38 90 C 38 48, 50 25, 100 25 Z" 
    fill="#FFFFFF" />

  <!-- Torch / Pen Symbol -->
  <g transform="translate(100, 85) scale(0.85)">
    <!-- Book -->
    <path d="M -45 40 C -25 32, -5 32, 0 38 C 5 32, 25 32, 45 40 L 45 10 C 25 5, 5 5, 0 10 C -5 5, -25 5, -45 10 Z" fill="#0D9488" />
    <!-- Flame -->
    <path d="M 0 -45 C 18 -25, 18 -10, 0 8 C -18 -10, -18 -25, 0 -45 Z" fill="#F59E0B" />
    <path d="M 0 -35 C 10 -20, 10 -10, 0 2 C -10 -10, -10 -20, 0 -35 Z" fill="#EF4444" />
    <!-- Torch handle -->
    <polygon points="-8,8 8,8 5,30 -5,30" fill="#059669" />
  </g>
  
  <!-- Motto Ribbon -->
  <path d="M 30 160 Q 100 145 170 160 L 165 175 Q 100 160 35 175 Z" fill="#1E293B" />
  <text x="100" y="169" font-family="Arial, sans-serif" font-size="8" font-weight="bold" fill="#F8FAFC" text-anchor="middle">
    ILMU PANDUAN HIDUP
  </text>
</svg>`;

export const DEFAULT_SCHOOL_CREST_DATA_URI = `data:image/svg+xml;utf8,${encodeURIComponent(DEFAULT_SCHOOL_CREST_SVG)}`;

/**
 * Resizes an uploaded image file on the client side and converts it to a clean Base64 data URL.
 * Ensures the image fits within maxDimensions (default 400x400) to keep localStorage lightweight.
 */
export async function resizeImageToBase64(
  file: File,
  maxWidth = 400,
  maxHeight = 400,
  quality = 0.88
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's already an SVG, read text directly
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio
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
          resolve(readerEvent.target?.result as string);
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);

        // Keep PNG transparency if PNG, else JPEG for compact storage
        const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputType, quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Gagal memproses fail imej'));
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
