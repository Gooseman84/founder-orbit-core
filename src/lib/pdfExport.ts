import { jsPDF } from 'jspdf';

export function exportWorkspaceDocToPdf(doc: { title: string; content: string }) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  // Title
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text(doc.title, margin, 25);

  // Content
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  
  const lines = pdf.splitTextToSize(doc.content || '', maxWidth);
  let y = 40;
  const lineHeight = 6;
  const pageHeight = pdf.internal.pageSize.getHeight();

  for (const line of lines) {
    if (y + lineHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(line, margin, y);
    y += lineHeight;
  }

  const filename = `${doc.title.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'workspace-doc'}.pdf`;
  pdf.save(filename);
}
