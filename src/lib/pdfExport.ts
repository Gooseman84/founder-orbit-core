import { jsPDF } from 'jspdf';

interface TextSegment {
  text: string;
  bold: boolean;
}

function parseInlineFormatting(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const boldRegex = /\*\*(.+?)\*\*|__(.+?)__/g;
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), bold: false });
    }
    segments.push({ text: match[1] || match[2], bold: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), bold: false });
  }

  return segments.length ? segments : [{ text, bold: false }];
}

export function exportWorkspaceDocToPdf(doc: { title: string; content: string }) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - margin * 2;

  // Title
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(doc.title, margin, 25);

  let y = 40;
  const lines = (doc.content || '').split('\n');

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Heading 1: # text
    if (trimmedLine.startsWith('# ')) {
      checkPageBreak(12);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      const headingText = trimmedLine.slice(2);
      pdf.text(headingText, margin, y);
      y += 10;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      continue;
    }

    // Heading 2: ## text
    if (trimmedLine.startsWith('## ')) {
      checkPageBreak(10);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      const headingText = trimmedLine.slice(3);
      pdf.text(headingText, margin, y);
      y += 8;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      continue;
    }

    // Heading 3: ### text
    if (trimmedLine.startsWith('### ')) {
      checkPageBreak(8);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      const headingText = trimmedLine.slice(4);
      pdf.text(headingText, margin, y);
      y += 7;
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      continue;
    }

    // Unordered list: - or *
    if (/^[-*]\s/.test(trimmedLine)) {
      checkPageBreak(6);
      const listText = trimmedLine.slice(2);
      const bulletX = margin + 4;
      pdf.text('•', margin, y);
      
      const segments = parseInlineFormatting(listText);
      let xPos = bulletX + 4;
      for (const seg of segments) {
        pdf.setFont('helvetica', seg.bold ? 'bold' : 'normal');
        const wrapped = pdf.splitTextToSize(seg.text, maxWidth - (xPos - margin));
        for (let i = 0; i < wrapped.length; i++) {
          if (i > 0) {
            y += 5;
            checkPageBreak(6);
            xPos = bulletX + 4;
          }
          pdf.text(wrapped[i], xPos, y);
          xPos += pdf.getTextWidth(wrapped[i]);
        }
      }
      y += 6;
      pdf.setFont('helvetica', 'normal');
      continue;
    }

    // Numbered list: 1. or 1)
    const numberedMatch = trimmedLine.match(/^(\d+)[.)]\s/);
    if (numberedMatch) {
      checkPageBreak(6);
      const listText = trimmedLine.slice(numberedMatch[0].length);
      const numX = margin;
      pdf.text(`${numberedMatch[1]}.`, numX, y);
      
      const segments = parseInlineFormatting(listText);
      let xPos = numX + 10;
      for (const seg of segments) {
        pdf.setFont('helvetica', seg.bold ? 'bold' : 'normal');
        const wrapped = pdf.splitTextToSize(seg.text, maxWidth - (xPos - margin));
        for (let i = 0; i < wrapped.length; i++) {
          if (i > 0) {
            y += 5;
            checkPageBreak(6);
            xPos = numX + 10;
          }
          pdf.text(wrapped[i], xPos, y);
          xPos += pdf.getTextWidth(wrapped[i]);
        }
      }
      y += 6;
      pdf.setFont('helvetica', 'normal');
      continue;
    }

    // Empty line
    if (!trimmedLine) {
      y += 4;
      continue;
    }

    // Regular paragraph with inline formatting
    checkPageBreak(6);
    const segments = parseInlineFormatting(trimmedLine);
    let xPos = margin;
    
    for (const seg of segments) {
      pdf.setFont('helvetica', seg.bold ? 'bold' : 'normal');
      const wrapped = pdf.splitTextToSize(seg.text, maxWidth - (xPos - margin));
      for (let i = 0; i < wrapped.length; i++) {
        if (i > 0) {
          y += 5;
          checkPageBreak(6);
          xPos = margin;
        }
        pdf.text(wrapped[i], xPos, y);
        xPos += pdf.getTextWidth(wrapped[i]);
      }
    }
    y += 6;
    pdf.setFont('helvetica', 'normal');
  }

  const filename = `${doc.title.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'workspace-doc'}.pdf`;
  pdf.save(filename);
}
