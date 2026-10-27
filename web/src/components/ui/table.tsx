"use client";

import * as React from "react";

import { useFieldPreference } from "@/components/configured-field"
import { cn } from "@/lib/utils";
import styles from "./ui.module.css";

type TableProps = React.HTMLAttributes<HTMLTableElement> & {
  containerClassName?: string
  containerRef?: React.Ref<HTMLDivElement>
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerClassName, containerRef, ...props }, ref) => (
    <div
      className={cn(styles.tableViewport, containerClassName)}
      ref={containerRef}
    >
      <table
        ref={ref}
        className={cn(styles.table, className)}
        {...props}
      />
    </div>
  ),
)
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn(styles.tableHeader, className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn(styles.tableBody, className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(styles.tableRow, className)}
    {...props}
  />
));
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement> & { field?: string }
>(({ className, field = "", children, ...props }, ref) => {
  const preference = useFieldPreference(field)
  return <th
    ref={ref}
    className={cn(styles.tableHead, className)}
    {...props}
    hidden={props.hidden || preference?.visible === false}
  >{typeof children === "string" ? preference?.label || children : children}</th>
});
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & { field?: string }
>(({ className, field = "", ...props }, ref) => {
  const preference = useFieldPreference(field)
  return <td
    ref={ref}
    className={cn(styles.tableCell, className)}
    {...props}
    hidden={props.hidden || preference?.visible === false}
  />
});
TableCell.displayName = "TableCell";

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
