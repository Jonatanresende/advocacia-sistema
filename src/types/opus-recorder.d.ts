declare module 'opus-recorder' {
  export interface RecorderConfig {
    bufferLength?: number
    encoderPath?: string
    mediaTrackConstraints?: MediaTrackConstraints | boolean
    monitorGain?: number
    numberOfChannels?: number
    recordingGain?: number
    encoderApplication?: number
    encoderBitRate?: number
    encoderComplexity?: number
    encoderFrameSize?: number
    encoderSampleRate?: number
    maxFramesPerPage?: number
    originalSampleRateOverride?: number
    resampleQuality?: number
    streamPages?: boolean
  }

  export default class Recorder {
    constructor(config?: RecorderConfig)
    start(): Promise<void>
    stop(): void
    pause(flush?: boolean): void
    resume(): void
    close(): void
    setRecordingGain(gain: number): void
    setMonitorGain(gain: number): void
    readonly encodedSamplePosition: number
    ondataavailable: (typedArray: Uint8Array) => void
    onstart: () => void
    onstop: () => void
    onpause: () => void
    onresume: () => void
    static isRecordingSupported(): boolean
    static readonly version: string
  }
}
