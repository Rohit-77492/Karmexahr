'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { FileText, Upload, Download, Eye, Lock, Search, Filter, Trash2 } from 'lucide-react'

const DOC_TYPE_LABELS: Record<string, string> = {
  offer_letter: 'Offer Letter', appointment_letter: 'Appointment Letter',
  payslip: 'Payslip', form_16: 'Form 16', experience_letter: 'Experience Letter',
  relieving_letter: 'Relieving Letter', identity: 'Identity Proof',
  address_proof: 'Address Proof', education: 'Education', other: 'Other',
}

const DOC_TYPE_ICONS: Record<string, string> = {
  offer_letter: '📄', appointment_letter: '📋', payslip: '💰', form_16: '📑',
  experience_letter: '🏅', relieving_letter: '📝', identity: '🪪',
  address_proof: '🏠', education: '🎓', other: '📁',
}

export default function DocumentsPage() {
  const params   = useParams()
  const supabase = createClient()
  const [companyId, setCompanyId] = useState('')
  const [docs, setDocs]           = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    supabase.from('companies').select('id').eq('slug', params.company as string).single()
      .then(({ data }) => { if (data) setCompanyId(data.id) })
  }, [params.company])

  useEffect(() => {
    if (!companyId) return
    let q = supabase.from('documents')
      .select('*, employees(first_name, last_name, employee_code)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
    if (typeFilter) q = q.eq('doc_type', typeFilter)
    if (search)     q = q.ilike('title', `%${search}%`)
    q.then(({ data }) => { setDocs(data ?? []); setLoading(false) })
  }, [companyId, search, typeFilter])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !companyId) return
    setUploading(true)
    try {
      const path = `${companyId}/docs/${Date.now()}-${file.name}`
      const { data: upload, error: uploadError } = await supabase.storage.from('documents').upload(path, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
      const { error: dbError } = await supabase.from('documents').insert({
        company_id: companyId, doc_type: 'other', title: file.name,
        file_url: publicUrl, file_size: file.size, mime_type: file.type,
        uploaded_by: (await supabase.auth.getUser()).data.user?.id,
      })
      if (dbError) throw dbError
      toast.success('Document uploaded')
      setDocs(prev => [{ title: file.name, doc_type: 'other', created_at: new Date().toISOString(), file_size: file.size }, ...prev])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Document Vault</h1>
          <p className="text-sm text-muted-foreground mt-1">{docs.length} documents · Encrypted at rest</p>
        </div>
        <label className={`flex items-center gap-2 bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 shadow-md shadow-gold-500/20 cursor-pointer ${uploading ? 'opacity-60' : ''}`}>
          <Upload size={13} /> {uploading ? 'Uploading...' : 'Upload Document'}
          <input type="file" className="hidden" onChange={handleUpload} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" disabled={uploading} />
        </label>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-3 py-2 flex-1 max-w-xs">
          <Search size={12} className="text-muted-foreground" />
          <input type="text" placeholder="Search documents..." className="bg-transparent text-xs outline-none w-full"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="bg-muted/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-gold-500"
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {Object.entries(DOC_TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-4 animate-pulse h-32" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <FileText size={40} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No documents found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Upload your first document to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {docs.map((doc, i) => {
            const emp = doc.employees
            return (
              <div key={doc.id ?? i} className="bg-card border border-border rounded-2xl p-4 hover:border-border/70 hover:-translate-y-0.5 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-2xl">{DOC_TYPE_ICONS[doc.doc_type] ?? '📁'}</div>
                  {doc.is_confidential && <Lock size={12} className="text-gold-500 mt-1" />}
                </div>
                <div className="font-semibold text-xs text-foreground mb-1 line-clamp-2">{doc.title}</div>
                <div className="text-[10px] text-muted-foreground mb-1">
                  {DOC_TYPE_LABELS[doc.doc_type] ?? 'Other'}
                </div>
                {emp && (
                  <div className="text-[10px] text-muted-foreground mb-3">
                    {emp.first_name} {emp.last_name} · {emp.employee_code}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="text-[10px] text-muted-foreground/60">
                    {new Date(doc.created_at).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-blue-400">
                        <Eye size={11} />
                      </a>
                    )}
                    {doc.file_url && (
                      <a href={doc.file_url} download
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-gold-500">
                        <Download size={11} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
