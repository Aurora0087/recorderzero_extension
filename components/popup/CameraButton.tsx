import { checkRocordingStates, getCamRecTabId, toggleCamStateInStore } from '@/lib/utils';
import { Button } from '../ui/button';
import { TbDeviceComputerCamera, TbDeviceComputerCameraOff } from 'react-icons/tb';
import { storage } from '#imports';

export default function CameraButton() {

    const [isCamOn, setIsCamOn] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Listen to changes from storage (synced across components)
  useEffect(() => {
    const unwatch = storage.watch<boolean>("local:isCamreRaOn", (newValue) => {
      if (newValue !== null) setIsCamOn(newValue);
    });

    return () => unwatch();
  }, []);

    const toggleCamera = async () => {
        if (isLoading) return;

        setIsLoading(true)
        try {
            
            const tab = await browser.tabs.query({ active: true, currentWindow: true });
            if (!tab || tab[0].id === undefined) {
                throw new Error("Can't Find current Tab.");
            }
            const tabId = tab[0].id;
            await toggleCamStateInStore(isCamOn,tabId);
        } catch (error) {
            console.error('Error WhileToggleing Cam on/off.', error);
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        ; (async () => {
            const state = await checkRocordingStates()
            const tab = await browser.tabs.query({ active: true, currentWindow: true });
            if (!tab || tab[0].id === undefined) {
                return;
            }
            const tabId = tab[0].id;
            if (tabId===state[3]) {
                setIsCamOn(state[2]);
            }
        })()
    }, [])
    return (
        <Button disabled={isLoading} onClick={() => toggleCamera()} variant={isCamOn ? "default" : "secondary"} className='text-xs disabled:cursor-wait'>
            {
                isCamOn ? (<>
                    <TbDeviceComputerCameraOff />
                    <span className=' text-wrap'>Off Camera</span>
                </>) : (
                    <>
                        <TbDeviceComputerCamera />
                        <span>Camera</span>
                    </>
                )
            }

        </Button>
    )
}
