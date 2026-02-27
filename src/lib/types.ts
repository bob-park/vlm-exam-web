export type VideoOut = {
  id: number;
  filename: string;
  content_type: string | null;
  duration: number | null;
  width: number | null;
  height: number | null;
  status: string;
  error_message: string | null;
  created_at: string;
};

export type VideoSearchResponse = {
  videos: VideoOut[];
};

export type SearchResult = {
  catalog_image_id: number;
  video_id: number;
  caption_ko: string | null;
  score: number;
  position_seconds?: number | null;
  position?: number | null;
  timestamp?: number | null;
  seconds?: number | string | null;
};

export type TextSearchResponse = {
  results: SearchResult[];
};

export type FaceSearchResponse = {
  results: SearchResult[];
};

export type FaceDetectResponse = {
  bboxes: number[][];
};
