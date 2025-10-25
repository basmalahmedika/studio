
import { InventoryDataTable } from "@/components/inventory-data-table";

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-headline font-bold tracking-tight">Manajemen Inventaris</h1>
        <p className="text-muted-foreground">
          Tambah, lihat, ubah, dan hapus stok obat dan peralatan kesehatan.
        </p>
      </div>
      <InventoryDataTable />
    </div>
  );
}
