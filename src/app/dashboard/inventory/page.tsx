import { InventoryDataTable } from "@/components/inventory-data-table";

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Inventory Management</h1>
        <p className="text-muted-foreground">
          Add, view, edit, and delete medication and health equipment stock.
        </p>
      </div>
      <InventoryDataTable />
    </div>
  );
}
