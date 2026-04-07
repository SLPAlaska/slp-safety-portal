// app/api/lms/bulk-import/route.js
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Load ALL existing auth users once (handles >1000 via pagination)
async function loadAllAuthUsers() {
  const allUsers = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    allUsers.push(...(data?.users || []));
    if (!data?.users || data.users.length < perPage) break;
    page++;
  }
  return allUsers;
}

export async function POST(req) {
  try {
    const { company_id, users } = await req.json();

    if (!company_id || !Array.isArray(users) || users.length === 0) {
      return NextResponse.json({ error: 'company_id and users array required' }, { status: 400 });
    }

    // Load existing lms_users for this company (check for duplicate usernames)
    const { data: existingLmsUsers, error: lmsErr } = await supabaseAdmin
      .from('lms_users')
      .select('username')
      .eq('company_id', company_id);
    if (lmsErr) throw new Error(`lms_users lookup failed: ${lmsErr.message}`);
    const existingUsernames = new Set((existingLmsUsers || []).map(u => u.username));

    // Load all auth users once — avoid calling listUsers() per employee
    const allAuthUsers = await loadAllAuthUsers();
    const authByEmail = new Map(allAuthUsers.map(u => [u.email, u.id]));

    const results = { created: [], skipped: [], errors: [] };

    for (const user of users) {
      const {
        first_name,
        last_name,
        username,
        temp_password,
        email,
        job_title,
        department,
        location,
        hire_date,
        employee_number,
      } = user;

      if (!username || !temp_password) {
        results.errors.push({ username: username || '?', error: 'username and temp_password are required' });
        continue;
      }

      const display_name = `${first_name} ${last_name}`.trim();
      // Placeholder email for Supabase Auth (field workers without real email)
      const has_real_email = email && email.includes('@') && !email.includes('noemail.');
      const placeholder_email = has_real_email
        ? email.toLowerCase().trim()
        : `${username}@noemail.slpalaska.com`;

      try {
        // Skip if username already exists in this company
        if (existingUsernames.has(username)) {
          results.skipped.push({ username, reason: 'already exists' });
          continue;
        }

        // Find or create auth user
        let auth_user_id = authByEmail.get(placeholder_email);

        if (!auth_user_id) {
          const { data: newAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: placeholder_email,
            password: temp_password,
            email_confirm: true,
            user_metadata: {
              display_name,
              username,
              company_id,
              login_type: has_real_email ? 'email' : 'username',
            },
          });

          if (authError) {
            results.errors.push({ username, error: authError.message });
            continue;
          }
          auth_user_id = newAuth.user.id;
          // Add to in-memory map so dupes within this batch are caught
          authByEmail.set(placeholder_email, auth_user_id);
        }

        // Insert lms_users record
        const { error: dbError } = await supabaseAdmin.from('lms_users').insert({
          id: auth_user_id,
          company_id,
          username,
          display_name,
          email: has_real_email ? email.toLowerCase().trim() : null,
          job_title: job_title || null,
          department: department || null,
          location: location || null,
          hire_date: hire_date || null,
          employee_number: employee_number ? String(employee_number) : null,
          role: 'learner',
          is_active: true,
        });

        if (dbError) {
          // Roll back auth user creation
          await supabaseAdmin.auth.admin.deleteUser(auth_user_id);
          results.errors.push({ username, error: dbError.message });
          continue;
        }

        existingUsernames.add(username); // prevent intra-batch dupes
        results.created.push({ username, display_name });
      } catch (err) {
        results.errors.push({ username, error: err.message });
      }
    }

    return NextResponse.json({
      company_id,
      total: users.length,
      created: results.created.length,
      skipped: results.skipped.length,
      errors: results.errors.length,
      details: results,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
