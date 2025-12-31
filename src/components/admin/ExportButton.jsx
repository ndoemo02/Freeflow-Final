import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { exportToCSV, exportToExcel, exportDashboardToPDF, exportTableToPDF } from '../../utils/exportData';

/**
 * Export Button Component
 * Dropdown z opcjami eksportu
 */
export default function ExportButton({
  data = null,
  tableData = null,
  tableColumns = null,
  dashboardElementId = null,
  filename = 'export'
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [exporting, setExporting] = useState(false);

  const exportOptions = [
    {
      label: '📄 CSV',
      action: () => handleCSVExport(),
      available: !!data
    },
    {
      label: '📊 Excel',
      action: () => handleExcelExport(),
      available: !!data
    },
    {
      label: '📑 PDF (Tabela)',
      action: () => handleTablePDFExport(),
      available: !!(tableData && tableColumns)
    },
    {
      label: '🖼️ PDF (Dashboard)',
      action: () => handleDashboardPDFExport(),
      available: !!dashboardElementId
    },
  ].filter(opt => opt.available);

  const handleCSVExport = async () => {
    if (!data || data.length === 0) {
      alert('Brak danych do eksportu');
      return;
    }
    setExporting(true);
    try {
      exportToCSV(data, `${filename}.csv`);
    } catch (error) {
      console.error('CSV export error:', error);
      alert('Błąd podczas eksportu do CSV');
    } finally {
      setExporting(false);
      setShowMenu(false);
    }
  };

  const handleExcelExport = async () => {
    if (!data || data.length === 0) {
      alert('Brak danych do eksportu');
      return;
    }
    setExporting(true);
    try {
      exportToExcel(data, `${filename}.xlsx`);
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Błąd podczas eksportu do Excel');
    } finally {
      setExporting(false);
      setShowMenu(false);
    }
  };

  const handleTablePDFExport = async () => {
    if (!tableData || !tableColumns) {
      alert('Brak danych tabeli do eksportu');
      return;
    }
    setExporting(true);
    try {
      exportTableToPDF(tableData, tableColumns, `${filename}.pdf`, 'FreeFlow Analytics Report');
    } catch (error) {
      console.error('Table PDF export error:', error);
      alert('Błąd podczas eksportu do PDF');
    } finally {
      setExporting(false);
      setShowMenu(false);
    }
  };

  const handleDashboardPDFExport = async () => {
    if (!dashboardElementId) {
      alert('Brak elementu dashboardu do eksportu');
      return;
    }
    setExporting(true);
    try {
      await exportDashboardToPDF(dashboardElementId, `${filename}.pdf`, 'FreeFlow Analytics Dashboard');
    } catch (error) {
      console.error('Dashboard PDF export error:', error);
      alert('Błąd podczas eksportu dashboardu do PDF');
    } finally {
      setExporting(false);
      setShowMenu(false);
    }
  };

  if (exportOptions.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={exporting}
        className="px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-lg flex items-center gap-2 transition-all disabled:opacity-50"
      >
        {exporting ? (
          <>
            <span className="animate-spin">⏳</span>
            <span>Eksportowanie...</span>
          </>
        ) : (
          <>
            <span>📥 Eksport</span>
            <span className={`transform transition-transform ${showMenu ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </>
        )}
      </button>

      <AnimatePresence>
        {showMenu && !exporting && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full right-0 mt-2 z-50 w-56 bg-gray-900/95 backdrop-blur-xl border border-purple-500/30 rounded-xl p-2 shadow-2xl"
          >
            {exportOptions.map((option, index) => (
              <button
                key={index}
                onClick={option.action}
                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-white/10 rounded-lg transition-all"
              >
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


