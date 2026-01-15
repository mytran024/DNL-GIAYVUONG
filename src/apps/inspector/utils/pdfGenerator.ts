import html2pdf from 'html2pdf.js';

interface PdfOptions {
    margin?: number | [number, number, number, number];
    filename?: string;
    image?: { type: 'jpeg' | 'png' | 'webp'; quality: number };
    html2canvas?: any;
    jsPDF?: any; // This already allows for 'orientation' due to 'any' type
    pagebreak?: { mode: string[] };
}

export const generatePdf = async (element: HTMLElement, filename: string, orientation: 'portrait' | 'landscape' = 'portrait') => {
    const options: PdfOptions = {
        margin: [5, 0, 5, 0], // Top, Right, Bottom, Left (mm) - adjusted for minimal margins
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2, // Higher scale for better quality
            useCORS: true,
            logging: false,
            scrollY: 0
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: orientation
        },
        pagebreak: { mode: ['css', 'legacy'] }
    };

    // Cast options to any to satisfy html2pdf's potentially loose or matching type definition
    return html2pdf().set(options as any).from(element).save();
};

export const printPdfFile = async (element: HTMLElement, filename: string) => {
    const options: PdfOptions = {
        margin: [0, 0, 0, 0],
        filename: filename,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            letterRendering: true,
            scrollY: 0
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
            compress: true
        }
    };

    const pdf = html2pdf().set(options as any).from(element);

    const blob = await pdf.output('blob');
    const blobUrl = URL.createObjectURL(blob);

    const printWindow = window.open(blobUrl, '_blank');
    if (printWindow) {
        // User can print from the opened PDF view
    }
};
