'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { Users, ChevronDown, ChevronRight } from 'lucide-react'
import { getAvatarColor } from '@/lib/utils'

interface OrgNode {
  id: string
  name: string
  designation: string
  department: string
  avatarColor: string
  reports: OrgNode[]
  expanded?: boolean
}

function OrgCard({ node, level = 0 }: { node: OrgNode; level?: number }) {
  const [expanded, setExpanded] = useState(level < 2)
  const hasReports = node.reports.length > 0

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div className={`relative bg-card border rounded-xl p-3 w-40 text-center hover:border-gold-500/40 hover:shadow-lg hover:shadow-gold-500/5 transition-all group ${level === 0 ? 'border-gold-500/30 shadow-md' : 'border-border'}`}>
        {level === 0 && <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-gold-500/5 to-orange-500/5" />}
        <div className="relative">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white mx-auto mb-2" style={{ background: node.avatarColor }}>
            {node.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0,2)}
          </div>
          <div className="text-xs font-semibold text-foreground leading-tight mb-0.5 truncate">{node.name}</div>
          <div className="text-[10px] text-muted-foreground truncate">{node.designation}</div>
          <div className="text-[9px] text-muted-foreground/60 mt-0.5 truncate">{node.department}</div>
          {hasReports && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors z-10"
            >
              {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>
          )}
        </div>
      </div>

      {/* Reports */}
      {hasReports && expanded && (
        <div className="mt-6 relative">
          {/* Vertical line from card */}
          <div className="absolute top-0 left-1/2 w-px h-6 bg-border -translate-y-6" />

          {/* Horizontal line connecting children */}
          {node.reports.length > 1 && (
            <div className="absolute top-0 left-0 right-0 h-px bg-border" style={{ top: '0px' }} />
          )}

          <div className="flex gap-8 items-start pt-0">
            {node.reports.map((child, i) => (
              <div key={child.id} className="relative flex flex-col items-center">
                {/* Vertical connector to each child */}
                <div className="w-px h-6 bg-border mb-0" />
                <OrgCard node={child} level={level + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Build hierarchical tree from flat list
function buildTree(employees: any[]): OrgNode[] {
  const map = new Map<string, OrgNode>()
  const roots: OrgNode[] = []

  employees.forEach(e => {
    map.set(e.id, {
      id: e.id,
      name: `${e.first_name} ${e.last_name}`,
      designation: e.designations?.name ?? 'Employee',
      department: e.departments?.name ?? 'General',
      avatarColor: getAvatarColor(`${e.first_name} ${e.last_name}`),
      reports: [],
    })
  })

  employees.forEach(e => {
    if (e.manager_id && map.has(e.manager_id)) {
      map.get(e.manager_id)!.reports.push(map.get(e.id)!)
    } else {
      roots.push(map.get(e.id)!)
    }
  })

  return roots
}

export default function OrgChartPage() {
  const params   = useParams()
  const supabase = createClient()
  const [tree, setTree]       = useState<OrgNode[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [departments, setDepartments] = useState<any[]>([])
  const [totalCount, setTotalCount]   = useState(0)

  useEffect(() => {
    const load = async () => {
      const { data: company } = await supabase.from('companies').select('id').eq('slug', params.company as string).single()
      if (!company) return

      const [{ data: emps }, { data: depts }] = await Promise.all([
        supabase.from('employees')
          .select('id, first_name, last_name, manager_id, departments(name), designations(name)')
          .eq('company_id', company.id).eq('status', 'active').order('first_name'),
        supabase.from('departments').select('id, name').eq('company_id', company.id).eq('is_active', true),
      ])

      setDepartments(depts ?? [])
      setTotalCount(emps?.length ?? 0)

      let filtered = emps ?? []
      if (deptFilter) filtered = filtered.filter((e: any) => e.departments?.name === deptFilter)
      if (search) filtered = filtered.filter((e: any) =>
        `${e.first_name} ${e.last_name}`.toLowerCase().includes(search.toLowerCase())
      )

      setTree(buildTree(filtered))
      setLoading(false)
    }
    load()
  }, [params.company, search, deptFilter])

  return (
    <div className="p-6 max-w-full mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Org Chart</h1>
          <p className="text-sm text-muted-foreground mt-1">{totalCount} employees · Hierarchical view</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2">
          <input type="text" placeholder="Search employee..." className="bg-transparent text-xs outline-none w-40"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="bg-card border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-gold-500"
          value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
        </select>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground text-sm">Building org chart...</div>
        </div>
      ) : tree.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-16 text-center">
          <Users size={40} className="text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No employees found</p>
        </div>
      ) : (
        <div className="overflow-auto pb-10">
          <div className="inline-flex flex-col items-center min-w-max py-4 px-8">
            {tree.map((root, i) => (
              <div key={root.id} className={i > 0 ? 'mt-12' : ''}>
                <OrgCard node={root} level={0} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gold-500/20 border border-gold-500/30" /> Top level</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-card border border-border" /> Direct report</div>
        <div className="flex items-center gap-1.5"><div className="w-4 h-px bg-border" /> Reports to</div>
      </div>
    </div>
  )
}
