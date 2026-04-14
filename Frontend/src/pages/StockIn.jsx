import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import { useAuth } from "../context/AuthContext";
import { useStockIn } from "../hooks/useStockIn";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import SearchInput from "../components/common/SearchInput";
import Pagination from "../components/common/Pagination";
import Modal from "../components/common/Modal";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { PageLoading, EmptyState } from "../components/common/LoadingState";
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
  Edit2,
  Trash2,
  Eye,
  PackagePlus,
  ArrowRightLeft,
  Package,
} from "lucide-react";

export default function StockIn() {
  const { user } = useAuth();
  const {
    stockItems,
    loading,
    pagination,
    search,
    sourceFilter,
    recordTypeFilter,
    modalOpen,
    transferModal,
    deleteDialog,
    viewModal,
    editingId,
    isPackageView,
    isPackageEditing,
    submitting,
    packageSearch,
    selectedPackageItems,
    packageProductOptions,
    sourceType,
    distributionPolicy,
    errors,
    register,
    handleSubmit,
    registerTransfer,
    handleTransferSubmit,
    locationOptions,
    donorOptions,
    sourceOptions,
    recordTypeOptions,
    policyOptions,
    frequencyOptions,
    unitOptions,
    categoryOptions,
    setPagination,
    setSearch,
    setSourceFilter,
    setRecordTypeFilter,
    setModalOpen,
    setTransferModal,
    setDeleteDialog,
    setViewModal,
    setPackageSearch,
    openCreateModal,
    openEditModal,
    addPackageItem,
    updatePackageItemQuantity,
    removePackageItem,
    onSubmit,
    handleTransfer,
    handleDelete,
    viewStockItem,
    closeTransferModal,
  } = useStockIn(user);

  if (!user) return null;
  if (
    ![
      "admin",
      "master_inventory_manager",
      "location_inventory_manager",
    ].includes(user.role)
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  const getPolicyBadge = (policy) => {
    const colors = {
      free_only: "badge-success",
      control_price: "badge-warning",
      flexible: "badge-primary",
    };

    const labels = {
      free_only: "Free Only",
      control_price: "Control Price",
      flexible: "Flexible",
    };

    return (
      <span className={`badge ${colors[policy] || "badge-gray"}`}>
        {labels[policy] || policy}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">
            {isPackageView ? "Packages" : "Stock In"}
          </h1>
          <p className="page-subtitle">
            {isPackageView
              ? "Group existing inventory into reusable package bundles"
              : "Manage incoming inventory from donors, companies, and purchases"}
          </p>
        </div>
        <Button icon={Plus} onClick={openCreateModal}>
          {isPackageView ? "Add Package" : "Add Stock"}
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={
              isPackageView ? "Search packages..." : "Search by product name..."
            }
            className="flex-1"
          />
          <Select
            placeholder="View Type"
            options={recordTypeOptions}
            value={recordTypeFilter}
            onChange={(event) => setRecordTypeFilter(event.target.value)}
            className="w-full sm:w-40"
          />
          {!isPackageView && (
            <Select
              options={sourceOptions}
              placeholder="All Sources"
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
              className="w-full sm:w-48"
            />
          )}
        </div>
      </Card>

      <Card>
        {loading ? (
          <PageLoading />
        ) : stockItems.length === 0 ? (
          <EmptyState
            icon={PackagePlus}
            title={isPackageView ? "No packages found" : "No stock items found"}
            description={
              isPackageView
                ? "Get started by creating your first package bundle"
                : "Get started by adding your first stock entry"
            }
            action={
              <Button icon={Plus} onClick={openCreateModal}>
                {isPackageView ? "Add Package" : "Add Stock"}
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHead>
                <tr>
                  {isPackageView ? (
                    <>
                      <TableHeaderCell>Package</TableHeaderCell>
                      <TableHeaderCell>Products</TableHeaderCell>
                      <TableHeaderCell>Total Quantity</TableHeaderCell>
                      <TableHeaderCell>Location</TableHeaderCell>
                      <TableHeaderCell>Policy</TableHeaderCell>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </>
                  ) : (
                    <>
                      <TableHeaderCell>Product</TableHeaderCell>
                      <TableHeaderCell>Category</TableHeaderCell>
                      <TableHeaderCell>Quantity</TableHeaderCell>
                      <TableHeaderCell>Source</TableHeaderCell>
                      <TableHeaderCell>Location</TableHeaderCell>
                      <TableHeaderCell>Policy</TableHeaderCell>
                      <TableHeaderCell>Date</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </>
                  )}
                </tr>
              </TableHead>
              <TableBody>
                {stockItems.map((item) => (
                  <TableRow key={item._id}>
                    {isPackageView ? (
                      <>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                              <Package size={20} className="text-primary-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {item.package?.name || item.product?.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {item.package?.totalProducts || item.quantity}{" "}
                                selected products
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {(item.package?.items || [])
                              .slice(0, 3)
                              .map((packageItem) => (
                                <div
                                  key={
                                    packageItem.stockInId?._id ||
                                    packageItem.stockInId
                                  }
                                  className="text-sm text-gray-700"
                                >
                                  {packageItem.productName ||
                                    packageItem.stockInId?.product?.name}{" "}
                                  {packageItem.quantity} {packageItem.unit}
                                </div>
                              ))}
                            {(item.package?.items || []).length > 3 && (
                              <div className="text-xs text-gray-500">
                                +{(item.package?.items || []).length - 3} more
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">
                              {item.package?.totalQuantity || item.quantity}
                            </span>
                            <span className="text-gray-500"> total units</span>
                          </div>
                        </TableCell>
                        <TableCell>{item.locationId?.name || "N/A"}</TableCell>
                        <TableCell>
                          {getPolicyBadge(item.distributionPolicy?.type)}
                        </TableCell>
                        <TableCell>
                          {item.createdAt
                            ? format(new Date(item.createdAt), "MMM dd, yyyy")
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => viewStockItem(item._id)}
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
                      </>
                    ) : (
                      <>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                              <Package size={20} className="text-primary-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {item.product?.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                Rs.{" "}
                                {(
                                  item.pricing?.unitPrice ||
                                  item.pricing?.costPrice ||
                                  0
                                ).toLocaleString()}{" "}
                                / {item.product?.unit}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="badge badge-gray capitalize">
                            {item.product?.category || "N/A"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">
                              {item.remainingQuantity || item.quantity}
                            </span>
                            <span className="text-gray-500">
                              {" "}
                              / {item.quantity} {item.product?.unit}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="capitalize">{item.source?.type}</div>
                          {item.source?.type === "donor" &&
                            item.source?.referenceId && (
                              <div className="text-sm text-gray-500">
                                {item.source?.referenceId?.name}
                              </div>
                            )}
                        </TableCell>
                        <TableCell>{item.locationId?.name || "N/A"}</TableCell>
                        <TableCell>
                          {getPolicyBadge(item.distributionPolicy?.type)}
                        </TableCell>
                        <TableCell>
                          {item.createdAt
                            ? format(new Date(item.createdAt), "MMM dd, yyyy")
                            : "N/A"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => viewStockItem(item._id)}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="View"
                            >
                              <Eye size={16} className="text-gray-600" />
                            </button>
                            <button
                              onClick={() =>
                                setTransferModal({ open: true, id: item._id })
                              }
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Transfer"
                            >
                              <ArrowRightLeft
                                size={16}
                                className="text-green-600"
                              />
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
                      </>
                    )}
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
                setPagination((previous) => ({ ...previous, page }))
              }
            />
          </>
        )}
      </Card>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editingId
            ? isPackageEditing
              ? "Edit Package"
              : "Edit Stock Item"
            : isPackageEditing
              ? "Add Package"
              : "Add Stock Item"
        }
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {isPackageEditing ? (
            <>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Package Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Package Name *"
                    placeholder="Enter package name"
                    error={errors.packageName?.message}
                    {...register("packageName", {
                      required: "Package name is required",
                    })}
                  />
                  <Select
                    label="Location *"
                    options={locationOptions}
                    error={errors.location?.message}
                    {...register("location", {
                      required: "Location is required",
                    })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Select Products
                </h4>
                <div className="space-y-4">
                  <Input
                    label="Search Product"
                    placeholder="Search available stock items"
                    value={packageSearch}
                    onChange={(event) => setPackageSearch(event.target.value)}
                  />
                  <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                    {packageProductOptions.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500">
                        No available stock items match your search.
                      </div>
                    ) : (
                      packageProductOptions.map((item) => (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => addPackageItem(item)}
                          className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50 last:border-b-0"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              {item.product?.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {item.remainingQuantity} {item.product?.unit}{" "}
                              available •{" "}
                              {item.locationId?.name || "No location"}
                            </div>
                          </div>
                          <span className="text-sm font-medium text-primary-600">
                            Add
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  <div className="space-y-3">
                    {selectedPackageItems.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                        Selected products will appear here.
                      </div>
                    ) : (
                      selectedPackageItems.map((item) => (
                        <div
                          key={item.stockInId}
                          className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 md:grid-cols-[1fr_140px_auto] md:items-center"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              {item.productName}
                            </div>
                            <div className="text-sm text-gray-500">
                              Available: {item.availableQuantity} {item.unit}
                            </div>
                          </div>
                          <Input
                            label="Quantity"
                            type="number"
                            min="1"
                            max={item.availableQuantity}
                            value={item.quantity}
                            onChange={(event) =>
                              updatePackageItemQuantity(
                                item.stockInId,
                                event.target.value,
                              )
                            }
                          />
                          <div className="flex justify-end mt-5">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => removePackageItem(item.stockInId)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Product Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Product Name *"
                    placeholder="Enter product name"
                    error={errors.productName?.message}
                    {...register("productName", {
                      required: "Product name is required",
                    })}
                  />
                  <Select
                    label="Category *"
                    options={categoryOptions}
                    error={errors.category?.message}
                    {...register("category", {
                      required: "Category is required",
                    })}
                  />
                  <Select
                    label="Unit *"
                    options={unitOptions}
                    error={errors.unit?.message}
                    {...register("unit", { required: "Unit is required" })}
                  />
                  <Input
                    label="Quantity *"
                    type="number"
                    min="1"
                    placeholder="Enter quantity"
                    error={errors.quantity?.message}
                    {...register("quantity", {
                      required: "Quantity is required",
                      min: 1,
                    })}
                  />
                  <Input
                    label="Unit Price (Rs.)"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Price per unit"
                    {...register("unitPrice")}
                  />
                  <Input
                    label="Expiry Date"
                    type="date"
                    {...register("expiryDate")}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Source Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select
                    label="Source Type *"
                    options={sourceOptions}
                    error={errors.sourceType?.message}
                    {...register("sourceType", {
                      required: "Source type is required",
                    })}
                  />
                  {sourceType === "donor" && (
                    <Select
                      label="Donor"
                      options={donorOptions}
                      placeholder="Select donor"
                      {...register("sourceReference")}
                    />
                  )}
                  {sourceType === "company" && (
                    <Input
                      label="Company Name"
                      placeholder="Enter company name"
                      {...register("companyName")}
                    />
                  )}
                  <Select
                    label="Location *"
                    options={locationOptions}
                    error={errors.location?.message}
                    {...register("location", {
                      required: "Location is required",
                    })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Distribution Policy
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select
                    label="Policy Type *"
                    options={policyOptions}
                    error={errors.distributionPolicy?.message}
                    {...register("distributionPolicy", {
                      required: "Policy is required",
                    })}
                  />
                  {distributionPolicy === "control_price" && (
                    <Input
                      label="Control Price (Rs.) *"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Fixed selling price"
                      {...register("controlPrice", {
                        required: "Control price is required",
                      })}
                    />
                  )}
                  {distributionPolicy === "flexible" && (
                    <Input
                      label="Max Discount (%)"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Maximum discount allowed"
                      {...register("maxDiscount")}
                    />
                  )}
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Eligibility Rules
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Frequency"
                    options={frequencyOptions}
                    {...register("eligibilityFrequency")}
                  />
                  <Input
                    label="Max Quantity Per Beneficiary"
                    type="number"
                    min="1"
                    placeholder="Leave empty for unlimited"
                    {...register("maxQuantityPerBeneficiary")}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Batch Number"
                    placeholder="Optional batch/lot number"
                    {...register("batchNumber")}
                  />
                </div>
                <Textarea
                  label="Notes"
                  placeholder="Additional notes..."
                  rows={2}
                  className="mt-4"
                  {...register("notes")}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {editingId ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={transferModal.open}
        onClose={closeTransferModal}
        title="Transfer Stock"
        size="md"
      >
        <form
          onSubmit={handleTransferSubmit(handleTransfer)}
          className="space-y-4"
        >
          <Select
            label="Destination Location *"
            options={locationOptions}
            placeholder="Select location"
            {...registerTransfer("toLocation", { required: true })}
          />
          <Input
            label="Quantity to Transfer *"
            type="number"
            min="1"
            placeholder="Enter quantity"
            {...registerTransfer("transferQuantity", {
              required: true,
              min: 1,
            })}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              type="button"
              onClick={closeTransferModal}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Transfer
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={viewModal.open}
        onClose={() => setViewModal({ open: false, data: null })}
        title={
          viewModal.data?.recordType === "package"
            ? "Package Details"
            : "Stock Item Details"
        }
        size="lg"
      >
        {viewModal.data && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
                <Package size={32} className="text-primary-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">
                  {viewModal.data.recordType === "package"
                    ? viewModal.data.package?.name ||
                      viewModal.data.product?.name
                    : viewModal.data.product?.name}
                </h3>
                <p className="text-gray-500 capitalize">
                  {viewModal.data.recordType === "package"
                    ? "package"
                    : viewModal.data.product?.category}
                </p>
              </div>
            </div>

            {viewModal.data.recordType === "package" ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Selected Products</p>
                    <p className="font-medium">
                      {viewModal.data.package?.totalProducts ||
                        viewModal.data.quantity}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Quantity</p>
                    <p className="font-medium">
                      {viewModal.data.package?.totalQuantity || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium">
                      {viewModal.data.locationId?.name || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Policy</p>
                    {getPolicyBadge(viewModal.data.distributionPolicy?.type)}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Package Items
                  </p>
                  <div className="space-y-2 rounded-lg border border-gray-200 p-4">
                    {(viewModal.data.package?.items || []).map((item) => (
                      <div
                        key={item.stockInId?._id || item.stockInId}
                        className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-b-0 last:pb-0"
                      >
                        <div>
                          <div className="font-medium text-gray-900">
                            {item.productName || item.stockInId?.product?.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {item.quantity} {item.unit}
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          Available: {item.availableQuantity}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Quantity</p>
                  <p className="font-medium">
                    {viewModal.data.remainingQuantity ||
                      viewModal.data.quantity}{" "}
                    / {viewModal.data.quantity} {viewModal.data.product?.unit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Unit Price</p>
                  <p className="font-medium">
                    Rs.{" "}
                    {(
                      viewModal.data.pricing?.unitPrice ||
                      viewModal.data.pricing?.costPrice ||
                      0
                    ).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Source Type</p>
                  <p className="font-medium capitalize">
                    {viewModal.data.source?.type}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Location</p>
                  <p className="font-medium">
                    {viewModal.data.locationId?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Distribution Policy</p>
                  {getPolicyBadge(viewModal.data.distributionPolicy?.type)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Eligibility</p>
                  <p className="font-medium capitalize">
                    {viewModal.data.eligibilityRules?.frequency || "Unlimited"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Received Date</p>
                  <p className="font-medium">
                    {viewModal.data.createdAt
                      ? format(
                          new Date(viewModal.data.createdAt),
                          "MMM dd, yyyy",
                        )
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Batch Number</p>
                  <p className="font-medium">
                    {viewModal.data.batchNumber || "N/A"}
                  </p>
                </div>
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

      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, id: null })}
        onConfirm={handleDelete}
        title={isPackageView ? "Delete Package" : "Delete Stock Item"}
        message={
          isPackageView
            ? "Are you sure you want to delete this package? This action cannot be undone."
            : "Are you sure you want to delete this stock item? This action cannot be undone."
        }
        confirmText="Delete"
      />
    </div>
  );
}
