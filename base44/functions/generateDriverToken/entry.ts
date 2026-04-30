import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { driver_id } = await req.json();

    if (!driver_id) {
      return Response.json({ error: 'driver_id required' }, { status: 400 });
    }

    // Generate a secure random token
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const token = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');

    await base44.asServiceRole.entities.Driver.update(driver_id, { portal_token: token });

    return Response.json({ token });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});