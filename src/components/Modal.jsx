export default function Modal({ open, title, children, onClose, footer, maxWidthClass = "max-w-2xl" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <button
        className="absolute inset-0 bg-black/40"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="absolute inset-0 flex items-end sm:items-center justify-center p-3">
        <div className={`w-full ${maxWidthClass} bg-white rounded-2xl shadow-xl overflow-hidden max-h-[calc(100dvh-1.5rem)] flex flex-col`}>
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold text-indigo-700">{title}</h3>
            <button className="text-gray-500 hover:text-indigo-700" onClick={onClose}>✕</button>
          </div>
          <div className="px-5 py-4 overflow-y-auto min-h-0">{children}</div>
          {footer && <div className="px-5 py-4 border-t bg-gray-50">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
