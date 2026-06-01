import React, { useState } from "react";
import { Eye, Loader2, Pencil, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import {
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useGetCategoriesQuery,
  useGetCategoryInvoiceApproversQuery,
  useUpdateCategoryMutation,
} from "../../../Services/apis/categoriesApi";
import AppDataTable from "../../../components/common/AppDataTable";
import { Button } from "../../../components/ui/button";
import { TableCell, TableRow } from "../../../components/ui/table";
import { useActionGuard } from "../../../hooks/useActionGuard";
import CategoryDialog from "./CategoryDialog";
import CategoryViewDialog from "./CategoryViewDialog";

const categoryTableHeader = [
  { key: "name", title: "Category Name", cellClassName: "font-medium" },
  { key: "description", title: "Description", cellClassName: "max-w-md" },
  { key: "assignedUsers", title: "Assigned Approvers" },
  { key: "createdDate", title: "Created Date" },
  { key: "actions", title: "Actions", headerClassName: "text-left", cellClassName: "text-left" },
];

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN");
};

const getErrorMessage = (error, fallback) =>
  error?.data?.detail || error?.data?.message || error?.error || fallback;

const CategoriesTab = () => {
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    isFetching: categoriesFetching,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useGetCategoriesQuery();
  const {
    data: approvers = [],
    isLoading: approversLoading,
    isFetching: approversFetching,
    isError: approversError,
    refetch: refetchApprovers,
  } = useGetCategoryInvoiceApproversQuery();
  const [createCategory, { isLoading: creatingCategory }] = useCreateCategoryMutation();
  const [updateCategory, { isLoading: updatingCategory }] = useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: deletingCategory }] = useDeleteCategoryMutation();
  const { guardAction, canPerformAction } = useActionGuard();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [viewingCategory, setViewingCategory] = useState(null);

  const canCreateCategory = canPerformAction("categories.create");
  const canUpdateCategory = canPerformAction("categories.update");
  const canDeleteCategory = canPerformAction("categories.delete");
  const isApproversLoading = approversLoading || approversFetching;
  const isSavingCategory = creatingCategory || updatingCategory;

  const handleCreateCategory = () => {
    if (!guardAction("categories.create")) return;
    setEditingCategory(null);
    setDialogOpen(true);
  };

  const handleEditCategory = (category) => {
    if (!guardAction("categories.update")) return;
    setEditingCategory(category);
    setDialogOpen(true);
  };

  const handleViewCategory = (category) => {
    setViewingCategory(category);
    setViewDialogOpen(true);
  };

  const handleDeleteCategory = async (category) => {
    if (!guardAction("categories.delete")) return;
    if (!window.confirm(`Delete ${category.name}?`)) return;

    try {
      await deleteCategory(category.id).unwrap();
      toast.success("Category deleted");
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to delete category"));
    }
  };

  const handleSaveCategory = async (categoryPayload) => {
    try {
      if (editingCategory) {
        if (!guardAction("categories.update")) return;
        await updateCategory({
          categoryId: editingCategory.id,
          category: categoryPayload,
          approvers,
        }).unwrap();
        toast.success("Category updated");
      } else {
        if (!guardAction("categories.create")) return;
        await createCategory({ category: categoryPayload, approvers }).unwrap();
        toast.success("Category created");
      }

      setDialogOpen(false);
      setEditingCategory(null);
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          editingCategory ? "Failed to update category" : "Failed to create category",
        ),
      );
    }
  };

  const retryCategoryData = () => {
    refetchCategories();
    refetchApprovers();
  };

  const renderCategoryRow = (category, rowIndex, headers) => (
    <TableRow key={category.id ?? rowIndex}>
      {headers.map((header) => {
        let value = null;

        switch (header.key) {
          case "name":
            value = category.name;
            break;
          case "description":
            value = (
              <span className="line-clamp-2 text-muted-foreground">
                {category.description || "-"}
              </span>
            );
            break;
          case "assignedUsers":
            value = (
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                {category.assignedUsersCount}
              </span>
            );
            break;
          case "createdDate":
            value = <span className="text-muted-foreground">{formatDate(category.createdDate)}</span>;
            break;
          case "actions":
            value = (
              <div className="flex items-center justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleViewCategory(category)}
                  aria-label={`View ${category.name}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditCategory(category)}
                  disabled={!canUpdateCategory || isSavingCategory}
                  aria-label={`Edit ${category.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteCategory(category)}
                  disabled={!canDeleteCategory || deletingCategory}
                  aria-label={`Delete ${category.name}`}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
            break;
          default:
            value = category[header.key] || "-";
        }

        return (
          <TableCell key={header.key} className={header.cellClassName}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <div className="rounded-lg border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-4 border-b border-border p-6 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="font-['Manrope'] text-xl font-semibold">Categories</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage categories used for approval routing
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(categoriesError || approversError) && (
            <Button type="button" variant="outline" onClick={retryCategoryData} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          )}
          <Button
            type="button"
            onClick={handleCreateCategory}
            disabled={!canCreateCategory || isSavingCategory}
            className="gap-2"
            data-testid="create-category-btn"
          >
            {creatingCategory ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Create Category
          </Button>
        </div>
      </div>

      <div className="p-6">
        {(categoriesError || approversError) && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {categoriesError
              ? "Failed to load categories."
              : "Failed to load invoice makers. You can still view categories."}
          </div>
        )}

        <AppDataTable
          tableHeader={categoryTableHeader}
          tableData={categories}
          renderRow={renderCategoryRow}
          emptyMessage="No categories found"
          emptyColSpan={categoryTableHeader.length}
          isLoading={categoriesLoading || categoriesFetching}
          loadingRowCount={4}
          striped
        />

        {!categoriesLoading && categories.length === 0 && (
          <div className="mt-4 text-center">
            <Button
              type="button"
              onClick={handleCreateCategory}
              disabled={!canCreateCategory || isSavingCategory}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Your First Category
            </Button>
          </div>
        )}
      </div>

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        category={editingCategory}
        employees={approvers}
        employeesLoading={isApproversLoading}
        employeesError={approversError}
        saving={isSavingCategory}
      />

      <CategoryViewDialog
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) setViewingCategory(null);
        }}
        category={viewingCategory}
        employees={approvers}
      />
    </div>
  );
};

export default CategoriesTab;
