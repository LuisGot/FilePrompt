/**
 * A shared utility module for file extension-related functions.
 * This module centralizes the list of blocked (non-text) file extensions.
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
  ".svg",
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
  // Executables & binaries
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".dat",
  // Database files
  ".db",
  ".sqlite",
  ".mdb",
  // Fonts
  ".ttf",
  ".otf",
  ".woff",
  ".woff2",
  // Other binary formats
  ".class",
  ".pyc",
  ".pyo",
  ".o",
  ".obj",
];
