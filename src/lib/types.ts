export type VideoSummary = {
  id: string;
  original_filename: string;
  duration_seconds: number | null;
  status: string;
  created_at: string;
};

export type VideoItem = {
  id: string;
  original_filename: string;
  duration_seconds: number | null;
  status: string;
  processing_started_at: string | null;
  processing_finished_at: string | null;
  created_at: string;
};

export type VideoListResponse = {
  page: number;
  size: number;
  total: number;
  items: VideoItem[];
};

export type VideoIngestResponse = {
  id: string;
  original_filename: string;
  status: string;
  created_at: string;
};

export type FaceBox = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type FaceDetectResponse = {
  faces: FaceBox[];
};

export type TextSearchRequest = {
  query: string;
  threshold?: number;
  limit?: number;
};

export type TextSearchItem = {
  video_id: string;
  video: VideoSummary;
  start_sec: number;
  end_sec: number;
  text: string;
  similarity: number;
};

export type TextSearchResponse = {
  items: TextSearchItem[];
};

export type FaceSearchItem = {
  video_id: string;
  video: VideoSummary;
  alias: string;
  start_sec: number;
  end_sec: number;
  similarity: number;
};

export type FaceSearchResponse = {
  items: FaceSearchItem[];
};
