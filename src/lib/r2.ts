import { S3Client } from "@aws-sdk/client-s3";

export const r2 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
    // aws-sdk v3 รุ่นใหม่ใส่ checksum CRC32 ลง presigned URL โดยปริยาย ซึ่ง R2 ปฏิเสธ
    // เมื่อ browser อัปโหลดไฟล์จริงด้วย URL นั้น (checksum ไม่ตรง) — ให้คำนวณเฉพาะตอนจำเป็น
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
});
