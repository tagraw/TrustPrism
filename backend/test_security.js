import { secureDelete, generateSecureCSVBuffer, clearBuffer, saveToSecureTmp } from "./util/storage.js";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";

async function test() {
    console.log("--- Testing Secure Storage ---");

    // 1. Test CSV Buffer and Memory Clearing
    const headers = ["id", "name"];
    const rows = [[1, "Alice"], [2, "Bob"]];
    const buffer = generateSecureCSVBuffer(headers, rows);
    console.log("Buffer created, size:", buffer.length);
    
    const tempPath = await saveToSecureTmp("test-export.csv", buffer);
    console.log("Saved to secure tmp:", tempPath);
    
    clearBuffer(buffer);
    console.log("Buffer cleared (first byte should be 0):", buffer[0]);
    if (buffer[0] !== 0) throw new Error("Buffer not cleared!");

    // 2. Test Secure Deletion (Zero-fill + Unlink)
    // Create a dummy file with some content
    const dummyPath = path.join(process.cwd(), "backend/secure_tmp/dummy.txt");
    await fs.writeFile(dummyPath, "Sensitive Data 12345");
    console.log("Created dummy file:", dummyPath);

    await secureDelete(dummyPath);
    
    if (fsSync.existsSync(dummyPath)) {
        throw new Error("File still exists after secureDelete!");
    }
    console.log("Verified: dummy file deleted.");

    // Clean up the first temp file too
    await secureDelete(tempPath);
    if (fsSync.existsSync(tempPath)) {
        throw new Error("Temp file still exists after secureDelete!");
    }
    console.log("Verified: temp export file deleted.");

    console.log("--- All Security Tests Passed ---");
}

test().catch(err => {
    console.error("Test failed:", err);
    process.exit(1);
});
