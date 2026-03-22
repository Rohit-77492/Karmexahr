// components/ui/index.tsx — Shared micro-components
// Lightweight custom components (not full shadcn — lighter, faster)

import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import React from 'react'

// ─── BUTTON ───────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?:    'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export function Button({
  variant = 'primary',
  size    = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:   'bg-gradient-to-r from-gold-500 to-orange-500 text-background hover:opacity-90 focus:ring-gold-500/50 shadow-md shadow-gold-500/20',
    secondary: 'bg-card border border-border text-foreground hover:bg-muted/50 focus:ring-border',
    ghost:     'text-muted-foreground hover:text-foreground hover:bg-muted/50 focus:ring-border',
    danger:    'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 focus:ring-destructive/30',
    outline:   'border border-border text-foreground hover:bg-muted/50 focus:ring-border',
  }

  const sizes = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-xs px-4 py-2',
    lg: 'text-sm px-5 py-2.5',
  }

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  )
}

// ─── BADGE ────────────────────────────────────────────────────

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  size?:    'sm' | 'md'
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'default', size = 'sm', children, className }: BadgeProps) {
  const variants = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-green-500/10 text-green-500',
    warning: 'bg-gold-500/10 text-gold-500',
    danger:  'bg-destructive/10 text-destructive',
    info:    'bg-blue-500/10 text-blue-400',
    purple:  'bg-purple-500/10 text-purple-400',
  }
  const sizes = {
    sm: 'text-[9px] px-1.5 py-0.5',
    md: 'text-xs px-2.5 py-1',
  }
  return (
    <span className={cn('inline-flex items-center font-bold rounded-full', variants[variant], sizes[size], className)}>
      {children}
    </span>
  )
}

// ─── CARD ─────────────────────────────────────────────────────

interface CardProps {
  children:   React.ReactNode
  className?: string
  hover?:     boolean
  padding?:   'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, className, hover = false, padding = 'md' }: CardProps) {
  const paddings = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' }
  return (
    <div className={cn(
      'bg-card border border-border rounded-2xl',
      paddings[padding],
      hover && 'hover:border-border/70 hover:-translate-y-0.5 transition-all',
      className
    )}>
      {children}
    </div>
  )
}

// ─── INPUT ────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:   string
  error?:   string
  hint?:    string
  leftEl?:  React.ReactNode
  rightEl?: React.ReactNode
}

export function Input({ label, error, hint, leftEl, rightEl, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftEl && <div className="absolute left-3 text-muted-foreground">{leftEl}</div>}
        <input
          id={inputId}
          className={cn(
            'w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 transition-all',
            'placeholder:text-muted-foreground',
            error && 'border-destructive focus:ring-destructive/30',
            leftEl  && 'pl-9',
            rightEl && 'pr-9',
            className
          )}
          {...props}
        />
        {rightEl && <div className="absolute right-3 text-muted-foreground">{rightEl}</div>}
      </div>
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
      {hint && !error && <p className="text-muted-foreground text-xs mt-1">{hint}</p>}
    </div>
  )
}

// ─── SELECT ───────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?:   string
  error?:   string
  options:  { value: string; label: string }[]
  placeholder?: string
}

export function Select({ label, error, options, placeholder, className, id, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={cn(
          'w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 transition-all',
          error && 'border-destructive',
          className
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  )
}

// ─── TEXTAREA ─────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const taId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={taId} className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={taId}
        className={cn(
          'w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-sm resize-none',
          'focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-500 transition-all',
          'placeholder:text-muted-foreground',
          error && 'border-destructive',
          className
        )}
        {...props}
      />
      {error && <p className="text-destructive text-xs mt-1">{error}</p>}
    </div>
  )
}

// ─── MODAL ────────────────────────────────────────────────────

interface ModalProps {
  open:       boolean
  onClose:    () => void
  title:      string
  subtitle?:  string
  children:   React.ReactNode
  size?:      'sm' | 'md' | 'lg' | 'xl'
  footer?:    React.ReactNode
}

export function Modal({ open, onClose, title, subtitle, children, size = 'md', footer }: ModalProps) {
  if (!open) return null

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}>
      <div
        className={cn('bg-card border border-border rounded-2xl w-full shadow-2xl animate-fade-in flex flex-col max-h-[90vh]', sizes[size])}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-display font-bold text-lg">{title}</h2>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── STAT CARD ────────────────────────────────────────────────

interface StatCardProps {
  label:      string
  value:      string | number
  icon:       React.ElementType
  color?:     string
  change?:    string
  changeUp?:  boolean
  sub?:       string
  className?: string
}

