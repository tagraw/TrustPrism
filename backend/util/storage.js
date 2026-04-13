import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SECURE_TMP_DIR = path.join(__dirname, "..", "secure_tmp");

/**
 * Securely overwrites a file with zeros and then deletes it.
 * @param {string} filePath - Absolute or relative path to the file.
 */
export async function secureDelete(filePath) {
    if (!filePath) return;
    
    try {
        // Resolve path: if it starts with /uploads, it's relative to backend/
        let fullPath = filePath;
        if (!path.isAbsolute(filePath)) {
            // Handle the case where the path in DB is "/uploads/..."
            const relativePath = filePath.startsWith("/") ? filePath.substring(1) : filePath;
            fullPath = path.join(__dirname, "..", relativePath);
        }
        
        if (fsSync.existsSync(fullPath)) {
            const stats = await fs.stat(fullPath);
            const size = stats.size;
            
            // 1. Overwrite with zeros
            const zeroBuffer = Buffer.alloc(stats.size, 0);
            await fs.writeFile(fullPath, zeroBuffer);
            
            // 2. Ensure it's flushed to disk
            const fd = fsSync.openSync(fullPath, 'r+');
            fsSync.fsyncSync(fd);
            fsSync.closeSync(fd);
            
            // 3. Unlink (delete)
            await fs.unlink(fullPath);
            console.log(`[STORAGE] Securely deleted: ${fullPath}`);
            
            // 4. Overwrite buffer in memory
            zeroBuffer.fill(0);
        }
    } catch (err) {
        console.error(`[STORAGE] Failed to securely delete ${filePath}:`, err);
    }
}

/**
 * Generates a CSV Buffer from headers and rows.
 * @param {string[]} headers 
 * @param {any[][]} rows 
 * @returns {Buffer}
 */
export function generateSecureCSVBuffer(headers, rows) {
    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(v => {
            const val = String(v ?? "").replace(/"/g, '""');
            return `"${val}"`;
        }).join(","))
    ].join("\n");
    
    return Buffer.from(csvContent, 'utf-8');
}

/**
 * Saves a Buffer to the secure temporary directory.
 * @param {string} filename 
 * @param {Buffer} buffer 
 * @returns {string} - Full path to the temporary file.
 */
export async function saveToSecureTmp(filename, buffer) {
    const safeFilename = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(SECURE_TMP_DIR, safeFilename);
    await fs.writeFile(filePath, buffer);
    return filePath;
}

/**
 * Utility to clear a buffer.
 * @param {Buffer} buffer 
 */
export function clearBuffer(buffer) {
    if (Buffer.isBuffer(buffer)) {
        buffer.fill(0);
    }
}
