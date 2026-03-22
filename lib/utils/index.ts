// lib/utils/index.ts — Shared utilities

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, isWeekend, parseISO, addDays } from 'date-fns'
import type { UserRole } from '@/lib/supabase/database.types'

// shadcn/ui cn helper
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── DATE HELPERS ─────────────────────────────────────────────

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy') {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt)
}

export function formatDateRelative(date: string | Date) {
  const d = typeof date === 'string' ? parseISO(date) : date
  const diff = differenceInDays(new Date(), d)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7)  return `${diff} days ago`
  return format(d, 'dd MMM yyyy')
}

// Count business days between two dates (excl. weekends, holidays)
export function countBusinessDays(from: Date, to: Date, holidays: string[] = []): number {
  let count = 0
  let current = new Date(from)
  while (current <= to) {
    const dateStr = format(current, 'yyyy-MM-dd')
    if (!isWeekend(current) && !holidays.includes(dateStr)) count++
    current = addDays(current, 1)
  }
  return count
}

export function getMonthName(month: number) {
  return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month - 1]
}

export function getFinancialYear(date = new Date(), fiscalStart = 4) {
  const month = date.getMonth() + 1
  const year  = date.getFullYear()
  if (month >= fiscalStart) return { from: year, to: year + 1, label: `FY ${year}-${String(year+1).slice(2)}` }
  return { from: year - 1, to: year, label: `FY ${year-1}-${String(year).slice(2)}` }
}

// ─── STRING HELPERS ───────────────────────────────────────────

export function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function titleCase(str: string) {
  return str.split(/[\s_-]/).map(capitalize).join(' ')
}

export function getInitials(name: string, max = 2) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, max)
}

export function truncate(str: string, maxLen: number) {
  return str.length <= maxLen ? str : str.slice(0, maxLen - 1) + '…'
}

// ─── NUMBER / CURRENCY HELPERS ────────────────────────────────

export function formatINR(amount: number, decimals = 0) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  }).format(amount)
}

export function formatINRCompact(amount: number) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`
  if (amount >= 100000)   return `₹${(amount / 100000).toFixed(2)}L`
  if (amount >= 1000)     return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount}`
}

export function parseINR(value: string) {
  return parseFloat(value.replace(/[₹,\s]/g, ''))
}

export function roundTo(n: number, decimals = 2) {
  return Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

// ─── VALIDATION ───────────────────────────────────────────────

export function isValidPAN(pan: string) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase())
}

export function isValidAadhaar(aadhaar: string) {
  return /^\d{12}$/.test(aadhaar.replace(/\s/g, ''))
}

export function isValidIFSC(ifsc: string) {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.toUpperCase())
}

export function isValidGST(gst: string) {
  return /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gst.toUpperCase())
}

export function maskAccountNumber(acc: string) {
  if (!acc || acc.length < 4) return acc
  return 'XXXX' + acc.slice(-4)
}

export function maskAadhaar(aadhaar: string) {
  const clean = aadhaar.replace(/\s/g, '')
  return 'XXXX XXXX ' + clean.slice(-4)
}

// ─── COLOR HELPERS ────────────────────────────────────────────

const AVATAR_COLORS = [
  '#6c47ff','#f0a500','#00c9b1','#ff5a65','#4d9fff',
  '#22d07a','#ff8c00','#9b6dff','#e91e8c','#00bcd4',
]

export function getAvatarColor(name: string) {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

// ─── FILE HELPERS ─────────────────────────────────────────────

export function formatFileSize(bytes: number) {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024*1024)  return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/1024/1024).toFixed(1)} MB`
}

export function getFileExtension(filename: string) {
  return filename.split('.').pop()?.toLowerCase() ?? ''
}

export function isImageFile(filename: string) {
  return ['jpg','jpeg','png','gif','webp','svg'].includes(getFileExtension(filename))
}

export function isPDFFile(filename: string) {
  return getFileExtension(filename) === 'pdf'
}

// ─── LOCAL STORAGE ────────────────────────────────────────────

export function localGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try { return JSON.parse(localStorage.getItem(key) ?? '') }
  catch { return fallback }
}

export function localSet(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

// ─── DEBOUNCE ─────────────────────────────────────────────────

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// ─── PERMISSIONS ──────────────────────────────────────────────

const ROLE_WEIGHTS: Record<UserRole, number> = {
  super_admin: 5, admin: 4, hr_manager: 3, manager: 2, employee: 1,
}

export function hasPermission(userRole: UserRole, requiredRole: UserRole) {
  return ROLE_WEIGHTS[userRole] >= ROLE_WEIGHTS[requiredRole]
}

export function canApproveLeave(role: UserRole)   { return hasPermission(role, 'manager') }
export function canRunPayroll(role: UserRole)      { return hasPermission(role, 'hr_manager') }
export function canManageSettings(role: UserRole) { return hasPermission(role, 'admin') }
export function canAccessReports(role: UserRole)  { return hasPermission(role, 'hr_manager') }
