import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, load_id, driver_id, driver_name, tenant_id, decision } = await req.json();

    if (action === 'request_load') {
      // Driver requests a load
      const load = await base44.entities.Load.get(load_id);
      if (!load) {
        return Response.json({ error: 'Load not found' }, { status: 404 });
      }

      // Create notification for owner-op
      const notification = await base44.entities.Notification.create({
        tenant_id,
        notification_type: 'driver_load_request',
        title: `${driver_name} requested load ${load.internal_load_number}`,
        message: `${driver_name} has requested to be assigned to load ${load.internal_load_number} (${load.pickup_city || ''} → ${load.delivery_city || ''})`,
        related_entity_type: 'load',
        related_entity_id: load_id,
        link_url: `/DispatchBoard`,
        read: false,
        metadata: {
          driver_id,
          driver_name,
          load_id,
          load_number: load.internal_load_number,
          request_status: 'pending'
        }
      });

      return Response.json({ success: true, notification_id: notification.id });
    }

    if (action === 'accept_request') {
      // Owner accepts - assign driver and notify
      const load = await base44.entities.Load.get(load_id);
      if (!load) {
        return Response.json({ error: 'Load not found' }, { status: 404 });
      }

      // Update load with driver assignment
      await base44.entities.Load.update(load_id, {
        driver_1_id: driver_id,
        driver_1_name: driver_name,
        dispatch_status: 'assigned',
        driver_visibility: false
      });

      // Notify driver that request was accepted
      await base44.entities.Notification.create({
        tenant_id,
        notification_type: 'load_request_accepted',
        title: `Load ${load.internal_load_number} assigned to you`,
        message: `Your request for load ${load.internal_load_number} was accepted. Check the My Loads board for details.`,
        related_entity_type: 'load',
        related_entity_id: load_id,
        link_url: `/DriverPublicPortal`,
        read: false,
        metadata: {
          driver_id,
          load_id,
          load_number: load.internal_load_number
        }
      });

      return Response.json({ success: true });
    }

    if (action === 'deny_request') {
      // Owner denies - just mark notification as handled (no driver notification)
      // Find the pending request notification and mark as read/deleted
      const notifications = await base44.entities.Notification.filter({
        tenant_id,
        notification_type: 'driver_load_request',
        read: false
      });
      
      const reqNotification = notifications.find(n => 
        n.metadata?.load_id === load_id && n.metadata?.driver_id === driver_id
      );

      if (reqNotification) {
        await base44.entities.Notification.update(reqNotification.id, {
          read: true,
          deleted: true
        });
      }

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Load request error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});