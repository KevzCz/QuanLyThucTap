import React from "react";
import Modal from "../../../util/Modal";
import type { Participant } from "./ParticipantsTypes";
import { roleLabel } from "./ParticipantsTypes";

interface Props {
  open: boolean;
  onClose: () => void;
  participant?: Participant;
  subjectId: string;
}

const ViewParticipantDialog: React.FC<Props> = ({ open, onClose, participant, subjectId }) => {
  const isGV = participant?.role === "giang-vien";
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isGV ? "Xem giảng viên" : "Xem sinh viên"}
      widthClass="max-w-2xl"
      actions={<button className="h-10 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700" onClick={onClose}>Đóng</button>}
    >
      {!participant ? (
        <div className="text-gray-500">Không tìm thấy.</div>
      ) : (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-blue-600">{participant.name}</h2>
            <div className="inline-block mt-2 rounded-full bg-blue-100 px-4 py-1 text-sm text-blue-800">{participant.id}</div>
          </div>

          <div className="rounded-xl border border-gray-200 p-4">
            <div className="text-gray-700">
              <div className="py-1"><span className="text-gray-500">Vai trò:</span> <span className="font-medium">{roleLabel[participant.role]}</span></div>
              <div className="py-1"><span className="text-gray-500">Trạng thái:</span> <span className="font-medium">{participant.status}</span></div>
              <div className="py-1"><span className="text-gray-500">Môn thực tập:</span> <span className="font-medium">{subjectId}</span></div>
              {participant.role === "sinh-vien" && (
                <div className="py-1"><span className="text-gray-500">Giảng viên hướng dẫn:</span> <span className="font-medium">{participant.advisorName || "—"}</span></div>
              )}
            </div>
          </div>

          {isGV && (
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="text-gray-700 font-medium mb-2">Sinh viên hướng dẫn:</div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-blue-700">- Sinh viên A{i + 1}</span>
                  <div className="flex gap-3 text-gray-600">
                    <span title="Chi tiết">⋯</span>
                    <span title="Chat">💬</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default ViewParticipantDialog;
