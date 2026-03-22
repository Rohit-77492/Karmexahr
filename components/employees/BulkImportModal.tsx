'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Upload, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Download, Loader2, X } from 'lucide-react'

interface ParsedRow {
  first_name:      string
  last_name:       string
  email:           string
  phone?:          string
  department:      string
  designation:     string
  employment_type: string
  join_date:       string
  pan_number?:     string
  bank_name?:      string
  bank_account_number?: string
  bank_ifsc?:      string
  errors:          string[]
  status:          'pending' | 'success' | 'error' | 'duplicate'
}

const REQUIRED_COLS = ['first_name','last_name','email','join_date']
const CSV_TEMPLATE  = [
  'first_name,last_name,email,phone,department,designation,employment_type,join_date,pan_number,bank_name,bank_account_number,bank_ifsc',
  'Priya,Sharma,priya.sharma@company.com,+91 98765 43210,Engineering,Software Engineer,full_time,2025-01-15,ABCDE1234F,HDFC Bank,12345678901234,HDFC0001234',
  'Rahul,Mehta,rahul.mehta@company.com,,Sales,Sales Executive,full_time,2025-02-01,,,,'
].join('\n')

interface Props {
  companyId:   string
  departments: { id: string; name: string }[]
  onClose:     () => void
  onSuccess:   (count: number) => void
}

