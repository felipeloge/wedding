import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, Upload, X, Loader2, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Gift } from '../lib/types'
import { formatCents, cn } from '../lib/utils'
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

interface GiftForm {
  name: string
  description: string
  price: string
}

const EMPTY_FORM: GiftForm = { name: '', description: '', price: '' }

export function GiftsPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGift, setEditingGift] = useState<Gift | null>(null)
  const [form, setForm] = useState<GiftForm>(EMPTY_FORM)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Gift | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Queries ───────────────────────────────────────────────
  const { data: gifts = [], isLoading } = useQuery({
    queryKey: ['gifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gifts')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  // ── Mutations ─────────────────────────────────────────────
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['gifts'] })

  const createMutation = useMutation({
    mutationFn: async (payload: { form: GiftForm; imageUrl: string | null }) => {
      const { error } = await supabase.from('gifts').insert({
        name: payload.form.name.trim(),
        description: payload.form.description.trim() || null,
        price_cents: priceToCents(payload.form.price),
        image_url: payload.imageUrl,
      })
      if (error) throw error
    },
    onSuccess: () => { invalidate(); closeDialog() },
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; form: GiftForm; imageUrl: string | null }) => {
      const { error } = await supabase
        .from('gifts')
        .update({
          name: payload.form.name.trim(),
          description: payload.form.description.trim() || null,
          price_cents: priceToCents(payload.form.price),
          image_url: payload.imageUrl,
        })
        .eq('id', payload.id)
      if (error) throw error
    },
    onSuccess: () => { invalidate(); closeDialog() },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gifts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { invalidate(); setDeleteTarget(null) },
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_available }: { id: string; is_available: boolean }) => {
      const { error } = await supabase.from('gifts').update({ is_available }).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  // ── Helpers ───────────────────────────────────────────────
  function priceToCents(price: string) {
    return Math.round(parseFloat(price.replace(',', '.')) * 100)
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return editingGift?.image_url ?? null
    setUploading(true)
    try {
      const filename = `${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error } = await supabase.storage.from('gift-images').upload(filename, imageFile, {
        contentType: imageFile.type,
        upsert: true,
      })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('gift-images').getPublicUrl(filename)
      return publicUrl
    } finally {
      setUploading(false)
    }
  }

  function openCreate() {
    setEditingGift(null)
    setForm(EMPTY_FORM)
    setImageFile(null)
    setImagePreview(null)
    setIsDialogOpen(true)
  }

  function openEdit(gift: Gift) {
    setEditingGift(gift)
    setForm({
      name: gift.name,
      description: gift.description ?? '',
      price: (gift.price_cents / 100).toFixed(2).replace('.', ','),
    })
    setImageFile(null)
    setImagePreview(gift.image_url ?? null)
    setIsDialogOpen(true)
  }

  function closeDialog() {
    setIsDialogOpen(false)
    setEditingGift(null)
    setForm(EMPTY_FORM)
    setImageFile(null)
    setImagePreview(null)
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const imageUrl = await uploadImage()
    if (editingGift) {
      await updateMutation.mutateAsync({ id: editingGift.id, form, imageUrl })
    } else {
      await createMutation.mutateAsync({ form, imageUrl })
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending || uploading

  const totalValue = gifts.reduce((sum, g) => sum + g.price_cents, 0)
  const availableCount = gifts.filter((g) => g.is_available).length
  const purchasedCount = gifts.length - availableCount

  const byPrice = Object.entries(
    gifts.reduce<Record<number, number>>((acc, g) => {
      acc[g.price_cents] = (acc[g.price_cents] ?? 0) + 1
      return acc
    }, {}),
  ).sort(([a], [b]) => Number(a) - Number(b))

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-text">Lista de Presentes</h1>
          <p className="font-body text-sm text-text-muted mt-1">
            {gifts.length} item{gifts.length !== 1 ? 's' : ''} cadastrado{gifts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total de itens', value: gifts.length },
          { label: 'Disponíveis', value: availableCount },
          { label: 'Comprados', value: purchasedCount },
          { label: 'Valor total', value: formatCents(totalValue) },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-lowest border border-border px-4 py-3">
            <p className="font-body text-[10px] uppercase tracking-widest text-text-muted mb-1">{label}</p>
            <p className="font-display text-xl text-text">{value}</p>
          </div>
        ))}
      </div>

      {byPrice.length > 0 && (
        <div className="mb-6">
          <p className="font-body text-[10px] uppercase tracking-widest text-text-muted mb-2">
            Distribuição por valor
          </p>
          <div className="flex flex-wrap gap-2">
            {byPrice.map(([cents, count]) => (
              <div
                key={cents}
                className="bg-surface-lowest border border-border px-3 py-2 flex items-baseline gap-2"
              >
                <span className="font-display text-base text-text">{count}×</span>
                <span className="font-body text-sm text-text-muted">{formatCents(Number(cents))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        </div>
      ) : gifts.length === 0 ? (
        <div className="bg-surface-lowest border border-border text-center py-20">
          <p className="font-body text-sm text-text-muted mb-4">Nenhum presente cadastrado ainda.</p>
          <Button variant="outline" onClick={openCreate}>
            Adicionar o primeiro presente
          </Button>
        </div>
      ) : (
        <div className="bg-surface-lowest border border-border overflow-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border bg-surface-low">
                {['Foto', 'Nome', 'Valor', 'Status', ''].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-body text-[10px] uppercase tracking-widest text-text-muted font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gifts.map((gift) => (
                <tr
                  key={gift.id}
                  className={cn(
                    'border-b border-border last:border-0 hover:bg-surface-low/40 transition-colors',
                    !gift.is_available && 'opacity-60',
                  )}
                >
                  <td className="px-4 py-3">
                    <div className="w-12 h-12 border border-border bg-surface-low overflow-hidden flex-shrink-0">
                      {gift.image_url ? (
                        <img src={gift.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-text-muted/30 text-xs">
                          —
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="font-body text-sm font-medium text-text truncate">{gift.name}</p>
                    {gift.description && (
                      <p className="font-body text-xs text-text-muted truncate mt-0.5">
                        {gift.description}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-text whitespace-nowrap">
                    {formatCents(gift.price_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() =>
                        toggleMutation.mutate({ id: gift.id, is_available: !gift.is_available })
                      }
                      title="Alternar disponibilidade"
                      className="focus:outline-none"
                    >
                      <Badge variant={gift.is_available ? 'default' : 'secondary'}>
                        {gift.is_available ? 'Disponível' : 'Comprado'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(gift)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => setDeleteTarget(gift)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Gift form dialog ─── */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingGift ? 'Editar Presente' : 'Novo Presente'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="gift-name">Nome *</Label>
              <Input
                id="gift-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Máquina de espresso italiana"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gift-desc">Descrição</Label>
              <Textarea
                id="gift-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Uma breve descrição do item…"
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gift-price">Valor (R$) *</Label>
              <Input
                id="gift-price"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="Ex: 2500,00"
                required
                pattern="^\d+([,\.]\d{1,2})?$"
                title="Use vírgula ou ponto como separador decimal (ex: 2500,00)"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Imagem</Label>
              <div
                className={cn(
                  'border-2 border-dashed border-border hover:border-primary/60 cursor-pointer transition-colors overflow-hidden',
                  imagePreview && 'border-primary/60',
                )}
                onClick={() => fileRef.current?.click()}
              >
                {imagePreview ? (
                  <div className="relative">
                    <img src={imagePreview} alt="Preview" className="w-full h-44 object-cover" />
                    <button
                      type="button"
                      className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation()
                        setImageFile(null)
                        setImagePreview(editingGift?.image_url ?? null)
                      }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-7 text-text-muted">
                    <Upload className="w-5 h-5 mb-2 opacity-50" />
                    <p className="font-body text-xs">Clique para selecionar</p>
                    <p className="font-body text-[10px] mt-1 opacity-50">JPG, PNG, WEBP · máx. 5MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onFileChange}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingGift ? 'Salvar' : 'Adicionar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ─── */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir presente?</DialogTitle>
          </DialogHeader>
          <p className="font-body text-sm text-text-muted">
            Tem certeza que deseja excluir <strong>"{deleteTarget?.name}"</strong>? Esta ação não
            pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
