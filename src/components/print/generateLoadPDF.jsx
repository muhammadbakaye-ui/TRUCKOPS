import { jsPDF } from 'jspdf';

export async function generateLoadPDF(load, stops = []) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.text('Load Details', 20, 20);
  
  doc.setFontSize(10);
  doc.text(`Load #: ${load.internal_load_number || '—'}`, 20, 30);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 30);
  
  // Load Information
  let yPos = 45;
  doc.setFontSize(12);
  doc.text('Load Information', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.text(`Customer: ${load.customer_name || '—'}`, 20, yPos);
  yPos += 6;
  doc.text(`Load Type: ${load.load_type || '—'}`, 20, yPos);
  yPos += 6;
  doc.text(`Equipment: ${load.equipment_type || '—'}`, 20, yPos);
  yPos += 6;
  doc.text(`Commodity: ${load.commodity || '—'}`, 20, yPos);
  yPos += 6;
  doc.text(`Weight: ${load.weight ? `${load.weight} lbs` : '—'}`, 20, yPos);
  yPos += 6;
  doc.text(`Miles: ${load.billable_miles || '—'}`, 20, yPos);
  yPos += 12;
  
  // Driver & Equipment
  doc.setFontSize(12);
  doc.text('Assignment', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.text(`Driver: ${load.driver_1_name || '—'}`, 20, yPos);
  yPos += 6;
  doc.text(`Truck: ${load.truck_number || '—'}`, 20, yPos);
  yPos += 6;
  doc.text(`Trailer: ${load.trailer_number || '—'}`, 20, yPos);
  yPos += 12;
  
  // Stops
  if (stops.length > 0) {
    doc.setFontSize(12);
    doc.text('Stops', 20, yPos);
    yPos += 8;
    
    stops.forEach((stop, idx) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(10);
      doc.text(`${idx + 1}. ${stop.stop_type?.toUpperCase() || 'STOP'}`, 20, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.text(`${stop.company_name || '—'}`, 25, yPos);
      yPos += 5;
      doc.text(`${stop.city || '—'}, ${stop.state || '—'}`, 25, yPos);
      yPos += 5;
      doc.text(`Date: ${stop.appointment_date || '—'}`, 25, yPos);
      yPos += 8;
    });
  }
  
  yPos += 6;
  
  // Financial
  if (yPos > 240) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFontSize(12);
  doc.text('Financial', 20, yPos);
  yPos += 8;
  
  doc.setFontSize(10);
  doc.text(`Freight Rate: $${(load.freight_rate || 0).toFixed(2)}`, 20, yPos);
  yPos += 6;
  doc.text(`Fuel Surcharge: $${(load.fuel_surcharge || 0).toFixed(2)}`, 20, yPos);
  yPos += 6;
  doc.text(`Extra Charges: $${(load.extra_charges || 0).toFixed(2)}`, 20, yPos);
  yPos += 8;
  
  doc.setFontSize(12);
  doc.text(`Invoice Amount: $${(load.invoice_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 20, yPos);
  
  // Notes
  if (load.notes || load.special_instructions) {
    yPos += 12;
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(12);
    doc.text('Notes', 20, yPos);
    yPos += 8;
    doc.setFontSize(9);
    const notes = load.notes || load.special_instructions || '';
    const lines = doc.splitTextToSize(notes, 170);
    lines.forEach(line => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 20, yPos);
      yPos += 5;
    });
  }
  
  // Return as blob URL
  const pdfBlob = doc.output('blob');
  return URL.createObjectURL(pdfBlob);
}