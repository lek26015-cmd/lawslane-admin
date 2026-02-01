
import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register Thai font from local server
Font.register({
    family: 'NotoSansThai',
    src: 'http://localhost:9002/fonts/noto-sans-thai-regular.ttf',
});

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#fff',
        padding: 40,
        fontFamily: 'NotoSansThai',
    },
    title: {
        fontSize: 24,
        textAlign: 'center',
        marginBottom: 10,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 30,
        color: '#555',
    },
    headerDate: {
        fontSize: 12,
        textAlign: 'right',
        marginBottom: 20,
    },
    section: {
        marginBottom: 15,
        fontSize: 12,
        lineHeight: 1.5,
    },
    bold: {
        fontWeight: 'bold',
        color: '#000',
    },
    label: {
        color: '#444',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    clauseTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 15,
        marginBottom: 5,
        color: '#333',
    },
    signatureSection: {
        marginTop: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    signatureBlock: {
        width: '40%',
        alignItems: 'center',
    },
    signatureLine: {
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        width: '100%',
        marginBottom: 5,
        height: 20,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        fontSize: 10,
        textAlign: 'center',
        color: '#999',
    },
});

interface ContractData {
    employer: string;
    contractor: string;
    task: string;
    price: number;
    deposit: number;
    deadline: string;
    paymentTerms: string;
}

interface ContractPDFProps {
    data: ContractData;
}

const ContractPDF: React.FC<ContractPDFProps> = ({ data }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            <Text style={styles.title}>สัญญาจ้างทำของ</Text>
            <Text style={styles.subtitle}>(ฉบับย่อ)</Text>

            <View style={styles.headerDate}>
                <Text>วันที่: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            </View>

            <View style={styles.section}>
                <Text>สัญญาฉบับนี้ทำขึ้นระหว่าง</Text>
                <Text style={{ marginTop: 5 }}>ผู้ว่าจ้าง: <Text style={styles.bold}>{data.employer}</Text></Text>
                <Text>ซึ่งต่อไปในสัญญานี้จะเรียกว่า "ผู้ว่าจ้าง" ฝ่ายหนึ่ง</Text>
                <Text style={{ marginTop: 5 }}>กับ ผู้รับจ้าง: <Text style={styles.bold}>{data.contractor}</Text></Text>
                <Text>ซึ่งต่อไปในสัญญานี้จะเรียกว่า "ผู้รับจ้าง" อีกฝ่ายหนึ่ง</Text>
                <Text style={{ marginTop: 10 }}>โดยทั้งสองฝ่ายตกลงทำสัญญากันดังมีข้อความต่อไปนี้</Text>
            </View>


            <View style={styles.section}>
                <Text style={styles.clauseTitle}>ข้อ 1. เนื้องานที่จ้าง</Text>
                <Text>ผู้รับจ้างตกลงรับจ้างทำงาน: <Text style={styles.bold}>{data.task}</Text></Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.clauseTitle}>ข้อ 2. ค่าจ้างและการชำระเงิน</Text>
                <Text>ตกลงค่าจ้างเป็นจำนวนเงินทั้งสิ้น: <Text style={styles.bold}>{data.price.toLocaleString()} บาท</Text></Text>
                {data.deposit > 0 && (
                    <Text>(ได้รับเงินมัดจำแล้วจำนวน: {data.deposit.toLocaleString()} บาท)</Text>
                )}
                <Text>การชำระเงินส่วนที่เหลือ: <Text style={styles.bold}>{data.paymentTerms}</Text></Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.clauseTitle}>ข้อ 3. กำหนดการส่งมอบงาน</Text>
                <Text>ผู้รับจ้างตกลงจะทำงานให้แล้วเสร็จภายใน: <Text style={styles.bold}>{data.deadline}</Text></Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.clauseTitle}>ข้อ 4. การบอกเลิกสัญญา</Text>
                <Text>หากผู้รับจ้างไม่สามารถทำงานให้แล้วเสร็จตามกำหนด หรือเจตนาทิ้งงาน ผู้ว่าจ้างมีสิทธิบอกเลิกสัญญาและเรียกร้องค่าเสียหายได้ทันที</Text>
            </View>

            <View style={styles.signatureSection}>
                <View style={styles.signatureBlock}>
                    <View style={styles.signatureLine} />
                    <Text>ลงชื่อ ผู้ว่าจ้าง</Text>
                    <Text>({data.employer})</Text>
                </View>
                <View style={styles.signatureBlock}>
                    <View style={styles.signatureLine} />
                    <Text>ลงชื่อ ผู้รับจ้าง</Text>
                    <Text>({data.contractor})</Text>
                </View>
            </View>

            <Text style={styles.footer}>เอกสารนี้ถูกสร้างโดยระบบอัตโนมัติจาก Lawslane</Text>
        </Page>
    </Document>
);

export default ContractPDF;
