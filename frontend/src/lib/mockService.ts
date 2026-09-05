import {
  mockCurrentUser,
  mockHospitalAdmin,
  mockDoctor,
  mockHospitals,
  mockDepartments,
  mockDoctors,
  mockOpdSlots,
  mockVisits,
  mockPatients,
  mockDocuments,
  mockPrescriptions,
  mockQueueEntries,
  mockQueueStatuses,
  mockDiagnosis,
  mockPharmacyDrugs,
} from './mockData';

// ─── Helpers ───────────────────────────────────────────────────────
function filterArray(
  arr: Record<string, unknown>[],
  filters: Array<{ col: string; op: string; val: unknown }>,
  rangeFilter?: { col: string; gte?: unknown; lte?: unknown; gt?: unknown; lt?: unknown },
): Record<string, unknown>[] {
  let result = arr.map(r => ({ ...r }));

  for (const f of filters) {
    if (f.val === null || f.val === undefined) continue;
    if (f.op === 'eq') {
      result = result.filter(r => r[f.col] === f.val);
    }
    if (f.op === 'in' && Array.isArray(f.val)) {
      result = result.filter(r => (f.val as unknown[]).includes(r[f.col]));
    }
  }

  if (rangeFilter) {
    if (rangeFilter.gte !== undefined) {
      result = result.filter(r => {
        const v = r[rangeFilter.col];
        return v !== null && v !== undefined && String(v) >= String(rangeFilter.gte);
      });
    }
    if (rangeFilter.lte !== undefined) {
      result = result.filter(r => {
        const v = r[rangeFilter.col];
        return v !== null && v !== undefined && String(v) <= String(rangeFilter.lte);
      });
    }
    if (rangeFilter.gt !== undefined) {
      result = result.filter(r => {
        const v = r[rangeFilter.col];
        return v !== null && v !== undefined && String(v) > String(rangeFilter.gt);
      });
    }
    if (rangeFilter.lt !== undefined) {
      result = result.filter(r => {
        const v = r[rangeFilter.col];
        return v !== null && v !== undefined && String(v) < String(rangeFilter.lt);
      });
    }
  }

  return result;
}

function sortArray(
  arr: Record<string, unknown>[],
  sorts: Array<{ col: string; ascending: boolean }>,
): Record<string, unknown>[] {
  if (sorts.length === 0) return arr;
  const result = [...arr];
  result.sort((a, b) => {
    for (const s of sorts) {
      const aVal = a[s.col];
      const bVal = b[s.col];
      if (aVal === bVal) continue;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = String(aVal) < String(bVal) ? -1 : String(aVal) > String(bVal) ? 1 : 0;
      return s.ascending ? cmp : -cmp;
    }
    return 0;
  });
  return result;
}

function applySelect(rows: Record<string, unknown>[], fields: string[]): Record<string, unknown>[] {
  if (fields.length === 0 || (fields.length === 1 && fields[0] === '*')) {
    return rows.map(r => ({ ...r }));
  }
  return rows.map(r => {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      if (f in r) out[f] = r[f];
    }
    return out;
  });
}

