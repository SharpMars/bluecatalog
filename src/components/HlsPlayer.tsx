import Hls from "hls.js";
import { createSignal, onCleanup } from "solid-js";

export default function HlsPlayer(props: { src: string; thumbnail?: string }) {
  const hls = new Hls({ progressive: true, maxMaxBufferLength: 1 });

  onCleanup(() => hls.destroy());

  const [alreadyLoaded, setAlreadyLoaded] = createSignal(false);
  hls.loadSource(props.src);

  return (
    <video
      class="w-full max-h-2xl"
      controls
      ref={(element) => {
        hls.attachMedia(element);
      }}
      poster={props.thumbnail}
      onplay={() => {
        if (!alreadyLoaded()) {
          hls.config.maxMaxBufferLength = 30;
          setAlreadyLoaded(true);
        }
      }}
    ></video>
  );
}
