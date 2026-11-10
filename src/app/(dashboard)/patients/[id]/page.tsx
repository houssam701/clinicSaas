import type { ReactNode } from "react";
import type { IconType } from "react-icons";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  HiOutlineArrowDownTray,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineCake,
  HiOutlineCalendarDays,
  HiOutlineDocument,
  HiOutlineDocumentText,
  HiOutlineEnvelope,
  HiOutlineLink,
  HiOutlinePencilSquare,
  HiOutlinePhone,
  HiOutlinePhoto,
  HiOutlineUser,
} from "react-icons/hi2";
import { formatBytes } from "@/config/documents";
import { isFileStorageConfigured } from "@/services/storage";
import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { loadMyAccess } from "@/lib/access-page";
import { ageFrom, formatDate, patientInitials, patientName } from "@/lib/patient-format";
import { totalPages } from "@/lib/pagination";
import { deletePatientAction } from "@/actions/delete-patient";
import { deletePatientDocumentAction } from "@/actions/delete-patient-document";
import { BackLink } from "@/components/ui/back-link";
import { DeleteButton } from "@/components/ui/delete-button";
import { Pagination } from "@/components/ui/pagination";
import { MedicalHistoryCard } from "@/components/patients/medical-history-card";
import { AddDocumentPanel } from "@/components/patients/add-document-panel";
import { PATIENT_APPOINTMENTS_SHOWN, PatientAppointments } from "@/components/patients/patient-appointments";
import type { AppointmentWithPeople } from "@/types/appointments";
import { PATIENT_TREATMENTS_SHOWN, PatientFinances, owedOn } from "@/components/patients/patient-finances";
import type { InvoiceSummary } from "@/types/invoices";
import { fromCents } from "@/lib/money";
import { DEFAULT_PAGE_SIZE } from "@/types/pagination";
import type { MedicalHistoryModel, PatientDocumentModel, PatientModel } from "@/types/patients";

const DOCS_PAGE_SIZE = DEFAULT_PAGE_SIZE;

const NOTICES = {
  created: "Patient added. You can now record their medical history and documents.",
  updated: "Patient updated.",
};

const card = "rounded-md border border-slate-300/50 dark:border-slate-800/80 bg-white dark:bg-slate-900/70";

const rowButton =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 transition-colors";

/** Icon for a document: a link, an image, a PDF, or any other file. */
function documentIcon(mimeType: string | null, uploaded: boolean): IconType {
  if (!uploaded) return HiOutlineLink;
  if (mimeType?.startsWith("image/")) return HiOutlinePhoto;
  if (mimeType === "application/pdf") return HiOutlineDocumentText;
  return HiOutlineDocument;
}

function Detail({ icon: Icon, label, children }: { icon: IconType; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 first:border-t-0 sm:[&:nth-child(2)]:border-t-0">
      <Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
      <div className="min-w-0">
        <dt className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="mt-1 break-words text-sm font-medium text-slate-800 dark:text-white">{children}</dd>
      </div>
    </div>
  );
}

const Missing = () => <span className="font-normal text-slate-400">Not recorded</span>;

/**
 * Server Component: Patient
 *
 * One patient with their shared medical history and documents, loaded in
 * parallel from /api/patients/[id], .../medical-history and .../documents
 * (?docs= pages the documents). Buttons follow the caller's "Patients" access.
 */
