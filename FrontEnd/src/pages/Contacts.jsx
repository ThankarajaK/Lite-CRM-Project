import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Briefcase, Download, Eye, NotebookPen, Pencil, Plus, Trash2, Users } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import ProcessSteps from '../components/layout/ProcessSteps'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import SearchBar from '../components/ui/SearchBar'
import FilterDropdown from '../components/ui/FilterDropdown'
import Table, { TBody, TD, TH, THead, TR } from '../components/ui/Table'
import Avatar from '../components/ui/Avatar'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import RowActions from '../components/ui/RowActions'
import Pagination from '../components/ui/Pagination'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { TableSkeleton } from '../components/ui/Skeleton'
import ContactFormModal from '../components/contacts/ContactFormModal'
import ContactDrawer from '../components/contacts/ContactDrawer'
import MoveToDealModal from '../components/contacts/MoveToDealModal'
import LogActivityModal from '../components/contacts/LogActivityModal'
import { useData } from '../context/DataContext'
import { useToast } from '../context/ToastContext'
import { useSimulatedLoading } from '../hooks/useSimulatedLoading'
import { formatCurrency, formatDate } from '../utils/format'

const PAGE_SIZE = 8

/**
 * STEP 2 — contacts.
 *
 * This is where a rep logs calls, emails, meetings and notes. When the
 * product and value are agreed, the contact moves to Deals.
 */
