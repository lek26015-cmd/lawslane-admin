import { parsePdfFromBuffer } from './src/lib/pdf-loader';

// Minimal PDF Base64 (Text based, 1 page)
const pdfBase64 = "JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDMgMCBSL0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nCtUMNAzAAAAMwAzCmVuZHN0cmVhbQplbmRvYmoKMyAwIG9iago2CmVuZG9iago1IDAgb2JqCjw8Cj4+CmVuZG9iago2IDAgb2JqCjw8L0ZvbnQgNSAwIFIvUHJvY1NldFsvUERGL1RleHRdPj4KZW5kb2JqCjEgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCA0IDAgUi9SZXNvdXJjZXMgNiAwIFIvTWVkaWFCb3hbMCAwIDIwMCAyMDBdL0NvbnRlbnRzIDIgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvVHlwZS9QYWdlcy9SZXNvdXJjZXMgNiAwIFIvTWVkaWFCb3hbMCAwIDIwMCAyMDBdL0tpZHdbMSAwIFJdL0NvdW50IDE+PgplbmRvYmoKNyAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgNCAwIFI+PgplbmRvYmoKOCAwIG9iago8PC9DcmVhdG9yKFBERmKitSAvIFBERi1TaGVsbFRvb2xzKS9Qcm9kdWNlcihQREZLaXQgLyBQREYtU2hlbGxUb29scykgL0NyZWF0aW9uRGF0ZShEOjIwMjEwOTAyMTcxNzMwWik+PgplbmRvYmoKeHJlZgowIDkKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMTE1IDAwMDAwIG4gCjAwMDAwMDAwMTUgMDAwMDAgbiAgCjAwMDAwMDAwNjYgMDAwMDAgbiAgCjAwMDAwMDAyMjUgMDAwMDAgbiAgCjAwMDAwMDAwODIgMDAwMDAgbiAgCjAwMDAwMDAwOTAgMDAwMDAgbiAgCjAwMDAwMDAzMjUgMDAwMDAgbiAgCjAwMDAwMDAzNzAgMDAwMDAgbiAgCnRyYWlsZXIKPDwvU2l6ZSA5L1Jvb3QgNyAwIFIvSW5mbyA4IDAgUj4+CnN0YXJ0eHJlZgo1MDYKJSVFT0YK";

async function test() {
    try {
        const buffer = Buffer.from(pdfBase64, 'base64');
        console.log("Testing parsePdfFromBuffer with dummy PDF...");

        // This is a valid text PDF, so it should return text "3".
        const text = await parsePdfFromBuffer(buffer);
        console.log("Result Text:", text);

        // We can't easily force the fallback path without mocking `parser.getText()` to return empty.
        // But we can trust that if `text` is returned, the library is working.
        // To test fallback we would need a file that `pdf-parse` fails to read text from.

    } catch (e) {
        console.error("Test failed:", e);
    }
}

test();