export default async function PatientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ docs?: string; created?: string; updated?: string }>;
}) {
  const [{ id }, { docs, created, updated }] = await Promise.all([params, searchParams]);
  const notice = created ? NOTICES.created : updated ? NOTICES.updated : undefined;
  const docsPage = Math.max(1, Math.floor(Number(docs)) || 1);

  // The appointment lists load alongside the rest; without Appointments access
  // the API refuses them and the section is not shown
  const nowIso = new Date().toISOString();
  const apptList = (sort: "asc" | "desc", range: { from?: string; to?: string }) =>
    serverApiFetch(API_PATHS.appointments.list({ patient_id: id, sort, limit: PATIENT_APPOINTMENTS_SHOWN, ...range }));
  const [access, patientRes, historyRes, docsRes, upcomingRes, pastRes, latestInvRes, openInvRes] = await Promise.all([
    loadMyAccess(),
    serverApiFetch(API_PATHS.patients.detail(id)),
    serverApiFetch(API_PATHS.patients.medicalHistory(id)),
    serverApiFetch(API_PATHS.patients.documents(id, { page: docsPage, limit: DOCS_PAGE_SIZE })),
    apptList("asc", { from: nowIso }),
    apptList("desc", { to: nowIso }),
    // Finances: the latest treatments, and every open one (for what is owed)
    serverApiFetch(API_PATHS.invoices.list({ patient_id: id, limit: PATIENT_TREATMENTS_SHOWN })),
    serverApiFetch(API_PATHS.invoices.list({ patient_id: id, open: 1, limit: 200 })),
  ]);
  const can = access?.grid.Patients;
  if (!can?.can_view) redirect(PATHS.patients.list());
  if (!patientRes.ok) notFound();

  const canAppointments = !!access?.grid.Appointments.can_view;
  type ApptPage = { appointments?: AppointmentWithPeople[]; total?: number };
  const upcoming: ApptPage = upcomingRes.ok ? await upcomingRes.json() : {};
  const past: ApptPage = pastRes.ok ? await pastRes.json() : {};

  const canFinances = !!access?.grid.Finances.can_view;
  type InvPage = { invoices?: InvoiceSummary[]; total?: number };
  const latestInv: InvPage = latestInvRes.ok ? await latestInvRes.json() : {};
  const openInv: InvPage = openInvRes.ok ? await openInvRes.json() : {};

  const { patient }: { patient: PatientModel } = await patientRes.json();
  // 404 on medical history means nothing has been recorded yet
  const history: MedicalHistoryModel | null = historyRes.ok ? (await historyRes.json()).medicalHistory : null;
  const historyError = !historyRes.ok && historyRes.status !== 404;
  const { documents = [], total: docsTotal = 0 }: { documents?: PatientDocumentModel[]; total?: number } = docsRes.ok
    ? await docsRes.json()
    : {};
  const docsError = !docsRes.ok;

  // Past the last documents page (e.g. its last document was just deleted)
  const lastDocsPage = totalPages(docsTotal, DOCS_PAGE_SIZE);
  if (!docsError && docsTotal > 0 && docsPage > lastDocsPage) {
    redirect(PATHS.patients.detail(id, { docs: lastDocsPage }));
  }

  const name = patientName(patient);

  return (
    <div className="max-w-5xl space-y-6">
      <BackLink href={PATHS.patients.list()}>Back to patients</BackLink>

      {/* Identity + actions */}
      <section className={`${card} flex flex-col sm:flex-row sm:items-center gap-5 p-6`}>
        <div
          aria-hidden="true"
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-blue-700 text-xl font-extrabold text-white shadow-[0_8px_16px_-4px_rgba(38,98,240,0.25)]"
        >
          {patientInitials(patient)}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white tracking-tight break-words">
            {name}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {[
              patient.date_of_birth ? `${ageFrom(patient.date_of_birth)} years old` : null,
              patient.gender,
              `Patient since ${formatDate(patient.created_at, "long")}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {(can.can_edit || can.can_delete) && (
          <div className="flex items-center gap-2">
            {can.can_edit && (
              <Link
                href={PATHS.patients.edit(id)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 transition-colors"
              >
                <HiOutlinePencilSquare aria-hidden="true" className="h-4 w-4" />
                Edit
              </Link>
            )}
            {can.can_delete && (
              <DeleteButton
                size="md"
                action={deletePatientAction.bind(null, id)}
                itemName={name}
                title={`Delete ${name}?`}
                description="Their medical history, documents and appointments are removed. Invoices and payments are kept for your records. This cannot be undone."
                confirmLabel="Delete patient"
                redirectTo={PATHS.patients.list({ deleted: 1 })}
              />
            )}
          </div>
        )}
      </section>

      {notice && (
        <div role="status" className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {notice}
        </div>
      )}

      {/* Contact & personal details */}
      <section className={card}>
        <h2 className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-6 py-4 font-bold text-slate-800 dark:text-white">
          <HiOutlineUser aria-hidden="true" className="h-5 w-5 text-primary" />
          Details
        </h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2">
          <Detail icon={HiOutlineEnvelope} label="Email">
            {patient.email ? (
              <a href={`mailto:${patient.email}`} className="hover:text-primary">
                {patient.email}
              </a>
            ) : (
              <Missing />
            )}
          </Detail>
          <Detail icon={HiOutlinePhone} label="Phone">
            {patient.phone ? (
              <a href={`tel:${patient.phone.replace(/\s+/g, "")}`} className="hover:text-primary">
                {patient.phone}
              </a>
            ) : (
              <Missing />
            )}
          </Detail>
          <Detail icon={HiOutlineCake} label="Date of birth">
            {patient.date_of_birth ? formatDate(patient.date_of_birth, "long") : <Missing />}
          </Detail>
          <Detail icon={HiOutlineCalendarDays} label="Added">
            {formatDate(patient.created_at, "long")}
          </Detail>
        </dl>
      </section>

      {/* Appointments */}
      {canAppointments && (
        <PatientAppointments
          patientId={id}
          upcoming={upcoming.appointments ?? []}
          upcomingTotal={upcoming.total ?? 0}
          past={past.appointments ?? []}
          pastTotal={past.total ?? 0}
          zone={access!.clinic?.timezone ?? "UTC"}
          canBook={!!access!.grid.Appointments.can_create}
          back={PATHS.patients.detail(id)}
          error={!upcomingRes.ok || !pastRes.ok}
        />
      )}

      {/* Finances */}
      {canFinances && (
        <PatientFinances
          patientId={id}
          invoices={latestInv.invoices ?? []}
          total={latestInv.total ?? 0}
          owed={fromCents(owedOn(openInv.invoices ?? []))}
          currency={access!.clinic?.currency}
          canCreate={!!access!.grid.Finances.can_create}
          error={!latestInvRes.ok || !openInvRes.ok}
        />
      )}

      {/* Medical history */}
      {historyError ? (
        <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          Couldn&apos;t load the medical history. Refresh the page to try again.
        </p>
      ) : (
        <MedicalHistoryCard
          // Remount with the saved values after each save
          key={history?.last_updated ?? "none"}
          patientId={id}
          canEdit={can.can_edit}
          lastUpdated={history ? formatDate(history.last_updated, "long") : undefined}
          history={
            history && {
              blood_type: history.blood_type ?? "",
              allergies: history.allergies ?? "",
              chronic_conditions: history.chronic_conditions ?? "",
              current_medications: history.current_medications ?? "",
            }
          }
        />
      )}

      {/* Documents */}
      <section className={card}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <h2 className="flex items-center gap-3 font-bold text-slate-800 dark:text-white">
            <HiOutlineDocumentText aria-hidden="true" className="h-5 w-5 text-primary" />
            Documents
            {docsTotal > 0 && <span className="text-sm font-semibold text-slate-400">{docsTotal}</span>}
          </h2>
          {can.can_create && <AddDocumentPanel patientId={id} uploadsEnabled={isFileStorageConfigured()} />}
        </header>

        {docsError ? (
          <p className="p-6 text-center text-sm text-red-600">Could not load documents. Please refresh the page.</p>
        ) : documents.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            No documents yet.{can.can_create && " Upload a file or paste a link to one."}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {documents.map((doc) => {
              const uploaded = Boolean(doc.storage_key);
              const Icon = documentIcon(doc.mime_type, uploaded);
              const openHref = API_PATHS.patients.documentFile(id, doc.id);
              return (
                <li key={doc.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-6 py-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Icon aria-hidden="true" className="mt-0.5 h-6 w-6 shrink-0 text-slate-400" />
                    <div className="min-w-0">
                      <a
                        href={openHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-slate-800 dark:text-white hover:text-primary break-all"
                      >
                        {doc.name}
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {doc.document_type && (
                          <span className="font-medium text-slate-600 dark:text-slate-300">{doc.document_type}</span>
                        )}
                        {uploaded ? (
                          <span>
                            {doc.file_name}
                            {doc.size_bytes != null && ` · ${formatBytes(doc.size_bytes)}`}
                          </span>
                        ) : (
                          <span>Link</span>
                        )}
                        <span>Added {formatDate(doc.uploaded_at)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={openHref} target="_blank" rel="noopener noreferrer" className={rowButton} aria-label={`Open ${doc.name}`}>
                      <HiOutlineArrowTopRightOnSquare aria-hidden="true" className="h-3.5 w-3.5" />
                      Open
                    </a>
                    {uploaded && (
                      <a
                        href={API_PATHS.patients.documentFile(id, doc.id, { download: 1 })}
                        className={rowButton}
                        aria-label={`Download ${doc.name}`}
                      >
                        <HiOutlineArrowDownTray aria-hidden="true" className="h-3.5 w-3.5" />
                        Download
                      </a>
                    )}
                    {can.can_delete && (
                      <DeleteButton
                        action={deletePatientDocumentAction.bind(null, id, doc.id)}
                        itemName={doc.name}
                        title={`Delete "${doc.name}"?`}
                        description={
                          uploaded
                            ? "The document and its file are removed. This cannot be undone."
                            : "The document is removed from this patient. The file at its link is not touched."
                        }
                        confirmLabel="Delete document"
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!docsError && docsTotal > DOCS_PAGE_SIZE && (
          <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4">
            <Pagination
              page={docsPage}
              pageSize={DOCS_PAGE_SIZE}
              total={docsTotal}
              itemLabel="documents"
              hrefForPage={(p) => PATHS.patients.detail(id, { docs: p })}
            />
          </div>
        )}
      </section>
    </div>
  );
}
