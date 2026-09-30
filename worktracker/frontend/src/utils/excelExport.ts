import * as XLSX from 'xlsx';
import { WorkUpdate } from '../types';

export const exportWorksToExcel = (
  works: WorkUpdate[],
  filterInfo?: { startDate?: string; endDate?: string; searchName?: string }
) => {
  if (!works || works.length === 0) {
    alert('No work entries to export.');
    return;
  }

  const rows = works.map((w) => {
    // Strip HTML tags for clean text presentation in Excel
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = w.description || '';
    const cleanDescription = tempDiv.textContent || tempDiv.innerText || '';

    return {
      'Work Entry ID': w.id,
      'Date & Time': new Date(w.createdAt).toLocaleString(),
      'Employee Name': w.userName,
      'Employee Email': w.userEmail,
      'Department': w.department,
      'Role': w.userRole.replace('_', ' ').toUpperCase(),
      'Category / Project': w.category,
      'Work Title': w.title,
      'Hours Spent': w.hoursSpent,
      'Status': w.status.toUpperCase(),
      'Reviewer Name': w.reviewerName || 'N/A',
      'Reviewer Comment': w.reviewComment || '',
      'Work Description': cleanDescription,
      'Attachments Count': w.attachments ? w.attachments.length : 0,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Auto-set column widths based on maximum length in each column
  if (rows.length > 0) {
    const headers = Object.keys(rows[0]);
    const colWidths = headers.map((key) => {
      let maxLen = key.length;
      rows.forEach((r) => {
        const val = String((r as any)[key] || '');
        if (val.length > maxLen) maxLen = Math.min(val.length, 60);
      });
      return { wch: maxLen + 4 };
    });
    worksheet['!cols'] = colWidths;
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Work Entries');

  let filename = 'Daily_Work_Entries';
  if (filterInfo?.searchName) {
    filename += `_${filterInfo.searchName.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }
  if (filterInfo?.startDate) {
    filename += `_from_${filterInfo.startDate}`;
  }
  if (filterInfo?.endDate) {
    filename += `_to_${filterInfo.endDate}`;
  }
  filename += `.xlsx`;

  XLSX.writeFile(workbook, filename);
};
