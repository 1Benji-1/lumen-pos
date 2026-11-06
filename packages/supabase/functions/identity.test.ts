import { afterEach, describe, expect, it, vi } from 'vitest'
import { createHandler as staffHandler } from './manage-staff/handler'
import { createHandler as storeHandler } from './create-store/handler'

function fixture(options: { inactive?: boolean; role?: string; profileError?: boolean; storeError?: boolean; superAdmin?: boolean; maxUsers?: number; authDeleteError?: boolean; profileThrows?: boolean; existingInvite?: boolean; moduleDenied?: boolean; moduleError?: boolean; moduleTenant?: string } = {}) {
  const records: Record<string, any[]> = {
    users: [
      { id: 'caller', store_id: 'a', role: options.role ?? 'owner', is_active: !options.inactive },
      { id: 'foreign', store_id: 'b', role: 'cashier', is_active: true },
      { id: 'owner', store_id: 'a', role: 'owner', is_active: true },
      { id: 'admin', store_id: 'a', role: 'admin', is_active: true },
    ],
    stores: [{ id: 'a', plans: { features: { max_users: options.maxUsers ?? 20 } }, feature_overrides: {} }],
    branches: [],
    plans: [{ id: 'plan', code: 'pro' }],
  }
  const authUsers = new Set(['caller', 'foreign', 'owner', 'admin'])
  const authMutations: string[] = []
  const client = {
    auth: {
      getUser: async () => ({ data: { user: { id: 'caller', app_metadata: { is_super_admin: options.superAdmin } } }, error: null }),
      admin: {
        deleteUser: async (id: string) => { authMutations.push(`delete:${id}`); if (options.authDeleteError) return { error: { message: 'Auth unavailable' } }; authUsers.delete(id); records.users = records.users.filter(user => user.id !== id); return { error: null } },
        updateUserById: async (id: string) => { authMutations.push(`update:${id}`); return { error: null } },
        createUser: async () => { authMutations.push('create'); authUsers.add('new'); return { data: { user: { id: 'new' } }, error: null } },
        inviteUserByEmail: async () => { authMutations.push('invite'); if (options.existingInvite) return { data: { user: { id: 'foreign' } }, error: null }; authUsers.add('new'); return { data: { user: { id: 'new' } }, error: null } },
      },
    },
    from(table: string) {
      let action = 'select'; let payload: any; const filters: [string, any][] = []
      const query: any = {
        select: () => query,
        eq: (key: string, value: any) => { filters.push([key, value]); return query },
        insert: (value: any) => { action = 'insert'; payload = value; return query },
        upsert: (value: any) => { action = 'insert'; payload = value; return query },
        update: (value: any) => { action = 'update'; payload = value; return query },
        delete: () => { action = 'delete'; return query },
        single: () => query.then((r: any) => ({ ...r, data: r.data?.[0] ?? null })),
        maybeSingle: () => query.single(),
        then: (resolve: any) => {
          const rows = records[table].filter(r => filters.every(([key, value]) => r[key] === value))
          if (action === 'insert' && table === 'users' && options.profileThrows) return Promise.reject(new Error('network unavailable')).then(resolve)
          if ((action === 'insert' && table === 'users' && options.profileError) || (action === 'insert' && table === 'stores' && options.storeError)) {
            return Promise.resolve({ data: null, error: { message: 'insert failed' } }).then(resolve)
          }
          let data = rows
          if (action === 'insert') {
            data = [{ id: 'new-store', ...payload }]
            records[table].push(...data)
            if (table === 'stores') records.branches.push({ id: 'primary-branch', store_id: 'new-store', is_primary: true, category_id: 'comercio_general' })
          }
          if (action === 'update') rows.forEach(r => Object.assign(r, payload))
          if (action === 'delete') records[table] = records[table].filter(r => !rows.includes(r))
          return Promise.resolve({ data, error: null, count: rows.length }).then(resolve)
        },
      }
      return query
    },
  }
  const scopedClient = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      if (name !== 'require_active_module' || args.p_module_id !== 'staff' || args.p_permission !== 'staff:manage') throw new Error('Wrong authorization contract')
      if (options.moduleError) return { data: null, error: { code: 'PGRST000', message: 'database unavailable' } }
      if (options.moduleDenied) return { data: null, error: { code: '42501', message: 'module disabled' } }
      return { data: options.moduleTenant ?? 'a', error: null }
    },
  }
  const clientFactory = (_url: string, _key: string, config?: any) =>
    config?.global?.headers?.Authorization === 'Bearer token' ? scopedClient : client
  const request = (body: any, method = 'POST') => new Request('https://test.local', { method, headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' }, ...(method === 'POST' ? { body: JSON.stringify(body) } : {}) })
  return { records, authUsers, authMutations, staff: (body: any) => staffHandler(clientFactory, () => 'test')(request(body)), store: (body: any, method?: string) => storeHandler(clientFactory, () => 'test')(request(body, method)) }
}

const newStaff = { action: 'create', email: 'test@example.com', fullName: 'Test', role: 'cashier', password: 'abcdef' }
const newStore = { email: 'test@example.com', storeName: 'Store', fullName: 'Test', planCode: 'pro', subscriptionStatus: 'active' }

describe('staff authorization', () => {
  it.each([
    newStaff,
    { ...newStaff, action: 'invite', password: undefined },
    { action: 'update-role', userId: 'admin', role: 'cashier' },
    { action: 'toggle-status', userId: 'admin', isActive: false },
    { action: 'reset-password', userId: 'admin', newPassword: 'abcdef' },
    { action: 'delete', userId: 'admin' },
  ])('denied_staff_action_has_no_side_effects: $action', async body => {
    const f = fixture({ moduleDenied: true })
    const before = JSON.stringify(f.records)
    const response = await f.staff(body)
    expect(response.status).toBe(403)
    expect(f.authMutations).toEqual([])
    expect(JSON.stringify(f.records)).toBe(before)
  })
  it('db_authorization_error_fails_closed', async () => {
    const f = fixture({ moduleError: true })
    expect((await f.staff(newStaff)).status).toBe(503)
    expect(f.authMutations).toEqual([])
  })
  it('rejects a module decision for a different tenant', async () => {
    const f = fixture({ moduleTenant: 'b' })
    expect((await f.staff(newStaff)).status).toBe(403)
    expect(f.authMutations).toEqual([])
  })
  it('foreign_store_id_is_ignored for a normal caller', async () => {
    const f = fixture()
    expect((await f.staff({ ...newStaff, storeId: 'b' })).status).toBe(200)
    expect(f.records.users.find(user => user.id === 'new')?.store_id).toBe('a')
  })
  it('superadmin_mfa_path_remains_separate from tenant module access', async () => {
    const f = fixture({ superAdmin: true, moduleDenied: true })
    expect((await f.staff({ ...newStaff, storeId: 'a' })).status).toBe(200)
    expect(f.authMutations).toContain('create')
  })
  it('authorized_owner_admin_keep_existing_role_limit_rules', async () => {
    const owner = fixture()
    expect((await owner.staff(newStaff)).status).toBe(200)
    expect(owner.records.users.find(user => user.id === 'new')?.role).toBe('cashier')

    const admin = fixture({ role: 'admin' })
    expect((await admin.staff(newStaff)).status).toBe(200)
    expect((await admin.staff({ ...newStaff, role: 'owner' })).status).toBe(403)
  })
  it('never deletes Auth belonging to a different store', async () => {
    const f = fixture(); const response = await f.staff({ action: 'delete', userId: 'foreign' })
    expect(response.status).toBe(403); expect(f.authUsers.has('foreign')).toBe(true)
  })
  it('rejects inactive administrators', async () => {
    const f = fixture({ inactive: true }); expect((await f.staff(newStaff)).status).toBe(403)
    expect(f.authUsers.has('new')).toBe(false)
  })
  it.each(['update-role', 'toggle-status', 'delete', 'reset-password'])('protects owner targets for %s', async action => {
    const f = fixture({ role: 'admin' })
    expect((await f.staff({ action, userId: 'owner', role: 'cashier', isActive: false, newPassword: 'abcdef' })).status).toBe(403)
    expect(f.records.users.find(u => u.id === 'owner')?.role).toBe('owner')
  })
  it('does not demote the store owner', async () => {
    const f = fixture(); expect((await f.staff({ action: 'update-role', userId: 'owner', role: 'cashier' })).status).toBe(403)
  })
  it('enforces the plan user limit before creating Auth', async () => {
    const f = fixture({ maxUsers: 3 }); expect((await f.staff(newStaff)).status).toBe(403)
    expect(f.authUsers.has('new')).toBe(false)
  })
  it('does not overwrite or delete an existing identity returned by invitation', async () => {
    const f = fixture({ existingInvite: true }); expect((await f.staff({ ...newStaff, action: 'invite', password: undefined })).status).toBe(403)
    expect(f.authUsers.has('foreign')).toBe(true); expect(f.records.users.find(user => user.id === 'foreign')?.store_id).toBe('b')
  })
  it('preserves the profile if Auth deletion fails', async () => {
    const f = fixture({ authDeleteError: true }); expect((await f.staff({ action: 'delete', userId: 'admin' })).status).toBe(500)
    expect(f.records.users.some(user => user.id === 'admin')).toBe(true)
  })
  it('rolls back Auth if profile persistence throws', async () => {
    const f = fixture({ profileThrows: true }); expect((await f.staff(newStaff)).status).toBe(500)
    expect(f.authUsers.has('new')).toBe(false)
  })
  it('removes a newly created Auth identity if profile persistence fails', async () => {
    const f = fixture({ profileError: true }); expect((await f.staff(newStaff)).status).toBe(400)
    expect(f.authUsers.has('new')).toBe(false)
  })
})

describe('create-store', () => {
  afterEach(() => vi.useRealTimers())
  it.each([
    [undefined, '2026-01-31T12:34:56.789Z', '2026-02-28T12:34:56.789Z'],
    ['monthly', '2028-01-31T12:34:56.789Z', '2028-02-29T12:34:56.789Z'],
    ['semiannual', '2026-08-31T12:34:56.789Z', '2027-02-28T12:34:56.789Z'],
    ['annual', '2028-02-29T12:34:56.789Z', '2029-02-28T12:34:56.789Z'],
  ])('sets a future server-generated calendar expiry for active %s stores', async (billingCycle, now, expected) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(now))
    const f = fixture({ superAdmin: true })
    const response = await f.store({ ...newStore, billingCycle, subscription_ends_at: '2099-01-01T00:00:00.000Z' })
    expect(response.status).toBe(200)
    const store = f.records.stores.find(row => row.id === 'new-store')
    expect(store?.subscription_ends_at).toBe(expected)
    expect(new Date(store?.subscription_ends_at).getTime()).toBeGreaterThan(Date.now())
    expect(store?.billing_cycle).toBe(billingCycle ?? 'monthly')
  })
  it('keeps trial expiry managed by the database default', async () => {
    const f = fixture({ superAdmin: true })
    expect((await f.store({ ...newStore, subscriptionStatus: 'trialing' })).status).toBe(200)
    const store = f.records.stores.find(row => row.id === 'new-store')
    expect(store?.subscription_ends_at ?? null).toBeNull()
    expect(store?.trial_ends_at).toBeUndefined()
    expect(store?.billing_cycle).toBeNull()
  })
  it('stores the selected category on the primary branch for a new commerce family', async () => {
    const f = fixture({ superAdmin: true })
    const response = await f.store({ ...newStore, familyId: 'services', categoryId: 'barberia_belleza' })
    expect(response.status).toBe(200)
    expect(f.records.stores.find(row => row.id === 'new-store')?.business_type).toBe('tienda_articulos')
    expect(f.records.branches).toContainEqual(expect.objectContaining({ store_id: 'new-store', category_id: 'barberia_belleza', is_primary: true }))
  })
  it('keeps the invited owner email visible in the admin store directory', async () => {
    const f = fixture({ superAdmin: true })
    expect((await f.store(newStore)).status).toBe(200)
    expect(f.records.users.find(row => row.id === 'new')?.email).toBe('test@example.com')
  })
  it('rejects a category from another family before creating an identity', async () => {
    const f = fixture({ superAdmin: true })
    expect((await f.store({ ...newStore, familyId: 'services', categoryId: 'cafeteria' })).status).toBe(400)
    expect(f.authMutations).toEqual([])
  })

  it('handles preflight before authentication', async () => {
    const f = fixture(); const response = await f.store(null, 'OPTIONS')
    expect(response.status).toBe(200); expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })
  it('rejects methods other than POST', async () => { expect((await fixture().store(null, 'GET')).status).toBe(405) })
  it('rejects invalid billing cycles before creating Auth', async () => {
    const f = fixture({ superAdmin: true }); expect((await f.store({ ...newStore, billingCycle: 'invalid' })).status).toBe(400)
    expect(f.authUsers.has('new')).toBe(false)
  })
  it('does not attach a new store to an existing invitation identity', async () => {
    const f = fixture({ superAdmin: true, existingInvite: true }); expect((await f.store(newStore)).status).toBe(403)
    expect(f.authUsers.has('foreign')).toBe(true); expect(f.records.stores).toHaveLength(1)
  })
  it('cleans up Auth after store failure', async () => {
    const f = fixture({ superAdmin: true, storeError: true }); expect((await f.store(newStore)).status).toBe(400)
    expect(f.authUsers.has('new')).toBe(false)
  })
  it('cleans up store and Auth after profile failure', async () => {
    const f = fixture({ superAdmin: true, profileError: true }); expect((await f.store(newStore)).status).toBe(400)
    expect(f.authUsers.has('new')).toBe(false); expect(f.records.stores).toHaveLength(1)
  })
})
