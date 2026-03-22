'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  GraduationCap, Play, CheckCircle, Clock, BookOpen,
  Plus, Star, Users, Award, ChevronRight, Lock,
} from 'lucide-react'
import type { TrainingCourse } from '@/lib/supabase/database.types'

const DIFF_COLOR: Record<string, string> = {
  beginner:     'bg-green-500/10 text-green-500',
  intermediate: 'bg-gold-500/10 text-gold-500',
  advanced:     'bg-red-500/10 text-destructive',
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  enrolled:    { label: 'Start',       color: 'bg-blue-500/10 text-blue-400',    icon: Play },
  in_progress: { label: 'Continue',   color: 'bg-gold-500/10 text-gold-500',    icon: Play },
  completed:   { label: 'Completed',  color: 'bg-green-500/10 text-green-500',  icon: CheckCircle },
  failed:      { label: 'Retry',      color: 'bg-destructive/10 text-destructive', icon: Play },
}

const MOCK_COURSES = [
  {
    id: '1', title: 'Leadership Essentials',    category: 'Soft Skills',   difficulty: 'intermediate',
    duration_hours: 8, instructor: 'Dr. Anjali Mehta', is_mandatory: true,
    enrolled: 142, rating: 4.7, thumbnail_color: '#6c47ff',
    my_status: 'completed', my_progress: 100,
  },
  {
    id: '2', title: 'POSH Act Compliance 2024', category: 'Compliance',    difficulty: 'beginner',
    duration_hours: 2, instructor: 'Legal Team',       is_mandatory: true,
    enrolled: 248, rating: 4.2, thumbnail_color: '#ff5a65',
    my_status: 'in_progress', my_progress: 60,
  },
  {
    id: '3', title: 'Advanced React Patterns',  category: 'Engineering',   difficulty: 'advanced',
    duration_hours: 12, instructor: 'Rohit Kapoor',   is_mandatory: false,
    enrolled: 38, rating: 4.9, thumbnail_color: '#4d9fff',
    my_status: 'enrolled', my_progress: 0,
  },
  {
    id: '4', title: 'Data-Driven Decision Making', category: 'Analytics', difficulty: 'intermediate',
    duration_hours: 6, instructor: 'Prof. Sanjay Iyer', is_mandatory: false,
    enrolled: 87, rating: 4.5, thumbnail_color: '#00c9b1',
    my_status: 'enrolled', my_progress: 0,
  },
  {
    id: '5', title: 'Excel for HR Professionals', category: 'Tools',     difficulty: 'beginner',
    duration_hours: 4, instructor: 'Priya Training Co', is_mandatory: false,
    enrolled: 115, rating: 4.3, thumbnail_color: '#f0a500',
    my_status: 'completed', my_progress: 100,
  },
  {
    id: '6', title: 'Cloud Architecture on AWS', category: 'Engineering', difficulty: 'advanced',
    duration_hours: 20, instructor: 'AWS Partner Lab', is_mandatory: false,
    enrolled: 22, rating: 4.8, thumbnail_color: '#ff8c00',
    my_status: null, my_progress: 0,
  },
]

function ProgressRing({ pct, size = 36, color = '#f0a500' }: { pct: number; size?: number; color?: string }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size/2} cy={size/2} r={r} stroke="hsl(var(--muted))" strokeWidth={4} fill="none" />
      <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={4} fill="none"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
    </svg>
  )
}

