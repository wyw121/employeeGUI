import { useEffect, useRef, useState } from 'react';
import type { DecodedVideoFrame } from './types';

export type DecoderConfig = {
  codec?: string; // e.g., 'avc1.64001f' (H.264)
};

export function useWebCodecsDecoder(cfg?: DecoderConfig) {
  const decoderRef = useRef<VideoDecoder | null>(null);
  const [supported, setSupported] = useState<boolean>(false);

  useEffect(() => {
    setSupported(typeof (window as any).VideoDecoder === 'function');
  }, []);

  const init = (onFrame: (frame: DecodedVideoFrame) => void, onError?: (e: any) => void) => {
    if (!supported) return false;
    const output = (frame: VideoFrame) => onFrame(frame);
    const error = (e: any) => onError?.(e);
    const decoder = new VideoDecoder({ output, error });
    // 配置在收到 stream parameter set/start 时再进行（具体取决于 ws-scrcpy 的首包）
    decoderRef.current = decoder;
    return true;
  };

  const close = () => { try { decoderRef.current?.close(); } catch {} decoderRef.current = null; };

  // 简版：直接将 Annex B NALU 交给 decoder（实际需根据 ws-scrcpy 协议提供的参数配置）
  const decode = async (chunk: EncodedVideoChunk) => {
    if (!decoderRef.current) return;
    try { decoderRef.current.decode(chunk); } catch {}
  };

  return { supported, decoderRef, init, close, decode };
}
