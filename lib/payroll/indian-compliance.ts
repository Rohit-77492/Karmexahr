// lib/payroll/indian-compliance.ts
// ============================================================
// KarmexaHR — Indian Statutory Compliance Engine
// Covers: PF · ESI · Professional Tax · TDS (New Regime) · Gratuity
// FY 2024-25 rates
// ============================================================

// ─── PROVIDENT FUND (EPF) ─────────────────────────────────────

export const PF_CONFIG = {
  WAGE_CEILING: 15000,       // PF deducted on max ₹15,000 basic
  EMPLOYEE_RATE: 0.12,       // 12% employee contribution
  EMPLOYER_RATE: 0.12,       // 12% employer (8.33% to EPS, 3.67% to EPF)
  EPS_RATE: 0.0833,          // 8.33% to Employee Pension Scheme (capped)
  EPS_CEILING: 15000,
  EDLI_RATE: 0.005,          // 0.5% Employer EDLI (insurance)
  ADMIN_CHARGES: 0.005,      // 0.5% Admin charges on EPF
  VOLUNTARY_PF_MAX: 1.00,    // VPF can be up to 100% of basic
} as const

export function calculatePF(basicSalary: number, vpfPercent: number = 0): {
  employeeEPF: number
  employerEPF: number
  employerEPS: number
  employerEDLI: number
  adminCharges: number
  totalEmployerCost: number
  uanContribution: number
} {
  const pfWage = Math.min(basicSalary, PF_CONFIG.WAGE_CEILING)
  const employeeEPF = Math.round(pfWage * PF_CONFIG.EMPLOYEE_RATE)
  const vpf = Math.round(basicSalary * (vpfPercent / 100))

  const employerEPS = Math.round(Math.min(basicSalary, PF_CONFIG.EPS_CEILING) * PF_CONFIG.EPS_RATE)
  const employerEPF = Math.round(pfWage * PF_CONFIG.EMPLOYER_RATE) - employerEPS
  const employerEDLI = Math.round(pfWage * PF_CONFIG.EDLI_RATE)
  const adminCharges = Math.round(pfWage * PF_CONFIG.ADMIN_CHARGES)
  const totalEmployerCost = employerEPF + employerEPS + employerEDLI + adminCharges

  return {
    employeeEPF: employeeEPF + vpf,
    employerEPF,
    employerEPS,
    employerEDLI,
    adminCharges,
    totalEmployerCost,
    uanContribution: employeeEPF + vpf + employerEPF,
  }
}

// ─── ESI (ESIC) ───────────────────────────────────────────────

export const ESI_CONFIG = {
  WAGE_CEILING: 21000,       // ESI applicable if gross ≤ ₹21,000
  EMPLOYEE_RATE: 0.0075,     // 0.75%
  EMPLOYER_RATE: 0.0325,     // 3.25%
} as const

export function calculateESI(grossSalary: number): {
  applicable: boolean
  employeeESI: number
  employerESI: number
} {
  if (grossSalary > ESI_CONFIG.WAGE_CEILING) {
    return { applicable: false, employeeESI: 0, employerESI: 0 }
  }
  return {
    applicable: true,
    employeeESI: Math.round(grossSalary * ESI_CONFIG.EMPLOYEE_RATE),
    employerESI: Math.round(grossSalary * ESI_CONFIG.EMPLOYER_RATE),
  }
}

// ─── PROFESSIONAL TAX ─────────────────────────────────────────
// Slabs vary by state. Providing major states:

type PTSlab = { upTo: number; tax: number }

export const PT_SLABS: Record<string, PTSlab[]> = {
  // Karnataka
  KA: [
    { upTo: 15000, tax: 0 },
    { upTo: 35000, tax: 200 },
    { upTo: Infinity, tax: 200 },
  ],
  // Maharashtra
  MH: [
    { upTo: 7500, tax: 0 },
    { upTo: 10000, tax: 175 },
    { upTo: Infinity, tax: 200 },
  ],
  // Tamil Nadu
  TN: [
    { upTo: 21000, tax: 0 },
    { upTo: 30000, tax: 135 },
    { upTo: 45000, tax: 315 },
    { upTo: 60000, tax: 690 },
    { upTo: 75000, tax: 1025 },
    { upTo: Infinity, tax: 1250 },
  ],
  // West Bengal
  WB: [
    { upTo: 10000, tax: 0 },
    { upTo: 15000, tax: 110 },
    { upTo: 25000, tax: 130 },
    { upTo: 40000, tax: 150 },
    { upTo: Infinity, tax: 200 },
  ],
  // Andhra Pradesh / Telangana
  AP: [
    { upTo: 15000, tax: 0 },
    { upTo: 20000, tax: 150 },
    { upTo: Infinity, tax: 200 },
  ],
  // Default / Other states
  DEFAULT: [
    { upTo: 15000, tax: 0 },
    { upTo: 25000, tax: 150 },
    { upTo: Infinity, tax: 200 },
  ],
}

