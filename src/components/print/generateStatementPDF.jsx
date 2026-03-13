import { jsPDF } from 'jspdf';

export async function generateStatementPDF(statement, lines, driver, truck) {
  const doc = new jsPDF();
  
  // Filter and calculate line totals
  const tripLines = lines.filter(l => l.line_type === 'trip');
  const deductionLines = lines.filter(l => l.line_type === 'deduction');
  const fuelLines = lines.filter(l => l.line_type === 'fuel');
  const creditLines = lines.filter(l => l.line_type === 'credit');
  
  const tripsTotal = tripLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const deductionsTotal = deductionLines.reduce((sum, l) => sum + Math.abs(Number(l.amount) || 0), 0);
  const fuelTotal = fuelLines.reduce((sum, l) => sum + Math.abs(Number(l.amount) || 0), 0);
  const creditsTotal = creditLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  
  const ytdGross = (driver?.ytd_gross_legacy || 0) + tripsTotal;
  const netPay = tripsTotal + creditsTotal - deductionsTotal - fuelTotal;
  
  // Header
  doc.setFontSize(20);
  doc.text('Driver Settlement Statement', 20, 20);
  
  doc.setFontSize(10);
  doc.text(`Statement Date: ${statement.statement_date || '—'}`, 20, 30);
  doc.text(`Period: ${statement.period_start || '—'} to ${statement.period_end || '—'}`, 20, 36);
  
  // Driver Info
  doc.setFontSize(12);
  doc.text('Driver Information', 20, 50);
  doc.setFontSize(10);
  doc.text(`Name: ${statement.driver_name || '—'}`, 20, 58);
  doc.text(`Truck: ${statement.truck_number || '—'}`, 20, 64);
  
  let yPos = 80;
  
  // Trips Section
  if (tripLines.length > 0) {
    doc.setFontSize(12);
    doc.text('Trips', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    doc.text('Date', 20, yPos);
    doc.text('Route', 50, yPos);
    doc.text('Amount', 170, yPos);
    yPos += 6;
    
    tripLines.forEach(line => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line.date || '—', 20, yPos);
      doc.text((line.route || line.description || '—').substring(0, 40), 50, yPos);
      doc.text(`$${(Number(line.amount) || 0).toFixed(2)}`, 170, yPos);
      yPos += 6;
    });
    
    doc.setFontSize(10);
    doc.text(`Total Trips: $${tripsTotal.toFixed(2)}`, 150, yPos);
    yPos += 12;
  }
  
  // Credits Section
  if (creditLines.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(12);
    doc.text('Credits', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    creditLines.forEach(line => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line.description || '—', 20, yPos);
      doc.text(`$${(Number(line.amount) || 0).toFixed(2)}`, 170, yPos);
      yPos += 6;
    });
    
    doc.setFontSize(10);
    doc.text(`Total Credits: $${creditsTotal.toFixed(2)}`, 150, yPos);
    yPos += 12;
  }
  
  // Deductions Section
  if (deductionLines.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(12);
    doc.text('Deductions', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    deductionLines.forEach(line => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line.description || '—', 20, yPos);
      doc.text(`-$${Math.abs(Number(line.amount) || 0).toFixed(2)}`, 170, yPos);
      yPos += 6;
    });
    
    doc.setFontSize(10);
    doc.text(`Total Deductions: -$${deductionsTotal.toFixed(2)}`, 150, yPos);
    yPos += 12;
  }
  
  // Fuel Section
  if (fuelLines.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(12);
    doc.text('Fuel', 20, yPos);
    yPos += 8;
    
    doc.setFontSize(9);
    fuelLines.forEach(line => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text((line.description || '—').substring(0, 50), 20, yPos);
      doc.text(`-$${Math.abs(Number(line.amount) || 0).toFixed(2)}`, 170, yPos);
      yPos += 6;
    });
    
    doc.setFontSize(10);
    doc.text(`Total Fuel: -$${fuelTotal.toFixed(2)}`, 150, yPos);
    yPos += 12;
  }
  
  // Summary
  if (yPos > 230) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(12);
  doc.text('Summary', 20, yPos);
  yPos += 10;
  
  doc.setFontSize(10);
  doc.text(`Year-to-Date Gross: $${ytdGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, yPos);
  yPos += 8;
  doc.text(`This Week Gross: $${tripsTotal.toFixed(2)}`, 20, yPos);
  yPos += 6;
  doc.text(`Credits: $${creditsTotal.toFixed(2)}`, 20, yPos);
  yPos += 6;
  doc.text(`Deductions: -$${deductionsTotal.toFixed(2)}`, 20, yPos);
  yPos += 6;
  doc.text(`Fuel: -$${fuelTotal.toFixed(2)}`, 20, yPos);
  yPos += 10;
  
  doc.setFontSize(14);
  doc.text(`Net Pay: $${netPay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 20, yPos);
  
  // Return as blob URL
  const pdfBlob = doc.output('blob');
  return URL.createObjectURL(pdfBlob);
}