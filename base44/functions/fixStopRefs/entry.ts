import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Triggered when a Document is created/updated with extraction_json set.
// Finds the linked load's stops and clears any reference_number that
// matches the load's external_load_number (top-level broker load #),
// since that means the LLM incorrectly copied the load # into the stop.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const doc = payload.data;
    if (!doc || !doc.related_id || doc.related_type !== 'load' || !doc.extraction_json) {
      return Response.json({ skipped: true });
    }

    let extracted;
    try {
      extracted = JSON.parse(doc.extraction_json);
    } catch {
      return Response.json({ skipped: true, reason: 'invalid json' });
    }

    const loadId = doc.related_id;
    const load = await base44.asServiceRole.entities.Load.get(loadId);
    if (!load) return Response.json({ skipped: true, reason: 'load not found' });

    // Values that should NOT appear as stop reference_numbers
    const topLevelNums = new Set(
      [load.external_load_number, load.internal_load_number]
        .filter(Boolean)
        .map(v => v.trim().toLowerCase())
    );

    const stops = await base44.asServiceRole.entities.LoadStop.filter({ load_id: loadId });
    let cleaned = 0;

    for (const stop of stops) {
      const ref = (stop.reference_number || '').trim();
      if (ref && (topLevelNums.has(ref.toLowerCase()) || ref.toLowerCase() === 'none')) {
        await base44.asServiceRole.entities.LoadStop.update(stop.id, { reference_number: '' });
        cleaned++;
      }
    }

    // Also update customer_reference_number on the load if we have customer_po and it's missing
    if (extracted.customer_po && !load.customer_reference_number) {
      await base44.asServiceRole.entities.Load.update(loadId, {
        customer_reference_number: extracted.customer_po,
      });
    }

    return Response.json({ ok: true, cleaned });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});