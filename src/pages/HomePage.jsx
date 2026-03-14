import { useEffect, useRef, useState } from 'react'
import BmiCalculatorPanel from '../components/BmiCalculatorPanel'
import CalorieEstimatorPanel from '../components/CalorieEstimatorPanel'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardTitle } from '../components/ui/card'

const appMenus = [
  {
    id: 'bmi',
    name: 'Hitung Body Mass Index (BMI)',
    iconSrc: '/bmi-link.png',
  },
  {
    id: 'calorie',
    name: 'Kalkulator Kalori',
    iconSrc: '/calorie-link.png',
  },
]

function HomePage({ animateOnLoad = false }) {
  const revealClass = animateOnLoad ? 'home-reveal-active' : ''
  const [expandedMenuId, setExpandedMenuId] = useState('bmi')
  const [panelHeights, setPanelHeights] = useState({})
  const panelContentRefs = useRef({})

  const handleSelectMenu = (menuId) => {
    setExpandedMenuId(menuId)
  }

  useEffect(() => {
    const updatePanelHeights = () => {
      setPanelHeights((current) => {
        let hasChanged = false
        const next = { ...current }

        appMenus.forEach((menu) => {
          const el = panelContentRefs.current[menu.id]
          if (!el) return
          const height = el.scrollHeight
          if (next[menu.id] !== height) {
            next[menu.id] = height
            hasChanged = true
          }
        })

        return hasChanged ? next : current
      })
    }

    updatePanelHeights()

    const resizeObserver = new ResizeObserver(updatePanelHeights)
    appMenus.forEach((menu) => {
      const el = panelContentRefs.current[menu.id]
      if (el) {
        resizeObserver.observe(el)
      }
    })

    window.addEventListener('resize', updatePanelHeights)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', updatePanelHeights)
    }
  }, [])

  return (
    <main
      className={`flex min-h-dvh items-center bg-[var(--background)] px-4 py-6 text-[var(--foreground)] md:px-8 md:py-8 ${revealClass}`}
    >
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <header className="home-seq text-center" style={{ '--seq-order': 0 }}>
          <h1 className="text-2xl font-semibold md:text-3xl">NutriCheck Apps</h1>
        </header>

        <section className="space-y-4">
          {appMenus.map((menu, index) => {
            const isExpanded = expandedMenuId === menu.id
            return (
              <Card
                key={menu.id}
                className="home-seq overflow-hidden ring-1 ring-[color:color-mix(in_oklab,var(--foreground)_10%,transparent)]"
                style={{ '--seq-order': index + 1 }}
              >
                <Button
                  variant="ghost"
                  onClick={() => handleSelectMenu(menu.id)}
                  aria-expanded={isExpanded}
                  className="h-auto w-full rounded-none p-4"
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-transparent text-2xl">
                        <img src={menu.iconSrc} alt="" className="h-full w-full bg-transparent object-contain" loading="lazy" />
                      </div>
                      <div className="space-y-1">
                        <CardTitle>{menu.name}</CardTitle>
                      </div>
                    </div>
                  </div>
                </Button>
                <div
                  aria-hidden={!isExpanded}
                  className={`overflow-hidden transition-[max-height] ${
                    isExpanded ? 'duration-850 ease-[cubic-bezier(0.22,1,0.36,1)]' : 'pointer-events-none duration-420 ease-out'
                  }`}
                  style={{ maxHeight: isExpanded ? `${panelHeights[menu.id] ?? 0}px` : '0px' }}
                >
                  <CardContent
                    ref={(el) => {
                      panelContentRefs.current[menu.id] = el
                    }}
                    className="p-3 md:p-4"
                  >
                    {menu.id === 'bmi' ? <BmiCalculatorPanel embedded /> : <CalorieEstimatorPanel embedded />}
                  </CardContent>
                </div>
              </Card>
            )
          })}
        </section>
      </div>
    </main>
  )
}

export default HomePage
