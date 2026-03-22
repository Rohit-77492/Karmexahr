'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Search, Plus, Download, Filter, ChevronLeft, ChevronRight,
  MoreHorizontal, Mail, Phone, Edit, Trash2, Eye,
} from 'lucide-react'
import type { Employee } from '@/lib/supabase/database.types'
import AddEmployeeModal from '@/components/employees/AddEmployeeModal'

const STATUS_COLORS: Record<string, string> = {
  active:          'bg-green-500/10 text-green-500',
  on_leave:        'bg-gold-500/10 text-gold-500',
  inactive:        'bg-muted text-muted-foreground',
  terminated:      'bg-destructive/10 text-destructive',
  notice_period:   'bg-orange-500/10 text-orange-500',
}

const PAGE_SIZE = 10

export default function EmployeesPage() {
  const params = useParams()
  const supabase = createClient()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [companyId, setCompanyId] = useState('')
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([])

  // Get company id from slug
  useEffect(() => {
    supabase.from('companies').select('id').eq('slug', params.company as string).single()
      .then(({ data }) => { if (data) setCompanyId(data.id) })
  }, [params.company])

  // Load departments
  useEffect(() => {
    if (!companyId) return
    supabase.from('departments').select('id, name').eq('company_id', companyId).eq('is_active', true)
      .then(({ data }) => setDepartments(data ?? []))
  }, [companyId])

  const fetchEmployees = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    let query = supabase.from('employees')
      .select(`*, departments(name), designations(name)`, { count: 'exact' })
      .eq('company_id', companyId)
      .order('first_name')
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,employee_code.ilike.%${search}%`)
    if (deptFilter) query = query.eq('department_id', deptFilter)
    if (statusFilter) query = query.eq('status', statusFilter)

    const { data, count, error } = await query
    if (error) { toast.error(error.message); setLoading(false); return }
    setEmployees((data ?? []) as Employee[])
    setTotal(count ?? 0)
    setLoading(false)
  }, [companyId, page, search, deptFilter, statusFilter])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  const handleExport = async () => {
    if (!companyId) return
    const { data } = await supabase.from('employees')
      .select('employee_code,first_name,last_name,email,phone,departments(name),designations(name),status,join_date')
      .eq('company_id', companyId)
    if (!data) return
    const csv = [
      'Code,First Name,Last Name,Email,Phone,Department,Designation,Status,Join Date',
      ...data.map(e => [
        e.employee_code, e.first_name, e.last_name, e.email, e.phone ?? '',
        (e.departments as any)?.name ?? '', (e.designations as any)?.name ?? '',
        e.status, e.join_date,
      ].map(v => `"${v}"`).join(','))
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `employees-${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Exported successfully')
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6 max-w-[1400px] mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Employee Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} active employees</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl text-xs font-medium hover:bg-muted/50 transition-colors">
            <Download size={13} /> Export
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 bg-gradient-to-r from-gold-500 to-orange-500 text-background text-xs font-semibold px-4 py-2 rounded-xl hover:opacity-90 transition-opacity shadow-md shadow-gold-500/20">
            <Plus size={13} /> Add Employee
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-xl px-3 py-2 min-w-[220px] flex-1 max-w-xs">
          <Search size={13} className="text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            placeholder="Search name, email, ID..."
            className="bg-transparent text-xs outline-none w-full"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="bg-muted/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-gold-500 w-40"
          value={deptFilter}
          onChange={e => { setDeptFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          className="bg-muted/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-gold-500 w-36"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="on_leave">On Leave</option>
          <option value="notice_period">Notice Period</option>
          <option value="inactive">Inactive</option>
          <option value="terminated">Terminated</option>
        </select>
        {(search || deptFilter || statusFilter) && (
          <button
            onClick={() => { setSearch(''); setDeptFilter(''); setStatusFilter(''); setPage(1) }}
            className="text-xs text-destructive hover:underline"
          >
            Clear filters
          </button>
        )}
        <div className="ml-auto text-xs text-muted-foreground">
          {loading ? 'Loading...' : `Showing ${Math.min((page-1)*PAGE_SIZE+1, total)}–${Math.min(page*PAGE_SIZE, total)} of ${total}`}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Employee</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">ID</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Department</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Designation</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">Joined</th>
                <th className="text-right px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50 animate-pulse">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-muted" /><div className="space-y-1"><div className="h-3 bg-muted rounded w-24" /><div className="h-2 bg-muted rounded w-32" /></div></div></td>
                    {Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3 hidden sm:table-cell"><div className="h-3 bg-muted rounded w-16" /></td>)}
                    <td className="px-4 py-3" />
                  </tr>
                ))
              ) : employees.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-16 text-muted-foreground text-sm">No employees found</td></tr>
              ) : (
                employees.map(emp => {
                  const dept = (emp.departments as any)?.name
                  const desig = (emp.designations as any)?.name
                  const initials = `${emp.first_name[0]}${emp.last_name[0]}`.toUpperCase()
                  const colors = ['#6c47ff','#f0a500','#00c9b1','#ff5a65','#4d9fff','#9b6dff','#22d07a']
                  const color = colors[emp.first_name.charCodeAt(0) % colors.length]

                  return (
                    <tr key={emp.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white" style={{ background: color }}>
                            {initials}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-foreground">{emp.first_name} {emp.last_name}</div>
                            <div className="text-xs text-muted-foreground">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{emp.employee_code}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">{dept ?? '—'}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-xs text-muted-foreground">{desig ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[emp.status] ?? 'bg-muted text-muted-foreground'}`}>
                          {emp.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground">
                        {emp.join_date ? new Date(emp.join_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="View"><Eye size={13} /></button>
                          <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" title="Edit"><Edit size={13} /></button>
                          <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-blue-400" title="Email"><Mail size={13} /></button>
                          <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive" title="Delete"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={13} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = page <= 3 ? i + 1 : page + i - 2
                if (pg < 1 || pg > totalPages) return null
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium ${pg === page ? 'bg-gradient-to-r from-gold-500 to-orange-500 text-background' : 'border border-border hover:bg-muted text-muted-foreground'}`}
                  >
                    {pg}
                  </button>
                )
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showAdd && (
        <AddEmployeeModal
          companyId={companyId}
          departments={departments}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); fetchEmployees(); toast.success('Employee added!') }}
        />
      )}
    </div>
  )
}
