import { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scannerRef.current.render(
        (decodedText) => {
          if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error);
          }
          onScan(decodedText);
        },
        (error) => {
          // ignore continuous scanning errors
        }
      );
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [onScan]);

  return (
    <div className="w-full bg-white p-4 rounded-xl border shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-700">Scan Barcode</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-red-500 font-bold">✕</button>
      </div>
      <div id="reader" className="w-full overflow-hidden rounded-lg"></div>
    </div>
  );
}
