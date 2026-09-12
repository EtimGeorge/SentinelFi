import React from "react";
import useToastStore from "../store/toastStore";
import ToastWithUndo from "./common/ToastWithUndo";

const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <>
      {children}
      <div className="fixed bottom-6 inset-x-4 z-[9999] flex flex-col gap-3 pointer-events-none sm:inset-x-auto sm:right-6">
        {toasts.map((toast) =>
          toast.isUndoToast ? (
            <ToastWithUndo
              key={toast.id}
              message={toast.message}
              onUndo={toast.onUndo || (() => {})}
              onDismiss={() => useToastStore.getState().removeToast(toast.id)}
              duration={toast.duration}
              variant={toast.type}
              undoLabel={toast.undoLabel}
              isOpen={true}
              onClose={() => useToastStore.getState().removeToast(toast.id)}
            />
          ) : (
            <div
              key={toast.id}
              className={`pointer-events-auto animate-in slide-in-from-bottom-4 duration-300 flex items-center gap-3 px-4 py-3 rounded-2xl border elev-lg w-full min-w-0 max-w-md backdrop-blur-xl ${
                toast.type === "success"
                  ? "bg-green-900/40 border-green-700/50 text-green-300"
                  : toast.type === "error"
                    ? "bg-red-900/40 border-red-700/50 text-red-300"
                    : toast.type === "warning"
                      ? "bg-yellow-900/40 border-yellow-700/50 text-yellow-300"
                      : "bg-blue-900/40 border-blue-700/50 text-blue-300"
              }`}
            >
              <p className="text-sm font-medium text-white flex-1">
                {toast.message}
              </p>
              <button
                onClick={() => useToastStore.getState().removeToast(toast.id)}
                className="text-white/60 hover:text-white transition-colors p-1 flex-shrink-0"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ),
        )}
      </div>
    </>
  );
};

export default ToastProvider;