export default function Contacts() {
  const {
    contacts,
    deals,
    activityLog,
    auditLog,
    stats,
    users,
    addContact,
    updateContact,
    deleteContact,
    logActivity,
    moveContactToDeal,
  } = useData()
  const toast = useToast()
  const navigate = useNavigate()
  const loading = useSimulatedLoading()

  const [query, setQuery] = useState('')
  const [owner, setOwner] = useState('')
  const [pipeline, setPipeline] = useState('')
  const [page, setPage] = useState(1)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [movingToDeal, setMovingToDeal] = useState(null)
  const [logging, setLogging] = useState(null)

  /** Deals grouped by company, recalculated whenever deals change. */
  const dealsByCompany = useMemo(
    () =>
      deals.reduce((map, deal) => {
        const list = map[deal.contact] ?? []
        list.push(deal)
        map[deal.contact] = list
        return map
      }, {}),
    [deals]
  )

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return contacts
      .filter((contact) => {
        const matchesTerm =
          !term ||
          contact.name.toLowerCase().includes(term) ||
          contact.company.toLowerCase().includes(term) ||
          contact.email.toLowerCase().includes(term)
        const hasDeals = (dealsByCompany[contact.company] ?? []).length > 0
        const matchesPipeline =
          !pipeline ||
          (pipeline === 'In pipeline' && hasDeals) ||
          (pipeline === 'No deal yet' && !hasDeals)
        return matchesTerm && matchesPipeline && (!owner || contact.owner === owner)
      })
      // Newest first, so anyone just moved across is at the top.
      .sort((a, b) => new Date(b.movedAt) - new Date(a.movedAt))
  }, [contacts, query, owner, pipeline, dealsByCompany])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const hasFilters = Boolean(query || owner || pipeline)

  function resetFilters() {
    setQuery('')
    setOwner('')
    setPipeline('')
    setPage(1)
  }

  function handleSubmit(values) {
    if (editing) {
      updateContact(editing.id, values)
      toast.success('Contact updated', values.company)
      setViewing((current) => (current?.id === editing.id ? { ...current, ...values } : current))
    } else {
      addContact(values)
      toast.success('Contact added', values.company)
      setPage(1)
    }
    setEditing(null)
  }

  function handleDelete() {
    if (!pendingDelete) return
    deleteContact(pendingDelete.id)
    toast.success('Contact removed', pendingDelete.company)
    setViewing((current) => (current?.id === pendingDelete.id ? null : current))
    setPendingDelete(null)
  }

  /** Log a call, email, meeting or note. */
  async function handleLogActivity(values) {
    if (!logging) return
    await logActivity(logging, values)
    setLogging(null)
    toast.success(`${values.type} logged`, `${values.title} · ${logging.company}`)
  }

  /** Step 3: product and value agreed — create the deal at Proposal. */
  async function handleMoveToDeal(values) {
    if (!movingToDeal) return
    const deal = await moveContactToDeal(movingToDeal, values)
    setMovingToDeal(null)
    setViewing(null)
    if (deal) {
      toast.success('Deal created at Proposal', `${deal.name} · ${formatCurrency(deal.value)}`)
      navigate('/deals')
    }
  }

  return (
    <div className="space-y-5">
      <ProcessSteps
        current="contacts"
        counts={{ leads: stats.totalLeads, contacts: stats.totalContacts, deals: stats.totalDeals }}
      />

      <PageHeader
        title="Contacts"
        subtitle="Log calls and emails here. When product and value are agreed, move to Deals."
        actions={
          <Button
            icon={Plus}
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            Add Contact
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
          <SearchBar
            value={query}
            onChange={(value) => {
              setQuery(value)
              setPage(1)
            }}
            placeholder="Search contacts..."
            className="w-full lg:w-64 lg:shrink-0"
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:ml-auto lg:flex lg:items-center">
            <FilterDropdown
              label="Stage"
              value={pipeline}
              options={['In pipeline', 'No deal yet']}
              onChange={(value) => {
                setPipeline(value)
                setPage(1)
              }}
              className="lg:w-48"
            />
            <FilterDropdown
              label="Owner"
              value={owner}
              options={users.map((item) => item.display_name)}
              onChange={(value) => {
                setOwner(value)
                setPage(1)
              }}
              className="lg:w-48"
            />
            <Button
              variant="secondary"
              icon={Download}
              onClick={() =>
                toast.info('Export started', `${filtered.length} contacts would be exported.`)
              }
            >
              Export
            </Button>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={6} columns={6} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Users}
            title={hasFilters ? 'No contacts match your filters' : 'No contacts yet'}
            message={
              hasFilters
                ? 'Try a different search term or clear the filters.'
                : 'Move a qualified lead across to create your first contact.'
            }
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              ) : null
            }
          />
        ) : (
          <>
            <Table className="min-w-[880px]">
              <THead>
                <TR>
                  <TH>Contact</TH>
                  <TH>Company</TH>
                  <TH>Stage</TH>
                  <TH className="hidden 2xl:table-cell">Email</TH>
                  <TH className="text-right">Deals</TH>
                  <TH className="text-right">Value</TH>
                  <TH className="hidden xl:table-cell">Last Contact</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {visible.map((contact) => {
                  const contactDeals = dealsByCompany[contact.company] ?? []
                  const totalValue = contactDeals.reduce(
                    (sum, deal) => sum + (Number(deal.value) || 0),
                    0
                  )
                  return (
                    <TR key={contact.id} onClick={() => setViewing(contact)}>
                      <TD>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={contact.name} size="sm" />
                          <div className="min-w-0">
                            <p className="whitespace-nowrap font-medium text-slate-900">
                              {contact.name}
                            </p>
                            <p className="whitespace-nowrap text-xs text-slate-500">
                              {contact.industry}
                            </p>
                          </div>
                        </div>
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <span>{contact.company}</span>
                          <StatusBadge status={contact.status} dot={false} />
                        </div>
                      </TD>
                      <TD>
                        <StatusBadge
                          status={contactDeals.length > 0 ? 'In pipeline' : 'No deal yet'}
                        />
                      </TD>
                      <TD className="hidden 2xl:table-cell">
                        <a
                          href={`mailto:${contact.email}`}
                          onClick={(event) => event.stopPropagation()}
                          className="text-brand-600 transition-colors hover:text-brand-700"
                        >
                          {contact.email}
                        </a>
                      </TD>
                      <TD className="text-right font-medium text-slate-900">
                        {contactDeals.length}
                      </TD>
                      <TD className="whitespace-nowrap text-right font-medium text-slate-900">
                        {formatCurrency(totalValue)}
                      </TD>
                      <TD className="hidden whitespace-nowrap text-slate-500 xl:table-cell">
                        {formatDate(contact.lastContact)}
                      </TD>
                      <TD>
                        <div className="flex items-center justify-end gap-1">
                          {contactDeals.length === 0 ? (
                            <Button
                              variant="subtle"
                              size="sm"
                              icon={Briefcase}
                              onClick={(event) => {
                                event.stopPropagation()
                                setMovingToDeal(contact)
                              }}
                              className="hidden whitespace-nowrap lg:inline-flex"
                            >
                              Move to Deals
                            </Button>
                          ) : null}
                          <RowActions
                            label={`Actions for ${contact.company}`}
                            actions={[
                              { label: 'View', icon: Eye, onClick: () => setViewing(contact) },
                              {
                                label: 'Log activity',
                                icon: NotebookPen,
                                onClick: () => setLogging(contact),
                              },
                              {
                                label: contactDeals.length === 0 ? 'Move to Deals' : 'New deal',
                                icon: Briefcase,
                                onClick: () => setMovingToDeal(contact),
                              },
                              {
                                label: 'Edit',
                                icon: Pencil,
                                onClick: () => {
                                  setEditing(contact)
                                  setFormOpen(true)
                                },
                              },
                              {
                                label: 'Delete',
                                icon: Trash2,
                                tone: 'danger',
                                onClick: () => setPendingDelete(contact),
                              },
                            ]}
                          />
                        </div>
                      </TD>
                    </TR>
                  )
                })}
              </TBody>
            </Table>

            <Pagination
              page={currentPage}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onChange={setPage}
            />
          </>
        )}
      </Card>

      <ContactFormModal
        open={formOpen}
        contact={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
      />

      <ContactDrawer
        contact={viewing}
        open={Boolean(viewing)}
        deals={viewing ? (dealsByCompany[viewing.company] ?? []) : []}
        activity={viewing ? (activityLog[viewing.recordId] ?? []) : []}
        history={viewing ? (auditLog[viewing.recordId] ?? []) : []}
        onClose={() => setViewing(null)}
        onEdit={(contact) => {
          setEditing(contact)
          setFormOpen(true)
        }}
        onMoveToDeal={(contact) => setMovingToDeal(contact)}
        onLogActivity={(contact) => setLogging(contact)}
      />

      <MoveToDealModal
        open={Boolean(movingToDeal)}
        contact={movingToDeal}
        onClose={() => setMovingToDeal(null)}
        onConfirm={handleMoveToDeal}
      />

      <LogActivityModal
        open={Boolean(logging)}
        record={logging}
        deals={logging ? (dealsByCompany[logging.company] ?? []) : []}
        onClose={() => setLogging(null)}
        onConfirm={handleLogActivity}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Remove this contact?"
        message={
          pendingDelete
            ? `${pendingDelete.company} will be removed. Their deals stay on the board.`
            : ''
        }
        confirmLabel="Remove contact"
      />
    </div>
  )
}
