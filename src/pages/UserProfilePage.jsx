import SectionHeader from '../components/SectionHeader'
import { useAuth } from '../context/AuthContext'

const roleLabels = {
  admissions_counselor: 'Admissions Counselor',
  admissions_processor: 'Admissions Processor',
  reviewer_evaluator: 'Reviewer / Evaluator',
  decision_releaser_director: 'Decision Releaser / Director',
  trust_analyst: 'Trust Analyst',
  registrar_transfer_specialist: 'Registrar / Transfer Specialist',
  financial_aid: 'Financial Aid',
  read_only_leadership: 'Read Only Leadership',
  integration_service: 'Integration Service',
}

function formatRoleLabel(role) {
  return roleLabels[role] || role
}

export default function UserProfilePage() {
  const { session, currentUser } = useAuth()

  return (
    <div className="page-wrap">
      <SectionHeader
        eyebrow="Account"
        title="User Profile"
        subtitle="Your admissions workspace identity and tenant context."
      />

      <section className="dashboard-grid two-up">
        <article className="panel profile-hero">
          <div className="panel-header">
            <div>
              <h3>Profile</h3>
              <p>The logged-in operator context for this workspace.</p>
            </div>
          </div>
          <div className="metric-cluster profile-metrics">
            <div><span>Username</span><strong>{session?.username || 'Unknown'}</strong></div>
            <div><span>Tenant</span><strong>{session?.tenant_name || 'Unknown tenant'}</strong></div>
            <div><span>Tenant code</span><strong>{session?.tenant_code || 'Not set'}</strong></div>
            <div><span>Tenant id</span><strong>{session?.tenant_id || 'Not set'}</strong></div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Session</h3>
              <p>Current authenticated session details used by protected APIs.</p>
            </div>
          </div>
          <div className="stack-list">
            <div className="stack-row"><strong>Token type</strong><span>{session?.token_type || 'Bearer'}</span></div>
            <div className="stack-row"><strong>Access token</strong><span>{session?.access_token ? 'Present' : 'Missing'}</span></div>
            <div className="stack-row"><strong>ID token</strong><span>{session?.id_token ? 'Present' : 'Missing'}</span></div>
            <div className="stack-row"><strong>Refresh token</strong><span>{session?.refresh_token ? 'Present' : 'Missing'}</span></div>
          </div>
        </article>
      </section>

      <section className="dashboard-grid two-up">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Roles and permissions</h3>
              <p>RBAC bootstrap payload for this authenticated user.</p>
            </div>
          </div>
          <div className="stack-list">
            <div className="stack-row"><strong>Display name</strong><span>{currentUser?.displayName || session?.username || 'Unknown'}</span></div>
            <div className="stack-row"><strong>Base role</strong><span>{currentUser?.baseRole || 'None'}</span></div>
            <div className="stack-row"><strong>Roles</strong><span>{currentUser?.roles?.length ? currentUser.roles.map(formatRoleLabel).join(', ') : 'None'}</span></div>
            <div className="stack-row"><strong>Permissions</strong><span>{currentUser?.permissions?.length ? currentUser.permissions.join(', ') : 'None'}</span></div>
            <div className="stack-row"><strong>Sensitivity tiers</strong><span>{currentUser?.sensitivityTiers?.length ? currentUser.sensitivityTiers.join(', ') : 'None'}</span></div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <h3>Scopes</h3>
              <p>Program, territory, and campus scoping provided by the backend.</p>
            </div>
          </div>
          <div className="stack-list">
            <div className="stack-row"><strong>Tenants</strong><span>{currentUser?.scopes?.tenants?.length ? currentUser.scopes.tenants.join(', ') : 'None'}</span></div>
            <div className="stack-row"><strong>Territories</strong><span>{currentUser?.scopes?.territories?.length ? currentUser.scopes.territories.join(', ') : 'None'}</span></div>
            <div className="stack-row"><strong>Programs</strong><span>{currentUser?.scopes?.programs?.length ? currentUser.scopes.programs.join(', ') : 'None'}</span></div>
            <div className="stack-row"><strong>Campuses</strong><span>{currentUser?.scopes?.campuses?.length ? currentUser.scopes.campuses.join(', ') : 'None'}</span></div>
            <div className="stack-row"><strong>Student populations</strong><span>{currentUser?.scopes?.studentPopulations?.length ? currentUser.scopes.studentPopulations.join(', ') : 'None'}</span></div>
            <div className="stack-row"><strong>Stages</strong><span>{currentUser?.scopes?.stages?.length ? currentUser.scopes.stages.join(', ') : 'None'}</span></div>
            <div className="stack-row"><strong>Record exceptions</strong><span>{currentUser?.recordExceptions?.length ? currentUser.recordExceptions.join(', ') : 'None'}</span></div>
          </div>
        </article>
      </section>
    </div>
  )
}