export default function TrainingPage() {
  const [tab, setTab]       = useState<'all' | 'my' | 'mandatory'>('all')
  const [category, setCategory] = useState('All')

  const categories = ['All', ...Array.from(new Set(MOCK_COURSES.map(c => c.category)))]
  const myCompleted = MOCK_COURSES.filter(c => c.my_status === 'completed').length
  const inProgress  = MOCK_COURSES.filter(c => c.my_status === 'in_progress').length
  const mandatory   = MOCK_COURSES.filter(c => c.is_mandatory)
  const mandatoryDone = mandatory.filter(c => c.my_status === 'completed').length

  const filtered = MOCK_COURSES.filter(c => {
    if (tab === 'my')        return c.my_status !== null
    if (tab === 'mandatory') return c.is_mandatory
    return true
  }).filter(c => category === 'All' || c.category === category)

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Training & Learning</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {myCompleted} completed · {inProgress} in progress · {mandatoryDone}/{mandatory.length} mandatory done
          </p>
        </div>
        <button className="flex items-center gap-2 bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 shadow-md shadow-gold-500/20">
          <Plus size={13} /> Add Course
        </button>
      </div>

      {/* My learning progress */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Completed',   value: myCompleted, color: '#22d07a', icon: CheckCircle },
          { label: 'In Progress', value: inProgress,  color: '#f0a500', icon: Clock },
          { label: 'Mandatory',   value: `${mandatoryDone}/${mandatory.length}`, color: '#ff5a65', icon: Lock },
          { label: 'Certificates', value: myCompleted, color: '#9b6dff', icon: Award },
        ].map(s => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}15`, color: s.color }}>
              <s.icon size={16} />
            </div>
            <div>
              <div className="font-display font-extrabold text-xl text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Mandatory banner */}
      {mandatoryDone < mandatory.length && (
        <div className="bg-red-500/5 border border-destructive/20 rounded-2xl px-5 py-4 flex items-center gap-4 mb-5">
          <Lock size={18} className="text-destructive flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold text-sm text-foreground">
              {mandatory.length - mandatoryDone} mandatory course{mandatory.length - mandatoryDone > 1 ? 's' : ''} pending
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Complete mandatory training to stay compliant
            </div>
          </div>
          <button onClick={() => setTab('mandatory')} className="text-xs font-semibold text-destructive hover:underline whitespace-nowrap">
            View →
          </button>
        </div>
      )}

      {/* Tabs + Category filter */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 bg-muted/50 border border-border rounded-xl p-1">
          {[['all','All Courses'],['my','My Learning'],['mandatory','Mandatory']].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === k ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${category === cat ? 'bg-gold-500/10 text-gold-500 border-gold-500/20' : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Course grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(course => {
          const sc = course.my_status ? STATUS_CONFIG[course.my_status] : null
          const Icon = sc?.icon ?? BookOpen

          return (
            <div key={course.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:border-border/70 hover:-translate-y-0.5 transition-all group">
              {/* Thumbnail */}
              <div className="h-28 relative flex items-center justify-center overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${course.thumbnail_color}20, ${course.thumbnail_color}08)` }}>
                <GraduationCap size={40} style={{ color: course.thumbnail_color, opacity: 0.4 }} />
                {course.is_mandatory && (
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-destructive/90 text-white text-[9px] font-bold px-2 py-1 rounded-full">
                    <Lock size={8} /> MANDATORY
                  </div>
                )}
                {course.my_status === 'completed' && (
                  <div className="absolute top-3 right-3">
                    <CheckCircle size={20} className="text-green-500" fill="currentColor" />
                  </div>
                )}
                {course.my_status === 'in_progress' && (
                  <div className="absolute top-3 right-3">
                    <ProgressRing pct={course.my_progress} size={32} color={course.thumbnail_color} />
                  </div>
                )}
              </div>

              <div className="p-4">
                {/* Meta */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{course.category}</span>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${DIFF_COLOR[course.difficulty]}`}>
                    {course.difficulty}
                  </span>
                </div>

                <h3 className="font-display font-bold text-sm text-foreground mb-1 group-hover:text-gold-500 transition-colors">
                  {course.title}
                </h3>
                <p className="text-[11px] text-muted-foreground mb-3">{course.instructor}</p>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><Clock size={10} /> {course.duration_hours}h</span>
                  <span className="flex items-center gap-1"><Users size={10} /> {course.enrolled}</span>
                  <span className="flex items-center gap-1"><Star size={10} className="text-gold-500" fill="currentColor" /> {course.rating}</span>
                </div>

                {/* Progress bar for in-progress */}
                {course.my_status === 'in_progress' && (
                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Progress</span><span>{course.my_progress}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${course.my_progress}%`, background: course.thumbnail_color }} />
                    </div>
                  </div>
                )}

                {/* CTA */}
                <button className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  sc ? sc.color + ' hover:opacity-80' : 'bg-gold-500/10 text-gold-500 hover:bg-gold-500/20'
                }`}>
                  <Icon size={12} />
                  {sc ? sc.label : 'Enroll Now'}
                  {course.my_status !== 'completed' && <ChevronRight size={10} />}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
