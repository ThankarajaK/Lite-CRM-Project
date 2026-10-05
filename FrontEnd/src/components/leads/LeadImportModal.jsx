import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  XCircle,
} from 'lucide-react'

import Modal from '../ui/Modal'
import Button from '../ui/Button'
import { crmApi } from '../../lib/api'

const ACCEPT = '.csv,.xlsx'

const FIELD_LABELS = {
  name: 'Name',
  company: 'Company',
  email: 'Email',
  phone: 'Phone',
  source: 'Source',
  status: 'Status',
  notes: 'Lead Feedback / Notes',
}

function normalizeList(value) {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.results)) return value.results
  return []
}

function formatError(error) {
  if (!error) return 'The import could not be completed.'
  if (error.message) return error.message
  return String(error)
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function LeadImportModal({
  open,
  onClose,
  onComplete,
}) {
  const inputRef = useRef(null)

  const [file, setFile] = useState(null)
  const [step, setStep] = useState('select')
  const [preview, setPreview] = useState(null)
  const [duplicateAction, setDuplicateAction] = useState('skip')
  const [skipInvalidRows, setSkipInvalidRows] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!open) {
      setFile(null)
      setStep('select')
      setPreview(null)
      setDuplicateAction('skip')
      setSkipInvalidRows(false)
      setLoading(false)
      setError('')
      setResult(null)
    }
  }, [open])

  function resetToSelect() {
    setFile(null)
    setStep('select')
    setPreview(null)
    setDuplicateAction('skip')
    setSkipInvalidRows(false)
    setLoading(false)
    setError('')
    setResult(null)

    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  function handleFileChange(event) {
    const selected = event.target.files?.[0] ?? null

    setError('')
    setPreview(null)
    setResult(null)

    if (!selected) {
      setFile(null)
      return
    }

    const lowerName = selected.name.toLowerCase()

    if (!lowerName.endsWith('.csv') && !lowerName.endsWith('.xlsx')) {
      setFile(null)
      setError('Only CSV and XLSX files are supported.')
      event.target.value = ''
      return
    }

    setFile(selected)
  }

  async function previewFile() {
    if (!file) {
      setError('Choose a CSV or XLSX file first.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mode', 'preview')
      formData.append('duplicate_action', duplicateAction)

      const response = await crmApi.importLeadPreview(formData)

      setPreview({
        headers: normalizeList(response?.headers),
        rows: normalizeList(response?.preview),
        errors: normalizeList(response?.errors),
        totalRows: Number(response?.total_rows ?? 0),
        missing: normalizeList(response?.missing),
      })

      setStep('preview')
    } catch (requestError) {
      setError(formatError(requestError))
    } finally {
      setLoading(false)
    }
  }

  async function importFile() {
    if (!file) return

    const errors = normalizeList(preview?.errors)

    if (errors.length > 0 && !skipInvalidRows) {
      setError(
        'This file contains validation errors. Review the rows first, then enable "Skip invalid rows" or fix the file and preview it again.',
      )
      return
    }

    setLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('mode', 'import')
      formData.append('duplicate_action', duplicateAction)

      const response = await crmApi.importLeads(formData)

      setResult(response)
      setStep('result')

      if (typeof onComplete === 'function') {
        onComplete(response)
      }
    } catch (requestError) {
      setError(formatError(requestError))
    } finally {
      setLoading(false)
    }
  }

  async function downloadTemplate() {
    setError('')

    try {
      const blob = await crmApi.downloadLeadImportTemplate()
      downloadBlob(blob, 'litecrm-leads-template.xlsx')
    } catch (requestError) {
      setError(formatError(requestError))
    }
  }

  function renderSelectStep() {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-brand-100 p-2 text-brand-700">
              <FileSpreadsheet className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-slate-900">
                Import leads from CSV or XLSX
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Download the template first if you are creating a new campaign or
                event list.
              </p>

              <button
                type="button"
                onClick={downloadTemplate}
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                <Download className="h-4 w-4" />
                Download import template
              </button>
            </div>
          </div>
        </div>

        <div>
          <label
            htmlFor="lead-import-file"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Spreadsheet
          </label>

          <input
            ref={inputRef}
            id="lead-import-file"
            type="file"
            accept={ACCEPT}
            onChange={handleFileChange}
            className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          />

          {file ? (
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <Upload className="h-3.5 w-3.5" />
              <span className="truncate">{file.name}</span>
              <span>·</span>
              <span>{Math.max(1, Math.round(file.size / 1024))} KB</span>
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-900">
            Required columns
          </p>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {['name', 'company', 'email'].map((key) => (
              <div
                key={key}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {FIELD_LABELS[key]}
                </p>
                <p className="mt-0.5 text-sm text-slate-700">{key}</p>
              </div>
            ))}
          </div>
        </div>

        {error ? (
          <ErrorBox message={error} />
        ) : null}
      </div>
    )
  }

  function renderPreviewStep() {
    const rows = normalizeList(preview?.rows)
    const errors = normalizeList(preview?.errors)
    const headers = normalizeList(preview?.headers)
    const missing = normalizeList(preview?.missing)

    return (
      <div className="space-y-5">
        {missing.length ? (
          <ErrorBox
            message={`Missing required columns: ${missing.join(', ')}`}
          />
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryCard
            label="Rows"
            value={preview?.totalRows ?? 0}
          />
          <SummaryCard
            label="Previewed"
            value={rows.length}
          />
          <SummaryCard
            label="Validation errors"
            value={errors.length}
            danger={errors.length > 0}
          />
          <SummaryCard
            label="Columns"
            value={headers.length}
          />
        </div>

        <section className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Detected column mapping
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              The importer detected these spreadsheet headers. The current backend
              maps columns by their names.
            </p>
          </div>

          <div className="max-h-48 overflow-y-auto p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {headers.map((header) => {
                const normalized = String(header).trim().toLowerCase()
                const label = FIELD_LABELS[normalized] ?? 'Unmapped / optional'

                return (
                  <div
                    key={header}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <span className="truncate text-sm font-medium text-slate-700">
                      {header}
                    </span>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-xs text-slate-500">
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">
              First rows
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Up to the first 25 rows are shown for validation.
            </p>
          </div>

          <div className="max-h-72 overflow-auto">
            {rows.length ? (
              <table className="min-w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-500">
                      Row
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-500">
                      Name
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-500">
                      Email
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-500">
                      Source
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-500">
                      Validation
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((item) => {
                    const rowErrors = normalizeList(item?.errors)

                    return (
                      <tr
                        key={item.row}
                        className="border-t border-slate-100"
                      >
                        <td className="px-3 py-2 font-medium text-slate-700">
                          {item.row}
                        </td>
                        <td className="max-w-40 truncate px-3 py-2 text-slate-700">
                          {item?.data?.name || '—'}
                        </td>
                        <td className="max-w-48 truncate px-3 py-2 text-slate-700">
                          {item?.data?.email || '—'}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {item?.data?.source || '—'}
                        </td>
                        <td className="px-3 py-2">
                          {rowErrors.length ? (
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <XCircle className="h-3.5 w-3.5" />
                              {rowErrors.join('; ')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                No preview rows were returned.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Duplicate handling
          </h3>

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[
              ['skip', 'Skip duplicates'],
              ['update', 'Update existing'],
            ].map(([value, label]) => (
              <label
                key={value}
                className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
              >
                <input
                  type="radio"
                  name="lead-import-duplicate-action"
                  value={value}
                  checked={duplicateAction === value}
                  onChange={() => setDuplicateAction(value)}
                  className="mt-0.5"
                />
                <span className="text-sm text-slate-700">{label}</span>
              </label>
            ))}
          </div>
        </section>

        {errors.length ? (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <input
              type="checkbox"
              checked={skipInvalidRows}
              onChange={(event) =>
                setSkipInvalidRows(event.target.checked)
              }
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-semibold text-amber-900">
                Skip invalid rows and continue
              </span>
              <span className="mt-1 block text-xs text-amber-800">
                Without this option, the import is blocked until the validation
                errors are fixed.
              </span>
            </span>
          </label>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            No validation errors were detected in the preview.
          </div>
        )}

        {error ? <ErrorBox message={error} /> : null}
      </div>
    )
  }

  function renderResultStep() {
    const imported = Number(result?.imported ?? 0)
    const skipped = Number(result?.skipped ?? 0)
    const errors = normalizeList(result?.errors)
    const failed = errors.length

    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
            <div>
              <h3 className="text-base font-semibold text-emerald-900">
                Lead import completed
              </h3>
              <p className="mt-1 text-sm text-emerald-800">
                The import batch has been processed and the Leads list can now
                be refreshed.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <SummaryCard label="Created / updated" value={imported} />
          <SummaryCard label="Skipped" value={skipped} />
          <SummaryCard label="Failed" value={failed} danger={failed > 0} />
        </div>

        {result?.batch_id ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Import batch
            </p>
            <p className="mt-1 break-all font-mono text-sm text-slate-700">
              {result.batch_id}
            </p>
          </div>
        ) : null}

        {errors.length ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-900">
              Rows with errors
            </p>
            <div className="mt-2 space-y-1 text-xs text-red-800">
              {errors.map((item) => (
                <div key={item.row}>
                  Row {item.row}: {normalizeList(item.errors).join('; ')}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  const footer =
    step === 'select' ? (
      <>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={previewFile}
          disabled={!file || loading}
          icon={Upload}
        >
          {loading ? 'Reading…' : 'Preview import'}
        </Button>
      </>
    ) : step === 'preview' ? (
      <>
        <Button
          variant="secondary"
          onClick={resetToSelect}
          disabled={loading}
        >
          Choose another file
        </Button>
        <Button
          onClick={importFile}
          disabled={loading}
          icon={Upload}
        >
          {loading ? 'Importing…' : 'Import leads'}
        </Button>
      </>
    ) : (
      <Button onClick={onClose}>
        Done
      </Button>
    )

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title="Import Leads"
      description={
        step === 'select'
          ? 'Upload a CSV or XLSX spreadsheet.'
          : step === 'preview'
            ? 'Review validation and duplicate handling before anything is written.'
            : 'Review the completed import summary.'
      }
      size="xl"
      footer={footer}
    >
      {step === 'select'
        ? renderSelectStep()
        : step === 'preview'
          ? renderPreviewStep()
          : renderResultStep()}
    </Modal>
  )
}

function SummaryCard({ label, value, danger = false }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-xl font-semibold ${
          danger ? 'text-red-600' : 'text-slate-900'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function ErrorBox({ message }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  )
}
