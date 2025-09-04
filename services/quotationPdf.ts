
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Customer, Quotation } from '../types';
// FIX: Corrected import name from LOGO_BASE_64 to LOGO_BASE64.
import { LOGO_BASE64 } from '../logo';

// A type assertion is used here because the autoTable method is added by the plugin and not part of the base jsPDF type.
type jsPDFWithAutoTable = jsPDF & { autoTable: (options: any) => void; };

const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
};

export const generateQuotationPdf = (customer: Customer, quotation: Quotation) => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    // 1. Header with Logo and Company Details
    if (LOGO_BASE64 && LOGO_BASE64.startsWith('data:image')) {
        doc.addImage(LOGO_BASE64, 'PNG', margin, 10, 40, 15);
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('SRI LAKSHMI INDUSTRIES', margin + 45, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('AUTOMATIC MURUKKU MACHINE MANUFACTURER', margin + 45, 20);
    doc.text('7/126, Thirumangalam Main Road, A.Ramanathapuram, Madurai, Tamilnadu - 625 532', margin + 45, 25);
    doc.text('GSTIN: 33CCWPP0457Q1ZP | CONTACT: 7811029371', margin + 45, 30);
    
    // 2. Quotation Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('QUOTATION', pageWidth / 2, 45, { align: 'center' });

    // 3. Customer Details and Quotation Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`To:`, margin, 60);
    doc.setFont('helvetica', 'bold');
    doc.text(customer.name, margin, 65);
    doc.setFont('helvetica', 'normal');
    doc.text(customer.location, margin, 70);
    doc.text(`Phone: ${customer.phone}`, margin, 75);

    doc.text(`Quotation No:`, pageWidth - margin - 40, 60);
    doc.text(`Date:`, pageWidth - margin - 40, 65);
    
    doc.setFont('helvetica', 'bold');
    doc.text(quotation.quotationNumber, pageWidth - margin, 60, { align: 'right' });
    doc.text(new Date(quotation.date).toLocaleDateString('en-GB'), pageWidth - margin, 65, { align: 'right' });

    // 4. Line Items Table
    const tableColumn = ["S.No", "Description", "HSN", "Qty", "Amount (INR)"];
    const tableRows = quotation.lineItems.map((item, index) => [
        index + 1,
        item.description,
        item.hsn,
        item.quantity,
        item.amount.toLocaleString('en-IN')
    ]);

    const subTotal = quotation.lineItems.reduce((acc, item) => acc + item.amount, 0);
    const cgst = subTotal * 0.09;
    const sgst = subTotal * 0.09;
    
    doc.autoTable({
        startY: 85,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], fontSize: 10 },
        styles: { fontSize: 10, cellPadding: 2.5 },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { cellWidth: 'auto' },
            2: { halign: 'center', cellWidth: 20 },
            3: { halign: 'center', cellWidth: 15 },
            4: { halign: 'right', cellWidth: 30 },
        },
    });

    // 5. Totals Section
    const finalY = (doc as any).lastAutoTable.finalY;
    const totalsX = pageWidth - margin - 60;

    doc.setFontSize(10);
    doc.text('Sub-Total:', totalsX, finalY + 10);
    doc.text('CGST @ 9%:', totalsX, finalY + 17);
    doc.text('SGST @ 9%:', totalsX, finalY + 24);
    doc.setFont('helvetica', 'bold');
    doc.text('Net Amount:', totalsX, finalY + 31);
    
    const totalsValueX = pageWidth - margin;
    doc.setFont('helvetica', 'normal');
    doc.text(subTotal.toLocaleString('en-IN'), totalsValueX, finalY + 10, { align: 'right' });
    doc.text(cgst.toLocaleString('en-IN'), totalsValueX, finalY + 17, { align: 'right' });
    doc.text(sgst.toLocaleString('en-IN'), totalsValueX, finalY + 24, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(quotation.netAmount), totalsValueX, finalY + 31, { align: 'right' });

    // 6. Bank Details and T&C
    const bottomY = Math.max(finalY + 45, pageHeight - 70);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Our Bank Details', margin, bottomY);
    doc.text('Terms And Conditions', pageWidth / 2, bottomY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Bank Name: HDFC BANK`, margin, bottomY + 5);
    doc.text(`Account Name: SRI LAKSHMI INDUSTRIES`, margin, bottomY + 10);
    doc.text(`Account Number: 50200075776754`, margin, bottomY + 15);
    doc.text(`IFSC Code: HDFC0005545`, margin, bottomY + 20);

    doc.text('1. Goods once sold will not be taken back.', pageWidth / 2, bottomY + 5);
    doc.text('2. Please inform of any discrepancy within five days.', pageWidth / 2, bottomY + 10);
    
    // 7. Footer / Signature
    doc.text('For SRI LAKSHMI INDUSTRIES', pageWidth - margin, pageHeight - 25, { align: 'right' });
    doc.text('Proprietor', pageWidth - margin, pageHeight - 15, { align: 'right' });

    doc.save(`Quotation-${quotation.quotationNumber}-${customer.name}.pdf`);
};