export function calculateProfessionalTax(
  grossSalary: number,
  stateCode: string = 'DEFAULT'
): number {
  const slabs = PT_SLABS[stateCode] ?? PT_SLABS.DEFAULT
  for (const slab of slabs) {
    if (grossSalary <= slab.upTo) return slab.tax
  }
  return 0
}

// ─── TDS / INCOME TAX ─────────────────────────────────────────
// New Tax Regime — FY 2024-25 (Union Budget 2024)

export const NEW_REGIME_SLABS = [
  { upTo: 300000, rate: 0 },
  { upTo: 600000, rate: 0.05 },
  { upTo: 900000, rate: 0.10 },
  { upTo: 1200000, rate: 0.15 },
  { upTo: 1500000, rate: 0.20 },
  { upTo: Infinity, rate: 0.30 },
] as const

export const OLD_REGIME_SLABS = [
  { upTo: 250000, rate: 0 },
  { upTo: 500000, rate: 0.05 },
  { upTo: 1000000, rate: 0.20 },
  { upTo: Infinity, rate: 0.30 },
] as const

export interface TDSInput {
  monthlyGross: number
  annualBonus?: number
  employeePF?: number          // Annual
  professionalTax?: number     // Annual
  hraExemption?: number        // Annual (old regime)
  section80C?: number          // Max 1.5L (old regime)
  section80D?: number          // Max 25K/50K (old regime)
  regime?: 'new' | 'old'
  age?: number
  isSeniorCitizen?: boolean
}

export interface TDSOutput {
  annualGross: number
  standardDeduction: number
  taxableIncome: number
  incomeTax: number
  surcharge: number
  cess: number
  totalAnnualTax: number
  monthlyTDS: number
  effectiveRate: number
}

export function calculateTDS(input: TDSInput): TDSOutput {
  const {
    monthlyGross,
    annualBonus = 0,
    employeePF = 0,
    professionalTax = 0,
    hraExemption = 0,
    section80C = 0,
    section80D = 0,
    regime = 'new',
    isSeniorCitizen = false,
  } = input

  const annualGross = monthlyGross * 12 + annualBonus
  const STANDARD_DEDUCTION = 75000 // Budget 2024 — enhanced for new regime

  let taxableIncome = annualGross

  if (regime === 'new') {
    taxableIncome = Math.max(0, annualGross - STANDARD_DEDUCTION - employeePF * 0.5) // NPS 80CCD(2)
  } else {
    // Old regime deductions
    const totalDeductions = STANDARD_DEDUCTION
      + Math.min(section80C, 150000)
      + Math.min(section80D, isSeniorCitizen ? 50000 : 25000)
      + hraExemption
      + professionalTax
      + employeePF
    taxableIncome = Math.max(0, annualGross - totalDeductions)
  }

  // Calculate slab tax
  const slabs = regime === 'new' ? NEW_REGIME_SLABS : OLD_REGIME_SLABS
  let incomeTax = 0
  let prevLimit = 0

  for (const slab of slabs) {
    if (taxableIncome <= prevLimit) break
    const taxableInSlab = Math.min(taxableIncome, slab.upTo) - prevLimit
    incomeTax += taxableInSlab * slab.rate
    prevLimit = slab.upTo
    if (slab.upTo === Infinity) break
  }

  // Rebate u/s 87A — tax nil if taxable income ≤ ₹7L (new regime) / ₹5L (old)
  const rebateLimit = regime === 'new' ? 700000 : 500000
  if (taxableIncome <= rebateLimit) incomeTax = 0

  // Surcharge
  let surcharge = 0
  if (annualGross > 50000000) surcharge = incomeTax * 0.37
  else if (annualGross > 20000000) surcharge = incomeTax * 0.25
  else if (annualGross > 10000000) surcharge = incomeTax * 0.15
  else if (annualGross > 5000000) surcharge = incomeTax * 0.10

  // 4% Health & Education Cess
  const cess = Math.round((incomeTax + surcharge) * 0.04)
  const totalAnnualTax = Math.round(incomeTax + surcharge + cess)
  const monthlyTDS = Math.round(totalAnnualTax / 12)

  return {
    annualGross,
    standardDeduction: STANDARD_DEDUCTION,
    taxableIncome: Math.round(taxableIncome),
    incomeTax: Math.round(incomeTax),
    surcharge: Math.round(surcharge),
    cess,
    totalAnnualTax,
    monthlyTDS,
    effectiveRate: annualGross > 0
      ? Math.round((totalAnnualTax / annualGross) * 10000) / 100
      : 0,
  }
}

