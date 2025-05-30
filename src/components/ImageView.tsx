import { AppBskyEmbedImages } from "@atcute/bluesky";
import Dialog, { useContext } from "@corvu/dialog";
import { createSignal, For, Show } from "solid-js";

export default function ImageView(props: { embed: AppBskyEmbedImages.View }) {
  const [current, setCurrent] = createSignal(0);

  return (
    <div class="relative">
      <Show when={props.embed.images.length > 1}>
        <button
          class="absolute top-50% left-0 text-8 translate-y--50% p-2 i-mingcute-left-fill mix-blend-difference text-white"
          onClick={() => {
            setCurrent(
              current() - 1 < 0 ? props.embed.images.length - 1 : current() - 1
            );
          }}
        ></button>
        <button
          class="absolute top-50% right-0 text-8 translate-y--50% p-2 i-mingcute-right-fill mix-blend-difference text-white"
          onClick={() => {
            setCurrent(
              current() + 1 >= props.embed.images.length ? 0 : current() + 1
            );
          }}
        ></button>
        <div class="flex absolute bottom-2 left-50% translate-x--50% gap-1 mix-blend-difference">
          {Array.from({ length: props.embed.images.length }, (_, i) => {
            return (
              <div
                class="w-2 h-2 bg-white rounded-50%"
                style={{ opacity: i === current() ? "100%" : "50%" }}
              ></div>
            );
          })}
        </div>
      </Show>
      <For each={props.embed.images}>
        {(item, index) => (
          <Dialog closeOnEscapeKeyDown closeOnOutsidePointer>
            <Dialog.Trigger
              class="w-100%"
              style={{ display: current() === index() ? "block" : "none" }}
            >
              <img
                class="max-h-2xl m-x-auto rounded-xl"
                style={{
                  "aspect-ratio": item.aspectRatio
                    ? item.aspectRatio.width / item.aspectRatio.height
                    : "initial",
                }}
                title={item.alt}
                alt={item.alt}
                src={item.fullsize}
              ></img>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
              {(() => {
                const context = useContext();
                return (
                  <Dialog.Content
                    class="fixed left-50% top-50% z-50 translate-x--50% translate-y--50% w-full h-full flex justify-center items-center"
                    onclick={() => {
                      context.setOpen(false);
                    }}
                  >
                    <img
                      title={item.alt}
                      alt={item.alt}
                      src={item.fullsize}
                      class="w-100vw object-contain max-h-[calc(100vh-2rem)] portrait:max-h-[calc(100vh-8rem)] landscape:max-w-[calc(100vw-8rem)]"
                    ></img>
                  </Dialog.Content>
                );
              })()}
              <Dialog.Close class="fixed right-2 top-2 text-6 text-white p-2 bg-op-30 bg-neutral-900 hover:bg-neutral-700 pointer-events-auto z-50 rounded-50% flex items-center justify-center w-12 h-12 transition-ease-in-out transition-all transition-100">
                ⨉
              </Dialog.Close>
            </Dialog.Portal>
          </Dialog>
        )}
      </For>
    </div>
  );
}
