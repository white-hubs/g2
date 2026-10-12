/** Export only the supplied report element, preserving the original direct PDF download interaction. */
export async function downloadPDF(element: HTMLElement, title: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const canvas = await html2canvas(element, { useCORS: true });
  if (!canvas.width || !canvas.height) throw new Error("报告内容为空，无法导出");
  const pdf = new jsPDF("p", "pt", "a4");
  const width = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const height = (width / canvas.width) * canvas.height;
  const image = canvas.toDataURL("image/jpeg", 1);
  for (let offset = 0; offset < height; offset += pageHeight) {
    if (offset > 0) pdf.addPage();
    pdf.addImage(image, "JPEG", 0, -offset, width, height);
  }
  pdf.save(`${title}.pdf`);
}
