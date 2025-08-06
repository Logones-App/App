import type { CreateProductPayload } from "@/lib/types/database-extensions";

interface HandlerFunctionsProps {
  addForm: any;
  editProductForm: any;
  editStockForm: any;
  editingProductId: string | null;
  editingStockId: string | null;
  organizationId: string;
  addProductMutation: any;
  updateProductMutation: any;
  updateStockMutation: any;
  deleteProductMutation: any;
  setShowAddForm: (show: boolean) => void;
  setAddForm: (form: any) => void;
  setEditingProductId: (id: string | null) => void;
  setEditProductForm: (form: any) => void;
  setEditingStockId: (id: string | null) => void;
  setEditStockForm: (form: any) => void;
  setErrorMsg: (msg: string) => void;
}

export function createHandlerFunctions({
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
}: HandlerFunctionsProps) {
  const handleAdd = () => {
    if (!addForm.name || addForm.price <= 0) {
      setErrorMsg("Veuillez remplir tous les champs obligatoires");
      return;
    }

    const productData: CreateProductPayload = {
      name: addForm.name,
      description: addForm.description,
      price: addForm.price,
      vat_rate: addForm.vat_rate,
      is_available: addForm.is_available,
      organization_id: organizationId,
    };

    addProductMutation.mutate(productData, {
      onSuccess: () => {
        setShowAddForm(false);
        setAddForm({
          name: "",
          description: "",
          price: 0,
          vat_rate: 20,
          is_available: true,
          current_stock: -1,
          min_stock: 0,
          max_stock: null,
          low_stock_threshold: null,
          critical_stock_threshold: null,
          unit: "pièce",
        });
      },
      onError: (error: any) => {
        setErrorMsg(error.message);
      },
    });
  };

  const saveProductEdit = () => {
    if (!editProductForm.name || editProductForm.price <= 0) {
      setErrorMsg("Veuillez remplir tous les champs obligatoires");
      return;
    }

    updateProductMutation.mutate(
      {
        id: editingProductId!,
        data: editProductForm,
      },
      {
        onSuccess: () => {
          setEditingProductId(null);
          setEditProductForm({
            name: "",
            description: "",
            price: 0,
            vat_rate: 20,
            is_available: true,
          });
        },
        onError: (error: any) => {
          setErrorMsg(error.message);
        },
      },
    );
  };

  const saveStockEdit = () => {
    if (editStockForm.current_stock < 0) {
      setErrorMsg("Le stock ne peut pas être négatif");
      return;
    }

    updateStockMutation.mutate(
      {
        id: editingStockId!,
        data: editStockForm,
      },
      {
        onSuccess: () => {
          setEditingStockId(null);
          setEditStockForm({
            current_stock: 0,
            min_stock: 0,
            max_stock: null,
            low_stock_threshold: null,
            critical_stock_threshold: null,
            unit: "pièce",
          });
        },
        onError: (error: any) => {
          setErrorMsg(error.message);
        },
      },
    );
  };

  const deleteProduct = (id: string) => {
    deleteProductMutation.mutate(id, {
      onError: (error: any) => {
        setErrorMsg(error.message);
      },
    });
  };

  return {
    handleAdd,
    saveProductEdit,
    saveStockEdit,
    deleteProduct,
  };
}
