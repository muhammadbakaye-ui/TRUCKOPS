import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const params = await req.json();
    console.log('FUNCTION CALLED WITH:', JSON.stringify(params));
    const { action, load_id, driver_id, driver_name, tenant_id } = params;

    console.log('[handleLoadRequest] Received request:', { action, load_id, driver_id, driver_name, tenant_id });

    if (!load_id || !tenant_id) {
      console.error('[handleLoadRequest] Missing required parameters');
      console.log('FUNCTION RETURNING:', JSON.stringify({ error: 'Missing required parameters', status: 400 }));
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    if (action === 'request_load') {
      // Validate driver info
      if (!driver_id || !driver_name) {
        console.error('[handleLoadRequest] Missing driver info');
        console.log('FUNCTION RETURNING:', JSON.stringify({ error: 'Driver information required', status: 400 }));
        return Response.json({ error: 'Driver information required' }, { status: 400 });
      }

      // Get load using service role (driver portal uses token auth, not standard session)
      let load;
      try {
        load = await base44.asServiceRole.entities.Load.get(load_id);
        console.log('[handleLoadRequest] Load retrieved:', { id: load_id, dispatch_status: load?.dispatch_status, driver_1_id: load?.driver_1_id });
      } catch (err) {
        console.error('[handleLoadRequest] Failed to get load:', err.message);
        return Response.json({ error: 'Load not found: ' + err.message }, { status: 404 });
      }

      if (!load) {
        console.error('[handleLoadRequest] Load not found:', load_id);
        return Response.json({ error: 'Load not found' }, { status: 404 });
      }

      // Check if load is still available
      if (load.dispatch_status !== 'available' || load.canceled || load.status === 'canceled') {
        console.log('[handleLoadRequest] Load not available:', { dispatch_status: load.dispatch_status, canceled: load.canceled });
        return Response.json({ error: 'Load is no longer available' }, { status: 400 });
      }

      // Check if driver already has a pending request for this load
      let existingRequests;
      try {
        existingRequests = await base44.asServiceRole.entities.Notification.filter({
          tenant_id,
          notification_type: 'load_request',
          related_entity_id: load_id,
          deleted: false
        });
        console.log('[handleLoadRequest] Existing requests:', existingRequests.length);
      } catch (err) {
        console.error('[handleLoadRequest] Failed to check existing requests:', err.message);
        return Response.json({ error: 'Failed to check existing requests: ' + err.message }, { status: 500 });
      }

      const hasPendingRequest = existingRequests.some(n => 
        n.metadata?.driver_id === driver_id && 
        n.metadata?.request_status === 'pending'
      );

      if (hasPendingRequest) {
        console.log('[handleLoadRequest] Driver already has pending request');
        return Response.json({ error: 'You already have a pending request for this load' }, { status: 400 });
      }

      // Update load to track this driver's request
      const requestedByDrivers = load.requested_by_driver_ids || [];
      if (!requestedByDrivers.includes(driver_id)) {
        requestedByDrivers.push(driver_id);
        try {
          await base44.asServiceRole.entities.Load.update(load_id, {
            requested_by_driver_ids: requestedByDrivers
          });
          console.log('[handleLoadRequest] Updated requested_by_driver_ids:', requestedByDrivers);
        } catch (err) {
          console.error('[handleLoadRequest] Failed to update load:', err.message);
          return Response.json({ error: 'Failed to update load: ' + err.message }, { status: 500 });
        }
      }

      // Create notification for dispatcher
      try {
        const notification = await base44.asServiceRole.entities.Notification.create({
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
        const result = { 
          success: true, 
          notification_id: notification.id,
          message: 'Request submitted successfully'
        };
        console.log('[handleLoadRequest] Notification created:', notification.id);
        console.log('FUNCTION RETURNING:', JSON.stringify(result));
        return Response.json(result);
      } catch (err) {
        console.error('[handleLoadRequest] Failed to create notification:', err.message);
        return Response.json({ error: 'Failed to create notification: ' + err.message }, { status: 500 });
      }
    }

    if (action === 'accept_request') {
      // Validate required params
      if (!driver_id) {
        console.error('[handleLoadRequest] accept_request: Missing driver_id');
        return Response.json({ error: 'Driver ID required' }, { status: 400 });
      }

      const load = await base44.asServiceRole.entities.Load.get(load_id);
      if (!load) {
        console.error('[handleLoadRequest] accept_request: Load not found:', load_id);
        return Response.json({ error: 'Load not found' }, { status: 404 });
      }

      console.log('[handleLoadRequest] accept_request:', { load_id, driver_id, driver_name });

      // Get accepting user for audit (use auth.me() for admin portal, fallback for safety)
      let acceptedBy = 'Dispatcher';
      try {
        const user = await base44.auth.me();
        acceptedBy = user?.full_name || user?.email || 'Dispatcher';
      } catch (err) {
        console.log('[handleLoadRequest] Could not get auth user (expected in some contexts):', err.message);
      }

      // Update load assignment
      const statusHistory = load.dispatch_status_history || [];
      statusHistory.push({
        from: load.dispatch_status || 'available',
        to: 'assigned',
        changed_by: acceptedBy,
        changed_by_type: 'manual',
        timestamp: new Date().toISOString()
      });

      try {
        await base44.asServiceRole.entities.Load.update(load_id, {
          driver_1_id: driver_id,
          driver_1_name: driver_name || 'Unknown Driver',
          dispatch_status: 'assigned',
          manual_dispatch_override: true,
          driver_visibility: false, // FIX 3: Hide from other drivers once assigned
          dispatch_status_history: statusHistory.slice(-20)
        });
        console.log('[handleLoadRequest] Load assigned and driver_visibility set to false');
      } catch (err) {
        console.error('[handleLoadRequest] Failed to update load:', err.message);
        return Response.json({ error: 'Failed to update load: ' + err.message }, { status: 500 });
      }

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
        console.error('[handleLoadRequest] deny_request: Missing driver_id');
        return Response.json({ error: 'Driver ID required' }, { status: 400 });
      }

      const load = await base44.asServiceRole.entities.Load.get(load_id);
      if (!load) {
        console.error('[handleLoadRequest] deny_request: Load not found:', load_id);
        return Response.json({ error: 'Load not found' }, { status: 404 });
      }

      console.log('[handleLoadRequest] deny_request:', { load_id, driver_id });

      // Find and update the request notification
      let notifications;
      try {
        notifications = await base44.asServiceRole.entities.Notification.filter({
          tenant_id,
          notification_type: 'load_request',
          related_entity_id: load_id,
          deleted: false
        });
      } catch (err) {
        console.error('[handleLoadRequest] Failed to fetch notifications:', err.message);
        return Response.json({ error: 'Failed to fetch notifications: ' + err.message }, { status: 500 });
      }
      
      const reqNotification = notifications.find(n => 
        n.metadata?.driver_id === driver_id
      );

      if (reqNotification) {
        try {
          await base44.asServiceRole.entities.Notification.update(reqNotification.id, {
            read: true,
            deleted: true,
            metadata: { 
              ...reqNotification.metadata, 
              request_status: 'denied',
              denied_at: new Date().toISOString()
            }
          });
          console.log('[handleLoadRequest] Notification marked as denied');
        } catch (err) {
          console.error('[handleLoadRequest] Failed to update notification:', err.message);
        }
      }

      // Remove driver from load's requested list
      const currentRequestedBy = load.requested_by_driver_ids || [];
      const updatedRequestedBy = currentRequestedBy.filter(id => id !== driver_id);
      try {
        await base44.asServiceRole.entities.Load.update(load_id, {
          requested_by_driver_ids: updatedRequestedBy
        });
        console.log('[handleLoadRequest] Removed driver from requested_by_driver_ids');
      } catch (err) {
        console.error('[handleLoadRequest] Failed to update load requested_by_driver_ids:', err.message);
      }

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

    const result = Response.json({ error: 'Invalid action' }, { status: 400 });
    console.log('FUNCTION RETURNING:', JSON.stringify({ error: 'Invalid action', status: 400 }));
    return result;
  } catch (error) {
    console.error('Load request error:', error);
    const result = Response.json({ error: error.message }, { status: 500 });
    console.log('FUNCTION RETURNING:', JSON.stringify({ error: error.message, status: 500 }));
    return result;
  }
});