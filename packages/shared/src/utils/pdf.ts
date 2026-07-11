/**
 * Minimal, dependency-free single-page PDF generator.
 * Used for mock report downloads across microfrontends; swap for a
 * real report service in production.
 */

export interface PdfLine {
  text: string;
  size?: number;
  gap?: number;
}

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function buildPdf(lines: PdfLine[]): Blob {
  let y = 790;
  const ops = lines
    .map((line) => {
      const size = line.size ?? 11;
      y -= line.gap ?? size + 8;
      return `BT /F1 ${size} Tf 56 ${y} Td (${escapePdfText(line.text)}) Tj ET`;
    })
    .join('\n');

  const encoder = new TextEncoder();
  const contentBytes = encoder.encode(ops);

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${contentBytes.length} >>\nstream\n${ops}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(encoder.encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([encoder.encode(pdf)], { type: 'application/pdf' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadPdf(lines: PdfLine[], filename: string): void {
  downloadBlob(buildPdf(lines), filename);
}
