'use client'

import { useState, useCallback, useRef } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  PlusIcon,
  XMarkIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

// Types
interface DemoShift {
  id: string
  staffId: string
  day: number // 0 = Mon, 6 = Sun
  startHour: number
  endHour: number
  status: 'draft' | 'published' | 'confirmed'
  role: string
  location: string
  roleColor: { bg: string; text: string; border: string }
}

interface DemoStaff {
  id: string
  name: string
  initials: string
  avatar: string // bg color class
  roles: string[]
}

// Mock data
const STAFF: DemoStaff[] = [
  { id: '1', name: 'Sarah Kim', initials: 'SK', avatar: 'bg-violet-500', roles: ['Barista', 'Cashier'] },
  { id: '2', name: 'James Liu', initials: 'JL', avatar: 'bg-blue-500', roles: ['Cashier', 'Floor Staff'] },
  { id: '3', name: 'Maria Garcia', initials: 'MG', avatar: 'bg-emerald-500', roles: ['Supervisor', 'Barista'] },
  { id: '4', name: 'Tom Wilson', initials: 'TW', avatar: 'bg-amber-500', roles: ['Warehouse', 'Floor Staff'] },
  { id: '5', name: 'Priya Patel', initials: 'PP', avatar: 'bg-rose-500', roles: ['Barista', 'Supervisor'] },
]

const LOCATIONS = ['Main Store', 'Warehouse', 'Downtown Branch']

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Barista: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  Cashier: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  Supervisor: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Warehouse: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  'Floor Staff': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}

const INITIAL_SHIFTS: DemoShift[] = [
  { id: generateId(), staffId: '1', day: 0, startHour: 9, endHour: 17, status: 'confirmed', role: 'Barista', location: 'Main Store', roleColor: ROLE_COLORS['Barista'] },
  { id: generateId(), staffId: '1', day: 1, startHour: 9, endHour: 17, status: 'confirmed', role: 'Barista', location: 'Main Store', roleColor: ROLE_COLORS['Barista'] },
  { id: generateId(), staffId: '1', day: 3, startHour: 12, endHour: 20, status: 'published', role: 'Cashier', location: 'Downtown Branch', roleColor: ROLE_COLORS['Cashier'] },
  { id: generateId(), staffId: '1', day: 5, startHour: 10, endHour: 18, status: 'draft', role: 'Barista', location: 'Main Store', roleColor: ROLE_COLORS['Barista'] },

  { id: generateId(), staffId: '2', day: 0, startHour: 12, endHour: 20, status: 'published', role: 'Cashier', location: 'Main Store', roleColor: ROLE_COLORS['Cashier'] },
  { id: generateId(), staffId: '2', day: 2, startHour: 9, endHour: 17, status: 'confirmed', role: 'Floor Staff', location: 'Downtown Branch', roleColor: ROLE_COLORS['Floor Staff'] },
  { id: generateId(), staffId: '2', day: 4, startHour: 9, endHour: 17, status: 'confirmed', role: 'Cashier', location: 'Main Store', roleColor: ROLE_COLORS['Cashier'] },

  { id: generateId(), staffId: '3', day: 1, startHour: 6, endHour: 14, status: 'confirmed', role: 'Supervisor', location: 'Main Store', roleColor: ROLE_COLORS['Supervisor'] },
  { id: generateId(), staffId: '3', day: 2, startHour: 6, endHour: 14, status: 'confirmed', role: 'Supervisor', location: 'Main Store', roleColor: ROLE_COLORS['Supervisor'] },
  { id: generateId(), staffId: '3', day: 4, startHour: 12, endHour: 20, status: 'draft', role: 'Barista', location: 'Downtown Branch', roleColor: ROLE_COLORS['Barista'] },
  { id: generateId(), staffId: '3', day: 6, startHour: 9, endHour: 15, status: 'draft', role: 'Supervisor', location: 'Main Store', roleColor: ROLE_COLORS['Supervisor'] },

  { id: generateId(), staffId: '4', day: 0, startHour: 7, endHour: 15, status: 'confirmed', role: 'Warehouse', location: 'Warehouse', roleColor: ROLE_COLORS['Warehouse'] },
  { id: generateId(), staffId: '4', day: 2, startHour: 7, endHour: 15, status: 'published', role: 'Warehouse', location: 'Warehouse', roleColor: ROLE_COLORS['Warehouse'] },
  { id: generateId(), staffId: '4', day: 3, startHour: 9, endHour: 17, status: 'confirmed', role: 'Floor Staff', location: 'Main Store', roleColor: ROLE_COLORS['Floor Staff'] },
  { id: generateId(), staffId: '4', day: 5, startHour: 10, endHour: 16, status: 'draft', role: 'Warehouse', location: 'Warehouse', roleColor: ROLE_COLORS['Warehouse'] },

  { id: generateId(), staffId: '5', day: 1, startHour: 14, endHour: 22, status: 'published', role: 'Barista', location: 'Main Store', roleColor: ROLE_COLORS['Barista'] },
  { id: generateId(), staffId: '5', day: 3, startHour: 9, endHour: 17, status: 'confirmed', role: 'Supervisor', location: 'Downtown Branch', roleColor: ROLE_COLORS['Supervisor'] },
  { id: generateId(), staffId: '5', day: 5, startHour: 8, endHour: 16, status: 'published', role: 'Barista', location: 'Main Store', roleColor: ROLE_COLORS['Barista'] },
  { id: generateId(), staffId: '5', day: 6, startHour: 10, endHour: 18, status: 'draft', role: 'Supervisor', location: 'Downtown Branch', roleColor: ROLE_COLORS['Supervisor'] },
]

