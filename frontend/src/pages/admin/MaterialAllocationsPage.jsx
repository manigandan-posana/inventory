import { useEffect } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import ProjectAllocationManager from "../../components/ProjectAllocationManager";
import { useNavigate } from "react-router-dom";
import { clearAllocationError, loadAllocationData } from "../../store/adminAllocationsSlice";

export default function MaterialAllocationsPage({ onRequestReload }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const { projects, materials, status, error } = useSelector((state) => state.adminAllocations);

  useEffect(() => {
    if (token) {
      dispatch(loadAllocationData(token));
    }
  }, [dispatch, token]);

  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearAllocationError());
    }
  }, [dispatch, error]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">Project Allocations</div>
          <p className="text-[11px] text-slate-500">
            Assign the total required quantity per material for each project.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/admin/materials")}
          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
        >
          Go to Material Directory
        </button>
      </div>
      {status === "loading" ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-[11px] text-slate-500">
          Loading projects and materials…
        </div>
      ) : (
        <ProjectAllocationManager
          token={token}
          projects={projects}
          materials={materials}
          onProjectBomUpdate={onRequestReload}
          onCreateMaterial={() => navigate("/admin/materials")}
        />
      )}
    </div>
  );
}
