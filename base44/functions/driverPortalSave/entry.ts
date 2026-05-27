import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { token, action, data } = body;

    if (!token || !action) {
      return Response.json({ error: 'token and action required' }, { status: 400 });
    }

    // Validate token and get driver
    const drivers = await base44.asServiceRole.entities.Driver.filter({ portal_token: token }, 'created_date', 1);
    if (!drivers || drivers.length === 0) {
      return Response.json({ error: 'Invalid token' }, { status: 401 });
    }
    const driver = drivers[0];
    const tenantId = driver.tenant_id;
    const driverId = driver.id;
    const driverName = driver.full_name;

    // READ: fetch qualification + tests
    if (action === 'read') {
      const quals = await base44.asServiceRole.entities.DriverQualification.filter({ driver_id: driverId }, '-created_date', 1);
      const tests = await base44.asServiceRole.entities.DrugAlcoholTest.filter({ driver_id: driverId }, '-test_date', 30);
      return Response.json({ success: true, qualification: quals[0] || null, tests });
    }

    // SAVE CDL
    if (action === 'save_cdl') {
      const quals = await base44.asServiceRole.entities.DriverQualification.filter({ driver_id: driverId }, '-created_date', 1);
      const existing = quals[0];
      const qualData = {
        driver_id: driverId, driver_name: driverName, tenant_id: tenantId,
        cdl_number: data.cdl_number, cdl_class: data.cdl_class,
        cdl_expiration_date: data.cdl_expiration_date, endorsements: data.endorsements,
        cdl_file_url: data.cdl_file_url, submitted_by_driver: true,
      };
      if (existing) {
        await base44.asServiceRole.entities.DriverQualification.update(existing.id, qualData);
      } else {
        await base44.asServiceRole.entities.DriverQualification.create({ ...qualData, pending_review: true });
      }
      await base44.asServiceRole.entities.Notification.create({
        tenant_id: tenantId,
        notification_type: 'driver_profile_update',
        title: `CDL info updated — ${driverName}`,
        message: `${driverName} updated their CDL/license information in the driver portal.`,
        link_url: '/DriverQualifications',
        read: false,
      });
      return Response.json({ success: true });
    }

    // SAVE MEDICAL
    if (action === 'save_medical') {
      const quals = await base44.asServiceRole.entities.DriverQualification.filter({ driver_id: driverId }, '-created_date', 1);
      const existing = quals[0];
      const qualData = {
        driver_id: driverId, driver_name: driverName, tenant_id: tenantId,
        medical_card_expiration_date: data.medical_card_expiration_date,
        medical_card_file_url: data.medical_card_file_url,
        submitted_by_driver: true,
      };
      if (existing) {
        await base44.asServiceRole.entities.DriverQualification.update(existing.id, qualData);
      } else {
        await base44.asServiceRole.entities.DriverQualification.create({ ...qualData, pending_review: true });
      }
      await base44.asServiceRole.entities.Notification.create({
        tenant_id: tenantId,
        notification_type: 'driver_profile_update',
        title: `Medical card updated — ${driverName}`,
        message: `${driverName} updated their medical card information in the driver portal.`,
        link_url: '/DriverQualifications',
        read: false,
      });
      return Response.json({ success: true });
    }

    // SAVE DRUG TEST
    if (action === 'save_drug_test') {
      await base44.asServiceRole.entities.DrugAlcoholTest.create({
        driver_id: driverId, driver_name: driverName, tenant_id: tenantId,
        test_date: data.test_date, test_type: data.test_type,
        result: data.result, notes: data.notes, file_url: data.file_url,
        submitted_by_driver: true, pending_review: true,
      });
      await base44.asServiceRole.entities.Notification.create({
        tenant_id: tenantId,
        notification_type: 'driver_test_submitted',
        title: `Drug test submitted — ${driverName}`,
        message: `${driverName} submitted a ${(data.test_type || '').replace(/_/g, ' ')} test result: ${(data.result || '').toUpperCase()}. Pending your review.`,
        link_url: '/DrugAlcoholTests',
        read: false,
      });
      return Response.json({ success: true });
    }

    // SAVE INSPECTION
    if (action === 'save_inspection') {
      await base44.asServiceRole.entities.TruckInspection.create({
        driver_id: driverId, driver_name: driverName, tenant_id: tenantId,
        truck_id: data.truck_id, truck_number: data.truck_number,
        date: data.date, inspection_type: data.inspection_type,
        result: data.result, checklist: data.checklist,
        defects_noted: data.defects_noted, file_url: data.file_url,
        submitted_by_driver: true, pending_review: true,
      });
      await base44.asServiceRole.entities.Notification.create({
        tenant_id: tenantId,
        notification_type: 'driver_inspection_submitted',
        title: `Inspection submitted — ${driverName}`,
        message: `${driverName} submitted a ${(data.inspection_type || '').replace(/_/g, ' ')} inspection for truck #${data.truck_number || ''}. Result: ${data.result || 'unknown'}. Pending your review.`,
        link_url: '/TruckInspections',
        read: false,
      });
      return Response.json({ success: true });
    }

    // UPLOAD FILE (service-role upload since drivers aren't Base44-authed)
    if (action === 'upload_file') {
      const { file_base64, file_name, mime_type } = data;
      if (!file_base64 || !file_name) {
        return Response.json({ error: 'file_base64 and file_name required' }, { status: 400 });
      }
      // Decode base64 to binary
      const binaryStr = atob(file_base64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mime_type || 'application/octet-stream' });
      const formFile = new File([blob], file_name, { type: mime_type || 'application/octet-stream' });
      const result = await base44.asServiceRole.integrations.Core.UploadFile({ file: formFile });
      return Response.json({ success: true, file_url: result.file_url });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('driverPortalSave error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});