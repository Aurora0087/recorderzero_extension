

export type RecordingType = "record_screen" | "record_tab"|''
export type RecordingState = [boolean, RecordingType, boolean, number] // [isRecording, type, isCamOn, camRecTabId]


export type GetVideoParamsProps = {ignore?:number,limit?:number}