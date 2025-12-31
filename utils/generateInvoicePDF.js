import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export const generateInvoicePDF = async () => {
  const input = document.getElementById("quote-preview-content");
  input.classList.remove("d-none");
  await new Promise((resolve) => setTimeout(resolve, 200));

  const canvas = await html2canvas(input, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const imgProps = pdf.getImageProperties(imgData);
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  input.classList.add("d-none");

  return pdf.output("datauristring"); // or use blob if needed
};
