import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Input } from "@/components/ui/input"
import { Toaster } from "@/components/ui/sonner"
import VideoCard from "@/components/unlisted-page/videos/videoCard"
import { getVideos } from "@/db/querys"
import { SearchIcon, User2 } from "lucide-react"

function App() {

    const [videoList, setVideoList] = useState<{
        preview: string | null;
        id: string;
        name: string;
        createdAt: Date;
    }[]>([]);

    async function load() {
        const res = await getVideos();
        setVideoList(res);
        console.log(res);
    }

    useEffect(() => {
        load();
    }, []);
    return (
        <div className=' w-screen min-h-screen h-full overflow-x-hidden relative pt-20 space-y-4 flex flex-col'>

      <Toaster richColors closeButton />
            <div className="w-full justify-between flex items-center gap-2 fixed top-0 px-4 sm:px-4 lg:px-8 h-16 bg-background/80 backdrop-blur-sm">
                <div>RecorderZero</div>
                <ButtonGroup>
                    <Input placeholder="Search..." />
                    <Button variant="outline" aria-label="Search" className="">
                        <SearchIcon />
                    </Button>
                </ButtonGroup>
                <div>
                    <Button size="icon" className=" rounded-full">
                        <User2 />
                    </Button>
                </div>
            </div>
            {/* TODO Later Folders gose here
            <div className=" flex flex-wrap gap-4 ">
            </div>*/}
            <div className="max-w-7xl mx-auto px-4 sm:px-4 lg:px-8 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {
                        videoList.map(vl => {
                            return (
                                <VideoCard key={vl.id} video={vl} reLoadFun={load} />
                            )
                        })
                    }
                </div>
            </div>
        </div>
    )
}

export default App