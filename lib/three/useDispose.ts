import { useEffect } from "react";

type Disposable = { dispose: () => void } | null | undefined;

/**
 * Dispose objects created outside JSX (useMemo geometries, materials, textures, PMREM targets)
 * when the component unmounts. JSX-created objects are already disposed by React Three Fiber.
 */
export function useDispose(...items: Disposable[]) {
  useEffect(
    () => () => {
      for (const i of items) i?.dispose();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    items,
  );
}
