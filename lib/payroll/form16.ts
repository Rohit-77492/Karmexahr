// lib/payroll/form16.ts
// KarmexaHR — Form 16 (TDS Certificate) generator
// Part A: TDS details | Part B: Salary details
// For Indian Income Tax purposes — FY 2024-25

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatINR } from '@/lib/utils'

interface Form16Data {
  // Employee
  employeeName:       string
  employeeCode:       string
  employeePAN:        string
  employeeAddress:    string
  designation:        string
  // Company (Deductor)
  companyName:        string
  companyAddress:     string
  companyTAN:         string   // Tax Deduction Account Number
  companyPAN:         string
  // Financials
  financialYear:      string   // e.g. "2024-25"
  assessmentYear:     string   // e.g. "2025-26"
  grossSalary:        number
  standardDeduction:  number
  profTax:            number
  pfContribution:     number
  taxableIncome:      number
  incomeTax:          number
  surcharge:          number
  cess:               number
  totalTaxPayable:    number
  tdsDeducted:        number
  // Monthly breakdown
  monthlyData: {
    month:        string
    grossSalary:  number
    tds:          number
  }[]
}

export async function generateForm16PDF(data: Form16Data): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW  = doc.internal.pageSize.getWidth()
  const PH  = doc.internal.pageSize.getHeight()

  const DARK  = [17, 24, 39] as [number, number, number]
  const GOLD  = [240, 165, 0] as [number, number, number]
  const GRAY  = [107, 114, 128] as [number, number, number]
  const WHITE = [255, 255, 255] as [number, number, number]
  const LIGHT = [249, 250, 251] as [number, number, number]

  // ── PART A ──────────────────────────────────────────────────

  // Header
  doc.setFillColor(...DARK)
  doc.rect(0, 0, PW, 22, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('FORM 16 — CERTIFICATE OF TAX DEDUCTION AT SOURCE', PW / 2, 10, { align: 'center' })
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 200, 200)
  doc.text(`[As per Section 203 of the Income Tax Act, 1961]`, PW / 2, 17, { align: 'center' })

  // Watermark-style FY badge
  doc.setFillColor(...GOLD)
  doc.roundedRect(PW - 50, 24, 40, 12, 3, 3, 'F')
  doc.setTextColor(...DARK)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`FY ${data.financialYear}`, PW - 30, 31.5, { align: 'center' })

  // Part A header
  let y = 26
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('PART A — DETAILS OF TAX DEDUCTED AT SOURCE', 10, y + 6)

  doc.setFillColor(...LIGHT)
  doc.rect(10, y + 8, PW - 20, 60, 'F')
  doc.setDrawColor(220, 220, 220)
  doc.rect(10, y + 8, PW - 20, 60, 'S')

  const infoY = y + 14
  const col1: [string, string][] = [
    ['Name of Deductor (Employer)', data.companyName],
    ['TAN of Deductor',            data.companyTAN],
    ['PAN of Deductor',            data.companyPAN],
    ['Address',                    data.companyAddress],
  ]
  const col2: [string, string][] = [
    ['Name of Employee',     data.employeeName],
    ['PAN of Employee',      data.employeePAN],
    ['Employee Code',        data.employeeCode],
    ['Designation',          data.designation],
    ['Assessment Year',      data.assessmentYear],
  ]

  col1.forEach(([label, value], i) => {
    doc.setFontSize(7); doc.setTextColor(...GRAY); doc.setFont('helvetica', 'normal')
    doc.text(label, 14, infoY + i * 8)
    doc.setTextColor(...DARK); doc.setFont('helvetica', 'bold')
    doc.text(value, 14, infoY + i * 8 + 4)
  })

  col2.forEach(([label, value], i) => {
    doc.setFontSize(7); doc.setTextColor(...GRAY); doc.setFont('helvetica', 'normal')
    doc.text(label, PW / 2 + 5, infoY + i * 8)
    doc.setTextColor(...DARK); doc.setFont('helvetica', 'bold')
    doc.text(value, PW / 2 + 5, infoY + i * 8 + 4)
  })

  // Monthly TDS table
  y = y + 75
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DARK)
  doc.text('MONTHLY TDS DETAILS', 10, y)

  autoTable(doc, {
    startY: y + 3,
    margin: { left: 10, right: 10 },
    head: [['Month', 'Gross Salary (₹)', 'TDS Deducted (₹)']],
    body: data.monthlyData.map(m => [m.month, formatINR(m.grossSalary), formatINR(m.tds)]),
    foot: [['TOTAL', formatINR(data.monthlyData.reduce((s, m) => s + m.grossSalary, 0)), formatINR(data.tdsDeducted)]],
    headStyles:   { fillColor: DARK, textColor: 255, fontSize: 8, fontStyle: 'bold' },
    footStyles:   { fillColor: [220, 252, 231], textColor: DARK, fontSize: 8, fontStyle: 'bold' },
    bodyStyles:   { fontSize: 7.5, textColor: DARK },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
  })

  // ── PART B ──────────────────────────────────────────────────

  doc.addPage()

  // Part B Header
  doc.setFillColor(...DARK)
  doc.rect(0, 0, PW, 16, 'F')
  doc.setTextColor(...WHITE)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('PART B — DETAILS OF SALARY PAID', PW / 2, 10, { align: 'center' })

  y = 22

  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    head: [['Description', 'Amount (₹)']],
    body: [
      ['1. Gross Salary', formatINR(data.grossSalary)],
      ['2. Less: Standard Deduction u/s 16(ia)', `(${formatINR(data.standardDeduction)})`],
      ['3. Less: Professional Tax u/s 16(iii)', `(${formatINR(data.profTax)})`],
      ['4. Less: PF Contribution u/s 80C', `(${formatINR(data.pfContribution)})`],
      ['5. Net Taxable Salary', formatINR(data.taxableIncome)],
    ],
    foot: [['6. TAXABLE INCOME', formatINR(data.taxableIncome)]],
    headStyles:   { fillColor: [37, 99, 235], textColor: 255, fontSize: 8 },
    footStyles:   { fillColor: GOLD, textColor: DARK, fontStyle: 'bold', fontSize: 9 },
    bodyStyles:   { fontSize: 8, textColor: DARK },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  })

  y = (doc as any).lastAutoTable.finalY + 6

  // Tax computation
  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    head: [['Tax Computation (New Regime FY 2024-25)', 'Amount (₹)']],
    body: [
      ['Income Tax on Taxable Income', formatINR(data.incomeTax)],
      ['Add: Surcharge (if applicable)', formatINR(data.surcharge)],
      ['Add: Health & Education Cess @4%', formatINR(data.cess)],
      ['Total Tax Payable', formatINR(data.totalTaxPayable)],
      ['Less: TDS Already Deducted', `(${formatINR(data.tdsDeducted)})`],
    ],
    foot: [['Tax Balance / Refund', formatINR(data.totalTaxPayable - data.tdsDeducted)]],
    headStyles:   { fillColor: [5, 150, 105], textColor: 255, fontSize: 8 },
    footStyles:   { fillColor: [220, 252, 231], textColor: DARK, fontStyle: 'bold' },
    bodyStyles:   { fontSize: 8, textColor: DARK },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
  })

  // Certification
  y = (doc as any).lastAutoTable.finalY + 10
  doc.setFillColor(...LIGHT)
  doc.roundedRect(10, y, PW - 20, 30, 2, 2, 'F')
  doc.setDrawColor(200, 200, 200)
  doc.roundedRect(10, y, PW - 20, 30, 2, 2, 'S')

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text([
    `Certified that the information given above is true and correct to the best of my knowledge and belief.`,
    `This certificate is issued in respect of ${data.employeeName} (PAN: ${data.employeePAN}) for Financial Year ${data.financialYear}.`,
    ``,
    `TDS deposited with government: ${formatINR(data.tdsDeducted)} | Challan / Reference as per books of ${data.companyName}`,
  ], 14, y + 8, { lineHeightFactor: 1.6 })

  // Signature area
  doc.setFontSize(7)
  doc.text('Authorised Signatory', PW - 50, y + 26)
  doc.line(PW - 60, y + 24, PW - 12, y + 24)

  // Footer
  const footY = PH - 14
  doc.setDrawColor(220, 220, 220)
  doc.line(10, footY, PW - 10, footY)
  doc.setFontSize(6.5)
  doc.setTextColor(...GRAY)
  doc.text(`Generated by KarmexaHR · This is a computer-generated certificate · ${data.companyName} · TAN: ${data.companyTAN}`, PW / 2, footY + 5, { align: 'center' })
  doc.text(`For queries: contact HR or email support@karmexahr.com`, PW / 2, footY + 10, { align: 'center' })

  return doc.output('blob')
}

export async function downloadForm16(data: Form16Data, employeeCode: string): Promise<void> {
  const blob = await generateForm16PDF(data)
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `Form16-${employeeCode}-FY${data.financialYear}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
