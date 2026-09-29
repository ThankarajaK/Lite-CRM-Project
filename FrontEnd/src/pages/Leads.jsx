import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Download,
  Eye,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  Upload,
} from "lucide-react";
import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import PageHeader from "../components/ui/PageHeader";
import ProcessSteps from "../components/layout/ProcessSteps";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import SearchBar from "../components/ui/SearchBar";
import FilterDropdown from "../components/ui/FilterDropdown";
import Table, {
  TBody,
  TD,
  TH,
  THead,
  TR,
} from "../components/ui/Table";
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

  /*
   * --------------------------------------------------------------------------
   * URL STATE
   * --------------------------------------------------------------------------
   *
   * Examples:
   *
   * /leads
   * /leads?search=raja
   * /leads?status=Qualified
   * /leads?owner=5&page=2
   * /leads?status=Qualified&owner=5&page=2&lead=12
   *
   * This makes filters, pagination and the selected Lead addressable.
   */

  const [searchParams, setSearchParams] =
    useSearchParams();

  const urlQuery =
    searchParams.get("search") ?? "";

  const urlStatus =
    searchParams.get("status") ?? "";

  const urlSource =
    searchParams.get("source") ?? "";

  const urlOwner =
    searchParams.get("owner") ?? "";

  const urlCourse =
    searchParams.get("course") ?? "";

  const urlLearningMode =
    searchParams.get("learning_mode") ?? "";

  const urlCourseDuration =
    searchParams.get("course_duration") ?? "";

  const urlTownCity =
    searchParams.get("town_city") ?? "";

  const parsedUrlPage = Number(
    searchParams.get("page") ?? "1",
  );

  const urlPage =
    Number.isFinite(parsedUrlPage) &&
    parsedUrlPage > 0
      ? Math.floor(parsedUrlPage)
      : 1;

  const urlLead =
    searchParams.get("lead") ?? "";

  /*
   * --------------------------------------------------------------------------
   * LOCAL UI STATE
   * --------------------------------------------------------------------------
   */

  const [query, setQuery] =
    useState(urlQuery);

  const [status, setStatus] =
    useState(urlStatus);

  const [source, setSource] =
    useState(urlSource);

  const [owner, setOwner] =
    useState(urlOwner);

  const [course, setCourse] =
    useState(urlCourse);

  const [learningMode, setLearningMode] =
    useState(urlLearningMode);

  const [courseDuration, setCourseDuration] =
    useState(urlCourseDuration);

  const [townCity, setTownCity] =
    useState(urlTownCity);

  const [page, setPage] =
    useState(urlPage);

  const [selected, setSelected] =
    useState([]);

  const [formOpen, setFormOpen] =
    useState(false);

  const [editing, setEditing] =
    useState(null);

  const [viewing, setViewing] =
    useState(null);

  const [pendingDelete, setPendingDelete] =
    useState(null);

  const [logging, setLogging] =
    useState(null);

  /*
   * Prevent opening the same URL Lead repeatedly.
   */
  const openedUrlLeadRef = useRef("");

  /*
   * --------------------------------------------------------------------------
   * URL HELPERS
   * --------------------------------------------------------------------------
   */

  function updateUrl({
    nextQuery = query,
    nextStatus = status,
    nextSource = source,
    nextOwner = owner,
    nextCourse = course,
    nextLearningMode = learningMode,
    nextCourseDuration = courseDuration,
    nextTownCity = townCity,
    nextPage = page,
    nextLead,
  } = {}) {
    const params = new URLSearchParams();

    if (nextQuery) {
      params.set("search", nextQuery);
    }

    if (nextStatus) {
      params.set("status", nextStatus);
    }

    if (nextSource) {
      params.set("source", nextSource);
    }

    if (nextOwner) {
      params.set("owner", nextOwner);
    }

    if (nextCourse) {
      params.set("course", nextCourse);
    }

    if (nextLearningMode) {
      params.set(
        "learning_mode",
        nextLearningMode,
      );
    }

    if (nextCourseDuration) {
      params.set(
        "course_duration",
        nextCourseDuration,
      );
    }

    if (nextTownCity) {
      params.set(
        "town_city",
        nextTownCity,
      );
    }

    if (
      Number(nextPage) > 1
    ) {
      params.set(
        "page",
        String(nextPage),
      );
    }

    if (
      nextLead !== undefined &&
      nextLead !== null &&
      nextLead !== ""
    ) {
      params.set(
        "lead",
        String(nextLead),
      );
    }

    setSearchParams(params);
  }

  /*
   * --------------------------------------------------------------------------
   * KEEP LOCAL STATE IN SYNC WITH BROWSER BACK/FORWARD
   * --------------------------------------------------------------------------
   */

  useEffect(() => {
    setQuery(urlQuery);
    setStatus(urlStatus);
    setSource(urlSource);
    setOwner(urlOwner);
    setCourse(urlCourse);
    setLearningMode(urlLearningMode);
    setCourseDuration(urlCourseDuration);
    setTownCity(urlTownCity);
    setPage(urlPage);
  }, [
    urlQuery,
    urlStatus,
    urlSource,
    urlOwner,
    urlCourse,
    urlLearningMode,
    urlCourseDuration,
    urlTownCity,
    urlPage,
  ]);

  /*
   * --------------------------------------------------------------------------
   * FILTERING
   * --------------------------------------------------------------------------
   */

  const filtered = useMemo(() => {
    const term =
      query.trim().toLowerCase();

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

      const matchesStatus =
        !status ||
        lead.status === status;

      const matchesSource =
        !source ||
        lead.source === source;

      const matchesOwner =
        !owner ||
        String(lead.ownerId) ===
          String(owner);

      const leadProductId =
        lead.productId ??
        lead.product_id ??
        lead.product ??
        "";

      const matchesCourse =
        !course ||
        String(leadProductId) ===
          String(course);

      const leadLearningModeId =
        lead.learningModeId ??
        lead.learning_mode_id ??
        lead.learning_mode ??
        "";

      const matchesLearningMode =
        !learningMode ||
        String(
          leadLearningModeId,
        ) === String(learningMode);

      const leadCourseDurationId =
        lead.courseDurationId ??
        lead.course_duration_id ??
        lead.course_duration ??
        "";

      const matchesCourseDuration =
        !courseDuration ||
        String(
          leadCourseDurationId,
        ) === String(courseDuration);

      const leadTown =
        lead.townCity ??
        lead.town_city ??
        "";

      const matchesTownCity =
        !townCity ||
        String(leadTown)
          .toLowerCase()
          .includes(
            townCity
              .trim()
              .toLowerCase(),
          );

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

  const pageCount = Math.max(
    1,
    Math.ceil(
      filtered.length / PAGE_SIZE,
    ),
  );

  const currentPage = Math.min(
    page,
    pageCount,
  );

  const visible = filtered.slice(
    (currentPage - 1) *
      PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  /*
   * If a URL contains a page number which is now outside the available
   * result set, normalize it back to the last valid page.
   */
  useEffect(() => {
    if (
      page > pageCount &&
      pageCount >= 1
    ) {
      setPage(pageCount);

      updateUrl({
        nextPage: pageCount,
      });
    }
  }, [
    page,
    pageCount,
  ]);

  const hasFilters =
    Boolean(
      query ||
        status ||
        source ||
        owner ||
        course ||
        learningMode ||
        courseDuration ||
        townCity,
    );

  /*
   * --------------------------------------------------------------------------
   * FILTER ACTIONS
   * --------------------------------------------------------------------------
   */

  function handleQueryChange(value) {
    setQuery(value);
    setPage(1);

    updateUrl({
      nextQuery: value,
      nextPage: 1,
    });
  }

  function handleStatusChange(value) {
    setStatus(value);
    setPage(1);

    updateUrl({
      nextStatus: value,
      nextPage: 1,
    });
  }

  function handleSourceChange(value) {
    setSource(value);
    setPage(1);

    updateUrl({
      nextSource: value,
      nextPage: 1,
    });
  }

  function handleOwnerChange(value) {
    setOwner(value);
    setPage(1);

    updateUrl({
      nextOwner: value,
      nextPage: 1,
    });
  }

  function handleCourseChange(value) {
    setCourse(value);
    setPage(1);

    updateUrl({
      nextCourse: value,
      nextPage: 1,
    });
  }

  function handleLearningModeChange(
    value,
  ) {
    setLearningMode(value);
    setPage(1);

    updateUrl({
      nextLearningMode: value,
      nextPage: 1,
    });
  }

  function handleCourseDurationChange(
    value,
  ) {
    setCourseDuration(value);
    setPage(1);

    updateUrl({
      nextCourseDuration: value,
      nextPage: 1,
    });
  }

  function handleTownCityChange(
    value,
  ) {
    setTownCity(value);
    setPage(1);

    updateUrl({
      nextTownCity: value,
      nextPage: 1,
    });
  }

  function handlePageChange(nextPage) {
    const safePage = Math.max(
      1,
      Math.min(
        Number(nextPage) || 1,
        pageCount,
      ),
    );

    setPage(safePage);

    updateUrl({
      nextPage: safePage,
    });
  }

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

    updateUrl({
      nextQuery: "",
      nextStatus: "",
      nextSource: "",
      nextOwner: "",
      nextCourse: "",
      nextLearningMode: "",
      nextCourseDuration: "",
      nextTownCity: "",
      nextPage: 1,
      nextLead: urlLead,
    });
  }

  /*
   * --------------------------------------------------------------------------
   * OPEN LEAD
   * --------------------------------------------------------------------------
   *
   * The selected Lead is now represented by:
   *
   * /leads?lead=123
   *
   * This makes the record bookmarkable/shareable.
   */

  async function openLead(
    lead,
    options = {},
  ) {
    const shouldUpdateUrl =
      options.updateUrl !== false;

    try {
      if (shouldUpdateUrl) {
        updateUrl({
          nextLead: lead.id,
        });
      }

      const logs =
        await loadLeadTimeline(
          lead.recordId,
        );

      setViewing({
        ...lead,
        ...logs,
      });

      openedUrlLeadRef.current =
        String(lead.id);
    } catch (err) {
      toast.error(
        "Could not load lead details",
        err.message,
      );
    }
  }

  /*
   * --------------------------------------------------------------------------
   * OPEN LEAD FROM URL
   * --------------------------------------------------------------------------
   *
   * This handles:
   *
   * /leads?lead=123
   *
   * after:
   * - refresh
   * - bookmark
   * - copied URL
   * - browser Back/Forward
   */

  useEffect(() => {
    if (!urlLead) {
      if (openedUrlLeadRef.current) {
        setViewing(null);
        openedUrlLeadRef.current = "";
      }

      return;
    }

    const matchingLead =
      leads.find(
        (lead) =>
          String(lead.id) ===
            String(urlLead) ||
          String(
            lead.recordId,
          ) === String(urlLead),
      );

    if (!matchingLead) {
      return;
    }

    if (
      openedUrlLeadRef.current ===
        String(matchingLead.id) &&
      viewing
    ) {
      return;
    }

    openLead(
      matchingLead,
      {
        updateUrl: false,
      },
    );
  }, [
    urlLead,
    leads,
  ]);

  /*
   * --------------------------------------------------------------------------
   * SUBMIT LEAD
   * --------------------------------------------------------------------------
   */

  async function handleSubmit(
    values,
  ) {
    try {
      if (editing) {
        const updated =
          await updateLead(
            editing.id,
            values,
          );

        toast.success(
          "Lead updated",
          values.name,
        );

        if (
          viewing?.id ===
          editing.id
        ) {
          setViewing(
            (current) => ({
              ...current,
              ...values,

              ownerId:
                updated.owner_id ??
                updated.ownerId ??
                values.ownerId,

              owner:
                updated.owner_name ??
                updated.ownerName ??
                values.owner,

              productId:
                updated.product_id ??
                updated.product ??
                values.productId,

              productName:
                updated.product_name ??
                updated.productName ??
                values.productName,

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

              townCity:
                updated.town_city ??
                updated.townCity ??
                values.townCity,

              notes:
                updated.notes ??
                values.notes,
            }),
          );
        }
      } else {
        const created =
          await addLead(values);

        toast.success(
          created?.duplicate_warning
            ? "Lead captured — duplicate warning"
            : "Lead captured",
          created?.duplicate_warning
            ? "A matching email already existed. The lead was still saved."
            : `${values.name} · ${values.company}`,
        );

        setPage(1);

        updateUrl({
          nextPage: 1,
          nextLead: "",
        });
      }

      setEditing(null);
    } catch (err) {
      toast.error(
        "Could not save lead",
        err.message,
      );

      throw err;
    }
  }

  /*
   * --------------------------------------------------------------------------
   * DELETE
   * --------------------------------------------------------------------------
   */

  async function handleDelete() {
    if (!pendingDelete) {
      return;
    }

    try {
      await deleteLead(
        pendingDelete.id,
      );

      toast.success(
        "Lead deleted",
        pendingDelete.name,
      );

      if (
        viewing?.id ===
        pendingDelete.id
      ) {
        setViewing(null);

        updateUrl({
          nextLead: "",
        });
      }
    } catch (err) {
      toast.error(
        "Could not delete lead",
        err.message,
      );
    } finally {
      setPendingDelete(null);
    }
  }

  /*
   * --------------------------------------------------------------------------
   * REASSIGN
   * --------------------------------------------------------------------------
   */

  async function handleReassign(
    lead,
    ownerId,
  ) {
    if (!ownerId) {
      return;
    }

    try {
      const updated =
        await reassignLead(
          lead.id,
          ownerId,
        );

      setViewing(
        (current) =>
          current?.id === lead.id
            ? {
                ...current,
                ownerId:
                  updated.owner_id ??
                  updated.ownerId,

                owner:
                  updated.owner_name ??
                  updated.ownerName,
              }
            : current,
      );

      toast.success(
        "Lead reassigned",
        updated.owner_name ??
          updated.ownerName,
      );
    } catch (err) {
      toast.error(
        "Could not reassign lead",
        err.message,
      );
    }
  }

  /*
   * --------------------------------------------------------------------------
   * MOVE TO CONTACT
   * --------------------------------------------------------------------------
   */

  async function handleMoveToContact(
    lead,
  ) {
    try {
      const contact =
        await moveLeadToContact(
          lead.id,
        );

      setViewing(null);

      updateUrl({
        nextLead: "",
      });

      if (contact) {
        toast.success(
          "Moved to Contacts",
          contact.company,
        );

        navigate("/contacts");
      }
    } catch (err) {
      toast.error(
        "Could not move lead",
        err.message,
      );
    }
  }

  /*
   * --------------------------------------------------------------------------
   * LOG ACTIVITY
   * --------------------------------------------------------------------------
   */

  async function handleLogActivity(
    values,
  ) {
    if (!logging) {
      return;
    }

    try {
      await logActivity(
        logging,
        values,
      );

      setLogging(null);

      await openLead(
        logging,
        {
          updateUrl: false,
        },
      );

      toast.success(
        `${values.type} logged`,
        logging.company,
      );
    } catch (err) {
      toast.error(
        "Could not log activity",
        err.message,
      );
    }
  }

  /*
   * --------------------------------------------------------------------------
   * SELECTION
   * --------------------------------------------------------------------------
   */

  function toggleSelected(id) {
    setSelected(
      (current) =>
        current.includes(id)
          ? current.filter(
              (item) =>
                item !== id,
            )
          : [
              ...current,
              id,
            ],
    );
  }

  function toggleAll() {
    const allVisibleSelected =
      visible.length &&
      visible.every(
        (lead) =>
          selected.includes(
            lead.id,
          ),
      );

    setSelected(
      allVisibleSelected
        ? []
        : visible.map(
            (lead) => lead.id,
          ),
    );
  }

  /*
   * --------------------------------------------------------------------------
   * BULK QUALIFY
   * --------------------------------------------------------------------------
   */

  async function qualifySelected() {
    if (!selected.length) {
      return;
    }

    try {
      await Promise.all(
        selected.map((id) =>
          api(
            `/leads/${id}/qualify/`,
            {
              method: "POST",
              body: JSON.stringify({
                status:
                  "qualified",
              }),
            },
          ),
        ),
      );

      setSelected([]);

      window.location.reload();
    } catch (err) {
      toast.error(
        "Bulk qualification failed",
        err.message,
      );
    }
  }

  /*
   * --------------------------------------------------------------------------
   * IMPORT
   * --------------------------------------------------------------------------
   */

  async function importFile(
    event,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const form =
        new FormData();

      form.append(
        "file",
        file,
      );

      form.append(
        "mode",
        "preview",
      );

      const preview =
        await api(
          "/leads/import/",
          {
            method: "POST",
            body: form,
            headers: {},
          },
        );

      const message =
        `${preview.total_rows} rows detected. ` +
        `${preview.errors.length} rows have validation issues. ` +
        "Import valid rows?";

      if (
        !window.confirm(
          message,
        )
      ) {
        return;
      }

      const importForm =
        new FormData();

      importForm.append(
        "file",
        file,
      );

      importForm.append(
        "mode",
        "import",
      );

      importForm.append(
        "duplicate_action",
        "skip",
      );

      const result =
        await api(
          "/leads/import/",
          {
            method: "POST",
            body: importForm,
            headers: {},
          },
        );

      toast.success(
        "Import completed",
        `${result.imported} imported, ${result.skipped} skipped`,
      );

      window.location.reload();
    } catch (err) {
      toast.error(
        "Import failed",
        err.message,
      );
    }
  }

  /*
   * --------------------------------------------------------------------------
   * OPTIONS
   * --------------------------------------------------------------------------
   */

  const sourceOptions =
    sources.map((item) => ({
      value: item.name,
      label: item.name,
    }));

  /*
   * Only active users are available as owners.
   *
   * Existing backend ownership and permission rules remain unchanged.
   */

  const ownerOptions =
    (users ?? [])
      .filter(
        (user) =>
          user.is_active ===
          true,
      )
      .map((user) => ({
        value: String(user.id),
        label:
          user.display_name,
      }));

  const productOptions =
    products.map((item) => ({
      value: String(item.id),
      label: item.name,
    }));

  const learningModeOptions =
    learningModes.map(
      (item) => ({
        value: String(item.id),
        label: item.name,
      }),
    );

  const courseDurationOptions =
    courseDurations.map(
      (item) => ({
        value: String(item.id),
        label: item.name,
      }),
    );

  const canReassign =
    hasPermission(
      "reassign_lead",
    );

  /*
   * --------------------------------------------------------------------------
   * CLOSE VIEW
   * --------------------------------------------------------------------------
   */

  function closeLeadDrawer() {
    setViewing(null);
    openedUrlLeadRef.current = "";

    updateUrl({
      nextLead: "",
    });
  }

  /*
   * --------------------------------------------------------------------------
   * RENDER
   * --------------------------------------------------------------------------
   */

  return (
    <div className="min-w-0 space-y-5">
      <div className="min-w-0 overflow-x-auto overscroll-x-contain">
        <div className="min-w-0">
          <ProcessSteps
            current="leads"
            counts={{
              leads:
                stats.totalLeads,
              contacts:
                stats.totalContacts,
              deals:
                stats.totalDeals,
            }}
          />
        </div>
      </div>

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
              onChange={
                importFile
              }
            />

            {hasPermission(
              "import_leads",
            ) ? (
              <Button
                variant="secondary"
                icon={Upload}
                onClick={() =>
                  fileRef.current?.click()
                }
              >
                Import
              </Button>
            ) : null}

            <Button
              icon={Plus}
              onClick={() => {
                setEditing(
                  null,
                );
                setFormOpen(
                  true,
                );
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
              onChange={
                handleQueryChange
              }
              placeholder="Search leads..."
              className="w-full lg:w-64 lg:shrink-0"
            />

            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:ml-auto lg:flex lg:w-auto lg:items-center">
              <FilterDropdown
                label="Status"
                value={status}
                options={
                  STATUSES
                }
                onChange={
                  handleStatusChange
                }
                className="lg:w-44"
              />

              <FilterDropdown
                label="Source"
                value={source}
                options={
                  sourceOptions
                }
                onChange={
                  handleSourceChange
                }
                className="lg:w-44"
              />

              <FilterDropdown
                label="Owner"
                value={owner}
                options={
                  ownerOptions
                }
                onChange={
                  handleOwnerChange
                }
                className="lg:w-48"
              />

              <FilterDropdown
                label="Course"
                value={course}
                options={
                  productOptions
                }
                onChange={
                  handleCourseChange
                }
                className="lg:w-48"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <FilterDropdown
              label="Learning Mode"
              value={
                learningMode
              }
              options={
                learningModeOptions
              }
              onChange={
                handleLearningModeChange
              }
            />

            <FilterDropdown
              label="Course Duration"
              value={
                courseDuration
              }
              options={
                courseDurationOptions
              }
              onChange={
                handleCourseDurationChange
              }
            />

            <div className="flex min-w-0 flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">
                Town / City
              </label>

              <input
                value={townCity}
                onChange={(event) =>
                  handleTownCityChange(
                    event.target
                      .value,
                  )
                }
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
                  onClick={
                    resetFilters
                  }
                  className="w-full"
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {selected.length ? (
          <div className="flex flex-col gap-2 border-b border-slate-200 bg-brand-50 px-4 py-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-sm font-medium text-brand-800">
              {selected.length}{" "}
              selected
            </span>

            {hasPermission(
              "set_lead_status",
            ) ? (
              <Button
                size="sm"
                onClick={
                  qualifySelected
                }
              >
                Qualify selected
              </Button>
            ) : null}
          </div>
        ) : null}

        {visible.length ===
        0 ? (
          <EmptyState
            icon={UserPlus}
            title={
              hasFilters
                ? "No leads match your filters"
                : "No leads yet"
            }
            message={
              hasFilters
                ? "Try a different search term or clear the filters."
                : "Capture your first lead to start the process."
            }
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  onClick={
                    resetFilters
                  }
                >
                  Clear filters
                </Button>
              ) : (
                <Button
                  icon={Plus}
                  onClick={() =>
                    setFormOpen(
                      true,
                    )
                  }
                >
                  Add Lead
                </Button>
              )
            }
          />
        ) : (
          <>
            {/* Desktop/tablet table. At 768px and above the full table remains
                available inside a bounded horizontal scroll area. */}
            <div className="hidden min-w-0 overflow-x-auto overscroll-x-contain min-[768px]:block">
              <Table className="min-w-[1200px]">
              <THead>
                <TR>
                  <TH>
                    <input
                      type="checkbox"
                      checked={
                        visible.length >
                          0 &&
                        visible.every(
                          (lead) =>
                            selected.includes(
                              lead.id,
                            ),
                        )
                      }
                      onChange={
                        toggleAll
                      }
                      aria-label="Select all leads"
                    />
                  </TH>

                  <TH>Name</TH>
                  <TH>Company</TH>
                  <TH>Email</TH>
                  <TH>
                    Course Interested
                  </TH>
                  <TH>
                    Learning Mode
                  </TH>
                  <TH>
                    Course Duration
                  </TH>
                  <TH>
                    Town / City
                  </TH>
                  <TH>Source</TH>
                  <TH>Status</TH>
                  <TH>Owner</TH>
                  <TH>Captured</TH>
                  <TH className="text-right">
                    Actions
                  </TH>
                </TR>
              </THead>

              <TBody>
                {visible.map(
                  (lead) => {
                    const productId =
                      lead.productId ??
                      lead.product_id ??
                      lead.product ??
                      "";

                    const productName =
                      lead.productName ??
                      lead.product_name ??
                      products.find(
                        (item) =>
                          String(
                            item.id,
                          ) ===
                          String(
                            productId,
                          ),
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
                        (item) =>
                          String(
                            item.id,
                          ) ===
                          String(
                            learningModeId,
                          ),
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
                        (item) =>
                          String(
                            item.id,
                          ) ===
                          String(
                            courseDurationId,
                          ),
                      )?.name ??
                      "—";

                    const city =
                      lead.townCity ??
                      lead.town_city ??
                      "—";

                    return (
                      <TR
                        key={
                          lead.id
                        }
                        onClick={() =>
                          openLead(
                            lead,
                          )
                        }
                      >
                        <TD
                          onClick={(
                            event,
                          ) =>
                            event.stopPropagation()
                          }
                        >
                          <input
                            type="checkbox"
                            checked={selected.includes(
                              lead.id,
                            )}
                            onChange={() =>
                              toggleSelected(
                                lead.id,
                              )
                            }
                            aria-label={`Select ${lead.name}`}
                          />
                        </TD>

                        <TD>
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              name={
                                lead.name
                              }
                              size="sm"
                            />

                            <span className="whitespace-nowrap font-medium text-slate-900">
                              {
                                lead.name
                              }
                            </span>
                          </div>
                        </TD>

                        <TD className="whitespace-nowrap">
                          {
                            lead.company
                          }
                        </TD>

                        <TD>
                          <a
                            href={`mailto:${lead.email}`}
                            onClick={(
                              event,
                            ) =>
                              event.stopPropagation()
                            }
                            className="text-brand-600 hover:text-brand-700"
                          >
                            {
                              lead.email
                            }
                          </a>
                        </TD>

                        <TD className="whitespace-nowrap">
                          {
                            productName
                          }
                        </TD>

                        <TD className="whitespace-nowrap">
                          {
                            learningModeName
                          }
                        </TD>

                        <TD className="whitespace-nowrap">
                          {
                            courseDurationName
                          }
                        </TD>

                        <TD className="whitespace-nowrap">
                          {city}
                        </TD>

                        <TD>
                          <Badge tone="gray">
                            {
                              lead.source
                            }
                          </Badge>
                        </TD>

                        <TD>
                          <StatusBadge
                            status={
                              lead.status
                            }
                          />
                        </TD>

                        <TD>
                          <span className="inline-flex items-center gap-2 whitespace-nowrap">
                            <Avatar
                              name={
                                lead.owner
                              }
                              size="xs"
                            />

                            {
                              lead.owner
                            }
                          </span>
                        </TD>

                        <TD className="whitespace-nowrap">
                          {formatDate(
                            lead.createdAt,
                          )}
                        </TD>

                        <TD
                          className="text-right"
                          onClick={(
                            event,
                          ) =>
                            event.stopPropagation()
                          }
                        >
                          <RowActions
                            items={[
                              {
                                label:
                                  "View",
                                icon: Eye,
                                onClick:
                                  () =>
                                    openLead(
                                      lead,
                                    ),
                              },

                              ...(hasPermission(
                                "edit_lead",
                              )
                                ? [
                                    {
                                      label:
                                        "Edit",
                                      icon: Pencil,
                                      onClick:
                                        () => {
                                          setEditing(
                                            lead,
                                          );
                                          setFormOpen(
                                            true,
                                          );
                                        },
                                    },
                                  ]
                                : []),

                              ...(hasPermission(
                                "delete_lead",
                              )
                                ? [
                                    {
                                      label:
                                        "Delete",
                                      icon: Trash2,
                                      danger:
                                        true,
                                      onClick:
                                        () =>
                                          setPendingDelete(
                                            lead,
                                          ),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        </TD>
                      </TR>
                    );
                  },
                )}
              </TBody>
              </Table>
            </div>

            {/* Mobile cards. The table intentionally becomes cards below 768px
                so every field and action remains reachable on narrow screens. */}
            <div className="space-y-3 p-3 min-[768px]:hidden">
              {visible.map((lead) => {
                const productId =
                  lead.productId ??
                  lead.product_id ??
                  lead.product ??
                  "";

                const productName =
                  lead.productName ??
                  lead.product_name ??
                  products.find(
                    (item) =>
                      String(item.id) ===
                      String(productId),
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
                    (item) =>
                      String(item.id) ===
                      String(learningModeId),
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
                    (item) =>
                      String(item.id) ===
                      String(courseDurationId),
                  )?.name ??
                  "—";

                const city =
                  lead.townCity ??
                  lead.town_city ??
                  "—";

                return (
                  <article
                    key={`mobile-${lead.id}`}
                    className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div
                        className="shrink-0 pt-0.5"
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(
                            lead.id,
                          )}
                          onChange={() =>
                            toggleSelected(
                              lead.id,
                            )
                          }
                          aria-label={`Select ${lead.name}`}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          openLead(lead)
                        }
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Avatar
                            name={lead.name}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-slate-900">
                              {lead.name}
                            </h3>
                            <p className="truncate text-xs text-slate-500">
                              {lead.company || "—"}
                            </p>
                          </div>
                        </div>
                      </button>

                      <div
                        className="shrink-0"
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                      >
                        <RowActions
                          items={[
                            {
                              label: "View",
                              icon: Eye,
                              onClick: () =>
                                openLead(
                                  lead,
                                ),
                            },
                            ...(hasPermission(
                              "edit_lead",
                            )
                              ? [
                                  {
                                    label:
                                      "Edit",
                                    icon: Pencil,
                                    onClick:
                                      () => {
                                        setEditing(
                                          lead,
                                        );
                                        setFormOpen(
                                          true,
                                        );
                                      },
                                  },
                                ]
                              : []),
                            ...(hasPermission(
                              "delete_lead",
                            )
                              ? [
                                  {
                                    label:
                                      "Delete",
                                    icon: Trash2,
                                    danger:
                                      true,
                                    onClick:
                                      () =>
                                        setPendingDelete(
                                          lead,
                                        ),
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Email
                        </p>
                        <a
                          href={`mailto:${lead.email}`}
                          onClick={(event) =>
                            event.stopPropagation()
                          }
                          className="mt-0.5 block truncate text-sm text-brand-600 hover:text-brand-700"
                        >
                          {lead.email || "—"}
                        </a>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Course Interested
                        </p>
                        <p className="mt-0.5 truncate text-sm text-slate-700">
                          {productName}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Learning Mode
                        </p>
                        <p className="mt-0.5 truncate text-sm text-slate-700">
                          {learningModeName}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Course Duration
                        </p>
                        <p className="mt-0.5 truncate text-sm text-slate-700">
                          {courseDurationName}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Town / City
                        </p>
                        <p className="mt-0.5 truncate text-sm text-slate-700">
                          {city}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Source
                        </p>
                        <div className="mt-1">
                          <Badge tone="gray">
                            {lead.source ||
                              "—"}
                          </Badge>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Status
                        </p>
                        <div className="mt-1">
                          <StatusBadge
                            status={
                              lead.status
                            }
                          />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Owner
                        </p>
                        <span className="mt-1 inline-flex max-w-full items-center gap-2">
                          <Avatar
                            name={
                              lead.owner
                            }
                            size="xs"
                          />
                          <span className="truncate text-sm text-slate-700">
                            {lead.owner ||
                              "—"}
                          </span>
                        </span>
                      </div>

                      <div className="min-w-0 sm:col-span-2">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          Captured
                        </p>
                        <p className="mt-0.5 text-sm text-slate-700">
                          {formatDate(
                            lead.createdAt,
                          )}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        openLead(lead)
                      }
                      className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                    >
                      View lead
                    </button>
                  </article>
                );
              })}
            </div>
          </>
        )}

        {visible.length >
        0 ? (
          <div className="border-t border-slate-200 p-3">
            <Pagination
              page={
                currentPage
              }
              pageSize={
                PAGE_SIZE
              }
              total={
                filtered.length
              }
              onChange={
                handlePageChange
              }
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
        onSubmit={
          handleSubmit
        }
        lead={editing}
        users={users}
        sources={sources}
        products={products}
        learningModes={
          learningModes
        }
        courseDurations={
          courseDurations
        }
        currentUser={user}
        canReassign={
          canReassign
        }
      />

      <LeadDrawer
        lead={viewing}
        activity={
          viewing
            ? activityLog[
                viewing.recordId
              ] ||
              viewing.activities ||
              []
            : []
        }
        history={
          viewing
            ? auditLog[
                viewing.recordId
              ] ||
              viewing.history ||
              []
            : []
        }
        open={Boolean(
          viewing,
        )}
        onClose={
          closeLeadDrawer
        }
        onEdit={(lead) => {
          setViewing(null);

          setEditing(lead);

          setFormOpen(true);
        }}
        onDelete={
          setPendingDelete
        }
        onMoveToContact={
          handleMoveToContact
        }
        onLogActivity={
          setLogging
        }
        canReassign={
          canReassign
        }
        onReassign={
          handleReassign
        }
        users={users}
      />

      <LogActivityModal
        open={Boolean(
          logging,
        )}
        onClose={() =>
          setLogging(null)
        }
        record={logging}
        onConfirm={
          handleLogActivity
        }
      />

      <ConfirmDialog
        open={Boolean(
          pendingDelete,
        )}
        onClose={() =>
          setPendingDelete(
            null,
          )
        }
        onConfirm={
          handleDelete
        }
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