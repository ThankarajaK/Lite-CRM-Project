import { useMemo, useRef, useState } from "react";
import {
  Download,
  Eye,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../components/ui/PageHeader";
import ProcessSteps from "../components/layout/ProcessSteps";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import SearchBar from "../components/ui/SearchBar";
import FilterDropdown from "../components/ui/FilterDropdown";
import Table, { TBody, TD, TH, THead, TR } from "../components/ui/Table";
import StatusBadge from "../components/ui/StatusBadge";
import Badge from "../components/ui/Badge";
import Avatar from "../components/ui/Avatar";
import EmptyState from "../components/ui/EmptyState";
import RowActions from "../components/ui/RowActions";
import Pagination from "../components/ui/Pagination";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import LeadFormModal from "../components/leads/LeadFormModal";
import LeadDrawer from "../components/leads/LeadDrawer";
import LogActivityModal from "../components/contacts/LogActivityModal";
import { useData } from "../context/DataContext";
import { useToast } from "../context/ToastContext";
import { api } from "../lib/api";
import { formatDate } from "../utils/format";

const PAGE_SIZE = 8;

const STATUSES = [
  {
    value: "Qualified",
    label: "Qualified",
  },
  {
    value: "Not Qualified",
    label: "Not Qualified",
  },
];

export default function Leads() {
  const {
    leads,
    users,
    sources,
    products,
    learningModes,
    courseDurations,
    stats,
    activityLog,
    auditLog,
    addLead,
    updateLead,
    deleteLead,
    moveLeadToContact,
    logActivity,
    loadLeadTimeline,
    reassignLead,
    hasPermission,
    user,
  } = useData();

  const toast = useToast();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [owner, setOwner] = useState("");
  const [course, setCourse] = useState("");
  const [learningMode, setLearningMode] = useState("");
  const [courseDuration, setCourseDuration] = useState("");
  const [townCity, setTownCity] = useState("");

  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [logging, setLogging] = useState(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesTerm =
        !term ||
        [
          lead.name,
          lead.company,
          lead.email,
          lead.phone,
          lead.townCity,
          lead.town_city,
          lead.productName,
          lead.product_name,
          lead.learningModeName,
          lead.learning_mode_name,
          lead.courseDurationName,
          lead.course_duration_name,
          lead.notes,
        ].some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(term),
        );

      const matchesStatus = !status || lead.status === status;

      const matchesSource = !source || lead.source === source;

      const matchesOwner = !owner || String(lead.ownerId) === String(owner);

      const leadProductId =
        lead.productId ?? lead.product_id ?? lead.product ?? "";

      const matchesCourse = !course || String(leadProductId) === String(course);

      const leadLearningModeId =
        lead.learningModeId ??
        lead.learning_mode_id ??
        lead.learning_mode ??
        "";

      const matchesLearningMode =
        !learningMode || String(leadLearningModeId) === String(learningMode);

      const leadCourseDurationId =
        lead.courseDurationId ??
        lead.course_duration_id ??
        lead.course_duration ??
        "";

      const matchesCourseDuration =
        !courseDuration ||
        String(leadCourseDurationId) === String(courseDuration);

      const leadTown = lead.townCity ?? lead.town_city ?? "";

      const matchesTownCity =
        !townCity ||
        String(leadTown).toLowerCase().includes(townCity.trim().toLowerCase());

      return (
        matchesTerm &&
        matchesStatus &&
        matchesSource &&
        matchesOwner &&
        matchesCourse &&
        matchesLearningMode &&
        matchesCourseDuration &&
        matchesTownCity
      );
    });
  }, [
    leads,
    query,
    status,
    source,
    owner,
    course,
    learningMode,
    courseDuration,
    townCity,
  ]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const currentPage = Math.min(page, pageCount);

  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const hasFilters = Boolean(
    query ||
    status ||
    source ||
    owner ||
    course ||
    learningMode ||
    courseDuration ||
    townCity,
  );

  function resetFilters() {
    setQuery("");
    setStatus("");
    setSource("");
    setOwner("");
    setCourse("");
    setLearningMode("");
    setCourseDuration("");
    setTownCity("");
    setPage(1);
  }

  async function openLead(lead) {
    try {
      const logs = await loadLeadTimeline(lead.recordId);

      setViewing({
        ...lead,
        ...logs,
      });
    } catch (err) {
      toast.error("Could not load lead details", err.message);
    }
  }

  async function handleSubmit(values) {
    try {
      if (editing) {
        const updated = await updateLead(editing.id, values);

        toast.success("Lead updated", values.name);

        if (viewing?.id === editing.id) {
          setViewing((current) => ({
            ...current,
            ...values,

            ownerId: updated.owner_id ?? updated.ownerId ?? values.ownerId,

            owner: updated.owner_name ?? updated.ownerName ?? values.owner,

            productId:
              updated.product_id ?? updated.product ?? values.productId,

            productName:
              updated.product_name ?? updated.productName ?? values.productName,

            learningModeId:
              updated.learning_mode_id ??
              updated.learning_mode ??
              values.learningModeId,

            learningModeName:
              updated.learning_mode_name ??
              updated.learningModeName ??
              values.learningModeName,

            courseDurationId:
              updated.course_duration_id ??
              updated.course_duration ??
              values.courseDurationId,

            courseDurationName:
              updated.course_duration_name ??
              updated.courseDurationName ??
              values.courseDurationName,

            townCity: updated.town_city ?? updated.townCity ?? values.townCity,

            notes: updated.notes ?? values.notes,
          }));
        }
      } else {
        const created = await addLead(values);

        toast.success(
          created?.duplicate_warning
            ? "Lead captured — duplicate warning"
            : "Lead captured",
          created?.duplicate_warning
            ? "A matching email already existed. The lead was still saved."
            : `${values.name} · ${values.company}`,
        );

        setPage(1);
      }

      setEditing(null);
    } catch (err) {
      toast.error("Could not save lead", err.message);

      throw err;
    }
  }

  async function handleDelete() {
    if (!pendingDelete) return;

    try {
      await deleteLead(pendingDelete.id);

      toast.success("Lead deleted", pendingDelete.name);

      setViewing(null);
    } catch (err) {
      toast.error("Could not delete lead", err.message);
    } finally {
      setPendingDelete(null);
    }
  }

  async function handleReassign(lead, ownerId) {
    if (!ownerId) return;

    try {
      const updated = await reassignLead(lead.id, ownerId);

      setViewing((current) =>
        current?.id === lead.id
          ? {
              ...current,
              ownerId: updated.owner_id ?? updated.ownerId,
              owner: updated.owner_name ?? updated.ownerName,
            }
          : current,
      );

      toast.success("Lead reassigned", updated.owner_name ?? updated.ownerName);
    } catch (err) {
      toast.error("Could not reassign lead", err.message);
    }
  }

  async function handleMoveToContact(lead) {
    try {
      const contact = await moveLeadToContact(lead.id);

      setViewing(null);

      if (contact) {
        toast.success("Moved to Contacts", contact.company);

        navigate("/contacts");
      }
    } catch (err) {
      toast.error("Could not move lead", err.message);
    }
  }

  async function handleLogActivity(values) {
    if (!logging) return;

    try {
      await logActivity(logging, values);

      setLogging(null);

      await openLead(logging);

      toast.success(`${values.type} logged`, logging.company);
    } catch (err) {
      toast.error("Could not log activity", err.message);
    }
  }

  function toggleSelected(id) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleAll() {
    const allVisibleSelected =
      visible.length && visible.every((lead) => selected.includes(lead.id));

    setSelected(allVisibleSelected ? [] : visible.map((lead) => lead.id));
  }

  async function qualifySelected() {
    if (!selected.length) return;

    try {
      await Promise.all(
        selected.map((id) =>
          api(`/leads/${id}/qualify/`, {
            method: "POST",
            body: JSON.stringify({
              status: "qualified",
            }),
          }),
        ),
      );

      setSelected([]);

      window.location.reload();
    } catch (err) {
      toast.error("Bulk qualification failed", err.message);
    }
  }

  async function importFile(event) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) return;

    try {
      const form = new FormData();

      form.append("file", file);
      form.append("mode", "preview");

      const preview = await api("/leads/import/", {
        method: "POST",
        body: form,
        headers: {},
      });

      const message =
        `${preview.total_rows} rows detected. ` +
        `${preview.errors.length} rows have validation issues. ` +
        "Import valid rows?";

      if (!window.confirm(message)) {
        return;
      }

      const importForm = new FormData();

      importForm.append("file", file);
      importForm.append("mode", "import");
      importForm.append("duplicate_action", "skip");

      const result = await api("/leads/import/", {
        method: "POST",
        body: importForm,
        headers: {},
      });

      toast.success(
        "Import completed",
        `${result.imported} imported, ${result.skipped} skipped`,
      );

      window.location.reload();
    } catch (err) {
      toast.error("Import failed", err.message);
    }
  }

  const sourceOptions = sources.map((item) => ({
    value: item.name,
    label: item.name,
  }));

  // const ownerOptions = users.map(
  //   (item) => ({
  //     value: String(item.id),
  //     label:
  //       item.display_name ??
  //       item.displayName ??
  //       item.name ??
  //       item.username ??
  //       item.email,
  //   }),
  // )

  const ownerOptions = (users ?? [])
  .filter((user) => user.is_active === true)
  .map((user) => ({
    value: String(user.id),
    label: user.display_name,
  }))

  const productOptions = products.map((item) => ({
    value: String(item.id),
    label: item.name,
  }));

  const learningModeOptions = learningModes.map((item) => ({
    value: String(item.id),
    label: item.name,
  }));

  const courseDurationOptions = courseDurations.map((item) => ({
    value: String(item.id),
    label: item.name,
  }));

  const canReassign = hasPermission("reassign_lead");

  return (
    <div className="space-y-5">
      <ProcessSteps
        current="leads"
        counts={{
          leads: stats.totalLeads,
          contacts: stats.totalContacts,
          deals: stats.totalDeals,
        }}
      />

      <PageHeader
        title="Leads"
        subtitle="Capture, qualify, reassign and convert leads using live backend data."
        actions={
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={importFile}
            />

            {hasPermission("import_leads") ? (
              <Button
                variant="secondary"
                icon={Upload}
                onClick={() => fileRef.current?.click()}
              >
                Import
              </Button>
            ) : null}

            <Button
              icon={Plus}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add Lead
            </Button>
          </div>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <SearchBar
              value={query}
              onChange={(value) => {
                setQuery(value);
                setPage(1);
              }}
              placeholder="Search leads..."
              className="w-full lg:w-64 lg:shrink-0"
            />

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:ml-auto lg:flex lg:w-auto lg:items-center">
              <FilterDropdown
                label="Status"
                value={status}
                options={STATUSES}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
                className="lg:w-44"
              />

              <FilterDropdown
                label="Source"
                value={source}
                options={sourceOptions}
                onChange={(value) => {
                  setSource(value);
                  setPage(1);
                }}
                className="lg:w-44"
              />

              <FilterDropdown
                label="Owner"
                value={owner}
                options={ownerOptions}
                onChange={(value) => {
                  setOwner(value);
                  setPage(1);
                }}
                className="lg:w-48"
              />

              <FilterDropdown
                label="Course"
                value={course}
                options={productOptions}
                onChange={(value) => {
                  setCourse(value);
                  setPage(1);
                }}
                className="lg:w-48"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <FilterDropdown
              label="Learning Mode"
              value={learningMode}
              options={learningModeOptions}
              onChange={(value) => {
                setLearningMode(value);
                setPage(1);
              }}
            />

            <FilterDropdown
              label="Course Duration"
              value={courseDuration}
              options={courseDurationOptions}
              onChange={(value) => {
                setCourseDuration(value);
                setPage(1);
              }}
            />

            <div className="flex min-w-0 flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">
                Town / City
              </label>

              <input
                value={townCity}
                onChange={(event) => {
                  setTownCity(event.target.value);
                  setPage(1);
                }}
                placeholder="Search town/city..."
                className="field-input w-full"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="secondary"
                icon={Download}
                onClick={() =>
                  toast.info(
                    "Export",
                    "CSV export can be connected to the export_records endpoint when enabled.",
                  )
                }
                className="w-full"
              >
                Export
              </Button>

              {hasFilters ? (
                <Button
                  variant="secondary"
                  onClick={resetFilters}
                  className="w-full"
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {selected.length ? (
          <div className="flex items-center justify-between border-b border-slate-200 bg-brand-50 px-4 py-2">
            <span className="text-sm font-medium text-brand-800">
              {selected.length} selected
            </span>

            {hasPermission("set_lead_status") ? (
              <Button size="sm" onClick={qualifySelected}>
                Qualify selected
              </Button>
            ) : null}
          </div>
        ) : null}

        {visible.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title={hasFilters ? "No leads match your filters" : "No leads yet"}
            message={
              hasFilters
                ? "Try a different search term or clear the filters."
                : "Capture your first lead to start the process."
            }
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={resetFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button icon={Plus} onClick={() => setFormOpen(true)}>
                  Add Lead
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[1200px]">
              <THead>
                <TR>
                  <TH>
                    <input
                      type="checkbox"
                      checked={
                        visible.length > 0 &&
                        visible.every((lead) => selected.includes(lead.id))
                      }
                      onChange={toggleAll}
                      aria-label="Select all leads"
                    />
                  </TH>

                  <TH>Name</TH>
                  <TH>Company</TH>
                  <TH>Email</TH>
                  <TH>Course Interested</TH>
                  <TH>Learning Mode</TH>
                  <TH>Course Duration</TH>
                  <TH>Town / City</TH>
                  <TH>Source</TH>
                  <TH>Status</TH>
                  <TH>Owner</TH>
                  <TH>Captured</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>

              <TBody>
                {visible.map((lead) => {
                  const productId =
                    lead.productId ?? lead.product_id ?? lead.product ?? "";

                  const productName =
                    lead.productName ??
                    lead.product_name ??
                    products.find(
                      (item) => String(item.id) === String(productId),
                    )?.name ??
                    "—";

                  const learningModeId =
                    lead.learningModeId ??
                    lead.learning_mode_id ??
                    lead.learning_mode ??
                    "";

                  const learningModeName =
                    lead.learningModeName ??
                    lead.learning_mode_name ??
                    learningModes.find(
                      (item) => String(item.id) === String(learningModeId),
                    )?.name ??
                    "—";

                  const courseDurationId =
                    lead.courseDurationId ??
                    lead.course_duration_id ??
                    lead.course_duration ??
                    "";

                  const courseDurationName =
                    lead.courseDurationName ??
                    lead.course_duration_name ??
                    courseDurations.find(
                      (item) => String(item.id) === String(courseDurationId),
                    )?.name ??
                    "—";

                  const city = lead.townCity ?? lead.town_city ?? "—";

                  return (
                    <TR key={lead.id} onClick={() => openLead(lead)}>
                      <TD onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.includes(lead.id)}
                          onChange={() => toggleSelected(lead.id)}
                          aria-label={`Select ${lead.name}`}
                        />
                      </TD>

                      <TD>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={lead.name} size="sm" />

                          <span className="whitespace-nowrap font-medium text-slate-900">
                            {lead.name}
                          </span>
                        </div>
                      </TD>

                      <TD className="whitespace-nowrap">{lead.company}</TD>

                      <TD>
                        <a
                          href={`mailto:${lead.email}`}
                          onClick={(event) => event.stopPropagation()}
                          className="text-brand-600 hover:text-brand-700"
                        >
                          {lead.email}
                        </a>
                      </TD>

                      <TD className="whitespace-nowrap">{productName}</TD>

                      <TD className="whitespace-nowrap">{learningModeName}</TD>

                      <TD className="whitespace-nowrap">
                        {courseDurationName}
                      </TD>

                      <TD className="whitespace-nowrap">{city}</TD>

                      <TD>
                        <Badge tone="gray">{lead.source}</Badge>
                      </TD>

                      <TD>
                        <StatusBadge status={lead.status} />
                      </TD>

                      <TD>
                        <span className="inline-flex items-center gap-2 whitespace-nowrap">
                          <Avatar name={lead.owner} size="xs" />

                          {lead.owner}
                        </span>
                      </TD>

                      <TD className="whitespace-nowrap">
                        {formatDate(lead.createdAt)}
                      </TD>

                      <TD
                        className="text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <RowActions
                          items={[
                            {
                              label: "View",
                              icon: Eye,
                              onClick: () => openLead(lead),
                            },

                            ...(hasPermission("edit_lead")
                              ? [
                                  {
                                    label: "Edit",
                                    icon: Pencil,
                                    onClick: () => {
                                      setEditing(lead);
                                      setFormOpen(true);
                                    },
                                  },
                                ]
                              : []),

                            ...(hasPermission("delete_lead")
                              ? [
                                  {
                                    label: "Delete",
                                    icon: Trash2,
                                    danger: true,
                                    onClick: () => setPendingDelete(lead),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        )}

        {visible.length > 0 ? (
          <div className="border-t border-slate-200 p-3">
            <Pagination
              page={currentPage}
              pageSize={PAGE_SIZE}
              total={filtered.length}
              onChange={setPage}
            />
          </div>
        ) : null}
      </Card>

      <LeadFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSubmit={handleSubmit}
        lead={editing}
        users={users}
        sources={sources}
        products={products}
        learningModes={learningModes}
        courseDurations={courseDurations}
        currentUser={user}
        canReassign={canReassign}
      />

      <LeadDrawer
        lead={viewing}
        activity={
          viewing
            ? activityLog[viewing.recordId] || viewing.activities || []
            : []
        }
        history={
          viewing ? auditLog[viewing.recordId] || viewing.history || [] : []
        }
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        onEdit={(lead) => {
          setViewing(null);
          setEditing(lead);
          setFormOpen(true);
        }}
        onDelete={setPendingDelete}
        onMoveToContact={handleMoveToContact}
        onLogActivity={setLogging}
        canReassign={canReassign}
        onReassign={handleReassign}
        users={users}
      />

      <LogActivityModal
        open={Boolean(logging)}
        onClose={() => setLogging(null)}
        record={logging}
        onConfirm={handleLogActivity}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleDelete}
        title="Delete lead?"
        message={
          pendingDelete
            ? `Delete ${pendingDelete.name} from ${pendingDelete.company}? This cannot be undone through the normal UI.`
            : ""
        }
        confirmLabel="Delete lead"
      />
    </div>
  );
}
