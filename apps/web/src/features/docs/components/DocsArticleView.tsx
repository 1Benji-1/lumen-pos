import type { DocsArticle, DocsCategory } from '../data/docsContent'

interface DocsArticleViewProps {
  category: DocsCategory
  article: DocsArticle
  prevArticle?: { id: string; title: string } | null
  nextArticle?: { id: string; title: string } | null
  onNavigate: (articleId: string) => void
  onOpenMobileNav?: () => void
  searchQuery?: string
  totalMatches?: number
  onClearSearch?: () => void
}

function highlightMatch(text: string, query?: string) {
  if (!query || !query.trim()) return text

  const trimmed = query.trim()
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escaped})`, 'gi')
  const parts = text.split(regex)

  if (parts.length === 1) return text

  return parts.map((part, i) =>
    part.toLowerCase() === trimmed.toLowerCase() ? (
      <mark
        key={i}
        className="bg-[#F5CB5C]/45 text-[#242423] rounded-xs px-0.5 font-medium"
      >
        {part}
      </mark>
    ) : (
      part
    )
  )
}

export function DocsArticleView({
  category,
  article,
  prevArticle,
  nextArticle,
  onNavigate,
  onOpenMobileNav,
  searchQuery,
  totalMatches,
  onClearSearch,
}: DocsArticleViewProps) {
  return (
    <article className="max-w-3xl mx-auto py-8 px-6 md:px-10 space-y-8 animate-in fade-in duration-150">
      {/* Botón para abrir el índice de temas en pantallas móviles (< 768px) */}
      {onOpenMobileNav && (
        <div className="md:hidden flex items-center justify-between pb-3 border-b border-[#CFDBD5]/70">
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 min-h-[44px] rounded-lg border border-[#CFDBD5] bg-white text-xs font-semibold text-[#242423] hover:bg-[#E5E5E5] transition cursor-pointer shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CB5C]/40"
            aria-label="Abrir índice de temas"
          >
            <svg aria-hidden="true" className="w-4 h-4 text-[#242423]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <span>Índice de temas</span>
          </button>
          <span className="text-xs text-[#5A5D5A] font-medium truncate max-w-[150px]">
            {category.title}
          </span>
        </div>
      )}

      {/* Indicador informativo de búsqueda activa con total de temas coincidentes */}
      {searchQuery && searchQuery.trim() && (
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-[#FEF9E7] border border-[#F5CB5C] text-xs text-[#8A6D14] shadow-2xs animate-in fade-in duration-150">
          <span className="flex items-center gap-2">
            <svg aria-hidden="true" className="w-4 h-4 text-[#8A6D14] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>
              Filtrando por <strong className="font-bold text-[#242423]">"{searchQuery.trim()}"</strong>
              {typeof totalMatches === 'number' && (
                <span className="ml-1 text-[#8A6D14]">
                  ({totalMatches} {totalMatches === 1 ? 'tema encontrado' : 'temas encontrados'})
                </span>
              )}
            </span>
          </span>
          {onClearSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Limpiar filtro de búsqueda"
              className="min-h-[44px] inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold text-[#242423] hover:bg-[#F5CB5C]/30 transition-colors cursor-pointer ml-2 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CB5C]/40"
            >
              Limpiar filtro
            </button>
          )}
        </div>
      )}

      {/* 1. Miga de pan (Breadcrumb) */}
      <nav aria-label="Miga de pan" className="flex items-center gap-2 text-xs text-[#5A5D5A]">
        <span>Documentación</span>
        <svg aria-hidden="true" className="w-3.5 h-3.5 text-[#5A5D5A]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium text-[#5A5D5A]">{category.title}</span>
        <svg aria-hidden="true" className="w-3.5 h-3.5 text-[#5A5D5A]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-semibold text-[#242423] truncate">
          {highlightMatch(article.title, searchQuery)}
        </span>
      </nav>

      {/* 2. Cabecera del artículo */}
      <div className="border-b border-[#CFDBD5] pb-6 space-y-2">
        <h1 className="text-2xl md:text-3xl font-extrabold text-[#242423] tracking-tight">
          {highlightMatch(article.title, searchQuery)}
        </h1>
        <p className="text-sm md:text-base text-[#5A5D5A] leading-relaxed">
          {highlightMatch(article.description, searchQuery)}
        </p>
      </div>

      {/* 3. Resumen introductorio */}
      {article.content.overview && (
        <div className="bg-white border border-[#CFDBD5] rounded-xl p-5 shadow-2xs text-sm md:text-base text-[#242423] leading-relaxed">
          {highlightMatch(article.content.overview, searchQuery)}
        </div>
      )}

      {/* 4. Secciones detalladas */}
      <div className="space-y-8">
        {article.content.sections.map((section, idx) => (
          <section key={idx} className="space-y-3">
            <h2 className="text-base md:text-lg font-bold text-[#242423] tracking-tight border-b border-[#CFDBD5]/60 pb-1.5">
              {highlightMatch(section.subtitle, searchQuery)}
            </h2>

            {section.paragraphs.map((p, pIdx) => (
              <p key={pIdx} className="text-sm md:text-base text-[#242423] leading-relaxed">
                {highlightMatch(p, searchQuery)}
              </p>
            ))}

            {/* Pasos numerados si aplican */}
            {section.steps && section.steps.length > 0 && (
              <ol className="space-y-2.5 my-3 pl-1">
                {section.steps.map((step, sIdx) => (
                  <li key={sIdx} className="flex items-start gap-3 text-sm md:text-base text-[#242423] leading-relaxed">
                    <span className="w-6 h-6 rounded-full bg-[#242423] text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {sIdx + 1}
                    </span>
                    <span className="leading-relaxed">
                      {highlightMatch(step, searchQuery)}
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {/* Llamada de atención o nota técnica si aplica con tokens oficiales de DESIGN.md */}
            {section.callout && (
              <div
                className={`p-4 rounded-xl border text-xs md:text-sm space-y-1.5 my-4 shadow-2xs ${
                  section.callout.type === 'warning'
                    ? 'bg-[#FDF0ED] border-[#F0B2B4] text-[#BC4749]'
                    : section.callout.type === 'tip'
                    ? 'bg-[#FEF9E7] border-[#F5CB5C] text-[#8A6D14]'
                    : 'bg-[#EFF5EE] border-[#BBD2B8] text-[#588157]'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-sm">
                  {section.callout.type === 'warning' ? (
                    <svg aria-hidden="true" className="w-4 h-4 text-[#BC4749] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  ) : section.callout.type === 'tip' ? (
                    <svg aria-hidden="true" className="w-4 h-4 text-[#8A6D14] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  ) : (
                    <svg aria-hidden="true" className="w-4 h-4 text-[#588157] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <span>{highlightMatch(section.callout.title, searchQuery)}</span>
                </div>
                <p className="leading-relaxed pl-6">
                  {highlightMatch(section.callout.text, searchQuery)}
                </p>
              </div>
            )}
          </section>
        ))}
      </div>

      {/* 5. Navegación inferior (Anterior / Siguiente) */}
      <div className="border-t border-[#CFDBD5] pt-6 flex items-center justify-between gap-4 select-none">
        {prevArticle ? (
          <button
            type="button"
            onClick={() => onNavigate(prevArticle.id)}
            aria-label={`Tema anterior: ${prevArticle.title}`}
            className="min-h-[44px] p-3 rounded-lg border border-[#CFDBD5] bg-white hover:bg-[#E5E5E5] transition text-left cursor-pointer group shadow-2xs max-w-[45%] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CB5C]/40"
          >
            <span className="text-xs uppercase font-bold text-[#5A5D5A] tracking-wider block">
              Tema anterior
            </span>
            <span className="text-xs font-semibold text-[#242423] truncate block group-hover:text-[#1A1A19]">
              {prevArticle.title}
            </span>
          </button>
        ) : (
          <div />
        )}

        {nextArticle && (
          <button
            type="button"
            onClick={() => onNavigate(nextArticle.id)}
            aria-label={`Siguiente tema: ${nextArticle.title}`}
            className="min-h-[44px] p-3 rounded-lg border border-[#CFDBD5] bg-white hover:bg-[#E5E5E5] transition text-right cursor-pointer group shadow-2xs max-w-[45%] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CB5C]/40"
          >
            <span className="text-xs uppercase font-bold text-[#5A5D5A] tracking-wider block">
              Siguiente tema
            </span>
            <span className="text-xs font-semibold text-[#242423] truncate block group-hover:text-[#1A1A19]">
              {nextArticle.title}
            </span>
          </button>
        )}
      </div>
    </article>
  )
}
