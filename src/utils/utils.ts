import { getIndex } from '../libs/pinecone.js'

export const SKIP_DIR = [
    ".git",
    "node_modules",
    "dist",
    "build",
    "target",
    "coverage",
    ".venv",
    "venv",
    "__pycache__",
    ".gradle"
];

export const IGNORE_EXTENSIONS = new Set([
    ".class", ".jar", ".war", ".ear", ".dll", ".exe", ".pdb",
    ".o", ".obj", ".out", ".so", ".dylib", ".a", ".lib",
    ".pyc", ".pyo", ".pyd", ".min.js", ".min.css", ".map",
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock",
    "Pipfile.lock", "go.sum", "Cargo.lock", "Gemfile.lock", "composer.lock",
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".bmp", ".tiff",
    ".psd", ".ai", ".fig", ".sketch",
    ".mp4", ".mov", ".avi", ".mp3", ".wav", ".flac",
    ".zip", ".tar", ".gz", ".rar", ".7z", ".bz2", ".tgz",
    ".swp", ".DS_Store", "Thumbs.db",
    ".ttf", ".otf", ".woff", ".woff2", ".eot",
    ".db", ".sqlite", ".sqlite3", ".mdb", ".sqldump"
]);

export function shouldSkipFiles(path: string, size: number | undefined) {
    // check for the size
    if (typeof size === 'number' && size >= 200_000) return true;

    const paths = path.split('/');
    const fileName = paths[paths.length - 1] ?? '';

    if (paths.some(path => SKIP_DIR.includes(path))) return true;
    if (IGNORE_EXTENSIONS.has(fileName)) return true;

    return false;
}