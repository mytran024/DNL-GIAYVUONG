

const API_URL = '/api'; // Relative path, Nginx will proxy

export const ApiService = {
    // --- USERS ---
    getUsers: async () => {
        const res = await fetch(`${API_URL}/users`);
        if (!res.ok) throw new Error('Failed to fetch users');
        return res.json();
    },
    saveUser: async (user: any) => {
        const res = await fetch(`${API_URL}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
        if (!res.ok) throw new Error('Failed to save user');
    },
    deleteUser: async (id: string) => {
        const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete user');
    },
    login: async (creds: any) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds)
        });
        if (!res.ok) throw new Error('Login failed');
        return res.json();
    },

    // --- RESOURCES ---
    getWorkers: async () => {
        const res = await fetch(`${API_URL}/workers`);
        if (!res.ok) throw new Error('Failed to fetch workers');
        return res.json();
    },
    saveWorkers: async (workers: any[]) => {
        const res = await fetch(`${API_URL}/workers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(workers)
        });
        if (!res.ok) throw new Error('Failed to save workers');
    },
    getTeams: async () => {
        const res = await fetch(`${API_URL}/teams`);
        if (!res.ok) throw new Error('Failed to fetch teams');
        return res.json();
    },
    saveTeams: async (teams: any[]) => {
        const res = await fetch(`${API_URL}/teams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(teams)
        });
        if (!res.ok) throw new Error('Failed to save teams');
    },

    // --- VESSELS & CONTAINERS ---
    getVessels: async () => {
        const res = await fetch(`${API_URL}/vessels`);
        if (!res.ok) throw new Error('Failed to fetch vessels');
        return res.json();
    },
    saveVessels: async (vessels: any[]) => {
        const res = await fetch(`${API_URL}/vessels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(vessels)
        });
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to save vessels');
        }
    },
    getContainers: async () => {
        const res = await fetch(`${API_URL}/containers`);
        if (!res.ok) throw new Error('Failed to fetch containers');
        return res.json();
    },
    saveContainers: async (containers: any[]) => {
        const res = await fetch(`${API_URL}/containers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(containers)
        });
        if (!res.ok) throw new Error('Failed to save containers');
    },
    // Individual update for efficiency
    updateContainer: async (container: any) => {
        const res = await fetch(`${API_URL}/containers/${container.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(container)
        });
        if (!res.ok) throw new Error('Failed to update container');
    },

    // --- REPORTS ---
    getTallyReports: async () => {
        const res = await fetch(`${API_URL}/tally-reports`);
        if (!res.ok) throw new Error('Failed to fetch tally reports');
        return res.json();
    },
    saveTallyReport: async (report: any) => {
        const res = await fetch(`${API_URL}/tally-reports`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });
        if (!res.ok) throw new Error('Failed to save tally report');
    },

    // --- WORK ORDERS ---
    getWorkOrders: async () => {
        const res = await fetch(`${API_URL}/work-orders`);
        if (!res.ok) throw new Error('Failed to fetch work orders');
        return res.json();
    },
    saveWorkOrder: async (wo: any) => {
        const res = await fetch(`${API_URL}/work-orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(wo)
        });
        if (!res.ok) throw new Error('Failed to save work order');
    }
};
