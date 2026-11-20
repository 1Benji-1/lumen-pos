import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DOCS_DATA } from './data/docsContent'
import { DocsSidebar } from './components/DocsSidebar'
import { DocsArticleView } from './components/DocsArticleView'

export function DocsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  const currentArticleId = searchParams.get('article') || 'vision-general'
  const searchQuery = searchParams.get('q') || ''

  // Lista plana de todos los artículos ordenados
  const flatArticles = useMemo(() => {
    return DOCS_DATA.flatMap((cat) =>
      cat.articles.map((art) => ({
        ...art,
        category: cat,
      }))
    )
  }, [])

  // Artículo actual y su categoría
  const currentItem = useMemo(() => {
    const found = flatArticles.find((a) => a.id === currentArticleId)
    return found || flatArticles[0]
  }, [flatArticles, currentArticleId])

  // Índices para anterior y siguiente
  const currentIndex = flatArticles.findIndex((a) => a.id === currentItem.id)
  const prevArticle = currentIndex > 0 ? flatArticles[currentIndex - 1] : null
  const nextArticle =
    currentIndex < flatArticles.length - 1 ? flatArticles[currentIndex + 1] : null

  // Cálculo de temas que coinciden con el término de búsqueda
  const matchedArticles = useMemo(() => {
    if (!searchQuery.trim()) return flatArticles

    const q = searchQuery.toLowerCase().trim()
    return flatArticles.filter((art) => {
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
  }, [flatArticles, searchQuery])

  const totalMatches = searchQuery.trim() ? matchedArticles.length : 0

  const handleSelectArticle = (articleId: string) => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      nextParams.set('article', articleId)
      return nextParams
    })
    setIsMobileNavOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleClearSearch = () => {
    setSearchParams((prev) => {
      const nextParams = new URLSearchParams(prev)
      nextParams.delete('q')
      return nextParams
    }, { replace: true })
  }

  return (
    <div className="flex-1 min-h-[calc(100vh-50px)] bg-[#E8EDDF] text-[#242423] flex items-stretch">
      {/* 1. Sidebar de documentación (fijo en desktop, drawer en móvil) */}
      <DocsSidebar
        currentArticleId={currentItem.id}
        onSelectArticle={handleSelectArticle}
        searchQuery={searchQuery}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        onClearSearch={handleClearSearch}
      />

      {/* 2. Área de lectura principal (section semántica para no duplicar main de AppLayout) */}
      <section
        aria-label="Contenido del tema"
        className="flex-1 min-w-0 bg-[#E8EDDF] overflow-y-auto"
      >
        {searchQuery.trim() && totalMatches === 0 ? (
          <div className="max-w-md mx-auto my-20 px-6 text-center space-y-5 animate-in fade-in duration-150">
            <div className="w-14 h-14 mx-auto rounded-full bg-[#FEF9E7] border border-[#F5CB5C] flex items-center justify-center text-[#8A6D14] shadow-2xs">
              <svg aria-hidden="true" className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-bold text-[#242423]">
                Sin coincidencias para "{searchQuery}"
              </h2>
              <p className="text-xs text-[#5A5D5A] leading-relaxed">
                No encontramos ningún artículo que contenga ese término. Prueba con palabras clave operativas como <span className="font-semibold text-[#242423]">caja</span>, <span className="font-semibold text-[#242423]">ticket</span> o <span className="font-semibold text-[#242423]">inventario</span>.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClearSearch}
              aria-label="Limpiar búsqueda"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#E5E5E5] hover:bg-[#CFDBD5] border border-[#CFDBD5] text-[#242423] text-xs font-semibold transition cursor-pointer shadow-2xs min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F5CB5C]/40"
            >
              <span>Limpiar búsqueda</span>
            </button>
          </div>
        ) : (
          <DocsArticleView
            category={currentItem.category}
            article={currentItem}
            prevArticle={prevArticle ? { id: prevArticle.id, title: prevArticle.title } : null}
            nextArticle={nextArticle ? { id: nextArticle.id, title: nextArticle.title } : null}
            onNavigate={handleSelectArticle}
            onOpenMobileNav={() => setIsMobileNavOpen(true)}
            searchQuery={searchQuery}
            totalMatches={totalMatches}
            onClearSearch={handleClearSearch}
          />
        )}
      </section>
    </div>
  )
}