// ─── GRATUITY ─────────────────────────────────────────────────
// Payment of Gratuity Act, 1972

export interface GratuityInput {
  joinDate: Date
  exitDate?: Date
  lastDrawnBasic: number   // Last month's basic + DA
}

export interface GratuityOutput {
  yearsOfService: number
  isEligible: boolean       // Min 5 years of continuous service
  gratuityAmount: number
  taxExemptLimit: number   // ₹20L from FY 2019-20
  taxableGratuity: number
}

export function calculateGratuity(input: GratuityInput): GratuityOutput {
  const { joinDate, exitDate = new Date(), lastDrawnBasic } = input

  const msPerYear = 1000 * 60 * 60 * 24 * 365.25
  const yearsOfService = Math.floor((exitDate.getTime() - joinDate.getTime()) / msPerYear)

  const isEligible = yearsOfService >= 5
  const TAX_EXEMPT_LIMIT = 2000000 // ₹20 lakhs

  // Gratuity = (15/26) × Last Basic × Completed Years
  const gratuityAmount = isEligible
    ? Math.round((15 / 26) * lastDrawnBasic * yearsOfService)
    : 0

  const taxExemptLimit = Math.min(gratuityAmount, TAX_EXEMPT_LIMIT)
  const taxableGratuity = Math.max(0, gratuityAmount - taxExemptLimit)

  return { yearsOfService, isEligible, gratuityAmount, taxExemptLimit, taxableGratuity }
}

// ─── FULL CTC BREAKDOWN ───────────────────────────────────────

export interface CTCBreakdown {
  annualCTC: number
  monthlyCTC: number
  earnings: {
    basic: number
    hra: number
    specialAllowance: number
    conveyance: number
    medicalAllowance: number
  }
  deductions: {
    employeePF: number
    employeeESI: number
    professionalTax: number
    tds: number
  }
  employerContributions: {
    employerPF: number
    employerESI: number
    edli: number
    adminCharges: number
    gratuityMonthly: number
  }
  monthlyGross: number
  monthlyNetTakeHome: number
}

export function buildCTCBreakdown(
  annualCTC: number,
  options: {
    basicPercent?: number       // % of CTC (default 40)
    hraPercent?: number         // % of CTC (default 20)
    conveyance?: number         // Fixed ₹1,600
    medical?: number            // Fixed ₹1,250
    stateCode?: string
    regime?: 'new' | 'old'
  } = {}
): CTCBreakdown {
  const {
    basicPercent = 40,
    hraPercent = 20,
    conveyance = 1600,
    medical = 1250,
    stateCode = 'DEFAULT',
    regime = 'new',
  } = options

  const monthlyCTC = Math.round(annualCTC / 12)
  const basic = Math.round(monthlyCTC * basicPercent / 100)
  const hra = Math.round(monthlyCTC * hraPercent / 100)
  const specialAllowance = Math.max(0, monthlyCTC - basic - hra - conveyance - medical)

  const monthlyGross = basic + hra + specialAllowance + conveyance + medical

  const pf = calculatePF(basic)
  const esi = calculateESI(monthlyGross)
  const pt = calculateProfessionalTax(monthlyGross, stateCode)
  const tds = calculateTDS({
    monthlyGross,
    employeePF: pf.employeeEPF * 12,
    professionalTax: pt * 12,
    regime,
  })

  // Gratuity provision (4.81% of basic per month)
  const gratuityMonthly = Math.round(basic * 0.0481)

  return {
    annualCTC,
    monthlyCTC,
    earnings: { basic, hra, specialAllowance, conveyance, medicalAllowance: medical },
    deductions: {
      employeePF: pf.employeeEPF,
      employeeESI: esi.employeeESI,
      professionalTax: pt,
      tds: tds.monthlyTDS,
    },
    employerContributions: {
      employerPF: pf.totalEmployerCost,
      employerESI: esi.employerESI,
      edli: pf.employerEDLI,
      adminCharges: pf.adminCharges,
      gratuityMonthly,
    },
    monthlyGross,
    monthlyNetTakeHome: monthlyGross - pf.employeeEPF - esi.employeeESI - pt - tds.monthlyTDS,
  }
}

// ─── FORMATTING HELPERS ───────────────────────────────────────

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatINRCompact(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount}`
}
