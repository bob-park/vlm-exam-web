import ky from "ky";
import {
  FaceDetectResponse,
  FaceSearchResponse,
  TextSearchRequest,
  TextSearchResponse,
  VideoIngestResponse,
  VideoListResponse,
} from "./types";

const api = ky.create({
  prefixUrl: "/api",
  retry: 0,
  timeout: 30 * 60 * 1000,
});

export function getStreamUrl(videoId: string) {
  return `/api/videos/${videoId}/stream`;
}

export async function listVideos(page?: number, size?: number) {
  const searchParams: Record<string, string> = {};
  if (typeof page === "number") searchParams.page = String(page);
  if (typeof size === "number") searchParams.size = String(size);

  return api
    .get("videos", {
      searchParams: Object.keys(searchParams).length > 0 ? searchParams : undefined,
      cache: "no-store",
    })
    .json<VideoListResponse>();
}

export async function uploadVideo(file: File) {
  const form = new FormData();
  form.append("file", file);
  return api.post("videos/ingest", { body: form }).json<VideoIngestResponse>();
}

export async function detectFaces(file: File) {
  const form = new FormData();
  form.append("file", file);
  return api
    .post("face/detect", {
      body: form,
    })
    .json<FaceDetectResponse>();
}

export async function searchByFace(file: File, threshold = 0.7, limit = 20) {
  const form = new FormData();
  form.append("file", file);
  return api
    .post("videos/faces", {
      body: form,
      searchParams: {
        threshold: String(threshold),
        limit: String(limit),
      },
    })
    .json<FaceSearchResponse>();
}

export async function searchByText(query: string, threshold = 0.7, limit = 20) {
  const payload: TextSearchRequest = {
    query,
    threshold,
    limit,
  };

  return api
    .post("videos/texts", {
      json: payload,
    })
    .json<TextSearchResponse>();
}
