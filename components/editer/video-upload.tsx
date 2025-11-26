import { useRef } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoUploadProps {
  onVideoUpload: (file: File) => void;
}

export default function VideoUpload({ onVideoUpload }: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      onVideoUpload(file);
    }
  };

  return (
    <div
      className="flex-1 flex items-center justify-center rounded-lg border-2 border-dashed border-neutral-700 bg-neutral-900/50 hover:border-neutral-600 transition-colors cursor-pointer"
      onClick={() => inputRef.current?.click()}
    >
      <div className="text-center">
        <Upload className="w-12 h-12 text-neutral-500 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-white mb-1">Upload Video</h3>
        <p className="text-neutral-400 text-sm mb-4">Drag and drop or click to select</p>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">Select Video</Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
