// In-memory stand-in for @supabase/supabase-js used only by check-lms-admin-auth.
// No network: every call is answered from globalThis.__mock.
export function createClient() {
  const m = globalThis.__mock
  const chain = (table) => {
    const q = {
      _t: table, _op: 'select', _patch: null,
      select() { return q }, eq() { return q }, order() { return q }, in() { return q }, limit() { return q },
      update(p) { q._op = 'update'; q._patch = p; m.calls.push({ table, op: 'update', patch: p }); return q },
      insert(p) { q._op = 'insert'; m.calls.push({ table, op: 'insert', patch: p }); return q },
      delete() { q._op = 'delete'; m.calls.push({ table, op: 'delete' }); return q },
      single() { return Promise.resolve(m.row(table, q._op)) },
      maybeSingle() { return Promise.resolve(m.row(table, q._op)) },
      then(res, rej) { return Promise.resolve(m.row(table, q._op)).then(res, rej) },
    }
    return q
  }
  return {
    from: chain,
    auth: {
      getUser: async (token) => m.users[token] ? { data: { user: m.users[token] }, error: null } : { data: { user: null }, error: { message: 'invalid' } },
      admin: { updateUserById: async (id, attrs) => { m.calls.push({ op: 'updateUserById', id, attrs }); return { data: {}, error: null } } },
    },
    storage: { from: () => ({ upload: async () => ({ error: null }), remove: async () => ({ error: null }) }) },
  }
}
