import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, load_id, driver_id, driver_name, tenant_id } = await req.json();

    if (!load_id || !tenant_id) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (action === 'request_load') {
      // Validate driver info
      if (!driver_id || !driver_name) {
        return Response.json({ error: 'Driver information required' }, { status: 400 });
      }

      // Get load
      const load = await base44.entities.Load.get(load_id);
      if (!load) {
        return Response.json({ error: 'Load not found' }, { status: 404 });
      }

      // Check if load is still available
      if (load.dispatch_status !== 'available' || load.canceled || load.status === 'canceled') {
        return Response.json({ error: 'Load is no longer available' }, { status: 400 });
      }

      // Check if driver already has a pending request for this load
      const existingRequests = await base44.entities.Notification.filter({
        tenant_id,
        notification_type: 'load_request',
        related_entity_id: load_id,
        deleted: false
      });

      const hasPendingRequest = existingRequests.some(n => 
        n.metadata?.driver_id === driver_id && 
        n.metadata?.request_status === 'pending'
      );

      if (hasPendingRequest) {
        return Response.json({ error: 'You already have a pending request for this load' }, { status: 400 });
      }

      // Update load to track this driver's request
      const requestedByDrivers = load.requested_by_driver_ids || [];
      if (!requestedByDrivers.includes(driver_id)) {
        requestedByDrivers.push(driver_id);
        await base44.entities.Load.update(load_id, {
          requested_by_driver_ids: requestedByDrivers
        });
      }

      // Create notification for dispatcher
      const notification = await base44.entities.Notification.create({
        tenant_id,
        notification_type: 'load_request',
        title: `${driver_name} requested load ${load.internal_load_number}`,
        message: `${driver_name} wants to be assigned to this load`,
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
          request_status: 'pending',
          requested_at: new Date().toISOString()
        }
      });

      console.log(`Load request created: ${notification.id} for driver ${driver_id}, load ${load_id}`);
      return Response.json({ 
        success: true, 
        notification_id: notification.id,
        message: 'Request submitted successfully'
      });
    }

    if (action === 'accept_request') {
      // Validate required params
      if (!driver_id) {
        return Response.json({ error: 'Driver ID required' }, { status: 400 });
      }

      const load = await base44.entities.Load.get(load_id);
      if (!load) {
        return Response.json({ error: 'Load not found' }, { status: 404 });
      }

      // Get accepting user for audit
      const user = await base44.auth.me();
      const acceptedBy = user?.full_name || user?.email || 'Dispatcher';

      // Update load assignment
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
        driver_1_name: driver_name || 'Unknown Driver',
        dispatch_status: 'assigned',
        manual_dispatch_override: true,
        driver_visibility: false,
        dispatch_status_history: statusHistory.slice(-20)
      });

      // Mark all requests for this load as resolved
      const allRequests = await base44.entities.Notification.filter({
        tenant_id,
        notification_type: 'load_request',
        related_entity_id: load_id
      });

      for (const req of allRequests) {
        const isAcceptedDriver = req.metadata?.driver_id === driver_id;
        await base44.entities.Notification.update(req.id, {
          read: true,
          deleted: true,
          metadata: { 
            ...req.metadata, 
            request_status: isAcceptedDriver ? 'accepted' : 'denied',
            resolved_at: new Date().toISOString()
          }
        });

        // Notify drivers who were denied
        if (!isAcceptedDriver && req.metadata?.driver_id) {
          await base44.entities.Notification.create({
            tenant_id,
            notification_type: 'load_request_denied',
            title: `Load ${load.internal_load_number} assigned to another driver`,
            message: `Your request was not accepted. The load has been assigned.`,
            related_entity_type: 'load',
            related_entity_id: load_id,
            link_url: `/DriverPublicPortal`,
            read: false,
            metadata: {
              driver_id: req.metadata.driver_id,
              load_id,
              load_number: load.internal_load_number
            }
          });
        }
      }

      // Notify accepted driver
      await base44.entities.Notification.create({
        tenant_id,
        notification_type: 'load_request_accepted',
        title: `Load ${load.internal_load_number} assigned to you`,
        message: `Your request was accepted. Check your loads.`,
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

      console.log(`Load request accepted: driver ${driver_id} assigned to load ${load_id}`);
      return Response.json({ success: true });
    }

    if (action === 'deny_request') {
      if (!driver_id) {
        return Response.json({ error: 'Driver ID required' }, { status: 400 });
      }

      const load = await base44.entities.Load.get(load_id);
      if (!load) {
        return Response.json({ error: 'Load not found' }, { status: 404 });
      }

      // Find and update the request notification
      const notifications = await base44.entities.Notification.filter({
        tenant_id,
        notification_type: 'load_request',
        related_entity_id: load_id,
        deleted: false
      });
      
      const reqNotification = notifications.find(n => 
        n.metadata?.driver_id === driver_id
      );

      if (reqNotification) {
        await base44.entities.Notification.update(reqNotification.id, {
          read: true,
          deleted: true,
          metadata: { 
            ...reqNotification.metadata, 
            request_status: 'denied',
            denied_at: new Date().toISOString()
          }
        });
      }

      // Remove driver from load's requested list
      const currentRequestedBy = load.requested_by_driver_ids || [];
      const updatedRequestedBy = currentRequestedBy.filter(id => id !== driver_id);
      await base44.entities.Load.update(load_id, {
        requested_by_driver_ids: updatedRequestedBy
      });

      // Notify driver
      await base44.entities.Notification.create({
        tenant_id,
        notification_type: 'load_request_denied',
        title: `Load ${load.internal_load_number} request not accepted`,
        message: `You can request other available loads.`,
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

      console.log(`Load request denied: driver ${driver_id}, load ${load_id}`);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Load request error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});