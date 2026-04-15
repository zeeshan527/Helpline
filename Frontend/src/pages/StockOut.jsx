import { useAuth } from "../context/AuthContext";
import { useStockOut } from "../hooks/useStockOut";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import SearchInput from "../components/common/SearchInput";
import Pagination from "../components/common/Pagination";
import Modal from "../components/common/Modal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { PageLoading, EmptyState } from "../components/common/LoadingState";
import { StatusBadge } from "../components/common/Badge";
import Table, {
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeaderCell,
} from "../components/common/Table";
import Input from "../components/common/Input";
import Select from "../components/common/Select";
import Textarea from "../components/common/Textarea";
import {
  Plus,
  Eye,
  PackageMinus,
  Edit2,
  Trash2,
  User,
  Package,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

export default function StockOut() {
  const { user } = useAuth();
  const {
    stockOutItems,
    loading,
    pagination,
    search,
    modeFilter,
    recordTypeFilter,
    modalOpen,
    editingId,
    deleteDialog,
    viewModal,
    submitting,
    selectedStockIn,
    selectedStockInAvailableQuantity,
    errors,
    watchMode,
    register,
    handleSubmit,
    setPagination,
    setSearch,
    setModeFilter,
    setRecordTypeFilter,
    closeModal,
    setDeleteDialog,
    setViewModal,
    openCreateModal,
    openEditModal,
    onSubmit,
    handleDeleteDistribution,
    viewStockOut,
    stockInOptions,
    beneficiaryOptions,
    modeOptions,
    recordTypeOptions,
  } = useStockOut();

  if (!user) return null;

  const getModeBadge = (mode) => {
    const colors = {
      free: "badge-success",
      control_price: "badge-warning",
      discounted: "badge-primary",
    };
    const labels = {
      free: "Free",
      control_price: "Control Price",
      discounted: "Discounted",
    };
    return (
      <span className={`badge ${colors[mode] || "badge-gray"}`}>
        {labels[mode] || mode}
      </span>
    );
  };

  const isDistributionModeAllowed = (mode) => {
    if (!selectedStockIn) return true;
    const policy = selectedStockIn.distributionPolicy?.type;

    if (policy === "free_only") return mode === "free";
    if (policy === "control_price") return mode === "control_price";
    return true;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Stock Out</h1>
          <p className="page-subtitle">Distribute inventory to beneficiaries</p>
        </div>
        <Button icon={Plus} onClick={openCreateModal}>
          New Distribution
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by product or beneficiary..."
            className="flex-1"
          />
          <Select
            options={recordTypeOptions}
            value={recordTypeFilter}
            onChange={(e) => setRecordTypeFilter(e.target.value)}
            className="w-full sm:w-40"
          />
          <Select
            options={modeOptions}
            placeholder="All Modes"
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <PageLoading />
        ) : stockOutItems.length === 0 ? (
          <EmptyState
            icon={PackageMinus}
            title="No distributions found"
            description="Start distributing items to beneficiaries"
            action={
              <Button icon={Plus} onClick={openCreateModal}>
                New Distribution
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>
                    {recordTypeFilter === "package" ? "Package" : "Product"}
                  </TableHeaderCell>
                  <TableHeaderCell>Beneficiary</TableHeaderCell>
                  <TableHeaderCell>Quantity</TableHeaderCell>
                  <TableHeaderCell>Mode</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Date</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {stockOutItems.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-warning-50 rounded-lg flex items-center justify-center">
                          <Package size={20} className="text-warning-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.stockInId?.product?.name || "N/A"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.locationId?.name || "N/A"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-gray-400" />
                        <span>
                          {item.beneficiaryId?.basicInfo?.headOfFamilyName ||
                            "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.quantity} {item.stockInId?.product?.unit || "units"}
                    </TableCell>
                    <TableCell>
                      {getModeBadge(item.distribution?.mode)}
                    </TableCell>
                    <TableCell>
                      {item.distribution?.mode === "free"
                        ? "-"
                        : `Rs. ${(item.revenue || (item.distribution?.price || 0) * item.quantity || 0).toLocaleString()}`}
                    </TableCell>
                    <TableCell>
                      {item.createdAt
                        ? format(new Date(item.createdAt), "MMM dd, yyyy")
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status || "completed"} />
                      {item.violation?.hasViolation && (
                        <span className="ml-2">
                          <AlertTriangle
                            size={14}
                            className="text-danger-500 inline"
                          />
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => viewStockOut(item._id)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="View"
                        >
                          <Eye size={16} className="text-gray-600" />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Edit2 size={16} className="text-primary-600" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteDialog({ open: true, id: item._id })
                          }
                          className="p-1 hover:bg-gray-100 rounded"
                          title="Delete"
                        >
                          <Trash2 size={16} className="text-danger-600" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
              onPageChange={(page) =>
                setPagination((prev) => ({ ...prev, page }))
              }
            />
          </>
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editingId ? "Edit Distribution" : "New Distribution"}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Select
            label="Stock Item *"
            options={stockInOptions}
            placeholder="Select stock item"
            error={errors.stockIn?.message}
            {...register("stockIn", { required: "Stock item is required" })}
          />

          {selectedStockIn && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                Stock Item Details
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Available: </span>
                  <span className="font-medium">
                    {selectedStockIn.remainingQuantity ||
                      selectedStockIn.quantity}{" "}
                    {selectedStockIn.product?.unit}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Unit Price: </span>
                  <span className="font-medium">
                    Rs.{" "}
                    {(selectedStockIn.pricing?.unitPrice || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Policy: </span>
                  {getModeBadge(
                    selectedStockIn.distributionPolicy?.type === "free_only"
                      ? "free"
                      : selectedStockIn.distributionPolicy?.type ===
                          "control_price"
                        ? "control_price"
                        : "discounted",
                  )}
                </div>
                {selectedStockIn.distributionPolicy?.controlPrice && (
                  <div>
                    <span className="text-gray-500">Control Price: </span>
                    <span className="font-medium">
                      Rs.{" "}
                      {selectedStockIn.distributionPolicy.controlPrice.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Select
            label="Beneficiary *"
            options={beneficiaryOptions}
            placeholder="Select beneficiary"
            error={errors.beneficiary?.message}
            {...register("beneficiary", {
              required: "Beneficiary is required",
            })}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Quantity *"
              type="number"
              min="1"
              max={
                selectedStockInAvailableQuantity ||
                999999
              }
              placeholder="Enter quantity"
              error={errors.quantity?.message}
              {...register("quantity", {
                required: "Quantity is required",
                min: { value: 1, message: "Minimum 1" },
                max: {
                  value:
                    selectedStockInAvailableQuantity ||
                    999999,
                  message: "Exceeds available quantity",
                },
              })}
            />
            <Select
              label="Distribution Mode *"
              options={modeOptions.filter((opt) =>
                isDistributionModeAllowed(opt.value),
              )}
              error={errors.distributionMode?.message}
              {...register("distributionMode", {
                required: "Mode is required",
              })}
            />
          </div>

          {watchMode && watchMode !== "free" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Price Applied (Rs.) *"
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter price"
                error={errors.priceApplied?.message}
                {...register("priceApplied", {
                  required: watchMode !== "free" ? "Price is required" : false,
                })}
              />
              {watchMode === "discounted" && (
                <Input
                  label="Discount (%)"
                  type="number"
                  min="0"
                  max={
                    selectedStockIn?.distributionPolicy?.maxDiscountPercent ||
                    100
                  }
                  placeholder="Enter discount percentage"
                  {...register("discountPercent")}
                />
              )}
            </div>
          )}

          <Textarea
            label="Notes"
            placeholder="Additional notes..."
            rows={2}
            {...register("notes")}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={closeModal}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingId ? "Update Distribution" : "Distribute"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title="Distribution Details"
        size="lg"
      >
        {viewModal.data && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-16 h-16 bg-warning-50 rounded-xl flex items-center justify-center">
                <PackageMinus size={32} className="text-warning-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">
                  {viewModal.data.stockInId?.product?.name || "N/A"}
                </h3>
                <p className="text-gray-500">
                  Distribution to{" "}
                  {viewModal.data.beneficiaryId?.basicInfo?.headOfFamilyName ||
                    "N/A"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Beneficiary</p>
                <p className="font-medium">
                  {viewModal.data.beneficiaryId?.basicInfo?.headOfFamilyName ||
                    "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">CNIC</p>
                <p className="font-medium">
                  {viewModal.data.beneficiaryId?.basicInfo?.cnic || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Quantity</p>
                <p className="font-medium">
                  {viewModal.data.quantity}{" "}
                  {viewModal.data.stockInId?.product?.unit || "units"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Distribution Mode</p>
                {getModeBadge(viewModal.data.distribution?.mode)}
              </div>
              <div>
                <p className="text-sm text-gray-500">Price Applied</p>
                <p className="font-medium">
                  {viewModal.data.distribution?.mode === "free"
                    ? "Free"
                    : `Rs. ${(viewModal.data.distribution?.price || 0).toLocaleString()}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="font-medium">
                  {viewModal.data.distribution?.mode === "free"
                    ? "-"
                    : `Rs. ${(viewModal.data.revenue || (viewModal.data.distribution?.price || 0) * viewModal.data.quantity || 0).toLocaleString()}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="font-medium">
                  {viewModal.data.locationId?.name || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium">
                  {viewModal.data.createdAt
                    ? format(
                        new Date(viewModal.data.createdAt),
                        "MMM dd, yyyy hh:mm a",
                      )
                    : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <StatusBadge status={viewModal.data.status || "completed"} />
              </div>
            </div>

            {viewModal.data.violation?.hasViolation && (
              <div className="p-4 bg-danger-50 rounded-lg border border-danger-200">
                <div className="flex items-center gap-2 text-danger-700 mb-2">
                  <AlertTriangle size={18} />
                  <span className="font-semibold">Policy Violation</span>
                </div>
                <p className="text-sm text-danger-600">
                  {viewModal.data.violation.reason ||
                    "Distribution policy was violated"}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setViewModal({ open: false, data: null })}
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
        onConfirm={handleDeleteDistribution}
        title="Delete Distribution"
        message="Are you sure you want to delete this distribution? The quantity will be returned to stock in."
        confirmText="Delete Distribution"
        variant="warning"
      />
    </div>
  );
}
