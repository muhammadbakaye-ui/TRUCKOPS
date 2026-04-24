import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: 'Token required' }, { status: 400 });
    }

    // Find driver by portal_token using service role (public endpoint)
    const drivers = await base44.asServiceRole.entities.Driver.filter({ portal_token: token }, 'created_date', 1);
    if (!drivers || drivers.length === 0) {
      return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    const driver = drivers[0];

    // Fetch published statements for this driver
    const statements = await base44.asServiceRole.entities.DriverStatement.filter(
      { driver_id: driver.id, published: true },
      '-period_start',
      52
    );

    // Fetch statement lines for all statements
    const statementIds = statements.map(s => s.id);
    let allLines = [];
    for (const sid of statementIds) {
      const lines = await base44.asServiceRole.entities.StatementLine.filter({ statement_id: sid }, 'date', 200);
      allLines = [...allLines, ...lines];
    }

    // Fetch fuel transactions for this driver (last 200)
    const fuelTransactions = await base44.asServiceRole.entities.FuelTransaction.filter(
      { matched_driver_id: driver.id },
      '-transaction_date',
      200
    );

    // Find assigned truck
    let truck = null;
    if (driver.assigned_truck_id) {
      try {
        truck = await base44.asServiceRole.entities.Truck.get(driver.assigned_truck_id);
      } catch {}
    }

    return Response.json({
      driver: {
        id: driver.id,
        full_name: driver.full_name,
        phone: driver.phone,
        email: driver.email,
        pay_type: driver.pay_type,
        pay_rate: driver.pay_rate,
        status: driver.status,
      },
      truck,
      statements,
      statementLines: allLines,
      fuelTransactions,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});