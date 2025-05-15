import Hls, { Events } from "hls.js";
import { createSignal, onCleanup, Show } from "solid-js";

export default function HlsPlayer(props: { src: string; thumbnail?: string }) {
  const hls = new Hls({ progressive: true, maxMaxBufferLength: 1 });
  onCleanup(() => hls.destroy());

  const [alreadyLoaded, setAlreadyLoaded] = createSignal(false);
  const [videoOnly, setVideoOnly] = createSignal(false);
  const [paused, setPaused] = createSignal(true);

  hls.loadSource(props.src);
  hls.on(Events.BUFFER_CREATED, (ev, data) => {
    const hasAudio = Object.keys(data.tracks).some(
      (bufName) => bufName === "audio" || bufName === "audiovideo"
    );
    if (!hasAudio) setVideoOnly(true);
  });

  return (
    <div class="relative rounded-xl overflow-clip">
      <video
        class="w-full max-h-2xl rounded-xl"
        controls={!videoOnly()}
        loop={videoOnly()}
        ref={(element) => {
          hls.attachMedia(element);
        }}
        poster={props.thumbnail}
        onplay={() => {
          setPaused(false);
          if (!alreadyLoaded()) {
            hls.config.maxMaxBufferLength = 30;
            setAlreadyLoaded(true);
          }
        }}
        onpause={() => {
          setPaused(true);
        }}
        onclick={(ev) => {
          if (videoOnly()) {
            if (ev.currentTarget.paused) ev.currentTarget.play();
            else ev.currentTarget.pause();
          }
        }}
      ></video>
      <Show when={videoOnly() && paused()}>
        <div class="bg-black bg-op-30 absolute left-0 top-0 w-full h-full pointer-events-none"></div>
        <div class="h-16 w-16 bg-white absolute left-50% top-50% translate-x--50% translate-y--50% pointer-events-none rounded-50% mix-blend-screen p-2">
          <div class="i-mingcute-play-fill text-black w-full h-full"></div>
        </div>
      </Show>
    </div>
  );
}
