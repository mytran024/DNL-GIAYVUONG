import express from 'express';
import cors from 'cors';
import supabase from './db.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Helper to handle JSON fields
const safeParse = (val) => {
    if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (e) { return []; }
    }
    return val || [];
};

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// --- ROUTES ---

// 1. USERS
app.get('/api/users', async (req, res) => {
    try {
        if (!supabase) throw new Error('Database not connected');
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        const formatted = data.map(u => ({ ...u, isActive: !!u.isActive }));
        res.json(formatted);
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/api/users', async (req, res) => {
    try {
        if (!supabase) throw new Error('Database not connected');
        const { id, username, password, name, role, isActive, phoneNumber, department, createdAt } = req.body;
        const { error } = await supabase.from('users').upsert({
            id, username, password, name, role,
            isActive: isActive ? true : false,
            phoneNumber, department: department || 'Kho', createdAt
        }, { onConflict: 'id' });
        if (error) throw error;
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        if (!supabase) throw new Error('Database not connected');
        const { id } = req.params;
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. RESOURCE MANAGEMENT
app.get('/api/workers', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Database not connected' });
    const { data, error } = await supabase.from('workers').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/workers', async (req, res) => {
    const workers = req.body;
    if (!Array.isArray(workers)) return res.status(400).json({ error: "Expected array" });
    try {
        if (!supabase) throw new Error('Database not connected');
        await supabase.from('workers').delete().neq('id', '0');
        if (workers.length > 0) {
            const { error: insErr } = await supabase.from('workers').insert(workers);
            if (insErr) throw insErr;
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/teams', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Database not connected' });
    const { data, error } = await supabase.from('teams').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/teams', async (req, res) => {
    const teams = req.body;
    if (!Array.isArray(teams)) return res.status(400).json({ error: "Expected array" });
    try {
        if (!supabase) throw new Error('Database not connected');
        await supabase.from('teams').delete().neq('id', '0');
        if (teams.length > 0) {
            const { error: insErr } = await supabase.from('teams').insert(teams);
            if (insErr) throw insErr;
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. AUTH (Login)
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        if (!supabase) throw new Error('Database not connected');
        const { data: user, error } = await supabase.from('users')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .maybeSingle();

        if (error) throw error;

        if (user) {
            if (!user.isActive) return res.status(403).json({ error: 'Account locked' });
            res.json({ success: true, user: { ...user, isActive: !!user.isActive } });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 4. CONTAINERS
app.get('/api/containers', async (req, res) => {
    try {
        if (!supabase) throw new Error('Database not connected');
        const { data, error } = await supabase.from('containers').select('*');
        if (error) throw error;
        const formatted = data.map(c => ({
            ...c,
            tallyApproved: !!c.tallyApproved,
            workOrderApproved: !!c.workOrderApproved,
            workerNames: safeParse(c.workerNames)
        }));
        res.json(formatted);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/containers', async (req, res) => {
    const containers = req.body;
    if (!Array.isArray(containers)) return res.status(400).json({ error: "Expected array" });
    try {
        if (!supabase) throw new Error('Database not connected');
        await supabase.from('containers').delete().neq('id', '0');
        if (containers.length > 0) {
            const cleanData = containers.map(c => ({
                id: c.id, vesselId: c.vesselId, unitType: c.unitType, containerNo: c.containerNo, size: c.size,
                sealNo: c.sealNo, consignee: c.consignee, carrier: c.carrier, pkgs: c.pkgs, weight: c.weight,
                billNo: c.billNo, vendor: c.vendor, detExpiry: c.detExpiry,
                tkNhaVC: c.tkNhaVC, ngayTkNhaVC: c.ngayTkNhaVC, tkDnlOla: c.tkDnlOla,
                ngayTkDnl: c.ngayTkDnl, ngayKeHoach: c.ngayKeHoach, noiHaRong: c.noiHaRong,
                workerNames: typeof c.workerNames === 'string' ? JSON.parse(c.workerNames) : (c.workerNames || []),
                status: c.status, updatedAt: c.updatedAt,
                tallyApproved: c.tallyApproved ? true : false,
                workOrderApproved: c.workOrderApproved ? true : false,
                remarks: c.remarks, lastUrgedAt: c.lastUrgedAt
            }));
            const { error: insErr } = await supabase.from('containers').insert(cleanData);
            if (insErr) throw insErr;
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/containers/:id', async (req, res) => {
    const c = req.body;
    const { id } = req.params;
    try {
        if (!supabase) throw new Error('Database not connected');
        const updateData = {
            status: c.status, updatedAt: c.updatedAt,
            tallyApproved: c.tallyApproved ? true : false,
            workOrderApproved: c.workOrderApproved ? true : false,
            remarks: c.remarks,
            workerNames: typeof c.workerNames === 'string' ? JSON.parse(c.workerNames) : (c.workerNames || []),
            lastUrgedAt: c.lastUrgedAt
        };
        const { error } = await supabase.from('containers').update(updateData).eq('id', id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 5. VESSELS
app.get('/api/vessels', async (req, res) => {
    if (!supabase) return res.status(500).json({ error: 'Database not connected' });
    const { data, error } = await supabase.from('vessels').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/vessels', async (req, res) => {
    const vessels = req.body;
    if (!Array.isArray(vessels)) return res.status(400).json({ error: "Expected array" });
    try {
        if (!supabase) throw new Error('Database not connected');
        const { error } = await supabase.from('vessels').upsert(vessels, { onConflict: 'id' });
        if (error) throw error;
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 6. TALLY REPORTS
app.get('/api/tally-reports', async (req, res) => {
    try {
        if (!supabase) throw new Error('Database not connected');
        const { data, error } = await supabase.from('tally_reports').select('*');
        if (error) throw error;
        const formatted = data.map(r => ({
            ...r, items: safeParse(r.items),
            isHoliday: !!r.isHoliday, isWeekend: !!r.isWeekend
        }));
        res.json(formatted);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tally-reports', async (req, res) => {
    const r = req.body;
    try {
        if (!supabase) throw new Error('Database not connected');
        const formatTally = (x) => ({
            ...x, items: x.items || [],
            isHoliday: x.isHoliday ? true : false, isWeekend: x.isWeekend ? true : false,
            workerCount: x.workerCount || 0, mechanicalCount: x.mechanicalCount || 0
        });

        if (Array.isArray(r)) {
            await supabase.from('tally_reports').delete().neq('id', '0');
            if (r.length > 0) {
                const clean = r.map(formatTally);
                await supabase.from('tally_reports').insert(clean);
            }
        } else {
            const clean = formatTally(r);
            await supabase.from('tally_reports').upsert(clean, { onConflict: 'id' });
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 7. WORK ORDERS
app.get('/api/work-orders', async (req, res) => {
    try {
        if (!supabase) throw new Error('Database not connected');
        const { data, error } = await supabase.from('work_orders').select('*');
        if (error) throw error;
        const formatted = data.map(w => ({
            ...w,
            containerIds: safeParse(w.containerIds), containerNos: safeParse(w.containerNos),
            workerNames: safeParse(w.workerNames), vehicleNos: safeParse(w.vehicleNos),
            items: safeParse(w.items),
            isHoliday: !!w.isHoliday, isWeekend: !!w.isWeekend
        }));
        res.json(formatted);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/work-orders', async (req, res) => {
    const w = req.body;
    try {
        if (!supabase) throw new Error('Database not connected');
        const formatWO = (x) => ({
            ...x,
            containerIds: x.containerIds || [], containerNos: x.containerNos || [],
            workerNames: x.workerNames || [], vehicleNos: x.vehicleNos || [],
            items: x.items || [],
            isHoliday: x.isHoliday ? true : false, isWeekend: x.isWeekend ? true : false
        });

        if (Array.isArray(w)) {
            await supabase.from('work_orders').delete().neq('id', '0');
            if (w.length > 0) {
                const clean = w.map(formatWO);
                await supabase.from('work_orders').insert(clean);
            }
        } else {
            const clean = formatWO(w);
            await supabase.from('work_orders').upsert(clean, { onConflict: 'id' });
        }
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// For Vercel, we export the app
// Vercel handles the listening.
export default app;