// ─── Resolves which mock data to use based on a from-table + filters
function resolveData(table: string, filters: Array<{ col: string; op: string; val: unknown }>): Record<string, unknown>[] {
  if (table === 'patients') {
    const idFilter = filters.find(f => f.col === 'id' && f.op === 'eq');
    if (idFilter) {
      const match = mockPatients.find(p => p.id === idFilter.val);
      return match ? [match as unknown as Record<string, unknown>] : [];
    }
    return mockPatients as unknown as Record<string, unknown>[];
  }
  if (table === 'profiles') {
    const idFilter = filters.find(f => f.col === 'id' && f.op === 'eq');
    if (idFilter && idFilter.val === 'mock-user-001') {
      return [{ ...mockCurrentUser } as unknown as Record<string, unknown>];
    }
    if (idFilter && idFilter.val === 'mock-admin-001') {
      return [{ ...mockHospitalAdmin } as unknown as Record<string, unknown>];
    }
    if (idFilter && idFilter.val === 'mock-doctor-001') {
      return [{ ...mockDoctor } as unknown as Record<string, unknown>];
    }
    return [];
  }
  if (table === 'hospitals') {
    const adminId = filters.find(f => f.col === 'admin_id' && f.op === 'eq');
    if (adminId) {
      return mockHospitals.filter(h => h.admin_id === adminId.val) as unknown as Record<string, unknown>[];
    }
    const verified = filters.find(f => f.col === 'is_verified');
    if (verified && verified.val === true) {
      return mockHospitals.filter(h => h.is_verified === true) as unknown as Record<string, unknown>[];
    }
    const idFilter = filters.find(f => f.col === 'id' && f.op === 'eq');
    if (idFilter) {
      const match = mockHospitals.find(h => h.id === idFilter.val);
      return match ? [match as unknown as Record<string, unknown>] : [];
    }
    return mockHospitals as unknown as Record<string, unknown>[];
  }
  if (table === 'departments') {
    const hid = filters.find(f => f.col === 'hospital_id' && f.op === 'eq');
    if (hid) {
      return mockDepartments.filter(d => d.hospital_id === hid.val) as unknown as Record<string, unknown>[];
    }
    const idFilter = filters.find(f => f.col === 'id' && f.op === 'eq');
    if (idFilter) {
      const match = mockDepartments.find(d => d.id === idFilter.val);
      return match ? [match as unknown as Record<string, unknown>] : [];
    }
    return mockDepartments as unknown as Record<string, unknown>[];
  }
  if (table === 'doctors') {
    const userId = filters.find(f => f.col === 'user_id' && f.op === 'eq');
    if (userId) {
      const match = mockDoctors.find(d => d.user_id === userId.val);
      return match ? [match as unknown as Record<string, unknown>] : [];
    }
    const hid = filters.find(f => f.col === 'hospital_id' && f.op === 'eq');
    if (hid) {
      return mockDoctors.filter(d => d.hospital_id === hid.val) as unknown as Record<string, unknown>[];
    }
    const idFilter = filters.find(f => f.col === 'id' && f.op === 'eq');
    if (idFilter) {
      const match = mockDoctors.find(d => d.id === idFilter.val);
      return match ? [match as unknown as Record<string, unknown>] : [];
    }
    return mockDoctors as unknown as Record<string, unknown>[];
  }
  if (table === 'opd_slots') {
    return mockOpdSlots as unknown as Record<string, unknown>[];
  }
  if (table === 'visits') {
    return mockVisits as unknown as Record<string, unknown>[];
  }
  if (table === 'documents') {
    const pid = filters.find(f => f.col === 'patient_id' && f.op === 'eq');
    if (pid) {
      return mockDocuments.filter(d => d.patient_id === pid.val) as unknown as Record<string, unknown>[];
    }
    return mockDocuments as unknown as Record<string, unknown>[];
  }
  if (table === 'prescriptions') {
    const pid = filters.find(f => f.col === 'patient_id' && f.op === 'eq');
    if (pid) {
      return mockPrescriptions.filter(p => p.patient_id === pid.val) as unknown as Record<string, unknown>[];
    }
    return mockPrescriptions as unknown as Record<string, unknown>[];
  }
  if (table === 'queue_entries') {
    const hid = filters.find(f => f.col === 'hospital_id' && f.op === 'eq');
    const did = filters.find(f => f.col === 'department_id' && f.op === 'eq');
    if (hid && did) {
      const entries = mockQueueEntries[did.val as string] || [];
      return entries.filter(e => e.hospital_id === hid.val) as unknown as Record<string, unknown>[];
    }
    if (hid) {
      const all = Object.values(mockQueueEntries).flat();
      return all.filter(e => e.hospital_id === hid.val) as unknown as Record<string, unknown>[];
    }
    return Object.values(mockQueueEntries).flat() as unknown as Record<string, unknown>[];
  }
  if (table === 'queues') {
    return mockQueueStatuses as unknown as Record<string, unknown>[];
  }
  if (table === 'diagnosis') {
    return mockDiagnosis.map(d => ({ name: d }));
  }
  if (table === 'pharmacy_drugs') {
    return mockPharmacyDrugs.map(d => ({ name: d }));
  }
  return [];
}

