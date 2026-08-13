/**
 * Fixture generator for the parsing engine tests.
 * Generates: sample.pdf (pdf-lib, known text), sample.docx (docx pkg),
 * sample.txt (plain). Run once; commit the generated fixtures.
 *
 *   node scripts/make-fixtures.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { Document, Packer, Paragraph, TextRun } from 'docx'

const __dirname = dirname(fileURLToPath(import.meta.url))
const fixturesDir = join(__dirname, '..', 'src', 'test', 'fixtures')
mkdirSync(fixturesDir, { recursive: true })

const RESUME_TEXT = [
  'FixtureName',
  'fixture@example.com',
  'Senior Software Engineer',
  'Summary',
  'Software engineer with 8 years of experience building scalable web applications with React and TypeScript.',
  'Skills',
  'React, TypeScript, Node.js, SQL, AWS',
  'Experience',
  'Led a team of 6 engineers; improved deployment speed by 40%; reduced error rates by 25%.',
  'Education',
  'BSc Computer Science, Example University',
].join('\n')

// --- PDF fixture (text-based, standard Helvetica font) ---
const pdfDoc = await PDFDocument.create()
const page = pdfDoc.addPage([612, 792])
const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
page.drawText('FixtureName', { x: 72, y: 720, size: 20, color: rgb(0, 0, 0) })
let y = 690
for (const line of RESUME_TEXT.split('\n')) {
  if (line === 'FixtureName') continue
  page.drawText(line, { x: 72, y, size: 11, color: rgb(0.1, 0.1, 0.1) })
  y -= 18
}
writeFileSync(join(fixturesDir, 'sample.pdf'), await pdfDoc.save())

// --- DOCX fixture ---
const doc = new Document({
  sections: [
    {
      children: RESUME_TEXT.split('\n').map(
        (line) => new Paragraph({ children: [new TextRun(line)] })
      ),
    },
  ],
})
const docxBuffer = await Packer.toBuffer(doc)
writeFileSync(join(fixturesDir, 'sample.docx'), docxBuffer)

// --- TXT fixture ---
writeFileSync(join(fixturesDir, 'sample.txt'), RESUME_TEXT, 'utf8')

console.log('Fixtures written to:', fixturesDir)
console.log('Content marker: FixtureName (all three files)')
