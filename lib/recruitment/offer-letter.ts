// lib/recruitment/offer-letter.ts
// KarmexaHR — Offer Letter PDF Generator

import jsPDF from 'jspdf'
import { formatINR, formatINRCompact, formatDate } from '@/lib/utils'

interface OfferLetterData {
  // Candidate
  candidateName:    string
  candidateAddress: string
  // Role
  designation:      string
  department:       string
  reportingTo:      string
  workLocation:     string
  joiningDate:      string
  // Compensation
  annualCTC:        number
  basic:            number
  hra:              number
  specialAllowance: number
  annualBonus?:     number
  // Company
  companyName:      string
  companyAddress:   string
  companyWebsite:   string
  hrName:           string
  hrDesignation:    string
  referenceNumber:  string
  issuedDate:       string
  validUntil:       string
}

export async function generateOfferLetter(data: OfferLetterData): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW  = doc.internal.pageSize.getWidth()
  const PH  = doc.internal.pageSize.getHeight()

  const DARK  = [17,  24, 39]  as [number, number, number]
  const GOLD  = [240, 165, 0]  as [number, number, number]
  const GRAY  = [107, 114, 128] as [number, number, number]
  const WHITE = [255, 255, 255] as [number, number, number]
  const LIGHT = [249, 250, 251] as [number, number, number]

  // ── Header ────────────────────────────────────────────────
  doc.setFillColor(...DARK)
  doc.rect(0, 0, PW, 30, 'F')

  // Gold accent bar
  doc.setFillColor(...GOLD)
  doc.rect(0, 30, PW, 2.5, 'F')

  doc.setTextColor(...WHITE)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(data.companyName, 14, 14)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 180, 180)
  doc.text(data.companyAddress, 14, 21)
  doc.text(data.companyWebsite, 14, 26)

  doc.setFontSize(8)
  doc.setTextColor(180, 180, 180)
  doc.text(`Ref: ${data.referenceNumber}`, PW - 14, 14, { align: 'right' })
  doc.text(`Date: ${formatDate(data.issuedDate, 'dd MMM yyyy')}`, PW - 14, 21, { align: 'right' })

  // ── Title ─────────────────────────────────────────────────
  let y = 42
  doc.setFillColor(...LIGHT)
  doc.roundedRect(10, y, PW - 20, 14, 2, 2, 'F')
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('OFFER OF EMPLOYMENT', PW / 2, y + 9, { align: 'center' })

  // ── Candidate address ─────────────────────────────────────
  y = 62
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)
  doc.text([
    `To,`,
    data.candidateName,
    ...data.candidateAddress.split('\n'),
    '',
    `Subject: Offer of Employment — ${data.designation}`,
  ], 14, y, { lineHeightFactor: 1.5 })

  // ── Salutation ────────────────────────────────────────────
  y = 105
  doc.setFontSize(9)
  doc.text([
    `Dear ${data.candidateName.split(' ')[0]},`,
    '',
    `We are delighted to offer you employment at ${data.companyName} in the position of`,
    `${data.designation} in our ${data.department} department. This offer is subject to`,
    `the terms and conditions mentioned below and our company policies.`,
  ], 14, y, { lineHeightFactor: 1.6 })

  // ── Terms table ────────────────────────────────────────────
  y = 135
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Terms of Employment', 14, y)

  const terms = [
    ['Designation',      data.designation],
    ['Department',       data.department],
    ['Reporting To',     data.reportingTo],
    ['Work Location',    data.workLocation],
    ['Date of Joining',  formatDate(data.joiningDate, 'dd MMMM yyyy')],
    ['Annual CTC',       formatINR(data.annualCTC)],
    ['Offer Valid Until', formatDate(data.validUntil, 'dd MMM yyyy')],
  ]

  terms.forEach(([label, value], i) => {
    const iy = y + 6 + i * 9
    doc.setFillColor(i % 2 === 0 ? 249 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 251 : 255)
    doc.rect(10, iy - 3.5, PW - 20, 9, 'F')
    doc.setDrawColor(230, 230, 230)
    doc.rect(10, iy - 3.5, PW - 20, 9, 'S')
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    doc.text(label, 15, iy + 2)
    doc.setTextColor(...DARK)
    doc.setFont('helvetica', 'bold')
    doc.text(value, 80, iy + 2)
  })

  // ── Compensation breakdown ─────────────────────────────────
  y = y + 6 + terms.length * 9 + 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Compensation Structure (Monthly)', 14, y)

  const comp = [
    ['Basic Salary',         formatINR(data.basic)],
    ['House Rent Allowance', formatINR(data.hra)],
    ['Special Allowance',    formatINR(data.specialAllowance)],
    ['Gross Monthly',        formatINR(data.basic + data.hra + data.specialAllowance)],
    ...(data.annualBonus ? [['Annual Variable Bonus', formatINRCompact(data.annualBonus) + ' (performance-linked)']] : []),
    ['Annual CTC',           formatINR(data.annualCTC)],
  ]

  comp.forEach(([label, value], i) => {
    const iy  = y + 6 + i * 8
    const isTotal = label.includes('Gross') || label.includes('CTC')
    doc.setFillColor(isTotal ? 240 : i % 2 === 0 ? 249 : 255, isTotal ? 253 : i % 2 === 0 ? 250 : 255, isTotal ? 224 : i % 2 === 0 ? 251 : 255)
    doc.rect(10, iy - 3, PW - 20, 8, 'F')
    doc.setFontSize(8)
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal')
    doc.setTextColor(...(isTotal ? GOLD : GRAY))
    doc.text(label, 15, iy + 2)
    doc.setTextColor(...(isTotal ? GOLD : DARK))
    doc.setFont('helvetica', 'bold')
    doc.text(value, PW - 15, iy + 2, { align: 'right' })
  })

  // ── Conditions ────────────────────────────────────────────
  y = y + 6 + comp.length * 8 + 8

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('Terms & Conditions', 14, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRAY)
  const conditions = [
    '1. This offer is contingent on successful completion of background verification.',
    '2. You will be on probation for 6 months from your date of joining.',
    '3. The notice period during probation is 1 month; post-confirmation, it is 2 months.',
    '4. You are required to submit original educational and identity documents on joining.',
    '5. This offer shall be treated as null and void if not accepted by the validity date.',
  ]
  doc.text(conditions, 14, y + 6, { lineHeightFactor: 1.8 })

  // ── Signature ─────────────────────────────────────────────
  const sigY = PH - 45
  doc.setFillColor(...LIGHT)
  doc.roundedRect(10, sigY, PW - 20, 30, 2, 2, 'F')

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...DARK)

  // Acceptance
  doc.text('I accept the above offer of employment.', 14, sigY + 8)
  doc.line(14, sigY + 20, 80, sigY + 20)
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  doc.text('Candidate Signature & Date', 14, sigY + 25)

  // HR signature
  doc.setFontSize(8.5)
  doc.setTextColor(...DARK)
  doc.text(`For ${data.companyName}`, PW - 14, sigY + 8, { align: 'right' })
  doc.line(PW - 80, sigY + 20, PW - 14, sigY + 20)
  doc.setFontSize(7.5)
  doc.setTextColor(...GRAY)
  doc.text(`${data.hrName} | ${data.hrDesignation}`, PW - 14, sigY + 25, { align: 'right' })

  // Footer
  doc.setFillColor(...DARK)
  doc.rect(0, PH - 10, PW, 10, 'F')
  doc.setFontSize(6.5)
  doc.setTextColor(160, 160, 160)
  doc.text(`${data.companyName} · Confidential · Generated via KarmexaHR`, PW / 2, PH - 4, { align: 'center' })

  return doc.output('blob')
}

export async function downloadOfferLetter(data: OfferLetterData, candidateName: string): Promise<void> {
  const blob = await generateOfferLetter(data)
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `OfferLetter-${candidateName.replace(/\s/g,'-')}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
