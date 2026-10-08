import React from "react"

type PageHeaderProps = {
  title: string
  subtitle?: React.ReactNode
  onBack: () => void
}

export default function PageHeader({
  title,
  subtitle,
  onBack,
}: PageHeaderProps) {
  return (
    <header className="inventory-header">
      <button
        type="button"
        className="inventory-back"
        onClick={onBack}
      >
        ← Volver
      </button>

      <div>
        <p className="eyebrow">MODAS SOPHIE</p>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </header>
  )
}
