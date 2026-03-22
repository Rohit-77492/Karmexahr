// lib/payroll/payslip-pdf.ts
// KarmexaHR — Payslip PDF Generator
// Uses jsPDF + jsPDF-AutoTable — runs in browser

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Payslip, Employee, Company } from '@/lib/supabase/database.types'
import { formatINR, formatINRCompact, maskAccountNumber } from '@/lib/utils'

const MONTHS = ['January','February','March','April','May','June',
  'July','August','September','October','November','December']

interface PayslipPDFData {
  payslip:  Payslip
  employee: Employee & {
    departments?: { name: string }
    designations?: { name: string }
    salary_structures?: { name: string }
  }
  company: Company
}

export async function generatePayslipPDF(data: PayslipPDFData): Promise<Blob> {
  const { payslip, employee, company } = data
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const PW = doc.internal.pageSize.getWidth()
  const PH = doc.internal.pageSize.getHeight()

  // ── Colors ──────────────────────────────────────────────────
  const GOLD   = [240, 165, 0]   as [number, number, number]
  const DARK   = [17,  24,  39]  as [number, number, number]
  const GRAY   = [107, 114, 128] as [number, number, number]
  const LIGHT  = [249, 250, 251] as [number, number, number]
  const GREEN  = [34,  197, 94]  as [number, number, number]
  const RED    = [239, 68,  68]  as [number, number, number]
  const WHITE  = [255, 255, 255] as [number, number, number]

  // ── Header bar ──────────────────────────────────────────────
  doc.setFillColor(...DARK)
  doc.rect(0, 0, PW, 28, 'F')

  // Company logo placeholder (circle with initials)
  const compInitials = company.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  doc.setFillColor(...GOLD)
  doc.roundedRect(10, 6, 16, 16, 3, 3, 'F')
  doc.setTextColor(...DARK)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text(compInitials, 18, 16.5, { align: 'center' })

  doc.setTextColor(...WHITE)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(company.name, 30, 12)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 200, 200)
  doc.text('PAYSLIP', 30, 18)
  if (company.gst_number) doc.text(`GST: ${company.gst_number}`, 30, 23)

  // Payslip month on right
  doc.setTextColor(...WHITE)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text(`${MONTHS[payslip.month - 1]} ${payslip.year}`, PW - 12, 14, { align: 'right' })
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 200, 200)
  doc.text('SALARY PAYSLIP', PW - 12, 20, { align: 'right' })

  // ── Employee info section ────────────────────────────────────
  let y = 35
  doc.setFillColor(...LIGHT)
  doc.roundedRect(10, y, PW - 20, 34, 2, 2, 'F')
  doc.setDrawColor(220, 220, 220)
  doc.roundedRect(10, y, PW - 20, 34, 2, 2, 'S')

  const infoLeft: [string, string][] = [
    ['Employee Name',    `${employee.first_name} ${employee.last_name}`],
    ['Employee ID',      employee.employee_code],
    ['Department',       (employee.departments as any)?.name ?? '—'],
    ['Designation',      (employee.designations as any)?.name ?? '—'],
  ]
  const infoRight: [string, string][] = [
    ['PAN Number',       employee.pan_number ?? '—'],
    ['UAN (PF)',          employee.uan_number ?? '—'],
    ['Bank Account',     employee.bank_account_number ? maskAccountNumber(employee.bank_account_number) : '—'],
    ['Days Worked',      `${payslip.present_days} / ${payslip.working_days}`],
  ]

  infoLeft.forEach(([label, val], i) => {
    const iy = y + 5 + i * 7
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.setFont('helvetica', 'normal')
    doc.text(label, 15, iy)
    doc.setTextColor(...DARK)
    doc.setFont('helvetica', 'bold')
    doc.text(val, 55, iy)
  })

  infoRight.forEach(([label, val], i) => {
    const iy = y + 5 + i * 7
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.setFont('helvetica', 'normal')
    doc.text(label, PW / 2 + 5, iy)
    doc.setTextColor(...DARK)
    doc.setFont('helvetica', 'bold')
    doc.text(val, PW / 2 + 40, iy)
  })

  // ── Earnings & Deductions tables ─────────────────────────────
  y += 40

  const earningsRows: [string, string, string][] = [
    ['Basic Salary',       'Monthly', formatINR(payslip.basic)],
    ['House Rent Allowance (HRA)', 'Monthly', formatINR(payslip.hra)],
    ['Special Allowance',  'Monthly', formatINR(payslip.special_allowance)],
    ['Conveyance',         'Monthly', formatINR(payslip.conveyance)],
    ['Medical Allowance',  'Monthly', formatINR(payslip.medical_allowance)],
    ...(payslip.other_earnings as any[] ?? []).map((e: any) => [e.name, 'Monthly', formatINR(e.amount)] as [string,string,string]),
  ].filter(([, , v]) => parseFloat(v.replace(/[₹,]/g, '')) > 0)

  const deductionRows: [string, string, string][] = [
    ['Provident Fund (Employee 12%)',   'Statutory', formatINR(payslip.pf_employee)],
    ['ESI (Employee 0.75%)',            'Statutory', formatINR(payslip.esi_employee)],
    ['Professional Tax',                'Statutory', formatINR(payslip.professional_tax)],
    ['Income Tax (TDS)',                'Statutory', formatINR(payslip.income_tax_tds)],
    ['Loan Deduction',                  'Recovery',  formatINR(payslip.loan_deduction)],
    ...(payslip.other_deductions as any[] ?? []).map((d: any) => [d.name, 'Other', formatINR(d.amount)] as [string,string,string]),
  ].filter(([, , v]) => parseFloat(v.replace(/[₹,]/g, '')) > 0)

  // Side-by-side tables
  const tableWidth = (PW - 30) / 2

  // Earnings
  autoTable(doc, {
    startY: y,
    margin: { left: 10 },
    tableWidth,
    head: [['Earnings', 'Type', 'Amount']],
    body: earningsRows,
    foot: [['Gross Earnings', '', formatINR(payslip.gross_earnings)]],
    headStyles: { fillColor: [34, 197, 94], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    footStyles: { fillColor: [220, 252, 231], textColor: DARK, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7, textColor: DARK },
    alternateRowStyles: { fillColor: [249, 255, 252] },
    columnStyles: { 2: { halign: 'right' } },
  })

  // Deductions
  autoTable(doc, {
    startY: y,
    margin: { left: PW / 2 + 5 },
    tableWidth,
    head: [['Deductions', 'Type', 'Amount']],
    body: deductionRows,
    foot: [['Total Deductions', '', formatINR(payslip.total_deductions)]],
    headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold', fontSize: 7 },
    footStyles: { fillColor: [254, 226, 226], textColor: DARK, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 7, textColor: DARK },
    alternateRowStyles: { fillColor: [255, 249, 249] },
    columnStyles: { 2: { halign: 'right' } },
  })

  // ── Net Pay banner ───────────────────────────────────────────
  const netY = (doc as any).lastAutoTable.finalY + 6
  doc.setFillColor(...GOLD)
  doc.roundedRect(10, netY, PW - 20, 18, 2, 2, 'F')

  doc.setTextColor(...DARK)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('NET PAY (Take-Home)', 18, netY + 7)

  doc.setFontSize(16)
  doc.text(formatINR(payslip.net_pay), PW - 15, netY + 11, { align: 'right' })

  // LOP note if applicable
  if (payslip.lop_days > 0) {
    doc.setFontSize(7)
    doc.setTextColor(...RED)
    doc.text(`⚠ LOP deduction: ${payslip.lop_days} day(s) of loss of pay applied`, 18, netY + 13)
  }

  // ── Employer contributions ───────────────────────────────────
  const empY = netY + 24
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...GRAY)
  doc.text('EMPLOYER CONTRIBUTIONS (not deducted from salary)', 10, empY)

  autoTable(doc, {
    startY: empY + 3,
    margin: { left: 10, right: 10 },
    head: [['Component', 'Employer Share']],
    body: [
      ['Provident Fund (Employer 12%)',  formatINR(payslip.pf_employer)],
      ['ESI (Employer 3.25%)',           formatINR(payslip.esi_employer)],
      ['EDLI (0.5%) + Admin (0.5%)',     formatINR(Math.round((payslip.pf_employee || 0) * 0.08))],
    ],
    headStyles: { fillColor: GRAY, textColor: 255, fontSize: 7 },
    bodyStyles: { fontSize: 7, textColor: DARK },
    tableWidth: (PW - 20) / 2,
  })

  // ── YTD summary ─────────────────────────────────────────────
  const ytdY = (doc as any).lastAutoTable.finalY + 4
  autoTable(doc, {
    startY: ytdY,
    margin: { left: PW / 2 },
    tableWidth: (PW - 20) / 2,
    head: [['Year-To-Date Summary', '']],
    body: [
      ['YTD Gross',          formatINR(payslip.ytd_gross)],
      ['YTD TDS Deducted',   formatINR(payslip.ytd_tds)],
    ],
    headStyles: { fillColor: DARK, textColor: 255, fontSize: 7 },
    bodyStyles: { fontSize: 7, textColor: DARK },
    columnStyles: { 1: { halign: 'right' } },
  })

  // ── Footer ───────────────────────────────────────────────────
  const footY = PH - 18
  doc.setDrawColor(220, 220, 220)
  doc.line(10, footY, PW - 10, footY)

  doc.setFontSize(6.5)
  doc.setTextColor(...GRAY)
  doc.setFont('helvetica', 'normal')
  doc.text('This is a computer-generated payslip and does not require a signature.', PW / 2, footY + 5, { align: 'center' })
  doc.text(`Generated on ${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })} · KarmexaHR Enterprise HRMS · ${company.website ?? 'karmexahr.com'}`, PW / 2, footY + 10, { align: 'center' })
  doc.text(`${company.name} · PAN: ${company.pan_number ?? '—'} · GST: ${company.gst_number ?? '—'}`, PW / 2, footY + 15, { align: 'center' })

  return doc.output('blob')
}

// Download directly
export async function downloadPayslip(data: PayslipPDFData): Promise<void> {
  const blob = await generatePayslipPDF(data)
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `Payslip-${data.employee.employee_code}-${MONTHS[data.payslip.month - 1]}-${data.payslip.year}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
