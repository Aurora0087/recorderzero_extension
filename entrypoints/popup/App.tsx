import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Command } from 'lucide-react';
import { RecordingState, RecordingType } from '@/lib/types';
import { CgScreen } from 'react-icons/cg';
import { MdOutlineTab } from 'react-icons/md';
import { FaPlay } from 'react-icons/fa';
import { IoIosSettings } from 'react-icons/io';
import CameraButton from '@/components/popup/CameraButton';
import { changeRecordType, checkRocordingStates, toggleIsRecording } from '@/lib/utils';

function App() {

  const [recordingState, setRecordingState] = useState<RecordingState>([
    false,
    "",
    false,
    -1
  ]);// [isRecording, type, isCamOn,camtabId]

  async function reValuadedState() {
    const state = await checkRocordingStates();
      setRecordingState(state)
  }

  function changeRecordingType(type: RecordingType) {
    changeRecordType(type);
    setRecordingState(preState=>[preState[0],type,preState[2],preState[3]])
  }

  function toggleRecording() {
    if (recordingState[1].length < 1) {
      return
    }
    toggleIsRecording(recordingState[0]);
    reValuadedState();
    window.close();
  }

  useEffect(() => {
    reValuadedState()
  }, [])

  const videoPath = browser.runtime.getURL("/videos.html");

  return (
    <div className="p-4 flex flex-col gap-4 w-sm h-full">
      {/* Header */}
      <header className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <Command />
          <h1 className="font-semibold text-lg">RecorderZero</h1>
        </div>
        <Button size="icon-sm" variant="ghost" className="rounded-full">
          <IoIosSettings />
        </Button>
      </header>

      {/* Record Type Buttons */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Button variant={recordingState[1] === "record_screen" ? "default" : "secondary"}
          onClick={() => changeRecordingType("record_screen")}
          className='text-xs transition-all'>
          <CgScreen />
          <span>Screen</span>
        </Button>

        <Button variant={recordingState[1] === "record_tab" ? "default" : "secondary"}
          onClick={() => changeRecordingType("record_tab")}
          className='text-xs transition-all'>
          <MdOutlineTab />
          <span>Tab</span>
        </Button>

        <CameraButton />
      </div>

      {/* Main Button */}
      <div className="flex justify-center">
        <Button className=' rounded-full px-8 w-full' onClick={()=>toggleRecording()}>
          {recordingState[0] ? (
            <div className="animate-pulse bg-red-500 w-2 h-2 rounded-full" />
          ) : (
            <FaPlay />
          )}
          <span>{recordingState[0] ? "Stop Recording" : "Start Recording"}</span>
        </Button>
      </div>

      {/* Footer */}
      <footer className="text-center">
        <a href={videoPath} target='_blank' className="text-xs text-gray-500">Videos</a>
      </footer>
    </div>
  );
}

export default App;
