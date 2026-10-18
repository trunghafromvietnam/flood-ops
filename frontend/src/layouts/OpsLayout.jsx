// Shell for every operations view: one data provider, one header, one mode bar.
// The provider stays mounted while moving between views, so mode and data persist.

import { Outlet } from 'react-router-dom'
import AppHeader from '../components/AppHeader.jsx'
import DataModeBar from '../components/DataModeBar.jsx'
import { OpsDataProvider } from '../state/OpsData.jsx'

export default function OpsLayout({ initialMode }) {
  return (
    <OpsDataProvider initialMode={initialMode}>
      <div className="ops-shell">
        <a href="#ops-main" className="skip-link">
          Skip to content
        </a>
        <AppHeader />
        <DataModeBar />
        <main id="ops-main" className="ops-main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </OpsDataProvider>
  )
}
