"use client";

import { useProductsData } from "./_components";
import { ErrorAlert } from "./products-error-alert";
import { createHandlerFunctions } from "./products-handler-functions";
import { useProductsHandlers } from "./products-handlers";
import { useProductsMutations } from "./products-mutations";
import { PageHeader } from "./products-page-header";
import { ProductsLoading, ProductsError } from "./products-states";
import { StatsCards } from "./products-stats-cards";
import { ProductsTable } from "./products-table";

export function ProductsShared({
  establishmentId,
  organizationId,
}: {
  establishmentId: string;
  organizationId: string;
}) {
  const { products, isLoading, error } = useProductsData(establishmentId, organizationId);

  const { addProductMutation, updateProductMutation, deleteProductMutation, updateStockMutation } =
    useProductsMutations(establishmentId);
  const {
    showAddForm,
    setShowAddForm,
    showAddProductsModal,
    setShowAddProductsModal,
    editingProductId,
    setEditingProductId,
    editingStockId,
    setEditingStockId,
    errorMsg,
    setErrorMsg,
    searchTerm,
    setSearchTerm,
    addForm,
    setAddForm,
    editProductForm,
    setEditProductForm,
    editStockForm,
    setEditStockForm,
    startEditProduct,
    startEditStock,
    cancelEdit,
  } = useProductsHandlers();

  const { handleAdd, saveProductEdit, saveStockEdit, deleteProduct } = createHandlerFunctions({
    addForm,
    editProductForm,
    editStockForm,
    editingProductId,
    editingStockId,
    organizationId,
    addProductMutation,
    updateProductMutation,
    updateStockMutation,
    deleteProductMutation,
    setShowAddForm,
    setAddForm,
    setEditingProductId,
    setEditProductForm,
    setEditingStockId,
    setEditStockForm,
    setErrorMsg,
  });

  if (isLoading) return <ProductsLoading />;
  if (error) return <ProductsError error={error.toString()} />;

  return (
    <div className="space-y-6">
      <PageHeader setShowAddForm={setShowAddForm} setShowAddProductsModal={setShowAddProductsModal} />

      <ErrorAlert errorMsg={errorMsg} />

      <StatsCards products={products ?? []} />

      <ProductsTable
        products={products ?? []}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        startEditProduct={startEditProduct}
        startEditStock={startEditStock}
        deleteProduct={deleteProduct}
      />
    </div>
  );
}
