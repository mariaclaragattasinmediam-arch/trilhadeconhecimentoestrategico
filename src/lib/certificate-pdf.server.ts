import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import qrcode from "qrcode-generator";

/** Paleta institucional InMediam (mesma da plataforma). */
const PETROL = rgb(0.08, 0.28, 0.42);
const AMBER = rgb(0.88, 0.63, 0.24);
const INK = rgb(0.13, 0.16, 0.2);
const MUTED = rgb(0.42, 0.46, 0.52);

export interface CertificateData {
  code: string;
  studentName: string;
  courseName: string;
  workloadFormatted: string;
  finalScore: number;
  completionDate: string; // YYYY-MM-DD
  verifyUrl: string;
}

function formatDateBr(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color = INK,
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (page.getWidth() - width) / 2, y, size, font, color });
}

function drawQr(page: PDFPage, url: string, x: number, y: number, size: number) {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  const count = qr.getModuleCount();
  const cell = size / count;
  page.drawRectangle({ x, y, width: size, height: size, color: rgb(1, 1, 1) });
  for (let r = 0; r < count; r += 1) {
    for (let c = 0; c < count; c += 1) {
      if (!qr.isDark(r, c)) continue;
      page.drawRectangle({
        x: x + c * cell,
        y: y + size - (r + 1) * cell,
        width: cell,
        height: cell,
        color: INK,
      });
    }
  }
}

/** Certificado A4 paisagem, pronto para download, impressão e envio digital. */
export async function buildCertificatePdf(data: CertificateData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Certificado ${data.code}`);
  pdf.setAuthor("InMediam");
  pdf.setSubject(data.courseName);

  const page = pdf.addPage([841.89, 595.28]); // A4 landscape
  const W = page.getWidth();
  const H = page.getHeight();

  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  // Moldura institucional
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 0, y: H - 14, width: W, height: 14, color: PETROL });
  page.drawRectangle({ x: 0, y: 0, width: W, height: 6, color: AMBER });
  page.drawRectangle({
    x: 26,
    y: 26,
    width: W - 52,
    height: H - 52,
    borderColor: PETROL,
    borderWidth: 1.2,
  });

  // Marca institucional (wordmark textual — sem logo fictícia)
  page.drawText("InMediam", { x: 58, y: H - 76, size: 22, font: bold, color: PETROL });
  page.drawText("Educação corporativa", { x: 58, y: H - 92, size: 9, font: regular, color: MUTED });

  drawCentered(page, "CERTIFICADO DE CONCLUSÃO", H - 150, bold, 26, PETROL);
  page.drawRectangle({ x: W / 2 - 40, y: H - 162, width: 80, height: 3, color: AMBER });

  drawCentered(page, "Certificamos que", H - 200, regular, 13, MUTED);
  drawCentered(page, data.studentName.toUpperCase(), H - 240, bold, 28, INK);
  drawCentered(page, "concluiu com êxito a", H - 272, regular, 13, MUTED);
  drawCentered(page, data.courseName.toUpperCase(), H - 302, bold, 17, PETROL);

  const texto =
    "promovida pela InMediam, cumprindo os requisitos de conclusão e avaliação estabelecidos para a formação.";
  drawCentered(page, texto, H - 330, italic, 11, MUTED);

  drawCentered(
    page,
    `Carga horária: ${data.workloadFormatted}    •    Nota final: ${Math.round(data.finalScore)}%    •    Data de conclusão: ${formatDateBr(data.completionDate)}`,
    H - 366,
    regular,
    12,
    INK,
  );

  // Assinatura institucional
  page.drawLine({
    start: { x: 96, y: 130 },
    end: { x: 336, y: 130 },
    thickness: 1,
    color: MUTED,
  });
  page.drawText("InMediam", { x: 96, y: 112, size: 12, font: bold, color: INK });
  page.drawText("Responsável pela Formação", { x: 96, y: 98, size: 9, font: regular, color: MUTED });

  // QR Code + código
  drawQr(page, data.verifyUrl, W - 176, 96, 96);
  page.drawText("Validar autenticidade", {
    x: W - 176,
    y: 82,
    size: 8,
    font: regular,
    color: MUTED,
  });
  page.drawText(`Código: ${data.code}`, {
    x: W - 176,
    y: 70,
    size: 9,
    font: bold,
    color: INK,
  });

  page.drawText(data.verifyUrl, { x: 58, y: 56, size: 7.5, font: regular, color: MUTED });

  return pdf.save();
}
