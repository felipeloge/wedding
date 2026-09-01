import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Pencil,
  Trash2,
  Send,
  Download,
  UserPlus,
  X,
  Loader2,
  Users,
  Check,
  Minus,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Guest, GuestCompanion } from '../lib/types'
import { formatDateShort } from '../lib/utils'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Badge } from '../components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog'

type GuestWithCompanions = Guest & { guest_companions: GuestCompanion[] }

interface CompanionDraft {
  tempId: string
  id?: string
  name: string
  phone: string
}

interface GuestForm {
  name: string
  phone: string
  observations: string
}

const EMPTY_FORM: GuestForm = { name: '', phone: '', observations: '' }

const RSVP_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  declined: 'Recusado',
}

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'gold'

const RSVP_BADGE: Record<string, BadgeVariant> = {
  pending: 'secondary',
  confirmed: 'default',
  declined: 'destructive',
}

function exportCsv(guests: GuestWithCompanions[]) {
  const headers = ['Nome', 'Celular', 'Acompanhantes', 'Status', 'Data Confirmação', 'Observações']
  const rows = guests.map((g) => [
    g.name,
    g.phone,
    g.guest_companions.map((c) => c.name + (c.phone ? ` (${c.phone})` : '')).join('; '),
    RSVP_LABELS[g.rsvp_status] ?? g.rsvp_status,
    formatDateShort(g.rsvp_confirmed_at),
    g.observations ?? '',
  ])
  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `convidados-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function GuestsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGuest, setEditingGuest] = useState<GuestWithCompanions | null>(null)
  const [form, setForm] = useState<GuestForm>(EMPTY_FORM)
  const [companions, setCompanions] = useState<CompanionDraft[]>([])
  const [deleteTarget, setDeleteTarget] = useState<GuestWithCompanions | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  // ── Query ─────────────────────────────────────────────────
  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('*, guest_companions(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as GuestWithCompanions[]
    },
  })

  // ── Derived ───────────────────────────────────────────────
  const filtered = guests
    .filter((g) => g.name.toLowerCase().includes(search.toLowerCase()))
    .filter((g) => statusFilter === 'all' || g.rsvp_status === statusFilter)

  const totalConfirmed = guests.filter((g) => g.rsvp_status === 'confirmed').length
  const totalPending = guests.filter((g) => g.rsvp_status === 'pending').length
  const totalCompanions = guests.reduce((acc, g) => acc + g.guest_companions.length, 0)

  // ── Mutations ─────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (payload: {
      form: GuestForm
      companions: CompanionDraft[]
      editing: GuestWithCompanions | null
    }) => {
      const { form, companions, editing } = payload

      if (editing) {
        const { error: updateErr } = await supabase
          .from('guests')
          .update({
            name: form.name.trim(),
            phone: form.phone.trim(),
            observations: form.observations.trim() || null,
          })
          .eq('id', editing.id)
        if (updateErr) throw updateErr

        // Replace companions: delete all then re-insert
        const { error: delErr } = await supabase
          .from('guest_companions')
          .delete()
          .eq('guest_id', editing.id)
        if (delErr) throw delErr

        if (companions.length > 0) {
          const { error: insErr } = await supabase.from('guest_companions').insert(
            companions.map((c) => ({
              guest_id: editing.id,
              name: c.name.trim(),
              phone: c.phone.trim() || null,
            })),
          )
          if (insErr) throw insErr
        }
      } else {
        const { data: newGuest, error: insErr } = await supabase
          .from('guests')
          .insert({
            name: form.name.trim(),
            phone: form.phone.trim(),
            observations: form.observations.trim() || null,
          })
          .select()
          .single()
        if (insErr) throw insErr

        if (companions.length > 0) {
          const { error: compErr } = await supabase.from('guest_companions').insert(
            companions.map((c) => ({
              guest_id: newGuest.id,
              name: c.name.trim(),
              phone: c.phone.trim() || null,
            })),
          )
          if (compErr) throw compErr
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] })
      closeDialog()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('guests').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] })
      setDeleteTarget(null)
    },
  })

  // ── Dialog helpers ────────────────────────────────────────
  const openCreate = () => {
    setEditingGuest(null)
    setForm(EMPTY_FORM)
    setCompanions([])
    setIsDialogOpen(true)
  }

  const openEdit = (guest: GuestWithCompanions) => {
    setEditingGuest(guest)
    setForm({ name: guest.name, phone: guest.phone, observations: guest.observations ?? '' })
    setCompanions(
      guest.guest_companions.map((c) => ({
        tempId: c.id,
        id: c.id,
        name: c.name,
        phone: c.phone ?? '',
      })),
    )
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingGuest(null)
    setForm(EMPTY_FORM)
    setCompanions([])
  }

  const addCompanion = () => {
    setCompanions((prev) => [...prev, { tempId: crypto.randomUUID(), name: '', phone: '' }])
  }

  const removeCompanion = (tempId: string) => {
    setCompanions((prev) => prev.filter((c) => c.tempId !== tempId))
  }

  const updateCompanion = (tempId: string, field: 'name' | 'phone', value: string) => {
    setCompanions((prev) =>
      prev.map((c) => (c.tempId === tempId ? { ...c, [field]: value } : c)),
    )
  }

  const handleSave = () => {
    if (!form.name.trim() || !form.phone.trim()) return
    const validCompanions = companions.filter((c) => c.name.trim())
    saveMutation.mutate({ form, companions: validCompanions, editing: editingGuest })
  }

  const handleSendWhatsApp = async (guest: GuestWithCompanions) => {
    setSendingId(guest.id)
    try {
      const { error } = await supabase.functions.invoke('send-whatsapp', {
        body: { guestId: guest.id },
      })
      if (error) throw error
      alert(`Mensagem enviada para ${guest.name}!`)
    } catch (err) {
      alert(
        `Erro ao enviar mensagem: ${err instanceof Error ? err.message : 'Tente novamente.'}`,
      )
    } finally {
      setSendingId(null)
    }
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-text">Convidados</h1>
          <p className="font-body text-sm text-text-muted mt-1">
            {guests.length} convidado{guests.length !== 1 ? 's' : ''} · {totalConfirmed}{' '}
            confirmado{totalConfirmed !== 1 ? 's' : ''} · {totalPending} pendente
            {totalPending !== 1 ? 's' : ''} · {totalCompanions} acompanhante
            {totalCompanions !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCsv(filtered)}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Novo convidado
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center">
        <Input
          placeholder="Buscar por nome..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          {[
            { value: 'all', label: 'Todos' },
            { value: 'pending', label: 'Pendentes' },
            { value: 'confirmed', label: 'Confirmados' },
            { value: 'declined', label: 'Recusados' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={`font-body text-xs uppercase tracking-widest px-4 py-2 border transition-colors ${
                statusFilter === value
                  ? 'bg-primary text-white border-primary'
                  : 'border-border text-text-muted hover:border-primary/40 hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-lowest border border-border text-center py-20">
          <Users className="w-8 h-8 text-text-muted mx-auto mb-3 opacity-40" />
          <p className="font-body text-sm text-text-muted">Nenhum convidado encontrado.</p>
        </div>
      ) : (
        <div className="bg-surface-lowest border border-border overflow-auto">
          <table className="w-full min-w-[820px]">
            <thead>
              <tr className="border-b border-border">
                {['Nome', 'Celular', 'Acompanhantes', 'Status', 'Confirmação', 'Ações'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-body text-xs uppercase tracking-wider text-text-muted font-medium"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((guest) => (
                <tr
                  key={guest.id}
                  className="border-b border-border last:border-0 hover:bg-surface/40 transition-colors"
                >
                  <td className="px-4 py-3 font-body text-sm text-text font-medium">
                    {guest.name}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-text-muted">{guest.phone}</td>
                  <td className="px-4 py-3">
                    {guest.guest_companions.length === 0 ? (
                      <span className="font-body text-xs text-text-muted">—</span>
                    ) : (
                      <div className="space-y-0.5">
                        {guest.guest_companions.map((c) => (
                          <div key={c.id} className="flex items-center gap-1 font-body text-xs text-text-muted">
                            {c.rsvp_status === 'confirmed' ? (
                              <Check className="w-3 h-3 shrink-0 text-primary" />
                            ) : c.rsvp_status === 'declined' ? (
                              <X className="w-3 h-3 shrink-0 text-red-500" />
                            ) : (
                              <Minus className="w-3 h-3 shrink-0 opacity-30" />
                            )}
                            {c.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={RSVP_BADGE[guest.rsvp_status] ?? 'secondary'}>
                      {RSVP_LABELS[guest.rsvp_status] ?? guest.rsvp_status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-text-muted">
                    {formatDateShort(guest.rsvp_confirmed_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSendWhatsApp(guest)}
                        disabled={sendingId === guest.id}
                        title="Enviar convite via WhatsApp"
                        className="p-1.5 text-text-muted hover:text-[#25D366] transition-colors disabled:opacity-40"
                      >
                        {sendingId === guest.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openEdit(guest)}
                        title="Editar"
                        className="p-1.5 text-text-muted hover:text-text transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(guest)}
                        title="Excluir"
                        className="p-1.5 text-text-muted hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingGuest ? 'Editar convidado' : 'Novo convidado'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="g-name">Nome *</Label>
              <Input
                id="g-name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="g-phone">Celular *</Label>
              <Input
                id="g-phone"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="5511999999999"
              />
              <p className="text-xs text-text-muted">
                Incluir código do país e DDD, sem espaços (ex: 5511999999999)
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="g-obs">Observações</Label>
              <Textarea
                id="g-obs"
                value={form.observations}
                onChange={(e) => setForm((prev) => ({ ...prev, observations: e.target.value }))}
                placeholder="Restrições alimentares, mobilidade reduzida..."
                rows={2}
              />
            </div>

            {/* Companions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Acompanhantes</Label>
                <button
                  type="button"
                  onClick={addCompanion}
                  className="flex items-center gap-1 text-xs text-primary hover:opacity-75 font-body transition-opacity"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Adicionar
                </button>
              </div>

              {companions.length === 0 ? (
                <p className="text-xs text-text-muted py-1">Nenhum acompanhante cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {companions.map((c) => (
                    <div
                      key={c.tempId}
                      className="flex items-start gap-2 bg-surface p-2 border border-border"
                    >
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Input
                          value={c.name}
                          onChange={(e) => updateCompanion(c.tempId, 'name', e.target.value)}
                          placeholder="Nome"
                          className="h-8 text-sm"
                        />
                        <Input
                          value={c.phone}
                          onChange={(e) => updateCompanion(c.tempId, 'phone', e.target.value)}
                          placeholder="Celular (opcional)"
                          className="h-8 text-sm"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCompanion(c.tempId)}
                        className="p-1 mt-0.5 text-text-muted hover:text-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saveMutation.isPending || !form.name.trim() || !form.phone.trim()}
            >
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingGuest ? 'Salvar alterações' : 'Criar convidado'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Excluir convidado</DialogTitle>
          </DialogHeader>
          <p className="font-body text-sm text-text-muted py-2">
            Tem certeza que deseja excluir{' '}
            <strong className="text-text">{deleteTarget?.name}</strong> e todos os seus
            acompanhantes? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
