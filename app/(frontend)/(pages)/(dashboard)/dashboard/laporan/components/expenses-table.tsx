"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRupiah } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { FileX } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface ExpenseRecord {
  id: string;
  date: string;
  category: string;
  note: string;
  amount: number;
  branch: string;
  employeeName: string;
}

interface ExpensesTableProps {
  expenses: ExpenseRecord[];
}

export function ExpensesTable({ expenses }: ExpensesTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(expenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedExpenses = expenses.slice(startIndex, endIndex);

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle>Riwayat Pengeluaran (Cashout)</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead>Staff</TableHead>
              <TableHead>Keterangan</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileX className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-muted-foreground font-medium text-sm">
                      Tidak ada data pengeluaran
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedExpenses.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-xs whitespace-nowrap">
                    {item.date}
                  </TableCell>
                  <TableCell className="text-xs font-semibold">
                    {item.branch}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.employeeName}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm">{item.note}</span>
                      <Badge
                        variant="outline"
                        className="w-fit text-[10px] bg-yellow-50 text-yellow-700 border-yellow-500"
                      >
                        {item.category}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-red-600">
                    {formatRupiah(item.amount)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {expenses.length > 0 && (
          <div className="flex items-center justify-between mt-4 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Menampilkan {startIndex + 1}-{Math.min(endIndex, expenses.length)}{" "}
              dari {expenses.length} data
            </p>
            <Pagination className="w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                <PaginationItem>
                  <PaginationLink isActive>{currentPage}</PaginationLink>
                </PaginationItem>

                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
