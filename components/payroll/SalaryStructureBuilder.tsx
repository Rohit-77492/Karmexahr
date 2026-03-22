'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Trash2, GripVertical, Save, Calculator } from 'lucide-react'
import { buildCTCBreakdown, formatINR, formatINRCompact } from '@/lib/payroll/indian-compliance'

interface Component {
  id:        string
  name:      string
  type:      'earning' | 'deduction'
  calc_type: 'fixed' | 'percent' | 'percent_of_basic' | 'remainder'
  value:     number
  is_taxable: boolean
  is_statutory: boolean
}

const DEFAULT_COMPONENTS: Component[] = [
  { id: '1', name: 'Basic Salary',        type: 'earning',   calc_type: 'percent',          value: 40,   is_taxable: true,  is_statutory: false },
  { id: '2', name: 'HRA',                 type: 'earning',   calc_type: 'percent',          value: 20,   is_taxable: false, is_statutory: false },
  { id: '3', name: 'Special Allowance',   type: 'earning',   calc_type: 'remainder',        value: 0,    is_taxable: true,  is_statutory: false },
  { id: '4', name: 'Conveyance',          type: 'earning',   calc_type: 'fixed',            value: 1600, is_taxable: false, is_statutory: false },
  { id: '5', name: 'Medical Allowance',   type: 'earning',   calc_type: 'fixed',            value: 1250, is_taxable: false, is_statutory: false },
  { id: '6', name: 'PF (Employee 12%)',   type: 'deduction', calc_type: 'percent_of_basic', value: 12,   is_taxable: false, is_statutory: true },
  { id: '7', name: 'ESI (Employee 0.75%)',type: 'deduction', calc_type: 'percent',          value: 0.75, is_taxable: false, is_statutory: true },
  { id: '8', name: 'Professional Tax',    type: 'deduction', calc_type: 'fixed',            value: 200,  is_taxable: false, is_statutory: true },
]

interface Props {
  companyId:  string
  onSave?:    (id: string) => void
  initial?:   { id?: string; name?: string; components?: Component[] }
}

