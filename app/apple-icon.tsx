import { ImageResponse } from "next/og";

// Generated from brand/make_brand.py (tensorphysics-mark-on-void.svg). The official artwork is an outlined SVG,
// rendered to PNG at build time so the repository stays text-only.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const SVG = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9Ii0xNiAtMTYgOTYgOTYiIHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIj48dGl0bGU+VGVuc29yUGh5c2ljczwvdGl0bGU+PHJlY3QgeD0iLTE2IiB5PSItMTYiIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgZmlsbD0iIzA0MDUwNyIvPjxwYXRoIGQ9Ik02IDhINThWMjJINloiIGZpbGw9IiMwMEU1RkYiLz48cGF0aCBkPSJNMjIgMjZINDJWNTBMMzYgNTZIMjJaIiBmaWxsPSIjRjRGNkY4Ii8+PC9zdmc+";

export default function Image() {
  return new ImageResponse(
    (
      <img src={SVG} width={180} height={180} alt="" />
    ),
    size,
  );
}
