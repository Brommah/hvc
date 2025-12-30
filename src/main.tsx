import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { PendingReview } from './pages/PendingReview.tsx'
import { CEODashboard } from './pages/CEODashboard.tsx'
import { AwaitingReviewPage } from './pages/AwaitingReview.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/pending-review" element={<PendingReview />} />
        <Route path="/ceo" element={<CEODashboard />} />
        <Route path="/awaiting-review" element={<AwaitingReviewPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
