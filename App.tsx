import React, { useEffect, useRef, useState } from 'react';
import { Peer } from 'peerjs';
import { Send, Download, FileUp, FileDown } from 'lucide-react';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function App() {
  const [mode, setMode] = useState<'send' | 'receive' | null>(null);
  const [code, setCode] = useState<string>('');
  const [inputCode, setInputCode] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number>(0);
  
  const peerRef = useRef<Peer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    peerRef.current = new Peer();
    
    return () => {
      peerRef.current?.destroy();
    };
  }, []);

  const handleSendFile = async () => {
    if (!file) return;
    
    const conn = peerRef.current?.connect(inputCode);
    if (!conn) return;

    conn.on('open', () => {
      const chunks: ArrayBuffer[] = [];
      const chunkSize = 16384; // 16KB chunks
      let offset = 0;

      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target?.result as ArrayBuffer;
        while (offset < data.byteLength) {
          const chunk = data.slice(offset, offset + chunkSize);
          chunks.push(chunk);
          offset += chunkSize;
        }

        let sent = 0;
        chunks.forEach((chunk, index) => {
          setTimeout(() => {
            conn.send({
              chunk,
              index,
              total: chunks.length,
              fileName: file.name,
              fileType: file.type
            });
            sent++;
            setProgress((sent / chunks.length) * 100);
          }, index * 100);
        });
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setCode(generateCode());
    }
  };

  const initializeReceiver = () => {
    peerRef.current?.on('connection', (conn) => {
      const chunks: ArrayBuffer[] = [];
      let fileName = '';
      let fileType = '';
      
      conn.on('data', (data: any) => {
        chunks[data.index] = data.chunk;
        fileName = data.fileName;
        fileType = data.fileType;
        setProgress((chunks.filter(Boolean).length / data.total) * 100);

        if (chunks.filter(Boolean).length === data.total) {
          const blob = new Blob(chunks, { type: fileType });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
          setStatus('Download complete!');
        }
      });
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8 text-indigo-900">P2P File Share</h1>
        
        {!mode ? (
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setMode('send')}
              className="flex flex-col items-center justify-center p-6 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <FileUp className="w-12 h-12 text-indigo-600 mb-2" />
              <span className="font-medium text-indigo-900">Send File</span>
            </button>
            <button
              onClick={() => {
                setMode('receive');
                initializeReceiver();
              }}
              className="flex flex-col items-center justify-center p-6 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <FileDown className="w-12 h-12 text-indigo-600 mb-2" />
              <span className="font-medium text-indigo-900">Receive File</span>
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {mode === 'send' && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  Select File
                </button>
                {file && (
                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <p className="font-medium text-indigo-900">Selected: {file.name}</p>
                    <p className="text-sm text-indigo-600">Share Code: {code}</p>
                  </div>
                )}
              </>
            )}
            
            {mode === 'receive' && (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  maxLength={6}
                />
                <button
                  onClick={handleSendFile}
                  className="w-full py-3 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Receive File
                </button>
              </div>
            )}

            {progress > 0 && (
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 text-center">{Math.round(progress)}% Complete</p>
              </div>
            )}

            <button
              onClick={() => {
                setMode(null);
                setFile(null);
                setCode('');
                setInputCode('');
                setProgress(0);
                setStatus('');
              }}
              className="w-full py-2 px-4 text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;