export function StatCard({ label, value, icon: Icon, color = '#f0a500', change, changeUp, sub, className }: StatCardProps) {
  return (
    <div className={cn('bg-card border border-border rounded-2xl p-5 relative overflow-hidden', className)}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full translate-x-8 -translate-y-8 opacity-[0.07]" style={{ background: color }} />
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: `${color}18`, color }}>
        <Icon size={18} />
      </div>
      <div className="font-display font-extrabold text-3xl text-foreground leading-none mb-1">{value}</div>
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
      {change && (
        <div className={cn('flex items-center gap-1 text-xs mt-2 font-medium', changeUp ? 'text-green-500' : 'text-destructive')}>
          {changeUp ? '↑' : '↓'} {change}
        </div>
      )}
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  )
}

// ─── EMPTY STATE ──────────────────────────────────────────────

interface EmptyStateProps {
  icon:     React.ElementType
  title:    string
  subtitle?: string
  action?:  React.ReactNode
}

export function EmptyState({ icon: Icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon size={28} className="text-muted-foreground/40" />
      </div>
      <h3 className="font-display font-bold text-base text-foreground mb-1">{title}</h3>
      {subtitle && <p className="text-sm text-muted-foreground max-w-xs">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

// ─── AVATAR ───────────────────────────────────────────────────

interface AvatarProps {
  name:      string
  color?:    string
  size?:     'xs' | 'sm' | 'md' | 'lg' | 'xl'
  imageUrl?: string
}

export function Avatar({ name, color = '#6c47ff', size = 'md', imageUrl }: AvatarProps) {
  const sizes = {
    xs: 'w-6 h-6 text-[9px]',
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-9 h-9 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-16 h-16 text-base',
  }

  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)

  if (imageUrl) {
    return (
      <img src={imageUrl} alt={name}
        className={cn('rounded-full object-cover flex-shrink-0', sizes[size])} />
    )
  }

  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-bold text-white flex-shrink-0', sizes[size])}
      style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}
    >
      {initials}
    </div>
  )
}

// ─── SKELETON ─────────────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-muted rounded-lg', className)} />
}

export function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 animate-pulse">
      <div className="flex gap-3 items-center mb-4">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2 w-20" />
        </div>
      </div>
      <Skeleton className="h-2 w-full mb-2" />
      <Skeleton className="h-2 w-3/4" />
    </div>
  )
}

// ─── TABLE ────────────────────────────────────────────────────

interface Column<T> {
  key:       keyof T | string
  header:    string
  render?:   (row: T) => React.ReactNode
  className?: string
}

interface TableProps<T> {
  columns:   Column<T>[]
  data:      T[]
  loading?:  boolean
  empty?:    React.ReactNode
  onRowClick?: (row: T) => void
}

export function Table<T extends { id?: string }>({ columns, data, loading, empty, onRowClick }: TableProps<T>) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {columns.map(col => (
                <th key={col.key as string} className={cn('text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/50">
                  {columns.map(col => (
                    <td key={col.key as string} className="px-4 py-3">
                      <Skeleton className="h-3 w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  {empty ?? <span className="text-sm text-muted-foreground">No data</span>}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={row.id ?? i}
                  className={cn('border-b border-border/50 hover:bg-muted/30 transition-colors', onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map(col => (
                    <td key={col.key as string} className={cn('px-4 py-3', col.className)}>
                      {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── TOGGLE ───────────────────────────────────────────────────

interface ToggleProps {
  checked:   boolean
  onChange:  (v: boolean) => void
  color?:    string
  disabled?: boolean
}

export function Toggle({ checked, onChange, color = '#f0a500', disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      className={cn('relative w-10 h-5 rounded-full transition-all flex-shrink-0', disabled && 'opacity-50 cursor-not-allowed')}
      style={{ background: checked ? color : 'hsl(var(--muted))' }}
    >
      <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200', checked ? 'left-5' : 'left-0.5')} />
    </button>
  )
}

// ─── PROGRESS ─────────────────────────────────────────────────

interface ProgressProps {
  value:     number
  max?:      number
  color?:    string
  size?:     'sm' | 'md' | 'lg'
  label?:    string
  showValue?: boolean
}

export function Progress({ value, max = 100, color = '#f0a500', size = 'md', label, showValue = false }: ProgressProps) {
  const pct  = Math.min(Math.max((value / max) * 100, 0), 100)
  const h    = size === 'sm' ? 'h-1' : size === 'md' ? 'h-2' : 'h-3'

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between mb-1.5">
          {label && <span className="text-xs text-muted-foreground">{label}</span>}
          {showValue && <span className="text-xs font-bold text-foreground">{pct.toFixed(0)}%</span>}
        </div>
      )}
      <div className={cn('w-full bg-muted rounded-full overflow-hidden', h)}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}
