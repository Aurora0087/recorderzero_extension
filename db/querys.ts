import { GetVideoParamsProps } from "@/lib/types";
import { db } from ".";

export async function getVideos() {
    // get videos ordered by createdAt desc
    const videos = await db.videos
        .orderBy("createdAt")
        .reverse()
        .toArray();

    // get first chunk of each video for preview
    const withPreview = await Promise.all(
        videos.map(async (video) => {
            const chunks = await db.chanks
                .where("videoId")
                .equals(video.id)
                .sortBy("createdAt"); // Sort to ensure we get the first chunk
            
            let preview = null;

            // Check if we have any chunks
            if (chunks && chunks.length > 0) {
                try {
                    
                    const previewChunks = chunks.slice(0, 2);
                    const previewData = previewChunks.map(chunk => new Uint8Array(chunk.data));
                    const blob = new Blob(previewData, { type: 'video/mp4' });
                    preview = URL.createObjectURL(blob);
                    
                } catch (error) {
                    console.error("Error creating preview for video:", video.id, error);
                }
            }

            return {
                ...video,
                preview
            };
        })
    );

    return withPreview;
}




export async function getVideoChanks({ videoId }: { videoId: string }) {
    // get video info
    const video = await db.videos.get(videoId);
    if (!video) return null;

    // get chunks ordered oldest → newest
    const chanks = await db.chanks
        .where("videoId")
        .equals(videoId)
        .sortBy("createdAt");

    return {
        video,
        chanks
    };
}


// Helper function to create a complete video blob from all chunks
export async function getVideoBlob(videoId: string): Promise<Blob | null> {
    const chunks = await db.chanks
        .where("videoId")
        .equals(videoId)
        .sortBy("createdAt");
    
    if (!chunks || chunks.length === 0) {
        return null;
    }
    
    const allChunkData = chunks.map(chunk => new Uint8Array(chunk.data));
    return new Blob(allChunkData, { type: 'video/mp4' });
}

// Helper to download a video
export async function downloadVideo(videoId: string, fileName: string) {
    const blob = await getVideoBlob(videoId);
    if (!blob) {
        console.error("No video data found");
        return;
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `video-${videoId}.mp4`;
    a.click();
    URL.revokeObjectURL(url);
}