'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Briefcase, Users, Star, Calendar, ChevronRight } from 'lucide-react'
import type { Candidate, Job } from '@/lib/supabase/database.types'

const STAGES: { key: string; label: string; color: string }[] = [
  { key: 'applied',     label: 'Applied',     color: '#f0a500' },
  { key: 'screened',    label: 'Screened',    color: '#4d9fff' },
  { key: 'interview_1', label: 'Interview 1', color: '#00c9b1' },
  { key: 'interview_2', label: 'Interview 2', color: '#9b6dff' },
  { key: 'offer',       label: 'Offer',       color: '#ff5a65' },
  { key: 'hired',       label: 'Hired',       color: '#22d07a' },
]

export default function RecruitmentPage() {
  const params   = useParams()
  const supabase = createClient()
  const [companyId, setCompanyId] = useState('')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [jobs, setJobs]             = useState<Job[]>([])
  const [jobFilter, setJobFilter]   = useState('')
  const [loading, setLoading]       = useState(true)
  const [showAddJob, setShowAddJob] = useState(false)
  const [showAddCandidate, setShowAddCandidate] = useState(false)
  const [dragging, setDragging]     = useState<string | null>(null)

  useEffect(() => {
    supabase.from('companies').select('id').eq('slug', params.company as string).single()
      .then(({ data }) => { if (data) setCompanyId(data.id) })
  }, [params.company])

  useEffect(() => {
    if (!companyId) return
    Promise.all([
      supabase.from('jobs').select('*, departments(name)').eq('company_id', companyId).in('status', ['open','paused']).order('created_at', { ascending: false }),
      supabase.from('candidates').select('*, jobs(title)').eq('company_id', companyId).not('stage', 'in', '(rejected)').order('applied_at', { ascending: false }),
    ]).then(([{ data: j }, { data: c }]) => {
      setJobs((j ?? []) as any)
      setCandidates((c ?? []) as any)
      setLoading(false)
    })
  }, [companyId])

  const candidatesByStage = (stage: string) => candidates.filter(c => c.stage === stage && (!jobFilter || c.job_id === jobFilter))

  const moveCandidate = async (candidateId: string, newStage: string) => {
    const { error } = await supabase.from('candidates').update({ stage: newStage as any }).eq('id', candidateId)
    if (!error) {
      setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, stage: newStage as any } : c))
      toast.success(`Candidate moved to ${STAGES.find(s => s.key === newStage)?.label}`)
    }
  }

  const onDragStart = (candidateId: string) => setDragging(candidateId)
  const onDrop = (stage: string) => { if (dragging) { moveCandidate(dragging, stage); setDragging(null) } }

  return (
    <div className="p-6 max-w-[1600px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Recruitment</h1>
          <p className="text-sm text-muted-foreground mt-1">{jobs.length} open positions · {candidates.length} active candidates</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddCandidate(true)} className="flex items-center gap-1.5 px-3 py-2 bg-card border border-border rounded-xl text-xs font-medium hover:bg-muted/50">
            <Users size={12} /> Add Candidate
          </button>
          <button onClick={() => setShowAddJob(true)} className="flex items-center gap-2 bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 shadow-md shadow-gold-500/20">
            <Plus size={13} /> New Job Opening
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {STAGES.map(s => {
          const count = candidatesByStage(s.key).length
          return (
            <div key={s.key} className="bg-card border border-border rounded-xl p-3 text-center">
              <div className="font-display font-extrabold text-2xl text-foreground">{count}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          )
        })}
      </div>

      {/* Job filter */}
      {jobs.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setJobFilter('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${jobFilter === '' ? 'bg-gold-500/10 text-gold-500 border-gold-500/20' : 'border-border text-muted-foreground hover:text-foreground'}`}
          >
            All Jobs
          </button>
          {jobs.map(j => (
            <button
              key={j.id}
              onClick={() => setJobFilter(j.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border truncate max-w-[180px] ${jobFilter === j.id ? 'bg-gold-500/10 text-gold-500 border-gold-500/20' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              {j.title}
            </button>
          ))}
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.slice(0, -1).map(stage => {
          const stageCandidates = candidatesByStage(stage.key)
          return (
            <div
              key={stage.key}
              className="flex-shrink-0 w-56 bg-card border border-border rounded-2xl flex flex-col"
              onDragOver={e => e.preventDefault()}
              onDrop={() => onDrop(stage.key)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-3 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                  <span className="text-xs font-bold text-foreground">{stage.label}</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${stage.color}18`, color: stage.color }}>
                  {stageCandidates.length}
                </span>
              </div>

              {/* Cards */}
              <div className="p-2 flex-1 min-h-[200px] space-y-2 overflow-y-auto scrollbar-thin">
                {stageCandidates.map(c => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => onDragStart(c.id)}
                    className="bg-background border border-border rounded-xl p-3 cursor-grab hover:border-border/80 hover:shadow-md transition-all group"
                  >
                    <div className="font-semibold text-xs text-foreground mb-0.5">{c.first_name} {c.last_name}</div>
                    <div className="text-[10px] text-muted-foreground mb-2">{c.current_designation ?? (c.jobs as any)?.title}</div>
                    {c.score && (
                      <div className="flex items-center gap-1 text-[10px] text-gold-500">
                        <Star size={9} fill="currentColor" /> {c.score}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground">
                      <Calendar size={9} />
                      {new Date(c.applied_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                    {c.experience_years && (
                      <div className="text-[10px] text-muted-foreground">{c.experience_years}y exp</div>
                    )}
                    {/* Move forward button */}
                    <div className="hidden group-hover:flex gap-1 mt-2 pt-2 border-t border-border/50">
                      {STAGES.findIndex(s => s.key === stage.key) < STAGES.length - 2 && (
                        <button
                          onClick={() => moveCandidate(c.id, STAGES[STAGES.findIndex(s => s.key === stage.key) + 1].key)}
                          className="flex items-center gap-1 text-[10px] text-gold-500 font-semibold hover:text-gold-400"
                        >
                          Move <ChevronRight size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {stageCandidates.length === 0 && (
                  <div className="text-center py-8 text-[10px] text-muted-foreground/50">Drop candidates here</div>
                )}
              </div>
            </div>
          )
        })}

        {/* Hired column */}
        <div
          className="flex-shrink-0 w-56 bg-green-500/5 border border-green-500/20 rounded-2xl flex flex-col"
          onDragOver={e => e.preventDefault()}
          onDrop={() => onDrop('hired')}
        >
          <div className="flex items-center justify-between px-3 py-3 border-b border-green-500/20">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-bold text-green-500">Hired 🎉</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-500">
              {candidatesByStage('hired').length}
            </span>
          </div>
          <div className="p-2 flex-1 min-h-[200px] space-y-2">
            {candidatesByStage('hired').map(c => (
              <div key={c.id} className="bg-background border border-green-500/20 rounded-xl p-3">
                <div className="font-semibold text-xs text-foreground">{c.first_name} {c.last_name}</div>
                <div className="text-[10px] text-muted-foreground">{c.current_designation}</div>
                {c.score && (
                  <div className="flex items-center gap-1 mt-1 text-[10px] text-gold-500">
                    <Star size={9} fill="currentColor" /> {c.score}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Open Jobs list */}
      {jobs.length > 0 && (
        <div className="mt-6">
          <div className="font-display font-bold text-sm mb-3">Open Positions</div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {jobs.map(job => (
              <div key={job.id} className="bg-card border border-border rounded-2xl p-4 hover:border-border/80 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-sm text-foreground">{job.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{(job.departments as any)?.name} · {job.location ?? 'Remote'}</div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-full ${job.status === 'open' ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}>
                    {job.status}
                  </span>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{job.openings} opening{job.openings > 1 ? 's' : ''}</span>
                  <span>{job.employment_type.replace(/_/g, ' ')}</span>
                  {job.experience_min > 0 && <span>{job.experience_min}+ yrs</span>}
                </div>
                {job.deadline && (
                  <div className="mt-2 text-[10px] text-muted-foreground/60">
                    Deadline: {new Date(job.deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
