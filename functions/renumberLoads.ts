import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all loads sorted by created_date ascending
    const loads = await base44.asServiceRole.entities.Load.list('created_date', 500);

    let counter = 1;
    let updated = 0;
    const errors = [];

    for (const load of loads) {
        const newNumber = `L-${1000 + counter}`;
        if (load.internal_load_number !== newNumber) {
            try {
                await base44.asServiceRole.entities.Load.update(load.id, {
                    internal_load_number: newNumber
                });
                updated++;
            } catch (e) {
                errors.push({ id: load.id, error: e.message });
            }
        }
        counter++;
    }

    return Response.json({
        total: loads.length,
        updated,
        errors
    });
});