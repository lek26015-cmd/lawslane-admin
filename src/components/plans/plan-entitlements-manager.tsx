'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Save, Search, RotateCcw, UserPlus, Trash2, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAdminLocale } from '@/lib/admin-i18n';
import { PLAN_CATALOG, PlanProduct, PlanValues } from '@/lib/plan-entitlements';
import {
    CustomerPlanRow,
    findCustomerAction,
    getPlanConfigAction,
    grantPlanAction,
    listPlanGrantsAction,
    revokePlanAction,
    savePlanConfigAction,
} from '@/app/actions/plan-entitlement-actions';

/**
 * หน้าจัดการแพ็กเกจและสิทธิ์ของลูกค้า — ใช้ร่วมกันระหว่าง CapDeal และ Wittaya
 *  แท็บ 1: ตั้งว่าแต่ละแพ็กเกจได้สิทธิ์อะไร  → planEntitlements/{product}
 *  แท็บ 2: มอบแพ็กเกจให้ลูกค้ารายคน       → users/{uid}.planGrants.{product}
 */
export function PlanEntitlementsManager({ product }: { product: PlanProduct }) {
    const catalog = PLAN_CATALOG[product];
    const { tx } = useAdminLocale();

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    {product === 'lawyer' ? tx('แพลนและสิทธิ์ทนาย', 'Lawyer Plans & Entitlements') : tx(`แพ็กเกจและสิทธิ์ ${catalog.name}`, `${catalog.name} Plans & Entitlements`)}
                </h2>
                <p className="text-slate-500">
                    {tx(
                        `กำหนดว่าแต่ละแพ็กเกจใช้ฟีเจอร์อะไรได้เท่าไร และมอบแพ็กเกจให้${catalog.subject[0]}รายคน — ระบบบังคับใช้ฝั่ง server ทันที`,
                        'Set what each plan can use, and grant plans to individual customers. Enforced server-side immediately.',
                    )}
                </p>
            </div>

            <Tabs defaultValue="plans">
                <TabsList>
                    <TabsTrigger value="plans">{tx('สิทธิ์ของแต่ละแพ็กเกจ', 'Plan entitlements')}</TabsTrigger>
                    <TabsTrigger value="grants">{tx(`${catalog.subject[0]}รายคน`, `${catalog.subject[1]}s`)}</TabsTrigger>
                </TabsList>
                <TabsContent value="plans" className="mt-6">
                    <PlanConfigEditor product={product} />
                </TabsContent>
                <TabsContent value="grants" className="mt-6">
                    <CustomerGrants product={product} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ---------------------------------------------------------------------------

function PlanConfigEditor({ product }: { product: PlanProduct }) {
    const catalog = PLAN_CATALOG[product];
    const { tx, locale } = useAdminLocale();
    const { toast } = useToast();
    const [plans, setPlans] = useState<Record<string, PlanValues> | null>(null);
    const [meta, setMeta] = useState<{ isDefault: boolean; updatedAt: string | null; updatedByEmail: string | null } | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        const res = await getPlanConfigAction(product);
        if (res.ok) {
            setPlans(res.data.plans);
            setMeta(res.data);
            setError(null);
        } else {
            setError(res.error);
        }
    }, [product]);

    useEffect(() => { load(); }, [load]);

    const setValue = (planId: string, key: string, value: number | boolean | null) => {
        setPlans(prev => prev && { ...prev, [planId]: { ...prev[planId], [key]: value } });
    };

    const save = async () => {
        if (!plans) return;
        setSaving(true);
        const res = await savePlanConfigAction(product, plans);
        setSaving(false);
        if (res.ok) {
            toast({ title: tx('บันทึกสิทธิ์แพ็กเกจแล้ว', 'Plan entitlements saved') });
            load();
        } else {
            toast({ title: tx('บันทึกไม่สำเร็จ', 'Save failed'), description: res.error, variant: 'destructive' });
        }
    };

    const resetToDefaults = () => setPlans(structuredClone(catalog.defaults));

    if (error) return <p className="text-sm text-red-600">{error}</p>;
    if (!plans) return <Loader2 className="h-6 w-6 animate-spin text-slate-400" />;

    return (
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg">{tx('สิทธิ์ของแต่ละแพ็กเกจ', 'Plan entitlements')}</CardTitle>
                <CardDescription>
                    {meta?.isDefault
                        ? tx('ยังไม่เคยบันทึก — ตอนนี้ใช้ค่าเริ่มต้นในโค้ด', 'Never saved — code defaults are in effect')
                        : tx('แก้ล่าสุด', 'Last updated') + ' ' +
                          (meta?.updatedAt ? new Date(meta.updatedAt).toLocaleString(locale === 'en' ? 'en-US' : 'th-TH') : '-') +
                          (meta?.updatedByEmail ? ` · ${meta.updatedByEmail}` : '')}
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="min-w-[220px]">{tx('สิทธิ์', 'Entitlement')}</TableHead>
                                {catalog.plans.map(p => (
                                    <TableHead key={p.id} className="min-w-[150px] text-center">{p.name}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {catalog.fields.map(field => (
                                <TableRow key={field.key}>
                                    <TableCell>
                                        <div className="font-medium text-slate-900">{tx(...field.label)}</div>
                                        {field.help && <div className="text-xs text-slate-500">{tx(...field.help)}</div>}
                                    </TableCell>
                                    {catalog.plans.map(p => {
                                        const value = plans[p.id]?.[field.key];
                                        if (field.type === 'boolean') {
                                            return (
                                                <TableCell key={p.id} className="text-center">
                                                    <Switch
                                                        checked={value === true}
                                                        onCheckedChange={v => setValue(p.id, field.key, v)}
                                                        aria-label={`${p.name} ${tx(...field.label)}`}
                                                    />
                                                </TableCell>
                                            );
                                        }
                                        const isNull = value === null;
                                        return (
                                            <TableCell key={p.id} className="text-center">
                                                <div className="flex flex-col items-center gap-1.5">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step={1}
                                                        disabled={isNull}
                                                        value={isNull ? '' : String(value ?? 0)}
                                                        placeholder={isNull && field.nullable ? tx(...field.nullable.label) : ''}
                                                        onChange={e => setValue(p.id, field.key, e.target.value === '' ? 0 : Math.max(0, Math.floor(Number(e.target.value))))}
                                                        className="h-9 w-28 text-center"
                                                        aria-label={`${p.name} ${tx(...field.label)}`}
                                                    />
                                                    {field.nullable && (
                                                        <label className="flex items-center gap-1.5 text-xs text-slate-500">
                                                            <input
                                                                type="checkbox"
                                                                checked={isNull}
                                                                onChange={e => setValue(p.id, field.key, e.target.checked ? null : Number(catalog.defaults[p.id]?.[field.key] ?? 0) || 0)}
                                                            />
                                                            {tx(...field.nullable.label)}
                                                        </label>
                                                    )}
                                                </div>
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 p-4">
                    <Button variant="outline" onClick={resetToDefaults} disabled={saving}>
                        <RotateCcw className="mr-2 h-4 w-4" /> {tx('ใช้ค่าเริ่มต้น', 'Use defaults')}
                    </Button>
                    <Button onClick={save} disabled={saving} className="bg-slate-900 text-white">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {tx('บันทึก', 'Save')}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

// ---------------------------------------------------------------------------

function planName(product: PlanProduct, id: string | null | undefined) {
    return PLAN_CATALOG[product].plans.find(p => p.id === id)?.name ?? id ?? '-';
}

function CustomerGrants({ product }: { product: PlanProduct }) {
    const catalog = PLAN_CATALOG[product];
    const { tx, locale } = useAdminLocale();
    const { toast } = useToast();
    const dateLocale = locale === 'en' ? 'en-US' : 'th-TH';
    const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(dateLocale, { dateStyle: 'medium' }) : null);

    const [rows, setRows] = useState<CustomerPlanRow[] | null>(null);
    const [listError, setListError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<CustomerPlanRow[] | null>(null);
    const [editing, setEditing] = useState<CustomerPlanRow | null>(null);
    const [revoking, setRevoking] = useState<CustomerPlanRow | null>(null);

    const load = useCallback(async () => {
        const res = await listPlanGrantsAction(product);
        if (res.ok) { setRows(res.data); setListError(null); } else setListError(res.error);
    }, [product]);

    useEffect(() => { load(); }, [load]);

    const search = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setSearching(true);
        const res = await findCustomerAction(product, query);
        setSearching(false);
        if (res.ok) setResults(res.data);
        else toast({ title: tx('ค้นหาไม่สำเร็จ', 'Search failed'), description: res.error, variant: 'destructive' });
    };

    const refreshAll = async () => {
        await load();
        if (results && query.trim()) {
            const res = await findCustomerAction(product, query);
            if (res.ok) setResults(res.data);
        }
    };

    const confirmRevoke = async () => {
        if (!revoking) return;
        const res = await revokePlanAction(product, revoking.uid);
        setRevoking(null);
        if (res.ok) {
            toast({ title: tx('ถอนแพ็กเกจแล้ว', 'Plan revoked') });
            refreshAll();
        } else {
            toast({ title: tx('ถอนไม่สำเร็จ', 'Revoke failed'), description: res.error, variant: 'destructive' });
        }
    };

    const renderStatus = (row: CustomerPlanRow) => {
        const expired = row.grant?.expiresAt && new Date(row.grant.expiresAt).getTime() <= Date.now();
        return (
            <div className="flex flex-wrap items-center gap-1.5">
                {row.grant ? (
                    <Badge className={expired ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-800'}>
                        {planName(product, row.grant.planId)}
                        {expired ? ` · ${tx('หมดอายุ', 'expired')}` : ''}
                    </Badge>
                ) : (
                    <Badge variant="outline">{tx('ไม่ได้มอบ', 'Not granted')}</Badge>
                )}
                {row.stripe?.planId && (
                    <Badge variant="outline" className="border-indigo-200 text-indigo-700">
                        Stripe: {planName(product, row.stripe.planId)} ({row.stripe.status ?? '-'})
                    </Badge>
                )}
            </div>
        );
    };

    const renderRow = (row: CustomerPlanRow) => (
        <TableRow key={row.uid}>
            <TableCell>
                <div className="font-medium text-slate-900">{row.name || tx('(ไม่มีชื่อ)', '(no name)')}</div>
                <div className="text-xs text-slate-500">{row.email || row.uid}</div>
            </TableCell>
            <TableCell>{renderStatus(row)}</TableCell>
            <TableCell className="text-sm text-slate-600">
                {row.grant ? (fmtDate(row.grant.expiresAt) ?? tx('ไม่มีกำหนด', 'No expiry')) : '-'}
            </TableCell>
            <TableCell className="max-w-[240px] text-sm text-slate-600">
                <div className="truncate" title={row.grant?.note ?? ''}>{row.grant?.note || '-'}</div>
                {row.grant?.grantedByEmail && (
                    <div className="text-xs text-slate-400">
                        {tx('โดย', 'by')} {row.grant.grantedByEmail}{row.grant.grantedAt ? ` · ${fmtDate(row.grant.grantedAt)}` : ''}
                    </div>
                )}
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
                <Button size="sm" variant="outline" onClick={() => setEditing(row)}>
                    <UserPlus className="mr-1.5 h-4 w-4" /> {row.grant ? tx('แก้', 'Edit') : tx('มอบแพ็กเกจ', 'Grant')}
                </Button>
                {row.grant && (
                    <Button size="sm" variant="ghost" className="ml-1 text-red-600 hover:text-red-700" onClick={() => setRevoking(row)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{tx('ถอน', 'Revoke')}</span>
                    </Button>
                )}
            </TableCell>
        </TableRow>
    );

    const tableHead = (
        <TableHeader>
            <TableRow>
                <TableHead>{tx(...catalog.subject)}</TableHead>
                <TableHead>{tx('แพ็กเกจ', 'Plan')}</TableHead>
                <TableHead>{tx('หมดอายุ', 'Expires')}</TableHead>
                <TableHead>{tx('หมายเหตุ', 'Note')}</TableHead>
                <TableHead />
            </TableRow>
        </TableHeader>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-2 rounded-2xl bg-blue-50 p-4 text-sm text-blue-900">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{tx(...catalog.grantNote)}</p>
            </div>

            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="border-b border-slate-100">
                    <CardTitle className="text-lg">{tx(`ค้นหา${catalog.subject[0]}`, `Find a ${catalog.subject[1].toLowerCase()}`)}</CardTitle>
                    <form onSubmit={search} className="flex gap-2 pt-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder={tx(...catalog.searchHint)}
                                className="pl-9"
                            />
                        </div>
                        <Button type="submit" disabled={searching}>
                            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : tx('ค้นหา', 'Search')}
                        </Button>
                    </form>
                </CardHeader>
                {results && (
                    <CardContent className="p-0">
                        {results.length === 0 ? (
                            <p className="p-6 text-sm text-slate-500">{tx(`ไม่พบ${catalog.subject[0]} — ค้นหาด้วย${catalog.searchHint[0]}แบบเต็ม`, `Not found — search by ${catalog.searchHint[1].toLowerCase()}`)}</p>
                        ) : (
                            <Table>{tableHead}<TableBody>{results.map(renderRow)}</TableBody></Table>
                        )}
                    </CardContent>
                )}
            </Card>

            <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="border-b border-slate-100">
                    <CardTitle className="text-lg">{tx(`${catalog.subject[0]}ที่ได้รับแพ็กเกจจากแอดมิน`, `${catalog.subject[1]}s with admin-granted plans`)}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {listError ? (
                        <p className="p-6 text-sm text-red-600">{listError}</p>
                    ) : !rows ? (
                        <div className="p-6"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
                    ) : rows.length === 0 ? (
                        <p className="p-6 text-sm text-slate-500">{tx(`ยังไม่มี${catalog.subject[0]}ที่ได้รับแพ็กเกจ`, 'No granted plans yet')}</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>{tableHead}<TableBody>{rows.map(renderRow)}</TableBody></Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {editing && (
                <GrantDialog
                    product={product}
                    row={editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); refreshAll(); }}
                />
            )}

            <AlertDialog open={!!revoking} onOpenChange={open => !open && setRevoking(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tx('ถอนแพ็กเกจที่มอบให้?', 'Revoke granted plan?')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {tx(
                                `${revoking?.name || revoking?.email || ''} จะกลับไปใช้สิทธิ์ตามแพ็กเกจที่จ่ายเอง (หรือ Free) ทันที`,
                                `${revoking?.name || revoking?.email || ''} falls back to their own paid plan (or Free) immediately.`,
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tx('ยกเลิก', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRevoke} className="bg-red-600 hover:bg-red-700">
                            {tx('ถอนแพ็กเกจ', 'Revoke')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function GrantDialog({ product, row, onClose, onSaved }: {
    product: PlanProduct;
    row: CustomerPlanRow;
    onClose: () => void;
    onSaved: () => void;
}) {
    const catalog = PLAN_CATALOG[product];
    const { tx } = useAdminLocale();
    const { toast } = useToast();
    const grantable = catalog.plans.filter(p => p.id !== catalog.basePlan);
    const [planId, setPlanId] = useState(row.grant?.planId ?? grantable[0].id);
    // วันหมดอายุเป็นวันที่ (ไม่มีเวลา) — ใช้ได้ถึงสิ้นวันนั้นตามเวลาไทย
    const [expiry, setExpiry] = useState(row.grant?.expiresAt
        ? new Date(new Date(row.grant.expiresAt).getTime() + 7 * 3600_000).toISOString().slice(0, 10)
        : '');
    const [note, setNote] = useState(row.grant?.note ?? '');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        const expiresAt = expiry ? new Date(`${expiry}T23:59:59.999+07:00`).toISOString() : null;
        const res = await grantPlanAction(product, row.uid, planId, expiresAt, note);
        setSaving(false);
        if (res.ok) {
            toast({ title: tx('มอบแพ็กเกจแล้ว', 'Plan granted') });
            onSaved();
        } else {
            toast({ title: tx('มอบแพ็กเกจไม่สำเร็จ', 'Grant failed'), description: res.error, variant: 'destructive' });
        }
    };

    return (
        <Dialog open onOpenChange={open => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{tx(`มอบแพ็กเกจ ${catalog.name}`, `Grant ${catalog.name} plan`)}</DialogTitle>
                    <DialogDescription>{row.name || row.email || row.uid}{row.email && row.name ? ` · ${row.email}` : ''}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>{tx('แพ็กเกจ', 'Plan')}</Label>
                        <Select value={planId} onValueChange={setPlanId}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {grantable.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="grant-expiry">{tx('ใช้ได้ถึง (เว้นว่าง = ไม่มีกำหนด)', 'Valid until (blank = no expiry)')}</Label>
                        <Input id="grant-expiry" type="date" value={expiry} onChange={e => setExpiry(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="grant-note">{tx('หมายเหตุ (เหตุผลที่มอบ)', 'Note (reason)')}</Label>
                        <Textarea id="grant-note" value={note} maxLength={500} onChange={e => setNote(e.target.value)} rows={3} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>{tx('ยกเลิก', 'Cancel')}</Button>
                    <Button onClick={save} disabled={saving} className="bg-slate-900 text-white">
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {tx('บันทึก', 'Save')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
