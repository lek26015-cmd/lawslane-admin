const fs = require('fs');
const pdf = require('pdf-parse');

async function testStandardUsage() {
    try {
        console.log('Testing standard usage...');
        // Create a dummy PDF buffer (this relies on pdf-parse handling empty/invalid buffers gracefully or valid pdfs)
        // Since I don't have a valid PDF easily, I'll rely on inspecting the library export structure.
        console.log('pdf export type:', typeof pdf);
        console.log('pdf keys:', Object.keys(pdf));

        if (typeof pdf === 'function') {
            console.log('pdf-parse is a function (standard expected behavior)');
        } else {
            console.log('pdf-parse is NOT a function');
        }

        try {
            const PDFParse = pdf.PDFParse;
            console.log('pdf.PDFParse exists:', !!PDFParse);
            if (PDFParse) {
                console.log('pdf.PDFParse type:', typeof PDFParse);
            }
        } catch (e) {
            console.log('Error checking PDFParse property:', e);
        }

    } catch (error) {
        console.error('Standard usage error:', error);
    }
}

testStandardUsage();
