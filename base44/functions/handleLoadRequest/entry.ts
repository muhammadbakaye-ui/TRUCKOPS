import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, load_id, driver_id, driver_name, tenant_id } = await req.json();

    if (!load_id || !tenant_id) {
      return Response.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    // ── REQUEST ──────────────────────────────────────────────────────────────
    if (action === 'request') {
      if (!driver_id) return Response.json({ success: false, error: 'Missing driver_id' }, { status: 400 });

      const load = await base44.asServiceRole.entities.Load.get(load_id);
      if (!load) return Response.json({ success: false, error: 'Load not found' });
      if (load.dispatch_status !== 'available') return Response.json({ success: false, error: 'Load not available' });

      const requestedIds   = load.requested_by_driver_ids   || [];
      const requestedNames = load.requested_by_driver_names || [];
      if (requestedIds.includes(driver_id)) return Response.json({ success: false, error: 'Already requested' });

      await base44.asServiceRole.entities.Load.update(load_id, {
        requested_by_driver_ids:   [...requestedIds,   driver_id],
        requested_by_driver_names: [...requestedNames, driver_name || driver_id],
      });

      await base44.asServiceRole.entities.Notification.create({
        tenant_id,
        notification_type: 'load_request',
        title: `${driver_name || driver_id} requested Load #${load.internal_load_number}`,
        message: `Driver wants to be assigned to this load`,
        related_entity_type: 'load',
        related_entity_id: load_id,
        read: false,
        deleted: false,
        metadata: {
          load_id,
          load_number: load.internal_load_number,
          driver_id,
          driver_name: driver_name || driver_id,
        },
      });

      return Response.json({ success: true });
    }

    // ── ACCEPT ───────────────────────────────────────────────────────────────
    if (action === 'accept') {
      if (!driver_id) return Response.json({ success: false, error: 'Missing driver_id' }, { status: 400 });

      const load = await base44.asServiceRole.entities.Load.get(load_id);
      if (!load) return Response.json({ success: false, error: 'Load not found' });

      const driverDisplayName = driver_name || driver_id;

      await base44.asServiceRole.entities.Load.update(load_id, {
        driver_1_id:               driver_id,
        driver_1_name:             driverDisplayName,
        dispatch_status:           'assigned',
        driver_visibility:         false,
        requested_by_driver_ids:   [],
        requested_by_driver_names: [],
        manual_dispatch_override:  true,
      });

      await base44.asServiceRole.entities.Notification.create({
        tenant_id,
        notification_type: 'request_accepted',
        title: `Your request for Load #${load.internal_load_number} was accepted`,
        message: `You have been assigned to this load`,
        read: false,
        deleted: false,
        metadata: { driver_id, load_id, load_number: load.internal_load_number },
      });

      return Response.json({ success: true });
    }

    // ── DENY ─────────────────────────────────────────────────────────────────
    if (action === 'deny') {
      if (!driver_id) return Response.json({ success: false, error: 'Missing driver_id' }, { status: 400 });

      const load = await base44.asServiceRole.entities.Load.get(load_id);
      if (!load) return Response.json({ success: false, error: 'Load not found' });

      const ids   = load.requested_by_driver_ids   || [];
      const names = load.requested_by_driver_names || [];
      const idx   = ids.indexOf(driver_id);

      const newIds   = idx >= 0 ? [...ids.slice(0, idx),   ...ids.slice(idx + 1)]   : ids;
      const newNames = idx >= 0 ? [...names.slice(0, idx), ...names.slice(idx + 1)] : names;

      await base44.asServiceRole.entities.Load.update(load_id, {
        requested_by_driver_ids:   newIds,
        requested_by_driver_names: newNames,
      });

      await base44.asServiceRole.entities.Notification.create({
        tenant_id,
        notification_type: 'request_denied',
        title: `Your request for Load #${load.internal_load_number} was not accepted`,
        message: `You can request other available loads`,
        read: false,
        deleted: false,
        metadata: { driver_id, load_id, load_number: load.internal_load_number },
      });

      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('handleLoadRequest error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});