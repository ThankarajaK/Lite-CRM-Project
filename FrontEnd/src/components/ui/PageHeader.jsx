/**
 * Shared page header used across LiteCRM screens.
 *
 * Desktop:
 * - Title + subtitle on the left
 * - Actions on the right
 *
 * Mobile:
 * - Title + subtitle stack naturally
 * - Actions move below the title
 * - Long titles/subtitles wrap without horizontal overflow
 * - Action buttons remain usable on smaller screens
 */
export default function PageHeader({
  title,
  subtitle,
  actions,
}) {
  return (
    <div
      className="
        crm-page-header
        flex
        w-full
        min-w-0
        max-w-full
        flex-col
        gap-4
        overflow-hidden
        sm:gap-5
        lg:flex-row
        lg:items-start
        lg:justify-between
        lg:gap-6
      "
    >
      {/* =====================================================
          TITLE / SUBTITLE
          ===================================================== */}
      <div className="min-w-0 flex-1">
        <h1
          className="
            min-w-0
            max-w-full
            break-words
            text-xl
            font-semibold
            leading-tight
            tracking-tight
            text-slate-900
            sm:text-2xl
            lg:text-2xl
          "
        >
          {title}
        </h1>

        {subtitle ? (
          <p
            className="
              mt-1.5
              max-w-full
              break-words
              text-sm
              leading-5
              text-slate-500
              sm:mt-2
              sm:text-sm
              lg:max-w-2xl
            "
          >
            {subtitle}
          </p>
        ) : null}
      </div>

      {/* =====================================================
          ACTIONS
          ===================================================== */}
      {actions ? (
        <div
          className="
            crm-page-header-actions
            flex
            w-full
            min-w-0
            shrink-0
            flex-wrap
            items-center
            gap-2
            sm:w-auto
            sm:max-w-full
            sm:justify-start
            lg:justify-end
          "
        >
          {actions}
        </div>
      ) : null}
    </div>
  )
}