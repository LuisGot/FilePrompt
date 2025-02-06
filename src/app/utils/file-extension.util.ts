/**
 * Centralized list of blocked (non‑text) file extensions.
 */
export const BLOCKED_FILE_EXTENSIONS: string[] = [
  // Images
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".tiff",
  ".webp",
  ".ico",
  ".icns",
  // Audio
  ".mp3",
  ".wav",
  ".ogg",
  ".m4a",
  ".flac",
  ".aac",
  // Video
  ".mp4",
  ".avi",
  ".mkv",
  ".mov",
  ".wmv",
  ".flv",
  ".webm",
  // Archives
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".bz2",
  // Documents
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  // Executables
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".dat",
  // Databases
  ".db",
  ".sqlite",
  ".mdb",
  // Fonts
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
  // Other binaries
  ".class",
  ".pyc",
  ".pyo",
  ".o",
  ".obj",
];
