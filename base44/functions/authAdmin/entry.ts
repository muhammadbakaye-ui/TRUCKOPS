const APP_ID = Deno.env.get('BASE44_APP_ID');
const API_BASE = `https://api.base44.com/api/apps/${APP_ID}`;

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getServiceToken(req) {
  // Extract the authorization token from the incoming request to use as service role
  const authHeader = req.headers.get('authorization') || '';
  return authHeader.replace('Bearer ', '');
}

async function listAdmins(token) {
  const res = await fetch(`${API_BASE}/entities/Admin?limit=200`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Failed to list admins: ${res.status}`);
  return res.json();
}

async function createAdmin(token, data) {
  const res = await fetch(`${API_BASE}/entities/Admin`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create admin: ${res.status}`);
  return res.json();
}

async function updateAdmin(token, id, data) {
  const res = await fetch(`${API_BASE}/entities/Admin/${id}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update admin: ${res.status}`);
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const token = await getServiceToken(req);
    const body = await req.json();
    const { action, email, password, password_hash, first_name, last_name } = body;

    if (action === 'login') {
      if (!email || (!password && !password_hash)) {
        return Response.json({ success: false, message: 'Email and password are required' }, { status: 400 });
      }
      const adminsData = await listAdmins(token);
      const admins = adminsData.data || adminsData;
      const admin = Array.isArray(admins)
        ? admins.find(a => a.active && a.email?.toLowerCase().trim() === email.toLowerCase().trim())
        : null;
      if (!admin) {
        return Response.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
      }
      const inputHash = password_hash || await hashPassword(password);
      if (inputHash !== admin.password_hash) {
        return Response.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
      }
      return Response.json({ success: true, admin_id: admin.id, admin_name: `${admin.first_name} ${admin.last_name}` });
    }

    if (action === 'create_admin') {
      if (!first_name || !last_name || !email || (!password && !password_hash)) {
        return Response.json({ success: false, message: 'All fields are required' }, { status: 400 });
      }
      const adminsData = await listAdmins(token);
      const admins = adminsData.data || adminsData;
      const existing = Array.isArray(admins)
        ? admins.find(a => a.email?.toLowerCase().trim() === email.toLowerCase().trim())
        : null;
      if (existing) {
        return Response.json({ success: false, message: 'An account with this email already exists' }, { status: 400 });
      }
      const passwordHash = password_hash || await hashPassword(password);
      const newAdmin = await createAdmin(token, {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        active: true,
      });
      return Response.json({ success: true, admin_id: newAdmin.id, admin_name: `${first_name} ${last_name}` });
    }

    if (action === 'reset_password') {
      if (!email || (!password && !password_hash)) {
        return Response.json({ success: false, message: 'Email and new password required' }, { status: 400 });
      }
      const adminsData = await listAdmins(token);
      const admins = adminsData.data || adminsData;
      const admin = Array.isArray(admins)
        ? admins.find(a => a.email?.toLowerCase().trim() === email.toLowerCase().trim())
        : null;
      if (!admin) {
        return Response.json({ success: false, message: 'Admin not found' }, { status: 404 });
      }
      const newHash = password_hash || await hashPassword(password);
      await updateAdmin(token, admin.id, { password_hash: newHash });
      return Response.json({ success: true, message: 'Password updated' });
    }

    if (action === 'list_admins') {
      const adminsData = await listAdmins(token);
      const admins = adminsData.data || adminsData;
      return Response.json({ success: true, admins });
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});