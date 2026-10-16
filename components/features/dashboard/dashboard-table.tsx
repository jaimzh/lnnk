import dbConnect from "@/lib/db";
import { Url } from "@/models/UrlSchema";
import { Cdn } from "@/models/CdnSchema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyCell } from "./copy-cell";
import Link from "next/link";
import { Cloud, Link2 } from "lucide-react";
import { QrCell } from "@/components/features/dashboard/qr-cell";
import { getBaseUrl } from "@/lib/server-utils";
import { SHORTENER_MODES } from "@/components/features/shortener/advanced-options/constants";
import type { ShortenerMode } from "@/components/features/shortener/advanced-options/constants";

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

type DashboardTableProps = {
  searchParams?: Promise<{ page?: string }>;
  codePageNumber?: number;
};

type LeanUrlRow = {
  _id: unknown;
  shortCode: string;
  clicks: number;
  createdAt: Date;
};

type LeanCdnRow = {
  _id: unknown;
  publicUrl: string;
  clicks?: number;
  createdAt: Date;
};

type DashboardRow = {
  id: string;
  mode: ShortenerMode;
  href: string;
  metric: string;
  createdAt: Date;
};

export async function DashboardTable(props: DashboardTableProps) {
  const baseUrl = await getBaseUrl();

  const params = await props.searchParams;
  const currentPage = Number(params?.page || props.codePageNumber || 1);

  const LIMIT = 6;
  const skip = (currentPage - 1) * LIMIT;

  let urls: LeanUrlRow[];
  let cdns: LeanCdnRow[];
  try {
    await dbConnect();
    [urls, cdns] = await Promise.all([
      Url.find({ visibility: "public" }).sort({ createdAt: -1 }).lean<LeanUrlRow[]>(),
      Cdn.find({ visibility: "public", status: "ready" }).sort({ createdAt: -1 }).lean<LeanCdnRow[]>(),
    ]);
  } catch (error) {
    console.error("Unable to load public link history:", error);
    return (
      <div id="dashboard-table" className="w-full px-5 py-6">
        <div role="status" className="mx-auto max-w-4xl rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm font-medium">History is temporarily unavailable</p>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn&apos;t connect to the database. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const rows: DashboardRow[] = [
    ...(urls as LeanUrlRow[]).map((url) => ({
      id: String(url._id),
      mode: SHORTENER_MODES.LINK,
      href: `${baseUrl}/${url.shortCode}`,
      metric: url.clicks.toLocaleString(),
      createdAt: url.createdAt,
    })),
    ...(cdns as LeanCdnRow[]).map((cdn) => ({
      id: String(cdn._id),
      mode: SHORTENER_MODES.CDN,
      href: cdn.publicUrl,
      metric: (cdn.clicks || 0).toLocaleString(),
      createdAt: cdn.createdAt,
    })),
  ].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const pageRows = rows.slice(skip, skip + LIMIT);
  const totalPages = Math.ceil(rows.length / LIMIT);
  const paginationButtonClass =
    "inline-flex h-8 items-center justify-center rounded-md px-4 text-xs font-medium text-text-muted transition-all duration-300 hover:bg-[color:var(--shortener-accent-soft)] hover:text-text-base";
  const disabledPaginationButtonClass = `${paginationButtonClass} pointer-events-none opacity-30`;

  return (
    <div id="dashboard-table" className="w-full flex justify-center py-6">
      <div className="w-full max-w-4xl rounded-xl border border-[color:var(--shortener-accent-border)] overflow-hidden bg-bg-base/40 backdrop-blur-md shadow-xl ring-1 ring-white/5">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-white/5">
              <TableHead className="py-4 px-4 text-center text-xs font-medium uppercase tracking-wider text-text-muted/60 w-[12%]">
                Type
              </TableHead>
              <TableHead className="py-4 px-4 text-center text-xs font-medium uppercase tracking-wider text-text-muted/60 w-[38%]">
                Link
              </TableHead>
              <TableHead className="py-4 px-4 text-center text-xs font-medium uppercase tracking-wider text-text-muted/60 w-[18%]">
                QR Code
              </TableHead>
              <TableHead className="py-4 px-4 text-center text-xs font-medium uppercase tracking-wider text-text-muted/60 w-[16%]">
                Views
              </TableHead>
              <TableHead className="py-4 px-4 text-center text-xs font-medium uppercase tracking-wider text-text-muted/60 w-[16%]">
                Date
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-40 text-center text-text-muted/50 font-light"
                >
                  <div className="flex flex-col items-center gap-2">
                    <p>No links created yet</p>
                    <p className="text-xs opacity-50">
                      Your shortened URLs and CDN assets will appear here
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((row) => {
                const TypeIcon = row.mode === SHORTENER_MODES.CDN ? Cloud : Link2;
                const typeLabel = row.mode === SHORTENER_MODES.CDN ? "CDN asset" : "Short link";

                return (
                  <TableRow
                    key={row.id}
                    className="hover:bg-[color:var(--shortener-accent-faint)] transition-colors duration-300 border-b border-white/5 group"
                  >
                    <TableCell className="py-4 px-4">
                      <div className="flex items-center justify-center">
                        <span
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/5 bg-white/5 text-text-muted/60 transition-colors group-hover:text-text-muted"
                          title={typeLabel}
                        >
                          <TypeIcon size={13} strokeWidth={1.8} />
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex items-center justify-center w-full px-4">
                        <div className="min-w-0">
                          <CopyCell text={row.href} />
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-4">
                      <div className="flex items-center justify-center w-full px-4 text-text-muted group-hover:text-[color:var(--shortener-accent)] transition-colors duration-300">
                        <QrCell
                          mode={row.mode}
                          originalUrl={row.href}
                          shortUrl={row.href}
                        />
                      </div>
                    </TableCell>

                    <TableCell className="text-center font-light text-text-base/90 px-4 py-4 tabular-nums">
                      {row.metric}
                    </TableCell>

                    <TableCell className="text-center text-text-muted/60 text-sm px-4 py-4 font-light">
                      {formatDate(row.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-[color:var(--shortener-accent-faint)]">
            <p className="text-xs text-text-muted/40 font-mono">
              PAGE {currentPage} OF {totalPages}
            </p>

            <div className="flex items-center gap-3">
              {currentPage > 1 ? (
                <Link
                  href={`?page=${currentPage - 1}#dashboard-table`}
                  className={paginationButtonClass}
                >
                  Previous
                </Link>
              ) : (
                <span className={disabledPaginationButtonClass}>Previous</span>
              )}

              {currentPage < totalPages ? (
                <Link
                  href={`?page=${currentPage + 1}#dashboard-table`}
                  className={paginationButtonClass}
                >
                  Next
                </Link>
              ) : (
                <span className={disabledPaginationButtonClass}>Next</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
