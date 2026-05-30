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

      // Check if driver already requested this load
      const existingRequests = await base44.entities.Notification.filter({
        tenant_id,
        notification_type: 'driver_load_request',
        related_entity_id: load_id
      });
      
      const alreadyRequested = existingRequests.some(n => 
        n.metadata?.driver_id === driver_id && !n.deleted
      );
      
      if (alreadyRequested) {
        return Response.json({ error: 'You already requested this load', status: 400 });
      }

      // Update load to track requested drivers
      const requestedByDrivers = load.requested_by_driver_ids || [];
      if (!requestedByDrivers.includes(driver_id)) {
        requestedByDrivers.push(driver_id);
      }
      await base44.entities.Load.update(load_id, {
        requested_by_driver_ids: requestedByDrivers
      });

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
        deleted: false,
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

      // Get user info for audit trail
      const user = await base44.auth.me();
      const acceptedBy = user?.full_name || user?.email || 'Owner';

      // Update load with driver assignment
      const statusHistory = load.dispatch_status_history || [];
      statusHistory.push({
        from: load.dispatch_status || 'available',
        to: 'assigned',
        changed_by: acceptedBy,
        changed_by_type: 'manual',
        timestamp: new Date().toISOString()
      });

      await base44.entities.Load.update(load_id, {
        driver_1_id: driver_id,
        driver_1_name: driver_name,
        dispatch_status: 'assigned',
        manual_dispatch_override: true,
        driver_visibility: false,
        dispatch_status_history: statusHistory.slice(-20)
      });

      // Deny all other pending requests for this load
      const allRequests = await base44.entities.Notification.filter({
        tenant_id,
        notification_type: 'driver_load_request',
        related_entity_id: load_id
      });

      for (const req of allRequests) {
        if (req.metadata?.driver_id !== driver_id && !req.deleted) {
          // Mark other requests as denied
          await base44.entities.Notification.update(req.id, {
            read: true,
            deleted: true,
            metadata: { ...req.metadata, request_status: 'denied' }
          });

          // Notify denied drivers
          await base44.entities.Notification.create({
            tenant_id,
            notification_type: 'load_request_denied',
            title: `Load ${load.internal_load_number} request not accepted`,
            message: `Your request for load ${load.internal_load_number} was not accepted. The load has been assigned to another driver.`,
            related_entity_type: 'load',
            related_entity_id: load_id,
            link_url: `/DriverPublicPortal`,
            read: false,
            metadata: {
              driver_id: req.metadata?.driver_id,
              load_id,
              load_number: load.internal_load_number
            }
          });
        }
      }

      // Mark accepted request as handled
      const acceptedRequest = allRequests.find(n => n.metadata?.driver_id === driver_id);
      if (acceptedRequest) {
        await base44.entities.Notification.update(acceptedRequest.id, {
          read: true,
          deleted: true,
          metadata: { ...acceptedRequest.metadata, request_status: 'accepted' }
        });
      }

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
      // Owner denies request
      const load = await base44.entities.Load.get(load_id);
      if (!load) {
        return Response.json({ error: 'Load not found' }, { status: 404 });
      }

      // Find the pending request notification
      const notifications = await base44.entities.Notification.filter({
        tenant_id,
        notification_type: 'driver_load_request',
        related_entity_id: load_id
      });
      
      const reqNotification = notifications.find(n => 
        n.metadata?.driver_id === driver_id && !n.deleted
      );

      if (reqNotification) {
        await base44.entities.Notification.update(reqNotification.id, {
          read: true,
          deleted: true,
          metadata: { ...reqNotification.metadata, request_status: 'denied' }
        });
      }

      // Remove driver from load's requested_by_driver_ids
      const currentRequestedBy = load.requested_by_driver_ids || [];
      const updatedRequestedBy = currentRequestedBy.filter(id => id !== driver_id);
      await base44.entities.Load.update(load_id, {
        requested_by_driver_ids: updatedRequestedBy
      });

      // Notify driver that request was denied (they can request again)
      await base44.entities.Notification.create({
        tenant_id,
        notification_type: 'load_request_denied',
        title: `Load ${load.internal_load_number} request not accepted`,
        message: `Your request for load ${load.internal_load_number} was not accepted. You may request again if the load is still available.`,
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

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Load request error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});