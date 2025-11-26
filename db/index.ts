import Dexie, { type EntityTable } from "dexie"


interface Video {
    id: string
    name: string
    createdAt: Date
}

interface Chank {
    id: string
    videoId: string
    data: Uint8Array
    createdAt: Date
}

const db = new Dexie("RecorderZero") as Dexie & {
    videos: EntityTable<
        Video,
        "id"
    >,
    chanks: EntityTable<
        Chank,
        "id"
    >
}

// Schema declaration:
db.version(1).stores({
    videos: "id, name, createdAt",
    chanks: "id, videoId,createdAt"
})

export type { Video, Chank }
export { db }