export default function SalaryStructureBuilder({ companyId, onSave, initial }: Props) {
  const supabase = createClient()
  const [name, setName]             = useState(initial?.name ?? 'Standard CTC')
  const [components, setComponents] = useState<Component[]>(initial?.components ?? DEFAULT_COMPONENTS)
  const [previewCTC, setPreviewCTC] = useState(1200000)
  const [saving, setSaving]         = useState(false)

  const addComponent = () => {
    setComponents(prev => [...prev, {
      id: Date.now().toString(), name: 'New Component', type: 'earning',
      calc_type: 'fixed', value: 0, is_taxable: true, is_statutory: false,
    }])
  }

  const removeComponent = (id: string) => {
    setComponents(prev => prev.filter(c => c.id !== id))
  }

  const updateComponent = (id: string, updates: Partial<Component>) => {
    setComponents(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
  }

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Structure name required'); return }
    setSaving(true)

    const payload = { company_id: companyId, name, components, is_active: true }

    let error
    if (initial?.id) {
      ({ error } = await supabase.from('salary_structures').update(payload).eq('id', initial.id))
    } else {
      const { data: result, error: err } = await supabase.from('salary_structures').insert(payload).select('id').single()
      error = err
      if (result && onSave) onSave(result.id)
    }

    if (error) toast.error(error.message)
    else toast.success('Salary structure saved!')
    setSaving(false)
  }

  // Preview calculation
  const basicPercent = components.find(c => c.name.toLowerCase().includes('basic') && c.calc_type === 'percent')?.value ?? 40
  const preview = buildCTCBreakdown(previewCTC, { basicPercent })

  const earningsTotal = preview.earnings.basic + preview.earnings.hra + preview.earnings.specialAllowance +
    preview.earnings.conveyance + preview.earnings.medicalAllowance
  const deductionsTotal = preview.deductions.employeePF + preview.deductions.employeeESI +
    preview.deductions.professionalTax + preview.deductions.tds

  const inp = "bg-muted/50 border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-gold-500"

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <Calculator size={16} className="text-gold-500" />
        <input
          className="font-display font-bold text-base bg-transparent focus:outline-none border-b border-transparent focus:border-gold-500 pb-0.5 flex-1"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Structure Name"
        />
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50">
          <Save size={12} /> {saving ? 'Saving...' : 'Save Structure'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-0">
        {/* Components editor */}
        <div className="xl:col-span-2 p-5 border-r border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Salary Components</div>
            <button onClick={addComponent} className="flex items-center gap-1 text-xs text-gold-500 font-medium hover:text-gold-400">
              <Plus size={12} /> Add Component
            </button>
          </div>

          {/* Header row */}
          <div className="grid gap-2 text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2 px-2"
            style={{ gridTemplateColumns: '1.5fr 100px 70px 70px auto auto 24px' }}>
            <span>Component Name</span>
            <span>Calculation</span>
            <span>Value</span>
            <span>Type</span>
            <span>Taxable</span>
            <span>Statutory</span>
            <span />
          </div>

          <div className="space-y-1.5">
            {components.map(comp => (
              <div key={comp.id}
                className="grid gap-2 items-center bg-muted/30 border border-border/50 rounded-xl px-2 py-2 hover:bg-muted/50 transition-colors"
                style={{ gridTemplateColumns: '1.5fr 100px 70px 70px auto auto 24px' }}>
                {/* Name */}
                <input className={`${inp} font-medium`} value={comp.name}
                  onChange={e => updateComponent(comp.id, { name: e.target.value })} />

                {/* Calc type */}
                <select className={inp} value={comp.calc_type}
                  onChange={e => updateComponent(comp.id, { calc_type: e.target.value as any })}>
                  <option value="fixed">Fixed ₹</option>
                  <option value="percent">% of CTC</option>
                  <option value="percent_of_basic">% of Basic</option>
                  <option value="remainder">Remainder</option>
                </select>

                {/* Value */}
                <input type="number" className={`${inp} text-right`} value={comp.value}
                  onChange={e => updateComponent(comp.id, { value: parseFloat(e.target.value) || 0 })}
                  disabled={comp.calc_type === 'remainder'} />

                {/* Earning/Deduction */}
                <select className={`${inp} ${comp.type === 'earning' ? 'text-green-500' : 'text-destructive'}`}
                  value={comp.type} onChange={e => updateComponent(comp.id, { type: e.target.value as any })}>
                  <option value="earning">Earning</option>
                  <option value="deduction">Deduction</option>
                </select>

                {/* Taxable toggle */}
                <button type="button" onClick={() => updateComponent(comp.id, { is_taxable: !comp.is_taxable })}
                  className={`relative w-8 h-4 rounded-full transition-all ${comp.is_taxable ? 'bg-gold-500' : 'bg-muted'}`}>
                  <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${comp.is_taxable ? 'left-4' : 'left-0.5'}`} />
                </button>

                {/* Statutory badge */}
                <div className={`text-[9px] font-bold px-1.5 py-0.5 rounded text-center ${comp.is_statutory ? 'bg-blue-500/10 text-blue-400' : 'bg-muted text-muted-foreground'}`}>
                  {comp.is_statutory ? 'Stat' : 'Flex'}
                </div>

                {/* Delete */}
                {!comp.is_statutory && (
                  <button onClick={() => removeComponent(comp.id)}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 size={11} />
                  </button>
                )}
                {comp.is_statutory && <div />}
              </div>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div className="p-5">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Live Preview</div>

          {/* CTC slider */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Annual CTC</span>
              <span className="font-bold text-foreground">{formatINRCompact(previewCTC)}</span>
            </div>
            <input type="range" min={300000} max={5000000} step={50000}
              value={previewCTC} onChange={e => setPreviewCTC(Number(e.target.value))}
              className="w-full accent-yellow-500" />
            <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-0.5">
              <span>₹3L</span><span>₹50L</span>
            </div>
          </div>

          {/* Monthly breakdown */}
          <div className="space-y-0">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Monthly</div>

            {[
              ['Basic',           preview.earnings.basic,            'text-foreground'],
              ['HRA',             preview.earnings.hra,              'text-foreground'],
              ['Special Allow.',  preview.earnings.specialAllowance, 'text-foreground'],
              ['Conveyance',      preview.earnings.conveyance,       'text-foreground'],
            ].map(([label, val, cls]) => (
              <div key={label as string} className="flex justify-between py-1.5 border-b border-border/40 text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className={cls as string}>{formatINR(val as number)}</span>
              </div>
            ))}

            <div className="flex justify-between py-1.5 border-b border-border font-bold text-xs">
              <span className="text-green-500">Gross</span>
              <span className="text-green-500">{formatINR(earningsTotal)}</span>
            </div>

            {[
              ['PF (Emp)',  preview.deductions.employeePF,    'text-destructive'],
              ['ESI',      preview.deductions.employeeESI,   'text-destructive'],
              ['Prof. Tax',preview.deductions.professionalTax,'text-destructive'],
              ['TDS',      preview.deductions.tds,           'text-destructive'],
            ].map(([label, val, cls]) => (
              <div key={label as string} className="flex justify-between py-1.5 border-b border-border/40 text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className={cls as string}>-{formatINR(val as number)}</span>
              </div>
            ))}

            <div className="mt-3 p-3 bg-gradient-to-r from-gold-500/10 to-orange-500/5 border border-gold-500/20 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-foreground">Net Take-Home</span>
                <span className="font-display font-extrabold text-xl text-green-500">{formatINR(preview.monthlyNetTakeHome)}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                {formatINRCompact(preview.monthlyNetTakeHome * 12)}/year
              </div>
            </div>

            <div className="mt-3 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
              <div className="text-[10px] font-bold text-blue-400 mb-2">Employer Cost</div>
              <div className="space-y-1">
                {[
                  ['PF (Employer)', formatINR(preview.employerContributions.employerPF)],
                  ['ESI (Employer)', formatINR(preview.employerContributions.employerESI)],
                  ['Gratuity Prov.', formatINR(preview.employerContributions.gratuityMonthly)],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="text-blue-400 font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
