import { useEffect, useRef } from 'react';
import { Modal } from './ui.js';

// Last-resort copy UI: pre-selected text the user copies manually with Ctrl+C/Cmd+C.
export default function CopyFallback({ text, onClose }: { text: string; onClose: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <Modal title="Automatic copy was blocked" onClose={onClose}>
      <p className="dim" style={{ fontSize: 13, marginTop: 0 }}>
        Your browser blocked one-click copy. The text below is already selected — press{' '}
        <strong>Ctrl+C</strong> (Windows) or <strong>⌘C</strong> (Mac); on a phone, tap the text, then Select All → Copy. Then close this window.
      </p>
      <textarea
        ref={ref} readOnly className="input" value={text}
        onClick={(e) => e.currentTarget.select()}
        style={{ minHeight: 220, fontSize: 12.5, fontFamily: 'ui-monospace,Menlo,Consolas,monospace' }}
      />
    </Modal>
  );
}
