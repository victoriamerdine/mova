'use client'

import { useState } from 'react'

import { BuilderHeader } from '@/components/professor/builder-header'
import { ConstructorWorkspace } from '@/components/professor/workout-builder'
import { LoadAnalysisPanel } from '@/components/professor/load-analysis-panel'

export function ConstructorScreen() {
  const [analysisOpen, setAnalysisOpen] = useState(false)

  return (
    <>
      <BuilderHeader onOpenAnalysis={() => setAnalysisOpen(true)} />

      <main className="grid flex-1 items-start gap-6 px-6 py-6 lg:grid-cols-[7fr_3fr]">
        <ConstructorWorkspace />
      </main>

      <LoadAnalysisPanel open={analysisOpen} onClose={() => setAnalysisOpen(false)} />
    </>
  )
}
