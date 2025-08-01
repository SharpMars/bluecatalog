import { Accessor, createSignal, createMemo, Setter } from "solid-js";

export default function createPagination<T>(
  data: Accessor<T[]>,
  itemsPerPage: number,
  initialIndex?: number,
  flip?: Accessor<boolean>
): [Accessor<T[]>, Accessor<number>, Accessor<number>, Setter<number>] {
  const [currentIndex, setCurrentIndex] = createSignal(initialIndex ? initialIndex : 0);

  const pageCount = createMemo(() => {
    return Math.ceil(data()?.length / itemsPerPage);
  });

  const currentPage = createMemo(() => {
    let d = data();

    if (flip && flip()) d = d.toReversed();

    return d?.slice(
      0 + currentIndex() * itemsPerPage,
      itemsPerPage + currentIndex() * itemsPerPage > d?.length
        ? d?.length
        : itemsPerPage + currentIndex() * itemsPerPage
    );
  });

  return [currentPage, pageCount, currentIndex, setCurrentIndex];
}