const STATUS_STYLES: Record<string, { dot: string; label: string }> = {
  draft: { dot: 'bg-gray-400', label: 'Draft' },
  published: { dot: 'bg-blue-500', label: 'Published' },
  confirmed: { dot: 'bg-green-500', label: 'Confirmed' },
}

// Shift Modal
function ShiftModal({
  shift,
  staff,
  onSave,
  onDelete,
  onClose,
}: {
  shift: Partial<DemoShift> & { staffId: string; day: number }
  staff: DemoStaff[]
  onSave: (shift: DemoShift) => void
  onDelete?: (id: string) => void
  onClose: () => void
}) {
  const isEdit = !!shift.id
  const selectedStaff = staff.find((s) => s.id === shift.staffId)
  const [form, setForm] = useState({
    staffId: shift.staffId,
    startHour: shift.startHour ?? 9,
    endHour: shift.endHour ?? 17,
    role: shift.role ?? selectedStaff?.roles[0] ?? 'Barista',
    location: shift.location ?? LOCATIONS[0],
    status: shift.status ?? ('draft' as DemoShift['status']),
  })

  const currentStaff = staff.find((s) => s.id === form.staffId)

  const handleSave = () => {
    const roleColor = ROLE_COLORS[form.role] || ROLE_COLORS['Barista']
    onSave({
      id: shift.id || generateId(),
      staffId: form.staffId,
      day: shift.day,
      startHour: form.startHour,
      endHour: form.endHour,
      status: form.status,
      role: form.role,
      location: form.location,
      roleColor,
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">
            {isEdit ? 'Edit Shift' : 'Create Shift'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Day</label>
            <div className="px-3 py-2.5 bg-gray-50 rounded-lg text-sm text-gray-600 font-medium">
              {DAY_FULL[shift.day]}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Staff</label>
            <select
              value={form.staffId}
              onChange={(e) => {
                const newStaff = staff.find((s) => s.id === e.target.value)
                setForm({
                  ...form,
                  staffId: e.target.value,
                  role: newStaff?.roles[0] ?? form.role,
                })
              }}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Time</label>
              <select
                value={form.startHour}
                onChange={(e) => setForm({ ...form, startHour: Number(e.target.value) })}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                {Array.from({ length: 18 }, (_, i) => i + 5).map((h) => (
                  <option key={h} value={h}>{`${h.toString().padStart(2, '0')}:00`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End Time</label>
              <select
                value={form.endHour}
                onChange={(e) => setForm({ ...form, endHour: Number(e.target.value) })}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                {Array.from({ length: 18 }, (_, i) => i + 6).map((h) => (
                  <option key={h} value={h}>{`${h.toString().padStart(2, '0')}:00`}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              {(currentStaff?.roles ?? Object.keys(ROLE_COLORS)).map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
            <select
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            >
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
            <div className="flex gap-2">
              {(['draft', 'published', 'confirmed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setForm({ ...form, status: s })}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                    form.status === s
                      ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLES[s].dot}`} />
                  {STATUS_STYLES[s].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <div>
            {isEdit && onDelete && (
              <button
                onClick={() => onDelete(shift.id!)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 text-sm font-semibold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors shadow-sm"
            >
              {isEdit ? 'Save Changes' : 'Create Shift'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Toast notification
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'info'; onClose: () => void }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-slide-up ${
        type === 'success'
          ? 'bg-gray-900 text-white'
          : 'bg-indigo-600 text-white'
      }`}
    >
      <span>{message}</span>
      <button onClick={onClose} className="p-0.5 hover:bg-white/20 rounded transition-colors">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  )
}

// Shift block in the grid
function DemoShiftBlock({
  shift,
  onClick,
  onDragStart,
}: {
  shift: DemoShift
  onClick: () => void
  onDragStart: (e: React.DragEvent) => void
}) {
  const hours = shift.endHour - shift.startHour
  const timeStr = `${shift.startHour.toString().padStart(2, '0')}:00 - ${shift.endHour.toString().padStart(2, '0')}:00`

  return (
    <button
      className={`w-full rounded-lg border-2 p-1.5 sm:p-2 text-left hover:shadow-md transition-all cursor-pointer ${shift.roleColor.bg} ${shift.roleColor.text} ${shift.roleColor.border}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      draggable
      onDragStart={(e) => {
        e.stopPropagation()
        onDragStart(e)
      }}
      title={`${shift.role} - ${timeStr} - ${shift.location}`}
    >
      <div className="text-[10px] sm:text-xs font-semibold truncate">{timeStr}</div>
      <div className="text-[9px] sm:text-[11px] truncate opacity-80">{shift.location}</div>
      <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
        <span className={`inline-flex items-center gap-1 text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded-md bg-white/60`}>
          <span className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${STATUS_STYLES[shift.status].dot}`} />
          {STATUS_STYLES[shift.status].label}
        </span>
        <span className="text-[8px] sm:text-[10px] opacity-70">{hours}h</span>
      </div>
    </button>
  )
}

export default function InteractiveScheduler() {
  const [shifts, setShifts] = useState<DemoShift[]>(INITIAL_SHIFTS)
  const [weekOffset, setWeekOffset] = useState(0)
  const [modal, setModal] = useState<{
    shift?: DemoShift
    staffId: string
    day: number
  } | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null)
  const [dragShiftId, setDragShiftId] = useState<string | null>(null)
  const toastTimeout = useRef<ReturnType<typeof setTimeout>>()

  const showToast = useCallback((message: string, type: 'success' | 'info' = 'success') => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current)
    setToast({ message, type })
    toastTimeout.current = setTimeout(() => setToast(null), 3000)
  }, [])

  // Week dates
  const today = new Date()
  const mondayBase = new Date(today)
  mondayBase.setDate(today.getDate() - ((today.getDay() + 6) % 7) + weekOffset * 7)

  const weekDates = DAYS.map((_, i) => {
    const d = new Date(mondayBase)
    d.setDate(mondayBase.getDate() + i)
    return d
  })

  const formatDate = (d: Date) => `${d.getDate()}`
  const formatRange = () => {
    const start = weekDates[0]
    const end = weekDates[6]
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[start.getMonth()]} ${start.getDate()} - ${months[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`
  }

  const handleCellClick = (staffId: string, day: number) => {
    setModal({ staffId, day })
  }

  const handleShiftClick = (shift: DemoShift) => {
    setModal({ shift, staffId: shift.staffId, day: shift.day })
  }

  const handleSave = (shift: DemoShift) => {
    setShifts((prev) => {
      const exists = prev.find((s) => s.id === shift.id)
      if (exists) {
        showToast('Shift updated')
        return prev.map((s) => (s.id === shift.id ? shift : s))
      }
      showToast('Shift created')
      return [...prev, shift]
    })
    setModal(null)
  }

  const handleDelete = (id: string) => {
    setShifts((prev) => prev.filter((s) => s.id !== id))
    setModal(null)
    showToast('Shift deleted')
  }

  const handleDragStart = (e: React.DragEvent, shiftId: string) => {
    setDragShiftId(shiftId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', shiftId)
  }

  const handleDrop = (e: React.DragEvent, staffId: string, day: number) => {
    e.preventDefault()
    if (!dragShiftId) return
    setShifts((prev) =>
      prev.map((s) =>
        s.id === dragShiftId ? { ...s, staffId, day } : s
      )
    )
    setDragShiftId(null)
    showToast('Shift moved', 'info')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  // Stats
  const totalShifts = shifts.length
  const totalHours = shifts.reduce((sum, s) => sum + (s.endHour - s.startHour), 0)
  const confirmedCount = shifts.filter((s) => s.status === 'confirmed').length
  const draftCount = shifts.filter((s) => s.status === 'draft').length

  return (
    <section id="demo" className="py-20 sm:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 ring-1 ring-indigo-100 mb-4">
            <CalendarDaysIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-medium text-indigo-700">Interactive Demo</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
            Try the shift scheduler
          </h2>
          <p className="mt-3 text-lg text-gray-500 max-w-xl mx-auto">
            Click any cell to create a shift. Drag shifts to move them. This is the actual scheduler your team will use.
          </p>
        </div>

        {/* Scheduler */}
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-900/5 ring-1 ring-gray-200/80 overflow-hidden">
          {/* Header bar */}
          <div className="bg-white border-b border-gray-200/60 px-4 sm:px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setWeekOffset((w) => w - 1)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  </button>
                  <button
                    onClick={() => setWeekOffset((w) => w + 1)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900">{formatRange()}</h3>
                </div>
                <button
                  onClick={() => setWeekOffset(0)}
                  className="hidden sm:inline-flex bg-white ring-1 ring-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 shadow-sm px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center gap-2 sm:gap-4">
                {/* Quick stats */}
                <div className="hidden lg:flex items-center gap-4 text-xs text-gray-500">
                  <span>{totalShifts} shifts</span>
                  <span className="w-px h-3 bg-gray-200" />
                  <span>{totalHours}h total</span>
                  <span className="w-px h-3 bg-gray-200" />
                  <span className="text-green-600">{confirmedCount} confirmed</span>
                  <span className="w-px h-3 bg-gray-200" />
                  <span className="text-gray-400">{draftCount} drafts</span>
                </div>
                <button
                  onClick={() => setModal({ staffId: STAFF[0].id, day: 0 })}
                  className="inline-flex items-center gap-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 shadow-sm font-medium text-xs sm:text-sm px-3 sm:px-4 py-2 transition-colors"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Create Shift</span>
                </button>
              </div>
            </div>
          </div>

          {/* Schedule Grid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-200/60">
                  <th className="w-36 sm:w-44 text-left text-xs font-medium text-gray-500 px-3 sm:px-4 py-3 bg-gray-50/50">
                    Staff
                  </th>
                  {DAYS.map((day, i) => {
                    const date = weekDates[i]
                    const isToday = date.toDateString() === today.toDateString()
                    return (
                      <th
                        key={day}
                        className={`text-center text-xs font-medium px-1 sm:px-2 py-3 ${
                          isToday ? 'bg-indigo-50/50 text-indigo-700' : 'text-gray-500 bg-gray-50/50'
                        }`}
                      >
                        <div>{day}</div>
                        <div className={`text-lg font-semibold mt-0.5 ${isToday ? 'text-indigo-600' : 'text-gray-900'}`}>
                          {formatDate(date)}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {STAFF.map((member) => (
                  <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50/30">
                    <td className="px-3 sm:px-4 py-2">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-[10px] sm:text-xs font-bold shrink-0 ${member.avatar}`}>
                          {member.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">{member.name}</div>
                          <div className="text-[10px] sm:text-xs text-gray-400 truncate">{member.roles.join(', ')}</div>
                        </div>
                      </div>
                    </td>
                    {DAYS.map((_, dayIdx) => {
                      const cellShifts = shifts.filter(
                        (s) => s.staffId === member.id && s.day === dayIdx
                      )
                      const isToday = weekDates[dayIdx].toDateString() === today.toDateString()
                      return (
                        <td
                          key={dayIdx}
                          className={`px-1 py-1.5 align-top cursor-pointer transition-colors ${
                            isToday ? 'bg-indigo-50/30' : ''
                          } ${dragShiftId ? 'hover:bg-indigo-50' : 'hover:bg-gray-50'}`}
                          onClick={() => handleCellClick(member.id, dayIdx)}
                          onDrop={(e) => handleDrop(e, member.id, dayIdx)}
                          onDragOver={handleDragOver}
                        >
                          <div className="min-h-[52px] sm:min-h-[60px] space-y-1">
                            {cellShifts.map((shift) => (
                              <DemoShiftBlock
                                key={shift.id}
                                shift={shift}
                                onClick={() => handleShiftClick(shift)}
                                onDragStart={(e) => handleDragStart(e, shift.id)}
                              />
                            ))}
                            {cellShifts.length === 0 && (
                              <div className="h-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                <PlusIcon className="w-4 h-4 text-gray-300" />
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer with legend */}
          <div className="border-t border-gray-200/60 bg-gray-50/50 px-4 sm:px-6 py-3">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-gray-500">
                <span className="font-medium text-gray-700">Status:</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  Draft
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Published
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Confirmed
                </span>
              </div>
              <div className="text-xs text-gray-400">
                Click to create &bull; Drag to move
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <ShiftModal
          shift={modal.shift ? modal.shift : { staffId: modal.staffId, day: modal.day }}
          staff={STAFF}
          onSave={handleSave}
          onDelete={modal.shift ? handleDelete : undefined}
          onClose={() => setModal(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </section>
  )
}
