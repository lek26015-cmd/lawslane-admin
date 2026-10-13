/**
 * สร้าง src/lib/cost-sheet-fixture.json จากไฟล์ต้นทุน .xlsx ที่แตกไฟล์แล้ว (ไม่เรียก Google)
 *
 * ใช้: ดาวน์โหลด Google Sheet เป็น .xlsx → unzip -d <dir> → npx tsx scripts/cost-sheet-fixture.ts <dir>
 *
 * เก็บเฉพาะช่องที่ admin เขียน (ค่า + เป็นสูตรไหม) ป้ายแถว และ defined name ที่ผังอ้าง — ไม่เก็บ id ของ Sheet
 * ไม่ต้องมี dependency: อ่าน XML ด้วย regex (ไฟล์มาจาก Excel/Google เป็นรูปแบบเดียวกันเสมอ)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DEFAULT_COST_ASSUMPTIONS, DEFAULT_RUN_CONTEXT } from '../src/lib/cost-model';
import { buildCostSheetBatch } from '../src/lib/cost-sheet-map';

const dir = process.argv[2];
if (!dir) {
    console.error('usage: tsx scripts/cost-sheet-fixture.ts <unzipped-xlsx-dir>');
    process.exit(1);
}
const xl = (p: string) => readFileSync(join(resolve(dir), 'xl', p), 'utf8');
const unxml = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

const shared = [...xl('sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map((m) => [...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => unxml(t[1])).join(''));

const wb = xl('workbook.xml');
const rels = xl('_rels/workbook.xml.rels');
const sheetFile: Record<string, string> = {};
for (const m of wb.matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)) {
    const target = new RegExp(`Id="${m[2]}"[^>]*Target="([^"]+)"`).exec(rels)?.[1];
    if (target) sheetFile[unxml(m[1])] = target;
}

type Cell = { v: number | string | null; f: boolean };
const cache: Record<string, Record<string, Cell>> = {};
function cells(tab: string): Record<string, Cell> {
    if (cache[tab]) return cache[tab];
    const xml = xl(sheetFile[tab]);
    const out: Record<string, Cell> = {};
    for (const m of xml.matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = m[2];
        const inner = m[3] ?? '';
        const raw = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        const t = /t="([^"]+)"/.exec(attrs)?.[1];
        let v: number | string | null = null;
        if (raw !== undefined) v = t === 's' ? shared[Number(raw)] : t === 'str' || t === 'inlineStr' ? unxml(raw) : Number(raw);
        else if (t === 'inlineStr') v = unxml(/<t[^>]*>([\s\S]*?)<\/t>/.exec(inner)?.[1] ?? '');
        out[m[1]] = { v, f: /<f[\s>/]/.test(inner) };
    }
    return (cache[tab] = out);
}

const split = (ref: string) => {
    const m = /^'(.+)'!([A-Z]+\d+)$/.exec(ref)!;
    return { tab: m[1], cell: m[2] };
};
const get = (ref: string): Cell => {
    const { tab, cell } = split(ref);
    return cells(tab)[cell] ?? { v: null, f: false };
};

const names: Record<string, string> = {};
for (const m of wb.matchAll(/<definedName name="([^"]+)"[^>]*>([^<]+)<\/definedName>/g)) names[m[1]] = unxml(m[2]);

const writes = buildCostSheetBatch(DEFAULT_COST_ASSUMPTIONS, DEFAULT_RUN_CONTEXT);
const fixture = {
    note: 'สร้างด้วย scripts/cost-sheet-fixture.ts จาก Google Sheet ต้นทุน (แชร์แบบมีลิงก์) — ช่องที่ admin เขียน + ป้ายแถว + defined names',
    cells: {} as Record<string, Cell>,
    labels: {} as Record<string, string>,
    names: {} as Record<string, string>,
};
for (const w of writes) {
    fixture.cells[w.range] = get(w.range);
    const label = get(w.target.labelCell).v;
    fixture.labels[w.target.labelCell] = label == null ? '' : String(label);
    const base = w.target.name?.split('#')[0];
    if (base && names[base]) fixture.names[base] = names[base];
}
const outPath = resolve(__dirname, '../src/lib/cost-sheet-fixture.json');
// หนึ่งช่องต่อบรรทัด ให้ diff อ่านง่าย
const block = (o: Record<string, unknown>) => `{\n${Object.entries(o).map(([k, v]) => `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(',\n')}\n  }`;
writeFileSync(outPath, `{\n  "note": ${JSON.stringify(fixture.note)},\n  "cells": ${block(fixture.cells)},\n  "labels": ${block(fixture.labels)},\n  "names": ${block(fixture.names)}\n}\n`);
console.log(`wrote ${Object.keys(fixture.cells).length} cells, ${Object.keys(fixture.labels).length} labels, ${Object.keys(fixture.names).length} names`);
