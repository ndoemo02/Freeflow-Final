/**
 * Data Export Utilities
 * Eksport danych do CSV, Excel, PDF
 */

import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

async function buildExcelBuffer(data, sheetName) {
  const excelModule = await import('exceljs');
  const ExcelJS = excelModule.default || excelModule;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  const headers = Object.keys(data[0] || {});

  worksheet.columns = headers.map(header => ({
    header,
    key: header,
    width: Math.min(40, Math.max(12, header.length + 2)),
  }));
  worksheet.addRows(data.map(row => Object.fromEntries(
    headers.map(header => {
      const value = row[header];
      return [header, value && typeof value === 'object' ? JSON.stringify(value) : value ?? ''];
    })
  )));
  worksheet.getRow(1).font = { bold: true };

  return workbook.xlsx.writeBuffer();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export data to CSV
 */
export function exportToCSV(data, filename = 'export.csv') {
  if (!data || data.length === 0) {
    alert('Brak danych do eksportu');
    return;
  }

  // Convert array of objects to CSV
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    )
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to Excel
 */
export async function exportToExcel(data, filename = 'export.xlsx', sheetName = 'Data') {
  if (!data || data.length === 0) {
    alert('Brak danych do eksportu');
    return;
  }

  const excelBuffer = await buildExcelBuffer(data, sheetName);
  downloadBlob(
    new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename
  );
}

/**
 * Export dashboard to PDF
 */
export async function exportDashboardToPDF(elementId, filename = 'dashboard.pdf', title = 'FreeFlow Analytics') {
  const html2canvas = (await import('html2canvas')).default;
  const element = document.getElementById(elementId);
  
  if (!element) {
    alert('Nie znaleziono elementu do eksportu');
    return;
  }

  try {
    // Show loading
    const loadingEl = document.createElement('div');
    loadingEl.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    loadingEl.innerHTML = '<div class="text-white text-xl">Generowanie PDF...</div>';
    document.body.appendChild(loadingEl);

    // Create canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#0a0a0f'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // Add title
    pdf.setFontSize(20);
    pdf.text(title, 105, 15, { align: 'center' });
    position = 25;

    // Add image (split across pages if needed)
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - position;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
    document.body.removeChild(loadingEl);
  } catch (error) {
    console.error('PDF export error:', error);
    alert('Błąd podczas eksportu do PDF');
  }
}

/**
 * Export table data to PDF with formatting
 */
export function exportTableToPDF(data, columns, filename = 'table.pdf', title = 'Raport') {
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  // Add title
  pdf.setFontSize(18);
  pdf.text(title, 105, 15, { align: 'center' });
  
  // Add date
  pdf.setFontSize(10);
  pdf.text(`Wygenerowano: ${new Date().toLocaleString('pl-PL')}`, 105, 22, { align: 'center' });

  // Prepare table data
  const tableData = data.map(row => 
    columns.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    })
  );

  const headers = columns.map(col => col.label || col.key);

  // Add table
  autoTable(pdf, {
    head: [headers],
    body: tableData,
    startY: 30,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [102, 126, 234], // Purple
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  pdf.save(filename);
}

/**
 * Export chart as image
 */
export async function exportChartAsImage(canvasId, filename = 'chart.png') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    alert('Nie znaleziono wykresu');
    return;
  }

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Export multiple data sources as ZIP
 */
export async function exportMultipleFormats(data, options = {}) {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();

  // Add CSV
  if (options.includeCSV) {
    const csvContent = convertToCSV(data);
    zip.file('data.csv', csvContent);
  }

  // Add Excel
  if (options.includeExcel) {
    const excelBuffer = await buildExcelBuffer(data, 'Data');
    zip.file('data.xlsx', excelBuffer);
  }

  // Generate and download
  const blob = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = options.filename || 'export.zip';
  link.click();
}

function convertToCSV(data) {
  if (!data || data.length === 0) return '';
  const headers = Object.keys(data[0]);
  return [
    headers.join(','),
    ...data.map(row => headers.map(h => row[h] ?? '').join(','))
  ].join('\n');
}


