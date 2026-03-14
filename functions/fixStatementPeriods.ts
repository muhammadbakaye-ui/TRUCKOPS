import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all statements
    const statements = await base44.asServiceRole.entities.DriverStatement.list('-created_date', 500);
    
    let fixed = 0;
    let skipped = 0;
    const errors = [];

    for (const stmt of statements) {
      try {
        // Skip if missing critical data
        if (!stmt.period_end) {
          skipped++;
          continue;
        }

        const periodEnd = new Date(stmt.period_end);
        const dayOfWeek = periodEnd.getDay();
        
        // RULE: Weeks are Sunday (0) - Saturday (6), due date is following Tuesday (2)
        // If period_end is already Saturday and period_start is 6 days before, skip
        if (dayOfWeek === 6 && stmt.period_start) {
          const periodStart = new Date(stmt.period_start);
          if (periodStart.getDay() === 0) {
            const daysDiff = Math.round((periodEnd - periodStart) / (1000 * 60 * 60 * 24));
            if (daysDiff === 6) {
              skipped++;
              continue;
            }
          }
        }

        // Calculate the Sunday-Saturday week containing period_end
        // Find the Sunday at or before period_end
        let correctSunday = new Date(periodEnd);
        while (correctSunday.getDay() !== 0) {
          correctSunday.setDate(correctSunday.getDate() - 1);
        }
        
        // Saturday is 6 days after Sunday
        const correctSaturday = new Date(correctSunday);
        correctSaturday.setDate(correctSunday.getDate() + 6);
        
        // Tuesday due date is 3 days after Saturday
        const correctTuesday = new Date(correctSaturday);
        correctTuesday.setDate(correctSaturday.getDate() + 3);

        // Update the statement
        await base44.asServiceRole.entities.DriverStatement.update(stmt.id, {
          period_start: correctSunday.toISOString().split('T')[0],
          period_end: correctSaturday.toISOString().split('T')[0],
          statement_date: correctTuesday.toISOString().split('T')[0],
        });

        fixed++;
      } catch (err) {
        errors.push({ id: stmt.id, driver: stmt.driver_name, error: err.message });
      }
    }

    return Response.json({
      success: true,
      total: statements.length,
      fixed,
      skipped,
      errors,
      message: `Fixed ${fixed} statements, skipped ${skipped} (already correct or missing data)`,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});