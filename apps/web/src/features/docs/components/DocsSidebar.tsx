import { useState, useEffect, useMemo } from 'react'
import { DOCS_DATA, type DocsCategory, type DocsArticle } from '../data/docsContent'

interface DocsSidebarProps {
  currentArticleId: string
  onSelectArticle: (articleId: string) => void
  searchQuery?: string
  isMobileOpen?: boolean
  onCloseMobile?: () => void
  onClearSearch?: () => void
}

export function DocsSidebar({
  currentArticleId,
  onSelectArticle,
  searchQuery = '',
  isMobileOpen = false,
  onCloseMobile,
  onClearSearch,
}: DocsSidebarProps) {
  // Manejo de la tecla Escape para cerrar el drawer móvil
  useEffect(() => {
    if (!isMobileOpen || !onCloseMobile) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseMobile()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMobileOpen, onCloseMobile])

  // Categoría a la que pertenece el artículo actual
  const activeCategoryId = useMemo(() => {
    const found = DOCS_DATA.find((cat) =>
      cat.articles.some((a) => a.id === currentArticleId)
    )
    return found ? found.id : DOCS_DATA[0]?.id
  }, [currentArticleId])

  // Estado de categorías expandidas. Por defecto, solo la categoría activa está expandida
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(
    () => new Set([activeCategoryId])
  )

  // Al cambiar de artículo, colapsar las demás y mantener expandida la del artículo actual
  useEffect(() => {
    setExpandedCategoryIds(new Set([activeCategoryId]))
  }, [activeCategoryId])

  // Filtrado reactivo si el usuario busca desde el navbar
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return DOCS_DATA

    const q = searchQuery.toLowerCase().trim()
    return DOCS_DATA.map((cat) => {
      const matchedArticles = cat.articles.filter((art) => {
        const inTitle = art.title.toLowerCase().includes(q)
        const inShortTitle = art.shortTitle?.toLowerCase().includes(q)
        const inDesc = art.description.toLowerCase().includes(q)
        const inOverview = art.content.overview.toLowerCase().includes(q)
        const inSections = art.content.sections.some(
          (s) =>
            s.subtitle.toLowerCase().includes(q) ||
            s.paragraphs.some((p) => p.toLowerCase().includes(q))
        )
        return inTitle || inShortTitle || inDesc || inOverview || inSections
      })
      return {
        ...cat,
        articles: matchedArticles,
      }
    }).filter((cat) => cat.articles.length > 0)
  }, [searchQuery])

  // Si hay búsqueda activa, expandir todas las categorías que contengan coincidencias
  useEffect(() => {
    if (searchQuery.trim()) {
      const allMatchedIds = filteredCategories.map((c) => c.id)
      setExpandedCategoryIds(new Set(allMatchedIds))
    }
  }, [searchQuery, filteredCategories])

  const toggleCategory = (categoryId: string) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }

  const renderNavContent = () => (
    <nav className="flex-1 px-3 py-3 space-y-2 overflow-y-auto">
      {filteredCategories.length === 0 ? (
        <div className="px-3 py-6 text-center space-y-2">
          <p className="text-xs text-[#5A5D5A]">
            No se encontraron temas con esa búsqueda.
          </p>
          {onClearSearch && (
            <button
              type="button"
              onClick={onClearSearch}
              aria-label="Limpiar búsqueda"
              className="min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[#E5E5E5] hover:bg-[#CFDBD5] border border-[#CFDBD5] text-xs font-semibold text-[#242423] cursor-pointer inline-flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CB5C]/40"
            >
              Limpiar búsqueda
            </button>
          )}
        </div>
      ) : (
        filteredCategories.map((group: DocsCategory) => {
          const isExpanded = expandedCategoryIds.has(group.id)
          const containsActiveArticle = group.articles.some((a) => a.id === currentArticleId)

          return (
            <div key={group.id} className="border-b border-[#CFDBD5]/40 pb-1.5 last:border-b-0">
              {/* Botón de cabecera de categoría (acordeón con min-h-[44px]) */}
              <button
                type="button"
                onClick={() => toggleCategory(group.id)}
                aria-expanded={isExpanded}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors cursor-pointer min-h-[44px] hover:bg-[#E5E5E5]/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CB5C]/40 group"
              >
                <span
                  className={`text-xs font-bold tracking-wider uppercase truncate ${
                    containsActiveArticle ? 'text-[#242423]' : 'text-[#5A5D5A] group-hover:text-[#242423]'
                  }`}
                >
                  {group.title}
                </span>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="text-xs tabular-nums font-semibold px-2 py-0.5 rounded-full bg-[#E5E5E5] text-[#5A5D5A]">
                    {group.articles.length}
                  </span>
                  <svg
                    aria-hidden="true"
                    className={`w-3.5 h-3.5 text-[#5A5D5A] transition-transform duration-200 ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Lista colapsable de artículos por categoría */}
              {isExpanded && (
                <div className="space-y-1 mt-1 pl-1 animate-in fade-in duration-150">
                  {group.articles.map((article: DocsArticle) => {
                    const isActive = article.id === currentArticleId

                    return (
                      <button
                        key={article.id}
                        type="button"
                        onClick={() => {
                          onSelectArticle(article.id)
                          if (onCloseMobile) onCloseMobile()
                        }}
                        title={article.title}
                        aria-current={isActive ? 'page' : undefined}
                        className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs leading-snug transition-colors cursor-pointer min-h-[44px] flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CB5C]/40 ${
                          isActive
                            ? 'bg-[#E5E5E5] text-[#242423] font-semibold shadow-2xs border-l-2 border-[#F5CB5C] pl-3'
                            : 'text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E5E5E5]/70 font-normal'
                        }`}
                      >
                        <span className="truncate w-full">
                          {article.shortTitle || article.title}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })
      )}
    </nav>
  )

  return (
    <>
      {/* 1. Sidebar estático en escritorio y tablet grande (>= 768px) */}
      <aside
        className="hidden md:flex w-60 md:w-64 shrink-0 bg-[#E8EDDF] border-r border-[#CFDBD5] select-none flex-col sticky top-[50px] h-[calc(100vh-50px)] self-start"
        aria-label="Navegación de Documentación"
      >
        {/* Título de sección como texto descriptivo para no alterar el orden h1 del documento */}
        <div className="h-[64px] px-6 border-b border-[#CFDBD5] flex items-center shrink-0">
          <p className="text-sm font-semibold text-[#242423] tracking-tight">
            Documentación
          </p>
        </div>

        {renderNavContent()}
      </aside>

      {/* 2. Drawer móvil deslizable para pantallas menores a 768px */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Fondo oscuro semitransparente */}
          <div
            className="fixed inset-0 bg-[#242423]/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* Panel lateral */}
          <aside
            className="relative w-72 max-w-[85vw] bg-[#E8EDDF] text-[#242423] border-r border-[#CFDBD5] flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-left duration-150 select-none"
            aria-label="Navegación móvil de Documentación"
          >
            <div className="h-[64px] px-5 border-b border-[#CFDBD5] flex items-center justify-between shrink-0">
              <p className="text-sm font-semibold text-[#242423] tracking-tight">
                Documentación
              </p>
              <button
                type="button"
                onClick={onCloseMobile}
                className="p-2 -mr-2 rounded-lg text-[#5A5D5A] hover:text-[#242423] hover:bg-[#E5E5E5] transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CB5C]/40"
                aria-label="Cerrar índice de temas"
              >
                <svg aria-hidden="true" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {renderNavContent()}
          </aside>
        </div>
      )}
    </>
  )
}
