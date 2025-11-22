import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { submitProcurementRequest } from "../../store/workspaceSlice";
import { setProcurementField, setProcurementSaving } from "../../store/workspaceUiSlice";

export default function ProcurementPage() {
  const dispatch = useDispatch();
  const { procurementRequests, assignedProjects, materials } = useSelector((state) => state.workspace);
  const { token } = useSelector((state) => state.auth);
  const { projectId, materialId, increaseQty, reason, saving } = useSelector(
    (state) => state.workspaceUi.procurement
  );

  const materialOptions = useMemo(
    () => [...materials].sort((a, b) => a.name.localeCompare(b.name)),
    [materials]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (!projectId || !materialId || !increaseQty || !reason) {
      toast.error("Project, material, quantity and reason are required");
      return;
    }
    dispatch(setProcurementSaving(true));
    try {
      await dispatch(
        submitProcurementRequest({
          token,
          payload: {
            projectId,
            materialId,
            increaseQty: Number(increaseQty),
            reason,
          },
        })
      ).unwrap();
      toast.success("Request submitted to backend");
      dispatch(setProcurementField({ field: "materialId", value: "" }));
      dispatch(setProcurementField({ field: "increaseQty", value: "" }));
      dispatch(setProcurementField({ field: "reason", value: "" }));
    } catch (err) {
      toast.error(err.message);
    } finally {
      dispatch(setProcurementSaving(false));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Procurement</h1>
        <p className="text-sm text-slate-500">Requests are persisted via the backend API.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Project
            <select
              value={projectId}
              onChange={(e) => dispatch(setProcurementField({ field: "projectId", value: e.target.value }))}
              className="rounded border border-slate-200 px-3 py-2"
              required
            >
              <option value="">Select project</option>
              {assignedProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.code} — {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Material
            <select
              value={materialId}
              onChange={(e) => dispatch(setProcurementField({ field: "materialId", value: e.target.value }))}
              className="rounded border border-slate-200 px-3 py-2"
              required
            >
              <option value="">Select material</option>
              {materialOptions.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.code} — {material.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Quantity needed
            <input
              type="number"
              min="0"
              step="0.01"
              value={increaseQty}
              onChange={(e) => dispatch(setProcurementField({ field: "increaseQty", value: e.target.value }))}
              className="rounded border border-slate-200 px-3 py-2"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-slate-700">
            Reason
            <input
              type="text"
              value={reason}
              onChange={(e) => dispatch(setProcurementField({ field: "reason", value: e.target.value }))}
              className="rounded border border-slate-200 px-3 py-2"
              required
            />
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? "Submitting…" : "Submit to backend"}
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-semibold text-slate-700">Requests</div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-slate-600">
                <th className="border border-slate-200 px-3 py-2">Project</th>
                <th className="border border-slate-200 px-3 py-2">Material</th>
                <th className="border border-slate-200 px-3 py-2">Quantity</th>
                <th className="border border-slate-200 px-3 py-2">Status</th>
                <th className="border border-slate-200 px-3 py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {procurementRequests.map((req) => (
                <tr key={req.id} className="odd:bg-white even:bg-slate-50">
                  <td className="border border-slate-200 px-3 py-2">{req.projectName}</td>
                  <td className="border border-slate-200 px-3 py-2">{req.materialName}</td>
                  <td className="border border-slate-200 px-3 py-2">{req.increaseQty}</td>
                  <td className="border border-slate-200 px-3 py-2">{req.status}</td>
                  <td className="border border-slate-200 px-3 py-2">{req.reason}</td>
                </tr>
              ))}
              {procurementRequests.length === 0 && (
                <tr>
                  <td colSpan={5} className="border border-slate-200 px-3 py-6 text-center text-slate-500">
                    No procurement requests yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
