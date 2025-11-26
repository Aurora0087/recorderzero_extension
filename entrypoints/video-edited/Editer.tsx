import EditerPage from '@/components/editer/Page';
import { Toaster } from '@/components/ui/sonner';
import { getVideoBlob } from '@/db/querys';

function Editer() {


  const [vId, setVId] = useState('');

  const [blob, setBlob] = useState<Blob | null>(null);

  async function getBlob() {
    if (vId) {
      const b = await getVideoBlob(vId);
      console.log(b);
      
      setBlob(b);
    }

  }

  useEffect(() => {
    getBlob();
  }, [vId])

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const videoId = queryParams.get('vi');
    if (videoId!==null) {
      setVId(videoId);
    }
  },[])



  return (
    <div className=' w-screen h-screen overflow-x-hidden relative'>
      <Toaster richColors closeButton />
      {
        blob && <EditerPage blob={blob} videoId={vId} />
      }
      {/* Grid background */}
      <div className="absolute -z-10 inset-0 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-size-[2rem_2rem]" />
    </div>
  )
}

export default Editer