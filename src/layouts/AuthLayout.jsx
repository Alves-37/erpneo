import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="relative isolate h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-600/30 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-950" />
        </div>

        <div className="relative mx-auto flex h-screen w-full max-w-6xl items-center px-6 py-12">
          <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-2 lg:items-stretch">
            <div className="hidden lg:flex lg:flex-col lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-brand-600/20 ring-1 ring-brand-600/30 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-brand-200" aria-hidden="true">
                      <path
                        d="M7 7h10v10H7V7Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4 12h3M17 12h3M12 4v3M12 17v3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-semibold tracking-tight">NEO ERP</div>
                    <div className="text-xs text-slate-400">Neotrix Tecnologias · Online-first</div>
                  </div>
                </div>

                <div className="mt-10">
                  <div className="text-4xl font-semibold leading-tight tracking-tight">
                    Gestão completa para suas filiais.
                  </div>
                  <div className="mt-4 text-slate-300 leading-relaxed">
                    Produtos, estoque, vendas, PDV, finanças e relatórios em um único sistema.
                  </div>

                  <div className="mt-8 grid gap-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-5 w-5 rounded-full bg-brand-600/20 ring-1 ring-brand-600/30 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-brand-200" aria-hidden="true">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">Multiempresa por padrão</div>
                        <div className="text-slate-400">Separação por `company_id` e permissões por usuário.</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-5 w-5 rounded-full bg-brand-600/20 ring-1 ring-brand-600/30 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-brand-200" aria-hidden="true">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">API REST + PostgreSQL</div>
                        <div className="text-slate-400">FastAPI com autenticação JWT e base sólida para escalar.</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 h-5 w-5 rounded-full bg-brand-600/20 ring-1 ring-brand-600/30 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-brand-200" aria-hidden="true">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">Pronto para offline-first</div>
                        <div className="text-slate-400">Arquitetura preparada para IndexedDB + Sync.</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500">© {new Date().getFullYear()} ERPCRM</div>
            </div>

            <div className="flex items-center">
              <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur">
                <div className="rounded-xl bg-white/95 text-slate-900 shadow-sm">
                  <Outlet />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
