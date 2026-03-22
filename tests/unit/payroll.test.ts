import { describe, it, expect } from 'vitest'
import {
  calculatePF, calculateESI, calculateProfessionalTax,
  calculateTDS, calculateGratuity, buildCTCBreakdown,
} from '@/lib/payroll/indian-compliance'

describe('Provident Fund (PF)', () => {
  it('calculates employee PF at 12% of basic', () => {
    const { employeeEPF } = calculatePF(20000)
    expect(employeeEPF).toBe(2400) // 12% of 20000
  })

  it('caps PF on ₹15,000 ceiling', () => {
    const { employeeEPF } = calculatePF(50000)
    expect(employeeEPF).toBe(1800) // 12% of 15000 ceiling
  })

  it('calculates employer contribution correctly', () => {
    const { employerEPF, employerEPS, totalEmployerCost } = calculatePF(15000)
    expect(employerEPS).toBe(1250)   // 8.33% of 15000
    expect(employerEPF).toBeGreaterThan(0)
    expect(totalEmployerCost).toBeGreaterThan(0)
  })

  it('handles basic below ceiling', () => {
    const { employeeEPF } = calculatePF(10000)
    expect(employeeEPF).toBe(1200) // 12% of 10000
  })
})

describe('ESI', () => {
  it('applies ESI for gross ≤ ₹21,000', () => {
    const { applicable, employeeESI, employerESI } = calculateESI(20000)
    expect(applicable).toBe(true)
    expect(employeeESI).toBe(150)  // 0.75% of 20000
    expect(employerESI).toBe(650)  // 3.25% of 20000
  })

  it('does not apply ESI for gross > ₹21,000', () => {
    const { applicable, employeeESI } = calculateESI(21001)
    expect(applicable).toBe(false)
    expect(employeeESI).toBe(0)
  })

  it('applies ESI exactly at ceiling', () => {
    const { applicable } = calculateESI(21000)
    expect(applicable).toBe(true)
  })
})

describe('Professional Tax', () => {
  it('returns 0 for Karnataka below ₹15,000', () => {
    expect(calculateProfessionalTax(14999, 'KA')).toBe(0)
  })

  it('returns ₹200 for Karnataka above ₹35,000', () => {
    expect(calculateProfessionalTax(40000, 'KA')).toBe(200)
  })

  it('applies Maharashtra slabs correctly', () => {
    expect(calculateProfessionalTax(5000,  'MH')).toBe(0)
    expect(calculateProfessionalTax(8000,  'MH')).toBe(175)
    expect(calculateProfessionalTax(12000, 'MH')).toBe(200)
  })

  it('uses DEFAULT slab for unknown state', () => {
    expect(calculateProfessionalTax(20000, 'XX')).toBe(150)
  })
})

describe('TDS / Income Tax', () => {
  it('has zero tax for income under rebate limit (new regime)', () => {
    const { monthlyTDS } = calculateTDS({ monthlyGross: 50000, regime: 'new' })
    // Annual 6L — below ₹7L rebate limit
    expect(monthlyTDS).toBe(0)
  })

  it('calculates tax for high earner', () => {
    const { monthlyTDS, totalAnnualTax } = calculateTDS({ monthlyGross: 250000, regime: 'new' })
    expect(totalAnnualTax).toBeGreaterThan(0)
    expect(monthlyTDS).toBeGreaterThan(0)
  })

  it('applies standard deduction', () => {
    const { standardDeduction } = calculateTDS({ monthlyGross: 100000 })
    expect(standardDeduction).toBe(75000)
  })

  it('new regime gives lower tax for 15L income than old', () => {
    const newTax = calculateTDS({ monthlyGross: 125000, regime: 'new' }).totalAnnualTax
    const oldTax = calculateTDS({ monthlyGross: 125000, regime: 'old' }).totalAnnualTax
    // New regime generally better for standard earners
    expect(newTax).toBeLessThanOrEqual(oldTax)
  })

  it('adds 4% cess', () => {
    const { incomeTax, cess } = calculateTDS({ monthlyGross: 150000, regime: 'new' })
    if (incomeTax > 0) {
      expect(cess).toBeGreaterThan(0)
    }
  })
})

describe('Gratuity', () => {
  it('is not eligible before 5 years', () => {
    const joinDate  = new Date('2022-01-01')
    const exitDate  = new Date('2025-01-01') // 3 years
    const { isEligible, gratuityAmount } = calculateGratuity({ joinDate, exitDate, lastDrawnBasic: 50000 })
    expect(isEligible).toBe(false)
    expect(gratuityAmount).toBe(0)
  })

  it('calculates gratuity correctly after 5 years', () => {
    const joinDate = new Date('2018-01-01')
    const exitDate = new Date('2023-01-01') // exactly 5 years
    const { isEligible, gratuityAmount } = calculateGratuity({ joinDate, exitDate, lastDrawnBasic: 50000 })
    expect(isEligible).toBe(true)
    // (15/26) × 50000 × 5 = 144230
    expect(gratuityAmount).toBeCloseTo(144230, -2)
  })

  it('tax exemption is capped at ₹20L', () => {
    const joinDate  = new Date('2000-01-01')
    const exitDate  = new Date('2025-01-01') // 25 years
    const { taxExemptLimit, taxableGratuity } = calculateGratuity({ joinDate, exitDate, lastDrawnBasic: 200000 })
    expect(taxExemptLimit).toBe(2000000)
    expect(taxableGratuity).toBeGreaterThan(0)
  })
})

describe('CTC Breakdown', () => {
  it('builds correct breakdown for ₹12L CTC', () => {
    const bd = buildCTCBreakdown(1200000, { basicPercent: 40, hraPercent: 20, stateCode: 'KA' })
    expect(bd.monthlyCTC).toBe(100000)
    expect(bd.earnings.basic).toBe(40000)       // 40% of 100K
    expect(bd.earnings.hra).toBe(20000)          // 20% of 100K
    expect(bd.deductions.employeePF).toBe(1800) // 12% of 15K PF ceiling
    expect(bd.monthlyNetTakeHome).toBeGreaterThan(0)
    expect(bd.monthlyNetTakeHome).toBeLessThan(bd.monthlyGross)
  })

  it('total cost to company includes employer contributions', () => {
    const bd = buildCTCBreakdown(1200000)
    const totalCost = bd.monthlyCTC + bd.employerContributions.employerPF + bd.employerContributions.employerESI
    expect(totalCost).toBeGreaterThan(bd.monthlyCTC)
  })

  it('net take-home is less than gross', () => {
    const bd = buildCTCBreakdown(600000)
    expect(bd.monthlyNetTakeHome).toBeLessThan(bd.monthlyGross)
  })
})