// ─── Join handling for visits with patients ────────────────────────
function enrichVisitsWithPatients(visits: Record<string, unknown>[]) {
  return visits.map(v => {
    const patient = mockPatients.find(p => p.id === v.patient_id);
    return { ...v, patients: patient || null };
  });
}

// ─── Mock Table Builder ────────────────────────────────────────────
function buildMockTable(table: string) {
  const state = {
    fields: [] as string[],
    filters: [] as Array<{ col: string; op: string; val: unknown }>,
    rangeFilter: undefined as { col: string; gte?: unknown; lte?: unknown; gt?: unknown; lt?: unknown } | undefined,
    sorts: [] as Array<{ col: string; ascending: boolean }>,
    limitVal: undefined as number | undefined,
    headOnly: false,
    countExact: false,
    insertRows: null as Record<string, unknown>[] | null,
    updateData: null as Record<string, unknown> | null,
    deleteOp: false,
  };

  const chainObj: Record<string, unknown> = {};

  const exec = async () => {
    // Insert
    if (state.insertRows) {
      const result = state.insertRows.map(r => ({
        id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ...r,
        created_at: new Date().toISOString(),
      }));
      return { data: result, error: null as null };
    }
    // Update
    if (state.updateData) {
      return { data: state.updateData, error: null as null };
    }
    // Delete
    if (state.deleteOp) {
      return { data: null, error: null as null };
    }

    let data = resolveData(table, state.filters);

    if (table === 'profiles') {
      const idF = state.filters.find(f => f.col === 'id' && f.op === 'eq');
      if (idF) {
        const all = [mockCurrentUser, mockHospitalAdmin, mockDoctor] as Record<string, unknown>[];
        const match = all.find(p => p.id === idF.val);
        data = match ? [match] : [];
      }
    }

    if (table === 'visits') {
      data = enrichVisitsWithPatients(data);
    }

    if (state.headOnly || state.countExact) {
      const filtered = filterArray(data, state.filters, state.rangeFilter);
      return { data: null, error: null as null, count: filtered.length };
    }

    const filtered = filterArray(data, state.filters, state.rangeFilter);
    let sorted = sortArray(filtered, state.sorts);

    if (state.limitVal !== undefined) {
      sorted = sorted.slice(0, state.limitVal);
    }

    return { data: applySelect(sorted, state.fields), error: null as null };
  };

  // .select(fields?)
  chainObj.select = (fieldsOrOpts?: string | { count?: string; head?: boolean }) => {
    if (typeof fieldsOrOpts === 'object' && fieldsOrOpts !== null) {
      if (fieldsOrOpts.count === 'exact') state.countExact = true;
      if (fieldsOrOpts.head) state.headOnly = true;
      state.fields = ['*'];
    } else {
      state.fields = fieldsOrOpts ? fieldsOrOpts.split(',').map(s => s.trim()) : ['*'];
    }
    return chainObj;
  };

  chainObj.insert = (rows: Record<string, unknown> | Record<string, unknown>[]) => {
    state.insertRows = Array.isArray(rows) ? rows : [rows];
    return chainObj;
  };

  chainObj.update = (data: Record<string, unknown>) => {
    state.updateData = data;
    return chainObj;
  };

  chainObj.delete = () => {
    state.deleteOp = true;
    return chainObj;
  };

  chainObj.eq = (col: string, val: unknown) => {
    state.filters.push({ col, op: 'eq', val });
    return chainObj;
  };

  chainObj.neq = () => chainObj;

  chainObj.in = (col: string, vals: unknown[]) => {
    state.filters.push({ col, op: 'in', val: vals });
    return chainObj;
  };

  chainObj.order = (col: string, opts?: { ascending?: boolean }) => {
    state.sorts.push({ col, ascending: opts?.ascending !== false });
    return chainObj;
  };

  chainObj.limit = (n: number) => {
    state.limitVal = n;
    return chainObj;
  };

  chainObj.range = () => chainObj;

  chainObj.gte = (col: string, val: unknown) => {
    if (!state.rangeFilter || state.rangeFilter.col !== col) state.rangeFilter = { col };
    state.rangeFilter.gte = val;
    return chainObj;
  };

  chainObj.lte = (col: string, val: unknown) => {
    if (!state.rangeFilter || state.rangeFilter.col !== col) state.rangeFilter = { col };
    state.rangeFilter.lte = val;
    return chainObj;
  };

  chainObj.gt = (col: string, val: unknown) => {
    if (!state.rangeFilter || state.rangeFilter.col !== col) state.rangeFilter = { col };
    state.rangeFilter.gt = val;
    return chainObj;
  };

  chainObj.lt = (col: string, val: unknown) => {
    if (!state.rangeFilter || state.rangeFilter.col !== col) state.rangeFilter = { col };
    state.rangeFilter.lt = val;
    return chainObj;
  };

  chainObj.maybeSingle = async () => {
    const res = await exec();
    if (res.data === null || (Array.isArray(res.data) && res.data.length === 0)) {
      return { data: null, error: null };
    }
    if (Array.isArray(res.data)) {
      return { data: res.data[0], error: null };
    }
    return { data: res.data, error: null };
  };

  chainObj.single = async () => {
    const maybeFn = chainObj.maybeSingle as () => Promise<{ data: unknown; error: null | { message: string } }>;
    const res = await maybeFn();
    if (res.data === null) {
      return { data: null, error: { message: 'Row not found', code: 'PGRST116', details: '', hint: '' } };
    }
    return res;
  };

  chainObj.then = (resolve: (v: { data: unknown; error: null | { message: string }; count?: number }) => void) => {
    exec().then(resolve).catch(err => resolve({ data: null, error: { message: String(err) } }));
  };

  // table-level select (not chained, e.g. supabase.from('profiles').select('*').eq(...))
  const tableObj: Record<string, unknown> = {
    select: chainObj.select,
    insert: chainObj.insert,
    update: chainObj.update,
    delete: chainObj.delete,
    upsert: () => chainObj,
    rpc: async () => ({ data: null, error: null }),
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  };

  return tableObj;
}

