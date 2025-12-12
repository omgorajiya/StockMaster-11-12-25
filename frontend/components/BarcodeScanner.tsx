'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Camera, Check } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (scanning && videoRef.current) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch((err) => {
          console.error('Error accessing camera:', err);
          alert('Unable to access camera. Please check permissions.');
        });
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [scanning]);

  const handleScan = () => {
    setScanning(true);
    // In a real implementation, you would use jsQR or html5-qrcode here
    // For now, this is a placeholder that simulates scanning
    setTimeout(() => {
      const mockBarcode = '1234567890123';
      setScannedCode(mockBarcode);
      onScan(mockBarcode);
      setScanning(false);
    }, 2000);
  };

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    setScanning(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Scan Barcode</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
          >
            <X size={20} />
          </button>
        </div>

        {!scanning ? (
          <div className="text-center py-8">
            <Camera size={64} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-4">Click to start scanning</p>
            <button
              onClick={handleScan}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Start Scanner
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden aspect-square">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
              />
              <div className="absolute inset-0 border-4 border-primary-500 rounded-lg pointer-events-none" />
            </div>
            {scannedCode && (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <Check className="text-green-600" size={20} />
                <span className="text-green-800 font-medium">Scanned: {scannedCode}</span>
              </div>
            )}
            <button
              onClick={handleClose}
              className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all duration-200"
            >
              Stop Scanning
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

