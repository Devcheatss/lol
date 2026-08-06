"use strict";

/* Minimal EXIF reader for JPEG files (APP1). Pure client-side. */
function parseEXIF(buffer) {
  const u8 = new Uint8Array(buffer);
  if (u8.length < 24 || u8[0] !== 0xff || u8[1] !== 0xd8) return null;

  let offset = 2;
  let tiffOff = -1;
  while (offset + 8 < u8.length) {
    if (u8[offset] !== 0xff) break;
    const marker = u8[offset + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue; }
    if (marker === 0xd9) break;
    const len = (u8[offset + 2] << 8) | u8[offset + 3];
    if (marker === 0xe1 && len >= 14 &&
        u8[offset + 4] === 0x45 && u8[offset + 5] === 0x78 && u8[offset + 6] === 0x69 &&
        u8[offset + 7] === 0x66 && u8[offset + 8] === 0x00 && u8[offset + 9] === 0x00) {
      tiffOff = offset + 10;
      break;
    }
    offset += 2 + len;
  }
  if (tiffOff < 0 || tiffOff + 8 > u8.length) return null;

  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const isLE = u8[tiffOff] === 0x49 && u8[tiffOff + 1] === 0x49;
  const getU16 = (o) => dv.getUint16(tiffOff + o, isLE);
  const getU32 = (o) => dv.getUint32(tiffOff + o, isLE);
  const getI32 = (o) => dv.getInt32(tiffOff + o, isLE);

  if (getU16(2) !== 42) return null;

  const readAscii = (o, len) => {
    let s = "";
    for (let i = 0; i < len; i++) {
      const c = u8[tiffOff + o + i];
      if (c === 0) break;
      s += c >= 32 && c < 127 ? String.fromCharCode(c) : ".";
    }
    return s;
  };
  const readRational = (o) => {
    const n = getU32(o);
    const d = getU32(o + 4);
    return d === 0 ? 0 : n / d;
  };
  const sizeMap = [0, 1, 1, 2, 4, 8, 1, 1, 4, 8];
  const readValue = (entryOff) => {
    const type = getU16(entryOff + 2);
    const count = getU32(entryOff + 4);
    const size = (sizeMap[type] || 1) * count;
    const dataOff = size <= 4 ? entryOff + 8 : getU32(entryOff + 8);
    switch (type) {
      case 2: return readAscii(dataOff, Math.min(count, 1024));
      case 1: {
        if (count === 1) return u8[tiffOff + dataOff];
        const a = [];
        for (let i = 0; i < count; i++) a.push(u8[tiffOff + dataOff + i]);
        return a;
      }
      case 3: {
        if (count === 1) return getU16(dataOff);
        const a = [];
        for (let i = 0; i < count; i++) a.push(getU16(dataOff + i * 2));
        return a;
      }
      case 4: return getU32(dataOff);
      case 5: {
        if (count === 1) return readRational(dataOff);
        const a = [];
        for (let i = 0; i < count; i++) a.push(readRational(dataOff + i * 8));
        return a;
      }
      case 9: return getI32(dataOff);
      case 10: return count === 1 ? getI32(dataOff) / getI32(dataOff + 4) : 0;
      default: return null;
    }
  };

  const readIfd = (ifdOff) => {
    if (!ifdOff || ifdOff <= 0 || ifdOff + 2 > u8.length) return [];
    const count = getU16(ifdOff);
    const entries = [];
    for (let i = 0; i < count; i++) {
      const off = ifdOff + 2 + i * 12;
      if (off + 12 > u8.length) break;
      entries.push({ tag: getU16(off), off });
    }
    return entries;
  };

  const out = {};
  let exifOff = 0;
  let gpsOff = 0;

  const IFD0_TAGS = { 0x010e: "ImageDescription", 0x010f: "Make", 0x0110: "Model", 0x0112: "Orientation", 0x0131: "Software", 0x0132: "DateTime", 0x013b: "Artist" };
  for (const e of readIfd(getU32(4))) {
    if (e.tag in IFD0_TAGS) out[IFD0_TAGS[e.tag]] = readValue(e.off);
    if (e.tag === 0x8769) exifOff = readValue(e.off);
    if (e.tag === 0x8825) gpsOff = readValue(e.off);
  }

  if (exifOff) {
    const EXIF_TAGS = { 0x9003: "DateTimeOriginal", 0x9004: "DateTimeDigitized", 0x829a: "ExposureTime", 0x829d: "FNumber", 0x8827: "ISO", 0x920a: "FocalLength", 0xa002: "PixelX", 0xa003: "PixelY", 0xa434: "LensModel" };
    for (const e of readIfd(exifOff)) {
      if (e.tag in EXIF_TAGS) out[EXIF_TAGS[e.tag]] = readValue(e.off);
    }
  }

  if (gpsOff) {
    const gps = {};
    const ref = {};
    for (const e of readIfd(gpsOff)) {
      if (e.tag === 0x0001) ref.lat = readValue(e.off);
      if (e.tag === 0x0002) gps.latRaw = readValue(e.off);
      if (e.tag === 0x0003) ref.lon = readValue(e.off);
      if (e.tag === 0x0004) gps.lonRaw = readValue(e.off);
      if (e.tag === 0x0006) gps.alt = Math.round(readValue(e.off) * 100) / 100;
    }
    const toDeg = (arr) => {
      if (!arr) return null;
      const [d, m, s] = Array.isArray(arr) ? arr : [arr, 0, 0];
      return d + m / 60 + (s || 0) / 3600;
    };
    if (gps.latRaw) gps.lat = ((ref.lat === "S" ? -1 : 1) * toDeg(gps.latRaw)).toFixed(6) + "°";
    if (gps.lonRaw) gps.lon = ((ref.lon === "W" ? -1 : 1) * toDeg(gps.lonRaw)).toFixed(6) + "°";
    if (gps.lat && gps.lon) {
      out.gps = { lat: gps.lat, lon: gps.lon, alt: gps.alt !== undefined ? gps.alt + " m" : null };
    }
  }

  if (typeof out.ExposureTime === "number") out.ExposureTime = out.ExposureTime < 1 ? "1/" + Math.round(1 / out.ExposureTime) : String(Math.round(out.ExposureTime * 100) / 100);
  if (typeof out.FNumber === "number") out.FNumber = Math.round(out.FNumber * 100) / 100;
  if (typeof out.FocalLength === "number") out.FocalLength = Math.round(out.FocalLength * 10) / 10;
  if (out.PixelX && out.PixelY) out.PixelDimensions = out.PixelX + " × " + out.PixelY;
  delete out.PixelX;
  delete out.PixelY;
  if (Array.isArray(out.ISO)) out.ISO = out.ISO[0];
  if (out.Orientation) {
    const map = { 1: "normal", 3: "rotated 180°", 6: "rotated 90° CW", 8: "rotated 90° CCW" };
    out.Orientation = map[out.Orientation] || String(out.Orientation);
  }

  return Object.keys(out).length ? out : null;
}
