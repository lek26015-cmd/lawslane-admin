import { callTyphoonOCR } from './src/lib/typhoon';
import fs from 'fs';

// Minimal PDF Base64
const pdfBase64 = "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nCtUMNAzAAAAMwAzCmVuZHN0cmVhbQplbmRvYmoKMyAwIG9iago2CmVuZG9iago1IDAgb2JqCjw8Cj4+CmVuZG9iago2IDAgb2JqCjw8L0ZvbnQgNSAwIFIvUHJvY1NldFsvUERGL1RleHRdPj4KZW5kb2JqCjEgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCA0IDAgUi9SZXNvdXJjZXMgNiAwIFIvTWVkaWFCb3hbMCAwIDIwMCAyMDBdL0NvbnRlbnRzIDIgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvVHlwZS9QYWdlcy9SZXNvdXJjZXMgNiAwIFIvTWVkaWFCb3hbMCAwIDIwMCAyMDBdL0tpZHdbMSAwIFJdL0NvdW50IDE+PgplbmRvYmoKNyAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgNCAwIFI+PgplbmRvYmoKOCAwIG9iago8PC9DcmVhdG9yKFBERmKitSAvIFBERi1TaGVsbFRvb2xzKS9Qcm9kdWNlcihQREZLaXQgLyBQREYtU2hlbGxUb29scykgL0NyZWF0aW9uRGF0ZShEOjIwMjEwOTAyMTcxNzMwWik+PgplbmRvYmoKeHJlZgowIDkKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAwMTUgMDAwMDAgbiAgCjAwMDAwMDAwNjYgMDAwMDAgbiAgCjAwMDAwMDAyMjUgMDAwMDAgbiAgCjAwMDAwMDAwODIgMDAwMDAgbiAgCjAwMDAwMDAwOTAgMDAwMDAgbiAgCjAwMDAwMDAzMjUgMDAwMDAgbiAgCjAwMDAwMDAzNzAgMDAwMDAgbiAgCnRyYWlsZXIKPDwvU2l6ZSA5L1Jvb3QgNyAwIFIvSW5mbyA4IDAgUj4+CnN0YXJ0eHJlZgo1MDYKJSVFT0YK";

async function test() {
    try {
        const buffer = Buffer.from(pdfBase64, 'base64');
        process.env.TYPHOON_API_KEY = "sk-3J5wQwmX4wHECaptDdNAfNdP3WAdcnupOyR3ZOW01EUwUgmU"; // From .env.local

        console.log("Testing Typhoon OCR with PDF...");
        const result = await callTyphoonOCR(buffer);
        console.log("Result:", result);
    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
