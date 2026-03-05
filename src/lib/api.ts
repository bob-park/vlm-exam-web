import ky from "ky";
import {
  FaceDetectResponse,
  FaceSearchResponse,
  TextSearchRequest,
  TextSearchResponse,
  VideoOut,
  VideoSearchResponse,
} from "./types";

const api = ky.create({
  prefixUrl: "/api",
  retry: 0,
  timeout: 30 * 60 * 1000,
});

export function getStreamUrl(videoId: number) {
  return `/api/videos/${videoId}/stream`;
}

export function getThumbnailUrl(catalogId: number) {
  return `/api/catalogs/${catalogId}/thumbnail`;
}

export async function listVideos(
  query?: string | null,
  page?: number,
  size?: number
) {
  const searchParams: Record<string, string> = {};
  if (query) searchParams.query = query;
  if (typeof page === "number") searchParams.page = String(page);
  if (typeof size === "number") searchParams.size = String(size);

  return api
    .get("videos", {
      searchParams: Object.keys(searchParams).length > 0 ? searchParams : undefined,
      cache: "no-store",
    })
    .json<VideoSearchResponse>();
}

export async function uploadVideo(file: File) {
  const form = new FormData();
  form.append("file", file);
  console.log("[uploadVideo] start", {
    name: file.name,
    type: file.type,
    size: file.size,
  });
  try {
    const response = await api.post("videos/upload", {
      body: form,
    });
    console.log("[uploadVideo] response", {
      status: response.status,
      ok: response.ok,
    });
    return response.json<VideoOut>();
  } catch (error) {
    console.error("[uploadVideo] error", error);
    throw error;
  }
}

export async function detectFaces(file: File) {
  const form = new FormData();
  form.append("file", file);
  return api
    .post("faces/detect", {
      body: form,
    })
    .json<FaceDetectResponse>();
}

export async function searchByFace(file: File) {
  const form = new FormData();
  form.append("file", file);
  return api
    .post("search/face", {
      body: form,
    })
    .json<FaceSearchResponse>();
}

export async function searchByText(text: string, topK?: number | null) {
  const payload: TextSearchRequest = {
    text,
    top_k: topK ?? null,
  };

  return api
    .post("search/text", {
      json: payload,
    })
    .json<TextSearchResponse>();
}
