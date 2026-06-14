
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { QDCBoard } from '@/features/builder/types';

export const exportQDCToPDF = (board: QDCBoard) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('Relatório Técnico: QDC Master Pro', 14, 22);
  
  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Projeto: ${board.name}`, 14, 32);
  doc.text(`Data: ${new Date(board.createdAt).toLocaleDateString('pt-BR')}`, 14, 38);

  // Summary Table
  const tableData = board.components.map((comp, index) => [
    index + 1,
    comp.label,
    comp.brand,
    comp.type.replace('_', ' ').toUpperCase(),
    `${comp.current}A`,
    `${comp.width} mod`
  ]);

  (doc as any).autoTable({
    startY: 50,
    head: [['#', 'Circuito / Descrição', 'Marca', 'Tipo', 'Amperagem', 'Espaço']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillStyle: [59, 130, 246] }, // blue-600
  });

  // Totals
  const finalY = (doc as any).lastAutoTable.finalY || 50;
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('Resumo de Carga:', 14, finalY + 15);
  
  const totalAmps = board.components.reduce((acc, c) => acc + c.current, 0);
  const totalModules = board.components.reduce((acc, c) => acc + c.width, 0);
  
  doc.setFontSize(11);
  doc.text(`Carga Total: ${totalAmps}A`, 14, finalY + 22);
  doc.text(`Ocupação do Quadro: ${totalModules} / ${board.maxModules} módulos`, 14, finalY + 28);

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text('Gerado por QDC Master Pro - O padrão ouro em instalações elétricas', 14, 285);
  }

  doc.save(`${board.name.replace(/\s+/g, '_')}_QDC.pdf`);
};
