import { useState } from 'react'
import { Search, X, DownloadCloud, CheckSquare, Square, RefreshCw, UserCheck, PlusCircle } from 'lucide-react'
import Button from '../ui/Button'
import { supabase } from '../../lib/supabase'

interface ContatoEvolution {
  remoteJid: string
  pushName: string
  name: string
  profilePicUrl?: string
  number: string
  existsInCrm?: boolean
}

interface ImportarContatosModalProps {
  aberto: boolean
  contatosExistentes: Array<{ whatsapp: string }>
  onFechar: () => void
  onContatosImportados: () => void
}

export default function ImportarContatosModal({
  aberto,
  contatosExistentes,
  onFechar,
  onContatosImportados,
}: ImportarContatosModalProps) {
  const [loading, setLoading] = useState(false)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [importingLote, setImportingLote] = useState(false)
  const [contatos, setContatos] = useState<ContatoEvolution[]>([])
  const [busca, setBusca] = useState('')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [errosImagem, setErrosImagem] = useState<Set<string>>(new Set())

  const [limiteExibicao, setLimiteExibicao] = useState(40)

  if (!aberto) return null

  // Conjunto de WhatsApps já cadastrados no CRM para fácil checagem
  const setExistentes = new Set(
    contatosExistentes.map((c) => c.whatsapp.replace(/\D/g, ''))
  )

  const handleBuscar = async () => {
    setLoading(true)
    setErro(null)
    setSucesso(null)
    try {
      const { data, error } = await supabase.functions.invoke(
        'whatsapp-manual-buscar-contatos'
      )

      if (error) {
        throw new Error(error.message || 'Erro ao buscar contatos do WhatsApp')
      }

      if (data?.erro) {
        throw new Error(data.erro)
      }

      const lista: ContatoEvolution[] = data?.contatos || []
      // Marca quais já existem no CRM
      const listaComStatus = lista.map((c) => ({
        ...c,
        existsInCrm: setExistentes.has(c.number.replace(/\D/g, '')),
      }))

      setContatos(listaComStatus)
      setSelecionados(new Set())
      setLimiteExibicao(40)
    } catch (err: any) {
      console.error('Erro ao buscar contatos:', err)
      setErro(err.message || 'Ocorreu um erro ao carregar os contatos do WhatsApp.')
    } finally {
      setLoading(false)
    }
  }

  const contatosFiltrados = contatos.filter((c) => {
    if (!busca.trim()) return true
    const termo = busca.toLowerCase()
    const nome = (c.pushName || c.name || '').toLowerCase()
    const num = c.number.toLowerCase()
    return nome.includes(termo) || num.includes(termo)
  })

  // Exibe apenas a quantidade limite para evitar renderizar mil elementos de uma vez no DOM
  const contatosVisiveis = contatosFiltrados.slice(0, limiteExibicao)

  const toggleSelecionar = (remoteJid: string) => {
    setSelecionados((prev) => {
      const next = new Set(prev)
      if (next.has(remoteJid)) {
        next.delete(remoteJid)
      } else {
        next.add(remoteJid)
      }
      return next
    })
  }

  const toggleSelecionarTodos = () => {
    const todosVisiveisNaoExistentes = contatosFiltrados.filter((c) => !c.existsInCrm)
    const todosJaSelecionados = todosVisiveisNaoExistentes.length > 0 && todosVisiveisNaoExistentes.every((c) =>
      selecionados.has(c.remoteJid)
    )

    setSelecionados((prev) => {
      const next = new Set(prev)
      if (todosJaSelecionados) {
        todosVisiveisNaoExistentes.forEach((c) => next.delete(c.remoteJid))
      } else {
        todosVisiveisNaoExistentes.forEach((c) => next.add(c.remoteJid))
      }
      return next
    })
  }

  // Importar 1 único contato individualmente
  const handleImportarUm = async (c: ContatoEvolution, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setImportingId(c.remoteJid)
    setErro(null)
    try {
      const numLimpo = c.number.replace(/\D/g, '')
      const nomeFinal = (c.pushName || c.name || `Contato ${numLimpo}`).trim()

      const { error } = await supabase.from('contatos_whatsapp_manual').upsert(
        {
          whatsapp: numLimpo,
          nome: nomeFinal,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'whatsapp' }
      )

      if (error) throw error

      // Atualiza estado local para mostrar como cadastrado
      setContatos((prev) =>
        prev.map((item) =>
          item.remoteJid === c.remoteJid ? { ...item, existsInCrm: true } : item
        )
      )
      setSelecionados((prev) => {
        const next = new Set(prev)
        next.delete(c.remoteJid)
        return next
      })

      setSucesso(`Contato "${nomeFinal}" importado com sucesso!`)
      onContatosImportados()
    } catch (err: any) {
      console.error('Erro ao importar contato:', err)
      setErro('Não foi possível salvar o contato no banco de dados.')
    } finally {
      setImportingId(null)
    }
  }

  // Importar os contatos selecionados via checkbox
  const handleImportarLote = async () => {
    if (selecionados.size === 0) return

    setImportingLote(true)
    setErro(null)
    try {
      const paraImportar = contatos.filter((c) => selecionados.has(c.remoteJid))
      let contagemSucesso = 0

      for (const c of paraImportar) {
        const numLimpo = c.number.replace(/\D/g, '')
        const nomeFinal = (c.pushName || c.name || `Contato ${numLimpo}`).trim()

        const { error } = await supabase.from('contatos_whatsapp_manual').upsert(
          {
            whatsapp: numLimpo,
            nome: nomeFinal,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'whatsapp' }
        )

        if (!error) {
          contagemSucesso++
          setContatos((prev) =>
            prev.map((item) =>
              item.remoteJid === c.remoteJid ? { ...item, existsInCrm: true } : item
            )
          )
        }
      }

      setSelecionados(new Set())
      setSucesso(`${contagemSucesso} contato(s) importado(s) com sucesso!`)
      onContatosImportados()
    } catch (err: any) {
      console.error('Erro ao importar lote de contatos:', err)
      setErro('Erro ao salvar os contatos no sistema.')
    } finally {
      setImportingLote(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-[var(--bg-card)] rounded-[16px] border border-[var(--border-card)] shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-card)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[10px] bg-[var(--primary)]/10 text-[var(--primary)]">
              <DownloadCloud size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-main)]">
                Buscar / Importar Contato do WhatsApp
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Pesquise um contato da sua lista do WhatsApp para importar e conversar no Atendimento Manual
              </p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-base)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {erro && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-medium">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-medium">
              {sucesso}
            </div>
          )}

          {contatos.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 rounded-full bg-[var(--bg-base)] text-[var(--text-muted)]">
                <DownloadCloud size={36} />
              </div>
              <div className="max-w-md">
                <p className="text-sm font-medium text-[var(--text-main)]">
                  Buscar contatos do seu WhatsApp
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Clique no botão abaixo para carregar seus contatos do 2º número e escolher qual deseja importar.
                </p>
              </div>
              <Button onClick={handleBuscar} isLoading={loading} className="mt-2">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Buscar Contatos no WhatsApp
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Barra de Busca e Atualizar */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => {
                      setBusca(e.target.value)
                      setLimiteExibicao(40)
                    }}
                    placeholder="Digite o nome ou número do contato que procura..."
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-[var(--bg-base)] border border-[var(--border-card)] text-[var(--text-main)] outline-none focus:border-[var(--primary)]"
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBuscar}
                  isLoading={loading}
                  title="Atualizar lista de contatos"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </Button>
              </div>

              {/* Header da lista */}
              <div className="flex items-center justify-between px-2 py-1.5 bg-[var(--bg-base)]/50 rounded-lg text-xs text-[var(--text-muted)]">
                <button
                  type="button"
                  onClick={toggleSelecionarTodos}
                  className="flex items-center gap-2 font-medium hover:text-[var(--text-main)] transition-colors"
                >
                  {contatosFiltrados.filter((c) => !c.existsInCrm).length > 0 &&
                  contatosFiltrados.filter((c) => !c.existsInCrm).every((c) => selecionados.has(c.remoteJid)) ? (
                    <CheckSquare size={16} className="text-[var(--primary)]" />
                  ) : (
                    <Square size={16} />
                  )}
                  <span>Selecionar todos visíveis ({selecionados.size} selecionado(s))</span>
                </button>
                <span>{contatosFiltrados.length} contato(s) encontrado(s)</span>
              </div>

              {/* Lista de Contatos */}
              <div className="max-h-[360px] overflow-y-auto space-y-1 pr-1">
                {contatosVisiveis.map((c) => {
                  const isSelected = selecionados.has(c.remoteJid)
                  const isThisImporting = importingId === c.remoteJid
                  const nome = c.pushName || c.name || 'Sem nome'

                  return (
                    <div
                      key={c.remoteJid}
                      onClick={() => !c.existsInCrm && toggleSelecionar(c.remoteJid)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                        c.existsInCrm
                          ? 'opacity-70 bg-[var(--bg-base)]/40 border-[var(--border-card)]/50'
                          : isSelected
                          ? 'bg-[var(--primary)]/5 border-[var(--primary)]/30'
                          : 'bg-[var(--bg-card)] border-[var(--border-card)] hover:bg-[var(--bg-base)] cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {!c.existsInCrm ? (
                          <div className="text-[var(--text-muted)] shrink-0">
                            {isSelected ? (
                              <CheckSquare size={16} className="text-[var(--primary)]" />
                            ) : (
                              <Square size={16} />
                            )}
                          </div>
                        ) : (
                          <UserCheck size={16} className="text-emerald-500 shrink-0" />
                        )}

                        <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-semibold flex items-center justify-center text-xs shrink-0 overflow-hidden">
                          {c.profilePicUrl && !errosImagem.has(c.remoteJid) ? (
                            <img
                              src={c.profilePicUrl}
                              alt={nome}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                              onError={() => {
                                setErrosImagem((prev) => new Set(prev).add(c.remoteJid))
                              }}
                            />
                          ) : (
                            nome.charAt(0).toUpperCase()
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[var(--text-main)] truncate">
                            {nome}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">
                            +{c.number}
                          </p>
                        </div>
                      </div>

                      {/* Botão de ação à direita */}
                      {c.existsInCrm ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 shrink-0 flex items-center gap-1">
                          <UserCheck size={12} /> No CRM
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => handleImportarUm(c, e)}
                          isLoading={isThisImporting}
                          disabled={importingLote}
                          className="text-xs py-1 h-7 px-2.5 shrink-0"
                        >
                          <PlusCircle size={13} /> Importar
                        </Button>
                      )}
                    </div>
                  )
                })}

                {contatosFiltrados.length > limiteExibicao && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setLimiteExibicao((prev) => prev + 50)}
                      className="text-xs font-medium text-[var(--primary)] hover:underline py-2 px-4 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/20 transition-all"
                    >
                      Mostrar mais contatos ({contatosFiltrados.length - limiteExibicao} restantes)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border-card)] flex items-center justify-between bg-[var(--bg-base)]/30">
          <Button variant="outline" size="sm" onClick={onFechar} disabled={importingLote}>
            Fechar
          </Button>

          {selecionados.size > 0 && (
            <Button
              size="sm"
              onClick={handleImportarLote}
              isLoading={importingLote}
            >
              <DownloadCloud size={14} />
              Importar {selecionados.size} Selecionado(s)
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
