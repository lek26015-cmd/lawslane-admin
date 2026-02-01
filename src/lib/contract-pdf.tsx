'use client';

interface ContractData {
    employer: any; // Allow string or object
    employerId?: string;
    employerAddress?: string;
    contractor: any; // Allow string or object
    contractorId?: string;
    contractorAddress?: string;
    task: string;
    price: number;
    deposit: number;
    deadline: string;
    paymentTerms: string;
}

// Format Thai date
function formatThaiDate(date: Date): string {
    const thaiMonths = [
        'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
        'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const day = date.getDate();
    const month = thaiMonths[date.getMonth()];
    const year = date.getFullYear() + 543;
    return `${day} ${month} ${year}`;
}

// Format currency
function formatCurrency(amount: number): string {
    return amount.toLocaleString('th-TH');
}

// Helper to show value or blank placeholder
function valueOrBlank(value: string | undefined, placeholder = '______________________________'): string {
    if (!value || value === '_______' || value.trim() === '') {
        return placeholder;
    }
    return value;
}

export function generateContractPDF(data: ContractData) {
    // Normalize data (Handle both flat and nested structures)
    const employerName = typeof data.employer === 'string' ? data.employer : data.employer?.name;
    const employerId = typeof data.employer === 'string' ? data.employerId : (data.employer?.id_card || data.employerId);
    const employerAddress = typeof data.employer === 'string' ? data.employerAddress : (data.employer?.address || data.employerAddress);
    const employerSignature = typeof data.employer === 'object' ? data.employer?.signature : null;

    const contractorName = typeof data.contractor === 'string' ? data.contractor : data.contractor?.name;
    const contractorId = typeof data.contractor === 'string' ? data.contractorId : (data.contractor?.id_card || data.contractorId);
    const contractorAddress = typeof data.contractor === 'string' ? data.contractorAddress : (data.contractor?.address || data.contractorAddress);
    const contractorSignature = typeof data.contractor === 'object' ? data.contractor?.signature : null;

    // Create a new window with printable content
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (!printWindow) {
        alert('กรุณาอนุญาต popup เพื่อดาวน์โหลด PDF');
        return;
    }

    const blankLine = '______________________________';
    const shortBlank = '___________________';
    const idBlank = '______________________';

    const htmlContent = `
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>สัญญาจ้าง</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Sarabun', sans-serif;
            font-size: 13px;
            line-height: 1.6;
            color: #333;
            padding: 25px 35px;
            max-width: 100%;
        }
        
        .title {
            text-align: center;
            font-size: 20px;
            font-weight: bold;
            color: #0B3979;
            margin-bottom: 3px;
        }
        
        .subtitle {
            text-align: center;
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
        }
        
        .date {
            text-align: right;
            margin-bottom: 12px;
            font-size: 12px;
        }
        
        .section {
            margin-bottom: 10px;
        }
        
        .clause-title {
            font-size: 13px;
            font-weight: bold;
            color: #DC7800;
            margin-top: 12px;
            margin-bottom: 4px;
        }
        
        .value {
            color: #0B3979;
            font-weight: bold;
        }
        
        .blank {
            color: #999;
        }
        
        .money {
            color: #008000;
            font-weight: bold;
        }
        
        .party-box {
            display: flex;
            gap: 30px;
            margin: 10px 0;
        }
        
        .party-info {
            flex: 1;
            padding: 10px 12px;
            background: #f8fafc;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        
        .party-info h4 {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 6px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .party-info p {
            margin: 3px 0;
            font-size: 12px;
        }
        
        .party-label {
            color: #64748b;
            font-size: 11px;
        }
        
        .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 40px;
            padding: 0 30px;
        }
        
        .signature-block {
            text-align: center;
            width: 40%;
        }
        
        .signature-line {
            border-bottom: 1px solid #000;
            margin-bottom: 5px;
            height: 40px;
            position: relative;
            display: flex;
            align-items: flex-end;
            justify-content: center;
        }
        
        .signature-line.signed {
            border-bottom: none;
        }

        .signature-img {
            max-height: 60px;
            object-fit: contain;
        }
        
        .signature-block p {
            font-size: 12px;
            margin: 2px 0;
        }
        
        .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 10px;
            color: #999;
        }
        
        @media print {
            body {
                padding: 15px 25px;
            }
            .no-print {
                display: none;
            }
            @page {
                margin: 10mm;
            }
        }
    </style>
</head>
<body>
    <div class="no-print" style="text-align: center; margin-bottom: 15px; padding: 12px; background: #f0f7ff; border-radius: 8px;">
        <p style="margin-bottom: 8px; font-size: 13px;">กด <strong>Ctrl+P</strong> (หรือ <strong>Cmd+P</strong> บน Mac) เพื่อบันทึกเป็น PDF</p>
        <button onclick="window.print()" style="padding: 8px 25px; background: #0B3979; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 13px;">
            บันทึกเป็น PDF
        </button>
    </div>

    <h1 class="title">สัญญาจ้าง</h1>
    <p class="subtitle">(ฉบับย่อ)</p>
    
    <p class="date">วันที่: ${formatThaiDate(new Date())}</p>
    
    <div class="section">
        <p>สัญญาฉบับนี้ทำขึ้นระหว่าง</p>
        
        <div class="party-box">
            <div class="party-info">
                <h4>ผู้ว่าจ้าง</h4>
                <p><span class="party-label">ชื่อ:</span> <span class="${employerName ? 'value' : 'blank'}">${valueOrBlank(employerName)}</span></p>
                <p><span class="party-label">บัตรประชาชน:</span> <span class="${employerId ? 'value' : 'blank'}">${valueOrBlank(employerId, idBlank)}</span></p>
                <p><span class="party-label">ที่อยู่:</span> <span class="${employerAddress ? 'value' : 'blank'}">${valueOrBlank(employerAddress, blankLine)}</span></p>
            </div>
            
            <div class="party-info">
                <h4>ผู้รับจ้าง</h4>
                <p><span class="party-label">ชื่อ:</span> <span class="${contractorName ? 'value' : 'blank'}">${valueOrBlank(contractorName)}</span></p>
                <p><span class="party-label">บัตรประชาชน:</span> <span class="${contractorId ? 'value' : 'blank'}">${valueOrBlank(contractorId, idBlank)}</span></p>
                <p><span class="party-label">ที่อยู่:</span> <span class="${contractorAddress ? 'value' : 'blank'}">${valueOrBlank(contractorAddress, blankLine)}</span></p>
            </div>
        </div>
        
        <p style="margin-top: 8px;">โดยทั้งสองฝ่ายตกลงทำสัญญากันดังมีข้อความต่อไปนี้</p>
    </div>
    
    <p class="clause-title">ข้อ 1. เนื้องานที่จ้าง</p>
    <p>ผู้รับจ้างตกลงรับจ้างทำงาน: <span class="${data.task ? 'value' : 'blank'}">${valueOrBlank(data.task)}</span></p>
    
    <p class="clause-title">ข้อ 2. ค่าจ้างและการชำระเงิน</p>
    <p>ตกลงค่าจ้างเป็นจำนวนเงินทั้งสิ้น: ${data.price ? `<span class="money">${formatCurrency(data.price)} บาท</span>` : `<span class="blank">${shortBlank}</span> บาท`}${(data.deposit && data.deposit > 0) ? ` (มัดจำแล้ว: <span class="money">${formatCurrency(data.deposit)}</span> บาท)` : ''}</p>
    <p>การชำระเงินส่วนที่เหลือ: <span class="${data.paymentTerms ? 'value' : 'blank'}">${valueOrBlank(data.paymentTerms)}</span></p>
    
    <p class="clause-title">ข้อ 3. กำหนดการส่งมอบงาน</p>
    <p>ผู้รับจ้างตกลงจะทำงานให้แล้วเสร็จภายใน: <span class="${data.deadline ? 'value' : 'blank'}">${valueOrBlank(data.deadline)}</span></p>
    
    <p class="clause-title">ข้อ 4. การบอกเลิกสัญญา</p>
    <p>หากผู้รับจ้างไม่สามารถทำงานให้แล้วเสร็จตามกำหนด หรือเจตนาทิ้งงาน ผู้ว่าจ้างมีสิทธิบอกเลิกสัญญาและเรียกร้องค่าเสียหายได้ทันที</p>
    
    <div class="signatures">
        <div class="signature-block">
            <div class="signature-line ${employerSignature ? 'signed' : ''}">
                ${employerSignature ? `<img src="${employerSignature}" class="signature-img" />` : ''}
            </div>
            <p>ลงชื่อ ผู้ว่าจ้าง</p>
            <p>(${valueOrBlank(employerName, '.....................')})</p>
        </div>
        <div class="signature-block">
            <div class="signature-line ${contractorSignature ? 'signed' : ''}">
                ${contractorSignature ? `<img src="${contractorSignature}" class="signature-img" />` : ''}
            </div>
            <p>ลงชื่อ ผู้รับจ้าง</p>
            <p>(${valueOrBlank(contractorName, '.....................')})</p>
        </div>
    </div>
    
    <p class="footer">เอกสารนี้ถูกสร้างโดยระบบอัตโนมัติจาก Lawslane</p>
</body>
</html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
}