// ─── createMockSupabase ────────────────────────────────────────────
export function createMockSupabase() {
  return {
    auth: {
      signUp: async () => {
        return { data: { user: null, session: null }, error: null };
      },
      signInWithPassword: async ({ email }: { email: string; password: string }) => {
        if (email === 'patient@demo.com') {
          return {
            data: {
              user: { id: mockCurrentUser.id, email: mockCurrentUser.email },
              session: { user: { id: mockCurrentUser.id, email: mockCurrentUser.email } },
            },
            error: null,
          };
        }
        if (email === 'admin@demo.com') {
          return {
            data: {
              user: { id: mockHospitalAdmin.id, email: mockHospitalAdmin.email },
              session: { user: { id: mockHospitalAdmin.id, email: mockHospitalAdmin.email } },
            },
            error: null,
          };
        }
        if (email === 'doctor@demo.com') {
          return {
            data: {
              user: { id: mockDoctor.id, email: mockDoctor.email },
              session: { user: { id: mockDoctor.id, email: mockDoctor.email } },
            },
            error: null,
          };
        }
        return { data: { user: null, session: null }, error: { message: 'Invalid demo credentials' } };
      },
      signOut: async () => ({ error: null }),
      getSession: async () => ({
        data: { session: null },
        error: null,
      }),
      getUser: async () => ({
        data: { user: null },
        error: null,
      }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    from: (table: string) => buildMockTable(table),
    rpc: async () => ({ data: null, error: null }),
  } as unknown as ReturnType<typeof import('@supabase/supabase-js').createClient>;
}
