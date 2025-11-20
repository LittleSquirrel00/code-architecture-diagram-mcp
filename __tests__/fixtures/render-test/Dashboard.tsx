/**
 * Dashboard page component
 */
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'

export function Dashboard() {
  return (
    <div className="dashboard">
      <Header />
      <div className="content">
        <Sidebar />
        <main>Content</main>
      </div>
      <Footer />
    </div>
  )
}