export default function BulkImportModal({ companyId, departments, onClose, onSuccess }: Props) {
  const supabase    = createClient()
  const [rows, setRows]         = useState<ParsedRow[]>([])
  const [step, setStep]         = useState<'upload'|'preview'|'done'>('upload')
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult]     = useState({ success: 0, errors: 0, duplicates: 0 })
  const [dragOver, setDragOver] = useState(false)

  const deptMap = Object.fromEntries(departments.map(d => [d.name.toLowerCase(), d.id]))

  const parseCSV = useCallback((text: string) => {
    const lines = text.trim().split('\n')
    if (lines.length < 2) { toast.error('CSV must have header and at least one data row'); return }

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g,''))

    const parsed: ParsedRow[] = lines.slice(1).map(line => {
      const values  = line.split(',').map(v => v.trim().replace(/^"|"$/g,''))
      const row: any = {}
      headers.forEach((h, i) => { row[h] = values[i] ?? '' })

      const errors: string[] = []
      if (!row.first_name?.trim()) errors.push('First name required')
      if (!row.last_name?.trim())  errors.push('Last name required')
      if (!row.email?.includes('@')) errors.push('Valid email required')
      if (!row.join_date)          errors.push('Join date required')
      if (row.join_date && isNaN(Date.parse(row.join_date))) errors.push('Invalid join date format (use YYYY-MM-DD)')

      return {
        first_name:       row.first_name?.trim() ?? '',
        last_name:        row.last_name?.trim()  ?? '',
        email:            row.email?.trim().toLowerCase() ?? '',
        phone:            row.phone?.trim()      || undefined,
        department:       row.department?.trim() ?? '',
        designation:      row.designation?.trim() ?? '',
        employment_type:  row.employment_type?.trim() || 'full_time',
        join_date:        row.join_date?.trim() ?? '',
        pan_number:       row.pan_number?.trim() || undefined,
        bank_name:        row.bank_name?.trim()  || undefined,
        bank_account_number: row.bank_account_number?.trim() || undefined,
        bank_ifsc:        row.bank_ifsc?.trim()  || undefined,
        errors,
        status: errors.length ? 'error' : 'pending',
      }
    }).filter(r => r.first_name || r.email) // skip empty rows

    setRows(parsed)
    setStep('preview')
  }, [])

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      toast.error('Please upload a CSV file')
      return
    }
    const reader = new FileReader()
    reader.onload = e => parseCSV(e.target?.result as string)
    reader.readAsText(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleImport = async () => {
    const validRows = rows.filter(r => r.status === 'pending')
    if (!validRows.length) { toast.error('No valid rows to import'); return }

    setImporting(true)
    let success = 0, errors = 0, duplicates = 0

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]
      setProgress(Math.round(((i + 1) / validRows.length) * 100))

      // Generate employee code
      const { data: code } = await supabase.rpc('generate_employee_code', { p_company_id: companyId })

      const deptId = deptMap[row.department.toLowerCase()] || null

      const { error } = await supabase.from('employees').insert({
        company_id:    companyId,
        employee_code: code,
        first_name:    row.first_name,
        last_name:     row.last_name,
        email:         row.email,
        phone:         row.phone || null,
        department_id: deptId,
        employment_type: (row.employment_type as any) || 'full_time',
        join_date:     row.join_date,
        pan_number:    row.pan_number || null,
        bank_name:     row.bank_name || null,
        bank_account_number: row.bank_account_number || null,
        bank_ifsc:     row.bank_ifsc || null,
        status:        'active',
      })

      if (error) {
        if (error.code === '23505') {
          duplicates++
          setRows(prev => prev.map(r => r.email === row.email ? { ...r, status: 'duplicate', errors: ['Email already exists'] } : r))
        } else {
          errors++
          setRows(prev => prev.map(r => r.email === row.email ? { ...r, status: 'error', errors: [error.message] } : r))
        }
      } else {
        success++
        setRows(prev => prev.map(r => r.email === row.email ? { ...r, status: 'success' } : r))
      }
    }

    setResult({ success, errors, duplicates })
    setStep('done')
    setImporting(false)
    if (success > 0) onSuccess(success)
  }

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'karmexahr-employee-import-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const validCount     = rows.filter(r => r.status === 'pending').length
  const errorCount     = rows.filter(r => r.status === 'error').length

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold-500/10 flex items-center justify-center">
              <FileSpreadsheet size={16} className="text-gold-500" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">Bulk Import Employees</h2>
              <p className="text-xs text-muted-foreground">Upload a CSV file to add multiple employees at once</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-muted/20 flex-shrink-0">
          {[['Upload File','upload'],['Preview & Validate','preview'],['Import Complete','done']].map(([label, s], i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${step === s ? 'bg-gold-500 text-background' : step === 'done' || (step === 'preview' && i === 0) ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                {(step === 'done' || (step === 'preview' && i === 0)) && i < (['upload','preview','done'].indexOf(step)) ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium ${step === s ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
              {i < 2 && <div className="w-8 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="p-6 space-y-4">
              {/* Template download */}
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3">
                <FileSpreadsheet size={16} className="text-blue-400 flex-shrink-0" />
                <div className="flex-1 text-sm text-muted-foreground">
                  Download the CSV template with the correct column format
                </div>
                <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold hover:text-blue-300">
                  <Download size={12} /> Download Template
                </button>
              </div>

              {/* Drop zone */}
              <label
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl p-12 cursor-pointer transition-all ${dragOver ? 'border-gold-500 bg-gold-500/5' : 'border-border hover:border-gold-500/50 hover:bg-muted/30'}`}
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${dragOver ? 'bg-gold-500/20' : 'bg-muted'}`}>
                  <Upload size={28} className={dragOver ? 'text-gold-500' : 'text-muted-foreground'} />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-foreground mb-1">Drag & drop your CSV here</div>
                  <div className="text-sm text-muted-foreground">or click to browse files</div>
                  <div className="text-xs text-muted-foreground/60 mt-1">CSV files only · Max 5MB · Up to 1,000 employees</div>
                </div>
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
              </label>

              {/* Column guide */}
              <div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Required Columns</div>
                <div className="flex flex-wrap gap-2">
                  {REQUIRED_COLS.map(col => (
                    <span key={col} className="text-[10px] font-mono bg-gold-500/10 text-gold-500 px-2 py-1 rounded-lg border border-gold-500/20">{col}</span>
                  ))}
                </div>
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-3 mb-2">Optional Columns</div>
                <div className="flex flex-wrap gap-2">
                  {['phone','department','designation','employment_type','pan_number','bank_name','bank_account_number','bank_ifsc'].map(col => (
                    <span key={col} className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-1 rounded-lg">{col}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === 'preview' && (
            <div className="p-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Total Rows',   value: rows.length,  color: '#4d9fff', icon: FileSpreadsheet },
                  { label: 'Valid',        value: validCount,   color: '#22d07a', icon: CheckCircle },
                  { label: 'Errors',       value: errorCount,   color: '#ff5a65', icon: XCircle },
                ].map(s => (
                  <div key={s.label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2">
                    <s.icon size={14} style={{ color: s.color }} />
                    <div>
                      <div className="font-display font-bold text-lg text-foreground">{s.value}</div>
                      <div className="text-[10px] text-muted-foreground">{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Table preview */}
              <div className="border border-border rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b border-border">
                      {['#','Name','Email','Department','Join Date','Status'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className={`border-b border-border/50 ${row.status === 'error' ? 'bg-destructive/5' : row.status === 'success' ? 'bg-green-500/5' : ''}`}>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 text-xs font-medium text-foreground">{row.first_name} {row.last_name}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{row.email}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{row.department || '—'}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{row.join_date}</td>
                        <td className="px-3 py-2">
                          {row.status === 'pending' && <span className="text-[9px] font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full">Ready</span>}
                          {row.status === 'error'   && (
                            <div className="flex items-center gap-1" title={row.errors.join(', ')}>
                              <AlertCircle size={11} className="text-destructive flex-shrink-0" />
                              <span className="text-[9px] text-destructive truncate max-w-[100px]">{row.errors[0]}</span>
                            </div>
                          )}
                          {row.status === 'success'   && <span className="text-[9px] font-bold bg-green-500/10 text-green-500 px-2 py-0.5 rounded-full">Imported</span>}
                          {row.status === 'duplicate' && <span className="text-[9px] font-bold bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full">Duplicate</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Import progress bar */}
              {importing && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Importing...</span>
                    <span className="font-bold text-foreground">{progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-gold-500 to-orange-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Done */}
          {step === 'done' && (
            <div className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={36} className="text-green-500" />
              </div>
              <h3 className="font-display text-xl font-bold mb-2">Import Complete!</h3>
              <p className="text-sm text-muted-foreground mb-6">Here's a summary of what was imported:</p>
              <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto mb-6">
                {[
                  { label: 'Imported',   value: result.success,    color: '#22d07a' },
                  { label: 'Errors',     value: result.errors,     color: '#ff5a65' },
                  { label: 'Duplicates', value: result.duplicates, color: '#f0a500' },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <div className="font-display font-extrabold text-3xl" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
              {result.errors > 0 && (
                <button onClick={() => setStep('preview')} className="text-xs text-gold-500 font-medium hover:underline">
                  Review failed rows →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={step === 'upload' ? onClose : () => setStep('upload')}
            className="px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted">
            {step === 'upload' ? 'Cancel' : '← Back'}
          </button>
          <div className="flex gap-3">
            {step === 'preview' && validCount > 0 && (
              <button onClick={handleImport} disabled={importing}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background text-sm font-semibold hover:opacity-90 disabled:opacity-50 shadow-md shadow-gold-500/20">
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {importing ? `Importing ${progress}%...` : `Import ${validCount} Employee${validCount !== 1 ? 's' : ''}`}
              </button>
            )}
            {step === 'done' && (
              <button onClick={onClose} className="px-6 py-2 rounded-xl bg-gradient-to-r from-gold-500 to-orange-500 text-background text-sm font-semibold hover:opacity-90">
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
