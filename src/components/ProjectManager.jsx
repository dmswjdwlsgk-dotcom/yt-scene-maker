import { loadProjects, deleteProject } from "../lib/storage.js";
import { useState } from "react";

export default function ProjectManager({ onLoad, onClose }) {
  const [projects, setProjects] = useState(loadProjects());

  function handleDelete(id, e) {
    e.stopPropagation();
    if (confirm("이 프로젝트를 삭제하시겠습니까?")) {
      setProjects(deleteProject(id));
    }
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#1F2128] rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">📁 프로젝트 관리</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>

        <div className="overflow-y-auto p-6 space-y-3">
          {projects.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-3">📂</div>
              <p>저장된 프로젝트가 없습니다.</p>
            </div>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                onClick={() => { onLoad(project); onClose(); }}
                className="bg-[#0E1117] border border-gray-700 rounded-xl p-4 cursor-pointer hover:border-orange-500 transition flex items-center justify-between group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-sm truncate">{project.title || "제목 없음"}</h3>
                  <p className="text-gray-500 text-xs mt-1">
                    씬 {project.scenes?.length || 0}개 · {formatDate(project.updatedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={(e) => handleDelete(project.id, e)}
                    className="text-gray-600 hover:text-red-400 text-lg transition opacity-0 group-hover:opacity-100"
                  >
                    🗑
                  </button>
                  <span className="text-orange-400 text-sm">→</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
